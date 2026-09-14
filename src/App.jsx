import { useEffect, useState } from 'react'
import AppNav from './components/AppNav'
import TeamSetup from './components/TeamSetup'
import WishlistHub from './components/WishlistHub'
import WishlistPicker from './components/WishlistPicker'
import ConflictResolver from './components/ConflictResolver'
import DraftBoard from './components/DraftBoard'
import ScheduleView from './components/ScheduleView'
import TimeClock from './components/TimeClock'
import SettingsPage from './components/SettingsPage'
import Lobby from './components/Lobby'
import { useSession } from './context/SessionProvider'
import { mergeSettings } from './data/settings'

function App() {
  const {
    mode,
    role,
    isPublished,
    currentMemberId,
    session,
    team,
    setTeam,
    wishlists,
    setWishlists,
    schedule,
    setSchedule,
    allHands,
    setAllHands,
    timeLogs,
    setTimeLogs,
    settings,
    setSettings,
    publishSchedule,
    leaveMode,
  } = useSession()

  const memberMode = mode === 'session' && role === 'member'
  const facilitatorMode = mode === 'session' && role === 'facilitator'

  // Members land directly on wishlist for themselves. Solo/facilitator go to setup.
  const defaultAppState = memberMode
    ? isPublished
      ? 'schedule'
      : 'wishlist_picker'
    : 'setup'

  const [appState, setAppState] = useState(defaultAppState)
  const [scheduleMode, setScheduleMode] = useState('master')
  const [currentPickerId, setCurrentPickerId] = useState(
    memberMode ? currentMemberId : null
  )
  const [prevAppState, setPrevAppState] = useState(defaultAppState)

  // Keep member's active picker in sync with claim
  useEffect(() => {
    if (memberMode) {
      setCurrentPickerId(currentMemberId)
      // When facilitator publishes, force members to the schedule view
      if (isPublished) setAppState('schedule')
      else if (appState !== 'wishlist_picker') setAppState('wishlist_picker')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberMode, currentMemberId, isPublished])

  // Theme apply
  useEffect(() => {
    const theme = settings.theme === 'light' ? 'light' : 'dark'
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.dataset.theme = theme
  }, [settings.theme])

  const goToScheduleSwaps = () => {
    setScheduleMode('swaps')
    setAppState('schedule')
  }

  const goToSettings = () => {
    setPrevAppState(appState === 'settings' ? prevAppState : appState)
    setAppState('settings')
  }

  const handleNav = (navId) => {
    switch (navId) {
      case 'setup':
        setAppState('setup')
        break
      case 'wishlist':
        if (currentPickerId) {
          setAppState('wishlist_picker')
        } else {
          setAppState('wishlist_hub')
        }
        break
      case 'draft':
        setAppState('draft')
        break
      case 'schedule':
        setScheduleMode('master')
        setAppState('schedule')
        break
      case 'timeclock':
        setAppState('timeclock')
        break
      case 'settings':
        goToSettings()
        break
      case 'lobby':
        leaveMode()
        break
      default:
        break
    }
  }

  // Show the lobby when there's no active mode, or when a member has joined but
  // hasn't claimed their identity yet.
  if (mode === 'none' || (mode === 'session' && role === 'viewer')) {
    return <Lobby />
  }

  return (
    <div className="app-shell min-h-screen">
      <AppNav
        appState={appState}
        onNavigate={handleNav}
        role={role}
        mode={mode}
        sessionCode={session?.code || null}
        published={isPublished}
      />

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
              setCurrentPickerId(memberId)
              setAppState('wishlist_picker')
            }}
            onResolve={() => setAppState('resolve')}
            onBack={() => setAppState('setup')}
            onOpenSettings={goToSettings}
            onGoToSwaps={goToScheduleSwaps}
            role={role}
            currentMemberId={currentMemberId}
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
              if (memberMode) {
                // members stay on their own picker
                return
              }
              setCurrentPickerId(null)
              setAppState('wishlist_hub')
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
              setCurrentPickerId(memberId)
              setAppState('wishlist_picker')
            }}
            onResolve={() => setAppState('resolve')}
            onBack={() => setAppState('setup')}
            onOpenSettings={goToSettings}
            onGoToSwaps={goToScheduleSwaps}
            role={role}
            currentMemberId={currentMemberId}
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
              setScheduleMode('master')
              setAppState('schedule')
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
            role={role}
            currentMemberId={currentMemberId}
            isPublished={isPublished}
            onPublish={facilitatorMode ? publishSchedule : null}
          />
        )}

        {appState === 'timeclock' && (
          <TimeClock team={team} timeLogs={timeLogs} setTimeLogs={setTimeLogs} />
        )}
      </main>
    </div>
  )
}

export default App
