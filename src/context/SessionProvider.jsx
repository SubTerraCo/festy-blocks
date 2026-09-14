import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  ensureAnonymousAuth,
  firebaseEnabled,
  generatePin,
  generateRoomCode,
  getFirebase,
  hashPin,
} from '../data/firebase';
import { mergeSettings } from '../data/settings';

const SessionContext = createContext(null);

const LS = {
  team: 'festival-team',
  wishlists: 'festival-wishlists',
  schedule: 'festival-schedule',
  allHands: 'festival-allhands',
  timeLogs: 'festival-timelogs',
  settings: 'festival-settings',
  mode: 'festy-mode',
  sessionCode: 'festy-session-code',
  // per-session claim key: `${LS.claimedMember}:${code}`
  claimedMember: 'festy-claimed-member',
};

const EMPTY_SCHEDULE = { friday: {}, saturday: {}, sunday: {} };
const EMPTY_ALLHANDS = { friday: [], saturday: [], sunday: [] };

/** Legacy day-grouped wishlists -> global "day|slot" arrays per member. */
function migrateWishlists(raw) {
  if (!raw || typeof raw !== 'object') return {};
  if (raw.friday && !Array.isArray(raw.friday)) {
    const migrated = {};
    const memberIds = new Set([
      ...Object.keys(raw.friday || {}),
      ...Object.keys(raw.saturday || {}),
      ...Object.keys(raw.sunday || {}),
    ]);
    memberIds.forEach((id) => {
      migrated[id] = [
        ...(raw.friday?.[id] || []).map((s) => `friday|${s}`),
        ...(raw.saturday?.[id] || []).map((s) => `saturday|${s}`),
        ...(raw.sunday?.[id] || []).map((s) => `sunday|${s}`),
      ];
    });
    return migrated;
  }
  return raw;
}

function readJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function SessionProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(LS.mode) || 'none');

  // ---------- solo state (mirrors legacy localStorage) ----------
  const [soloTeam, setSoloTeam] = useState(() => readJson(LS.team, []));
  const [soloWishlists, setSoloWishlists] = useState(() =>
    migrateWishlists(readJson(LS.wishlists, {}))
  );
  const [soloSchedule, setSoloSchedule] = useState(() => {
    const s = readJson(LS.schedule, null);
    return s?.friday ? s : EMPTY_SCHEDULE;
  });
  const [soloAllHands, setSoloAllHands] = useState(() => {
    const s = readJson(LS.allHands, null);
    return s?.friday ? s : EMPTY_ALLHANDS;
  });
  const [soloTimeLogs, setSoloTimeLogs] = useState(() => readJson(LS.timeLogs, {}));
  const [soloSettings, setSoloSettings] = useState(() =>
    mergeSettings(readJson(LS.settings, null))
  );

  useEffect(() => { localStorage.setItem(LS.team, JSON.stringify(soloTeam)); }, [soloTeam]);
  useEffect(() => { localStorage.setItem(LS.wishlists, JSON.stringify(soloWishlists)); }, [soloWishlists]);
  useEffect(() => { localStorage.setItem(LS.schedule, JSON.stringify(soloSchedule)); }, [soloSchedule]);
  useEffect(() => { localStorage.setItem(LS.allHands, JSON.stringify(soloAllHands)); }, [soloAllHands]);
  useEffect(() => { localStorage.setItem(LS.timeLogs, JSON.stringify(soloTimeLogs)); }, [soloTimeLogs]);
  useEffect(() => { localStorage.setItem(LS.settings, JSON.stringify(soloSettings)); }, [soloSettings]);

  // ---------- session state ----------
  const [sessionCode, setSessionCode] = useState(() => localStorage.getItem(LS.sessionCode) || null);
  const [sessionDoc, setSessionDoc] = useState(null);
  const [sessionMembers, setSessionMembers] = useState([]);
  const [sessionWishlists, setSessionWishlists] = useState({});
  const [claimedMemberId, setClaimedMemberId] = useState(() => {
    const code = localStorage.getItem(LS.sessionCode);
    if (!code) return null;
    return localStorage.getItem(`${LS.claimedMember}:${code}`) || null;
  });
  const [uid, setUid] = useState(null);
  const [ready, setReady] = useState(mode !== 'session');
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );
  const [error, setError] = useState(null);

  // online/offline listener
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // anonymous auth once when in session mode
  useEffect(() => {
    if (mode !== 'session' || !firebaseEnabled) {
      setReady(true);
      return;
    }
    let alive = true;
    setReady(false);
    ensureAnonymousAuth()
      .then((u) => {
        if (!alive) return;
        setUid(u);
        setReady(true);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || String(err));
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [mode]);

  // subscribe to session doc + subcollections
  useEffect(() => {
    if (mode !== 'session' || !sessionCode || !firebaseEnabled) return undefined;
    const fb = getFirebase();
    if (!fb) return undefined;
    const { db } = fb;
    const sref = doc(db, 'sessions', sessionCode);
    const mref = collection(db, 'sessions', sessionCode, 'members');
    const wref = collection(db, 'sessions', sessionCode, 'wishlists');
    const unsubs = [];
    unsubs.push(
      onSnapshot(
        sref,
        (snap) => setSessionDoc(snap.exists() ? snap.data() : null),
        (err) => setError(err?.message || String(err))
      )
    );
    unsubs.push(
      onSnapshot(
        mref,
        (snap) => {
          const arr = [];
          snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
          arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setSessionMembers(arr);
        },
        (err) => setError(err?.message || String(err))
      )
    );
    unsubs.push(
      onSnapshot(
        wref,
        (snap) => {
          const map = {};
          snap.forEach((d) => {
            map[d.id] = d.data()?.picks || [];
          });
          setSessionWishlists(map);
        },
        (err) => setError(err?.message || String(err))
      )
    );
    return () => unsubs.forEach((fn) => fn());
  }, [mode, sessionCode]);

  // ---------- derived state ----------
  const isFacilitator =
    mode === 'session' && !!sessionDoc && !!uid && sessionDoc.facilitatorUid === uid;
  const currentMemberId = mode === 'session' ? claimedMemberId : null;
  const role =
    mode === 'solo'
      ? 'solo'
      : mode !== 'session'
        ? 'none'
        : isFacilitator
          ? 'facilitator'
          : currentMemberId
            ? 'member'
            : 'viewer';

  const team = mode === 'session' ? sessionMembers : soloTeam;
  const wishlists = mode === 'session' ? sessionWishlists : soloWishlists;
  const schedule = mode === 'session' ? sessionDoc?.schedule || EMPTY_SCHEDULE : soloSchedule;
  const allHands = mode === 'session' ? sessionDoc?.allHands || EMPTY_ALLHANDS : soloAllHands;
  const timeLogs = mode === 'session' ? sessionDoc?.timeLogs || {} : soloTimeLogs;
  const settings =
    mode === 'session' ? mergeSettings(sessionDoc?.settings || null) : soloSettings;
  const isPublished = mode === 'session' && sessionDoc?.status === 'published';

  // ---------- setters (write-through in session mode) ----------
  const writeSessionField = useCallback(
    async (patch) => {
      if (mode !== 'session' || !sessionCode || !firebaseEnabled) return;
      const fb = getFirebase();
      if (!fb) return;
      try {
        await updateDoc(doc(fb.db, 'sessions', sessionCode), patch);
      } catch (err) {
        setError(err?.message || String(err));
      }
    },
    [mode, sessionCode]
  );

  const setTeam = useCallback(
    (updater) => {
      if (mode !== 'session') {
        setSoloTeam(updater);
        return;
      }
      if (!isFacilitator) return;
      const fb = getFirebase();
      if (!fb || !sessionCode) return;
      const { db } = fb;
      const next = typeof updater === 'function' ? updater(sessionMembers) : updater;
      const prevIds = new Set(sessionMembers.map((m) => m.id));
      const nextIds = new Set(next.map((m) => m.id));
      next.forEach((m, idx) => {
        const { id, ...rest } = m;
        setDoc(
          doc(db, 'sessions', sessionCode, 'members', id),
          { ...rest, order: idx },
          { merge: true }
        ).catch((err) => setError(err?.message || String(err)));
      });
      prevIds.forEach((id) => {
        if (!nextIds.has(id)) {
          deleteDoc(doc(db, 'sessions', sessionCode, 'members', id)).catch(() => {});
          deleteDoc(doc(db, 'sessions', sessionCode, 'wishlists', id)).catch(() => {});
        }
      });
    },
    [mode, isFacilitator, sessionMembers, sessionCode]
  );

  const setWishlists = useCallback(
    (updater) => {
      if (mode !== 'session') {
        setSoloWishlists(updater);
        return;
      }
      const fb = getFirebase();
      if (!fb || !sessionCode) return;
      const { db } = fb;
      const next = typeof updater === 'function' ? updater(sessionWishlists) : updater || {};
      const ids = new Set([
        ...Object.keys(sessionWishlists),
        ...Object.keys(next),
      ]);
      ids.forEach((memberId) => {
        const before = sessionWishlists[memberId] || [];
        const after = next[memberId] || [];
        if (arraysEqual(before, after)) return;
        // Members can only write their own picks; facilitator can write any.
        if (!isFacilitator && memberId !== claimedMemberId) return;
        setDoc(
          doc(db, 'sessions', sessionCode, 'wishlists', memberId),
          { picks: after },
          { merge: true }
        ).catch((err) => setError(err?.message || String(err)));
      });
    },
    [mode, isFacilitator, claimedMemberId, sessionWishlists, sessionCode]
  );

  const setSchedule = useCallback(
    (updater) => {
      if (mode !== 'session') {
        setSoloSchedule(updater);
        return;
      }
      if (!isFacilitator) return;
      const current = sessionDoc?.schedule || EMPTY_SCHEDULE;
      const next = typeof updater === 'function' ? updater(current) : updater;
      writeSessionField({ schedule: next });
    },
    [mode, isFacilitator, sessionDoc, writeSessionField]
  );

  const setAllHands = useCallback(
    (updater) => {
      if (mode !== 'session') {
        setSoloAllHands(updater);
        return;
      }
      if (!isFacilitator) return;
      const current = sessionDoc?.allHands || EMPTY_ALLHANDS;
      const next = typeof updater === 'function' ? updater(current) : updater;
      writeSessionField({ allHands: next });
    },
    [mode, isFacilitator, sessionDoc, writeSessionField]
  );

  const setTimeLogs = useCallback(
    (updater) => {
      if (mode !== 'session') {
        setSoloTimeLogs(updater);
        return;
      }
      if (!isFacilitator) return;
      const current = sessionDoc?.timeLogs || {};
      const next = typeof updater === 'function' ? updater(current) : updater;
      writeSessionField({ timeLogs: next });
    },
    [mode, isFacilitator, sessionDoc, writeSessionField]
  );

  const setSettings = useCallback(
    (updater) => {
      if (mode !== 'session') {
        setSoloSettings((prev) => {
          const next = typeof updater === 'function' ? updater(prev) : updater;
          return mergeSettings(next);
        });
        return;
      }
      if (!isFacilitator) return;
      const current = mergeSettings(sessionDoc?.settings || null);
      const next = typeof updater === 'function' ? updater(current) : updater;
      writeSessionField({ settings: mergeSettings(next) });
    },
    [mode, isFacilitator, sessionDoc, writeSessionField]
  );

  // ---------- session lifecycle ----------
  const enterSolo = useCallback(() => {
    localStorage.setItem(LS.mode, 'solo');
    setMode('solo');
  }, []);

  const leaveMode = useCallback(() => {
    localStorage.removeItem(LS.mode);
    localStorage.removeItem(LS.sessionCode);
    setMode('none');
    setSessionCode(null);
    setSessionDoc(null);
    setSessionMembers([]);
    setSessionWishlists({});
    setClaimedMemberId(null);
    setError(null);
  }, []);

  const createSession = useCallback(async ({ facilitatorPin } = {}) => {
    if (!firebaseEnabled) {
      throw new Error(
        'Firebase not configured. Add VITE_FIREBASE_* values in .env (see .env.example).'
      );
    }
    const fb = getFirebase();
    const authUid = await ensureAnonymousAuth();
    let code = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateRoomCode();
      const existing = await getDoc(doc(fb.db, 'sessions', candidate));
      if (!existing.exists()) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error('Could not allocate a unique room code. Try again.');
    const facilitatorPinHash = facilitatorPin ? await hashPin(facilitatorPin) : null;
    await setDoc(doc(fb.db, 'sessions', code), {
      createdAt: serverTimestamp(),
      facilitatorUid: authUid,
      facilitatorPinHash,
      status: 'gathering',
      settings: mergeSettings(null),
      schedule: EMPTY_SCHEDULE,
      allHands: EMPTY_ALLHANDS,
      timeLogs: {},
    });
    localStorage.setItem(LS.mode, 'session');
    localStorage.setItem(LS.sessionCode, code);
    setSessionCode(code);
    setUid(authUid);
    setMode('session');
    return { code };
  }, []);

  const joinSession = useCallback(async (rawCode) => {
    if (!firebaseEnabled) throw new Error('Firebase not configured.');
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) throw new Error('Enter a room code.');
    const fb = getFirebase();
    await ensureAnonymousAuth();
    const snap = await getDoc(doc(fb.db, 'sessions', code));
    if (!snap.exists()) throw new Error(`Session "${code}" not found.`);
    localStorage.setItem(LS.mode, 'session');
    localStorage.setItem(LS.sessionCode, code);
    setSessionCode(code);
    setMode('session');
    const savedClaim = localStorage.getItem(`${LS.claimedMember}:${code}`);
    setClaimedMemberId(savedClaim || null);
    return { code };
  }, []);

  const claimMember = useCallback(
    async (memberId, pin) => {
      if (!firebaseEnabled) throw new Error('Firebase not configured.');
      if (!sessionCode) throw new Error('Not in a session.');
      const fb = getFirebase();
      const authUid = await ensureAnonymousAuth();
      const mref = doc(fb.db, 'sessions', sessionCode, 'members', memberId);
      const msnap = await getDoc(mref);
      if (!msnap.exists()) throw new Error('Member not found.');
      const data = msnap.data();
      if (data.claimedByUid && data.claimedByUid !== authUid) {
        throw new Error('Someone else already claimed this member on another device.');
      }
      if (data.pinHash) {
        const attempt = await hashPin(pin);
        if (attempt !== data.pinHash) throw new Error('PIN did not match.');
      }
      await updateDoc(mref, { claimedByUid: authUid });
      localStorage.setItem(`${LS.claimedMember}:${sessionCode}`, memberId);
      setClaimedMemberId(memberId);
      return { memberId };
    },
    [sessionCode]
  );

  const releaseClaim = useCallback(() => {
    if (sessionCode) {
      localStorage.removeItem(`${LS.claimedMember}:${sessionCode}`);
    }
    setClaimedMemberId(null);
  }, [sessionCode]);

  const publishSchedule = useCallback(() => {
    if (!isFacilitator) return;
    return writeSessionField({ status: 'published' });
  }, [isFacilitator, writeSessionField]);

  const setStatus = useCallback(
    (status) => {
      if (!isFacilitator) return;
      return writeSessionField({ status });
    },
    [isFacilitator, writeSessionField]
  );

  const value = {
    // meta
    mode,
    role,
    ready,
    online,
    error,
    firebaseEnabled,
    // session
    session: sessionCode
      ? {
          code: sessionCode,
          status: sessionDoc?.status || null,
          facilitatorUid: sessionDoc?.facilitatorUid || null,
        }
      : null,
    isPublished,
    currentMemberId,
    // state
    team,
    wishlists,
    schedule,
    allHands,
    timeLogs,
    settings,
    // setters
    setTeam,
    setWishlists,
    setSchedule,
    setAllHands,
    setTimeLogs,
    setSettings,
    // lifecycle
    enterSolo,
    leaveMode,
    createSession,
    joinSession,
    claimMember,
    releaseClaim,
    publishSchedule,
    setStatus,
    // helpers exposed for the Lobby
    generatePin,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
