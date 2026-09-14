import { useState, useEffect } from 'react';
import SettingsForm from './SettingsForm';
import { PageShell, PageCard } from './AppNav';
import { ui } from '../ui';
import { mergeSettings } from '../data/settings';

export default function SettingsPage({ settings, setSettings, team = [], onBack, setWishlists }) {
  const [draft, setDraft] = useState(() => mergeSettings(settings));

  // Live preview for theme changes before saving
  useEffect(() => {
    const theme = draft.theme === 'light' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Revert to actual saved theme if unmounted without saving
    return () => {
      const savedTheme = settings.theme === 'light' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    };
  }, [draft.theme, settings.theme]);

  const clearAllWishlists = () => {
    if (confirm('Are you sure you want to clear ALL wishlists for the entire team? This cannot be undone.')) {
      setWishlists({ friday: {}, saturday: {}, sunday: {} });
    }
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
          onChange={setDraft}
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
          Clear all wishlist data for the entire team. This is useful if you are starting a completely new draft.
        </p>
        <button
          type="button"
          onClick={clearAllWishlists}
          className="px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm"
        >
          Clear All Wishlists
        </button>
      </PageCard>
    </PageShell>
  );
}
