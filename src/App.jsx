import { useState, useEffect } from 'react'
import AppNav from './components/AppNav'
import TeamSetup from './components/TeamSetup'
import WishlistHub from './components/WishlistHub'
import WishlistPicker from './components/WishlistPicker'
import ConflictResolver from './components/ConflictResolver'
import DraftBoard from './components/DraftBoard'
import ScheduleView from './components/ScheduleView'
import TimeClock from './components/TimeClock'
import SettingsPage from './components/SettingsPage'
import { mergeSettings } from './data/settings'

function App() {
  const [appState, setAppState] = useState('setup');
  
  const [team, setTeam] = useState(() => {
    const saved = localStorage.getItem('festival-team');
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlists, setWishlists] = useState(() => {
    const saved = localStorage.getItem('festival-wishlists');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old format (grouped by day) to new format (global array per member)
      if (parsed.friday && !Array.isArray(parsed.friday)) {
        const migrated = {};
        const memberIds = new Set([
          ...Object.keys(parsed.friday || {}),
          ...Object.keys(parsed.saturday || {}),
          ...Object.keys(parsed.sunday || {})
        ]);
        
        memberIds.forEach(mId => {
          migrated[mId] = [
            ...(parsed.friday?.[mId] || []).map(s => `friday|${s}`),
            ...(parsed.saturday?.[mId] || []).map(s => `saturday|${s}`),
            ...(parsed.sunday?.[mId] || []).map(s => `sunday|${s}`)
          ];
        });
        return migrated;
      }
      return parsed;
    }
    return {};
  });

  const [schedule, setSchedule] = useState(() => {
    const saved = localStorage.getItem('festival-schedule');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.friday) return parsed;
    }
    return { friday: {}, saturday: {}, sunday: {} };
  });

  const [allHands, setAllHands] = useState(() => {
    const saved = localStorage.getItem('festival-allhands');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.friday) return parsed;
    }
    return { friday: [], saturday: [], sunday: [] };
  });

  const [timeLogs, setTimeLogs] = useState(() => {
    const saved = localStorage.getItem('festival-timelogs');
    return saved ? JSON.parse(saved) : {};
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('festival-settings');
    if (saved) {
      try {
        return mergeSettings(JSON.parse(saved));
      } catch {
        return mergeSettings(null);
      }
    }
    return mergeSettings(null);
  });

  const [scheduleMode, setScheduleMode] = useState('master');
  const [currentPickerId, setCurrentPickerId] = useState(null);
  const [prevAppState, setPrevAppState] = useState('setup');

  const goToScheduleSwaps = () => {
    setScheduleMode('swaps');
    setAppState('schedule');
  };

  useEffect(() => {
    localStorage.setItem('festival-team', JSON.stringify(team));
  }, [team]);

  useEffect(() => {
    localStorage.setItem('festival-wishlists', JSON.stringify(wishlists));
  }, [wishlists]);

  useEffect(() => {
    localStorage.setItem('festival-schedule', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('festival-allhands', JSON.stringify(allHands));
  }, [allHands]);

  useEffect(() => {
    localStorage.setItem('festival-timelogs', JSON.stringify(timeLogs));
  }, [timeLogs]);

  useEffect(() => {
    localStorage.setItem('festival-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const theme = settings.theme === 'light' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;
  }, [settings.theme]);

  const goToSettings = () => {
    setPrevAppState(appState === 'settings' ? prevAppState : appState);
    setAppState('settings');
  };

  const handleNav = (navId) => {
    switch (navId) {
      case 'setup':
        setAppState('setup');
        break;
      case 'wishlist':
        if (currentPickerId) {
          setAppState('wishlist_picker');
        } else {
          setAppState('wishlist_hub');
        }
        break;
      case 'draft':
        setAppState('draft');
        break;
      case 'schedule':
        setScheduleMode('master');
        setAppState('schedule');
        break;
      case 'timeclock':
        setAppState('timeclock');
        break;
      case 'settings':
        goToSettings();
        break;
      default:
        break;
    }
  };

  return (
    <div className="app-shell min-h-screen">
      <AppNav appState={appState} onNavigate={handleNav} />

      <main className="app-main container mx-auto px-3 sm:px-4">
        {appState === 'setup' && (
          <TeamSetup 
            team={team} 
            setTeam={setTeam}
            settings={settings}
            setSettings={setSettings}
            onComplete={() => setAppState('wishlist_hub')} 
          />
        )}

        {appState === 'settings' && (
          <SettingsPage
            settings={settings}
            setSettings={(next) => setSettings(mergeSettings(next))}
            team={team}
            onBack={() => setAppState(prevAppState === 'settings' ? 'setup' : prevAppState)}
            setWishlists={setWishlists}
          />
        )}
        
        {appState === 'wishlist_hub' && (
          <WishlistHub 
            team={team}
            wishlists={wishlists}
            schedule={schedule}
            settings={settings}
            onPickFor={(memberId) => {
              setCurrentPickerId(memberId);
              setAppState('wishlist_picker');
            }}
            onResolve={() => setAppState('resolve')}
            onBack={() => setAppState('setup')}
            onOpenSettings={goToSettings}
            onGoToSwaps={goToScheduleSwaps}
          />
        )}

        {appState === 'wishlist_picker' && currentPickerId && (
          <WishlistPicker
            team={team}
            memberId={currentPickerId}
            wishlists={wishlists}
            setWishlists={setWishlists}
            settings={settings}
            onSave={() => {
              setCurrentPickerId(null);
              setAppState('wishlist_hub');
            }}
          />
        )}

        {appState === 'wishlist_picker' && !currentPickerId && (
          <WishlistHub 
            team={team}
            wishlists={wishlists}
            schedule={schedule}
            settings={settings}
            onPickFor={(memberId) => {
              setCurrentPickerId(memberId);
              setAppState('wishlist_picker');
            }}
            onResolve={() => setAppState('resolve')}
            onBack={() => setAppState('setup')}
            onOpenSettings={goToSettings}
            onGoToSwaps={goToScheduleSwaps}
          />
        )}

        {appState === 'resolve' && (
          <ConflictResolver
            team={team}
            wishlists={wishlists}
            schedule={schedule}
            setSchedule={setSchedule}
            settings={settings}
            onComplete={() => setAppState('draft')}
            onBack={() => setAppState('wishlist_hub')}
          />
        )}

        {appState === 'draft' && (
          <DraftBoard 
            team={team}
            wishlists={wishlists}
            schedule={schedule}
            setSchedule={setSchedule}
            settings={settings}
            onComplete={() => {
              setScheduleMode('master');
              setAppState('schedule');
            }}
            onBack={() => setAppState('resolve')}
            onOpenSettings={goToSettings}
            onGoToSwaps={goToScheduleSwaps}
          />
        )}

        {appState === 'schedule' && (
          <ScheduleView 
            team={team}
            wishlists={wishlists}
            schedule={schedule}
            setSchedule={setSchedule}
            allHands={allHands}
            setAllHands={setAllHands}
            settings={settings}
            initialMode={scheduleMode}
            onBack={() => setAppState('draft')}
          />
        )}

        {appState === 'timeclock' && (
          <TimeClock 
            team={team}
            timeLogs={timeLogs}
            setTimeLogs={setTimeLogs}
          />
        )}
      </main>
    </div>
  )
}

export default App
