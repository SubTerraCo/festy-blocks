import { useState } from 'react';
import { useSession } from '../context/SessionProvider';
import { ui } from '../ui';

/**
 * Lobby handles three surfaces:
 *   - Landing (mode === 'none'): Solo / Create Session / Join Session
 *   - Create result: shows the new room code
 *   - Join flow: enter code, then claim a member (name + PIN)
 *
 * Once a facilitator creates a session, or a member has claimed their name,
 * App.jsx renders the normal scheduler UI.
 */
export default function Lobby() {
  const {
    mode,
    role,
    ready,
    online,
    firebaseEnabled,
    session,
    team,
    createSession,
    joinSession,
    claimMember,
    enterSolo,
    leaveMode,
    error,
  } = useSession();

  const [view, setView] = useState('landing'); // 'landing' | 'create' | 'join'
  const [facilitatorPin, setFacilitatorPin] = useState('');
  const [showFacilitatorPin, setShowFacilitatorPin] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [pickerMemberId, setPickerMemberId] = useState(null);
  const [memberPin, setMemberPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  const err = localError || error;

  const doCreate = async () => {
    setLocalError(null);
    setBusy(true);
    try {
      await createSession({ facilitatorPin: facilitatorPin || undefined });
    } catch (e) {
      setLocalError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const doJoin = async () => {
    setLocalError(null);
    setBusy(true);
    try {
      await joinSession(codeInput);
      setView('join'); // still on join view — now shows member list
    } catch (e) {
      setLocalError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const doClaim = async () => {
    setLocalError(null);
    if (!pickerMemberId) {
      setLocalError('Pick your name first.');
      return;
    }
    setBusy(true);
    try {
      await claimMember(pickerMemberId, memberPin);
    } catch (e) {
      setLocalError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const shell = (children) => (
    <div className="app-shell min-h-screen">
      <header className="app-nav bg-blue-600 text-white shadow-md print:hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Festy Blocks</h1>
            <p className="text-blue-100 text-xs hidden sm:block">
              Shift wishlist · conflict draft · schedule{' '}
              <span className="opacity-75">(v26.09.14b7)</span>
            </p>
          </div>
          <div className="text-xs text-blue-100">
            {online ? 'Online' : 'Offline'}
          </div>
        </div>
      </header>
      <main className="app-main container mx-auto px-3 sm:px-4">{children}</main>
    </div>
  );

  // === Session mode without a claim (member joining or waiting) ===
  if (mode === 'session' && role === 'viewer') {
    if (!ready) {
      return shell(
        <div className={`${ui.pageNarrow}`}>
          <div className={`${ui.card} ${ui.cardPad}`}>
            <p className="text-slate-500 dark:text-slate-400">Connecting to session…</p>
          </div>
        </div>
      );
    }
    return shell(
      <div className={ui.pageNarrow}>
        <div className={`${ui.card} ${ui.cardPad} space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Session {session?.code}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Pick your name to start your wishlist.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                leaveMode();
                setView('landing');
                setCodeInput('');
                setPickerMemberId(null);
                setMemberPin('');
                setLocalError(null);
              }}
              className={ui.btnGhost}
            >
              Leave
            </button>
          </div>

          {team.length === 0 ? (
            <div className={`${ui.infoBox} ${ui.infoBlue}`}>
              Waiting for the facilitator to add crew members. This screen
              will update automatically when they do.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {team.map((m) => {
                  const taken = !!m.claimedByUid;
                  const selected = pickerMemberId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={taken}
                      onClick={() => setPickerMemberId(m.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                        selected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200'
                          : taken
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <span className="font-semibold">{m.name}</span>
                      <span className="ml-2 text-xs uppercase opacity-70">{m.role}</span>
                      {taken && (
                        <span className="ml-2 text-xs uppercase opacity-70">— claimed</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {pickerMemberId && (
                <div className="space-y-2">
                  <label className={ui.label}>Your PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={memberPin}
                    onChange={(e) => setMemberPin(e.target.value)}
                    placeholder="4-digit PIN from the facilitator"
                    className={ui.input}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={doClaim}
                    className={`w-full ${ui.btnPrimary}`}
                  >
                    {busy ? 'Verifying…' : 'Enter session'}
                  </button>
                </div>
              )}
            </>
          )}

          {err && (
            <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-100 p-3 text-sm">
              {err}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === Landing / create / join views (mode === 'none') ===
  return shell(
    <div className={ui.pageNarrow}>
      <div className={`${ui.card} ${ui.cardPad} space-y-5`}>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome to Festy Blocks
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Draft the crew schedule. Choose how you want to run this session.
          </p>
        </div>

        {view === 'landing' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setView('create')}
              className={`w-full ${ui.btnPrimary}`}
            >
              Create a new session (facilitator)
            </button>
            <button
              type="button"
              onClick={() => setView('join')}
              className={`w-full ${ui.btnSecondary}`}
            >
              Join a session with a room code
            </button>
            <button
              type="button"
              onClick={enterSolo}
              className={`w-full ${ui.btnGhost}`}
            >
              Use solo mode (one device, offline)
            </button>
            {!firebaseEnabled && (
              <div className={`${ui.infoBox} ${ui.infoOrange}`}>
                Multi-device sync is not configured. Solo mode works fully offline.
                To enable Create / Join, add <code>VITE_FIREBASE_*</code> values
                (see <code>.env.example</code>).
              </div>
            )}
          </div>
        )}

        {view === 'create' && (
          <div className="space-y-4">
            <div>
              <label className={ui.label}>Facilitator PIN (optional)</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Used later if you need to reclaim facilitator on another device.
              </p>
              <div className="flex gap-2">
                <input
                  type={showFacilitatorPin ? 'text' : 'password'}
                  inputMode="numeric"
                  value={facilitatorPin}
                  onChange={(e) => setFacilitatorPin(e.target.value)}
                  placeholder="e.g. 4321"
                  className={ui.input}
                />
                <button
                  type="button"
                  onClick={() => setShowFacilitatorPin((v) => !v)}
                  className={ui.btnSecondary}
                >
                  {showFacilitatorPin ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView('landing')}
                className={`flex-1 ${ui.btnSecondary}`}
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy || !firebaseEnabled}
                onClick={doCreate}
                className={`flex-1 ${ui.btnPrimary}`}
              >
                {busy ? 'Creating…' : 'Create session'}
              </button>
            </div>
          </div>
        )}

        {view === 'join' && (
          <div className="space-y-4">
            <div>
              <label className={ui.label}>Room code</label>
              <input
                type="text"
                autoCapitalize="characters"
                autoCorrect="off"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. AB3D9"
                className={`${ui.input} tracking-widest uppercase`}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView('landing')}
                className={`flex-1 ${ui.btnSecondary}`}
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy || !firebaseEnabled}
                onClick={doJoin}
                className={`flex-1 ${ui.btnPrimary}`}
              >
                {busy ? 'Joining…' : 'Join session'}
              </button>
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-100 p-3 text-sm">
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
