import { useState } from 'react';
import SettingsForm from './SettingsForm';
import { PageShell, PageCard } from './AppNav';
import { ui } from '../ui';
import { mergeSettings } from '../data/settings';

export default function SettingsPage({
  settings,
  setSettings,
  team = [],
  onBack,
  setWishlists,
  onLeaveToStart,
  onClearLocalData,
  mode = 'solo',
}) {
  const [draft, setDraft] = useState(() => mergeSettings(settings));

  const handleDraftChange = (next) => {
    const merged = mergeSettings(next);
    setDraft(merged);
    if (merged.theme !== settings.theme) {
      setSettings(mergeSettings({ ...settings, theme: merged.theme }));
    }
  };

  const clearAllWishlists = () => {
    if (confirm('Are you sure you want to clear ALL wishlists for the entire team? This cannot be undone.')) {
      setWishlists({});
    }
  };

  const goHome = () => {
    const leavingSession = mode === 'session';
    const ok = confirm(
      leavingSession
        ? 'Leave this session and return to the start screen? You can rejoin with the room code.'
        : 'Return to the start screen? Your solo data stays on this device until you clear it below.'
    );
    if (ok) onLeaveToStart?.();
  };

  const clearLocal = () => {
    const ok = confirm(
      'Clear this device’s solo team, wishlists, schedule, and time clock, then return to the start screen? Theme preference is kept. This cannot be undone.'
    );
    if (ok) onClearLocalData?.();
  };

  return (
    <PageShell
      narrow
      title="Settings"
      subtitle="Coverage calculator, shift structure, hours on/off, and conflict handling — applies across wishlist, draft, and schedule."
      actions={
        <button type="button" onClick={onBack} className={ui.btnGhost}>&larr; Back</button>
      }
    >
      <PageCard>
        <SettingsForm
          settings={draft}
          onChange={handleDraftChange}
          mode="full"
          team={team}
          showActions
          onSave={() => {
            setSettings(mergeSettings(draft));
            onBack();
          }}
        />
      </PageCard>

      <PageCard className="mt-8 border-red-200 dark:border-red-900/50">
        <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Clear wishlists, return to the start screen, or wipe this device’s solo data.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <button
            type="button"
            onClick={clearAllWishlists}
            className="px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm"
          >
            Clear All Wishlists
          </button>
          <button
            type="button"
            onClick={goHome}
            className="px-4 py-2 rounded-lg font-bold text-slate-800 dark:text-slate-100 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition shadow-sm"
          >
            {mode === 'session' ? 'Leave session' : 'Back to start'}
          </button>
          {onClearLocalData && (
            <button
              type="button"
              onClick={clearLocal}
              className="px-4 py-2 rounded-lg font-bold text-white bg-red-800 hover:bg-red-900 transition shadow-sm"
            >
              Clear this device
            </button>
          )}
        </div>
      </PageCard>
    </PageShell>
  );
}
