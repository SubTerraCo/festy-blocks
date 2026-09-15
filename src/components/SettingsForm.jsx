import { useMemo } from 'react';
import {
  DEFAULT_SETTINGS,
  CONFLICT_STRATEGIES,
  mergeSettings,
  buildTimeSlots,
  formatDecimalHour,
  decimalToTimeInput,
  timeInputToDecimal,
  endFromStartCountLength,
} from '../data/settings';
import CoverageDashboard from './CoverageDashboard';

/**
 * Shared settings editor used on Setup (before wishlist) and Settings page.
 * mode: 'full' | 'schedule' — schedule = shift structure only (embedded in TeamSetup)
 */
export default function SettingsForm({
  settings,
  onChange,
  mode = 'full',
  showActions = false,
  onSave,
  onReset,
  team = [],
}) {
  const draft = mergeSettings(settings);
  const slots = useMemo(() => buildTimeSlots(draft), [
    draft.dayStartHour,
    draft.dayEndHour,
    draft.shiftLengthHours,
  ]);
  const shiftsPerDay = slots.length;

  const patch = (partial) => onChange(mergeSettings({ ...draft, ...partial }));

  const setStart = (timeStr) => {
    const start = timeInputToDecimal(timeStr);
    patch({ dayStartHour: start });
  };

  const setEnd = (timeStr) => {
    let end = timeInputToDecimal(timeStr);
    // Overnight: if end input is "00:30" and start is afternoon, treat as 24.5
    if (end <= draft.dayStartHour) {
      end += 24;
    }
    patch({ dayEndHour: end });
  };

  const setLength = (value) => {
    const length = Math.max(0.25, Number(value) || 1);
    patch({ shiftLengthHours: length });
  };

  const setShiftsPerDay = (value) => {
    const count = Math.max(1, Math.min(24, Number(value) || 1));
    const end = endFromStartCountLength(draft.dayStartHour, count, draft.shiftLengthHours);
    patch({ dayEndHour: end });
  };

  const endInputValue = () => {
    let h = draft.dayEndHour;
    if (h >= 24) h -= 24;
    return decimalToTimeInput(h);
  };

  return (
    <div className="space-y-6">
      {mode === 'full' && (
        <section>
          <h3 className="text-lg font-bold mb-1 text-slate-900 dark:text-slate-100">Appearance</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Global dark / light mode. Choosing a theme applies immediately across every page.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'dark', label: 'Dark' },
              { id: 'light', label: 'Light' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => patch({ theme: opt.id })}
                className={`rounded-lg border-2 p-4 font-bold transition ${
                  draft.theme === opt.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-lg font-bold mb-1 text-slate-900 dark:text-slate-100">Shift schedule</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Controls every page: wishlist, resolve, draft, and printed schedule.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/60">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Shifts start</label>
            <input
              type="time"
              value={decimalToTimeInput(draft.dayStartHour % 24)}
              onChange={e => setStart(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/60">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Shifts end</label>
            <input
              type="time"
              value={endInputValue()}
              onChange={e => setEnd(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              If end is earlier than start, it is treated as next morning.
            </p>
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/60">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Shift length (hours)</label>
            <select
              value={draft.shiftLengthHours}
              onChange={e => setLength(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value={0.5}>0.5 hour</option>
              <option value={1}>1 hour</option>
              <option value={1.5}>1.5 hours</option>
              <option value={2}>2 hours</option>
            </select>
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/60">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Shifts per day</label>
            <input
              type="number"
              min={1}
              max={24}
              value={shiftsPerDay}
              onChange={e => setShiftsPerDay(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-md p-2 font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Changing this adjusts end time from start + count × length.
            </p>
          </div>
        </div>

        <div className="mt-3 border border-blue-100 dark:border-blue-900 rounded-lg p-3 bg-blue-50 dark:bg-blue-950/40 text-sm text-blue-900 dark:text-blue-100">
          <p className="font-semibold mb-1">
            Preview: {shiftsPerDay} shifts &bull; {formatDecimalHour(draft.dayStartHour)} →{' '}
            {formatDecimalHour(draft.dayEndHour)}
            {' '}· demand {shiftsPerDay * draft.minCoverage} person-shifts/day at coverage {draft.minCoverage}
          </p>
          <div className="max-h-32 overflow-y-auto text-xs space-y-0.5">
            {slots.map(s => (
              <div key={s.id}>{s.label}</div>
            ))}
            {slots.length === 0 && (
              <p className="text-red-600">No slots — check start, end, and length.</p>
            )}
          </div>
        </div>
      </section>

      <CoverageDashboard team={team} settings={draft} onChange={onChange} />

      {mode === 'full' && (
        <section>
          <h3 className="text-lg font-bold mb-1 text-slate-900 dark:text-slate-100">Conflict management</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            How auto-resolve handles overlapping time-off requests before the draft.
          </p>
          <div className="space-y-2">
            {CONFLICT_STRATEGIES.map(opt => (
              <label
                key={opt.id}
                className={`flex gap-3 border rounded-lg p-3 cursor-pointer transition ${
                  draft.conflictStrategy === opt.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="conflictStrategy"
                  checked={draft.conflictStrategy === opt.id}
                  onChange={() => patch({ conflictStrategy: opt.id })}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{opt.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>

          {(draft.conflictStrategy === 'adjust_start_earlier' ||
            draft.conflictStrategy === 'adjust_start_later') && (
            <div className="mt-3 border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Max slots to nudge</label>
              <input
                type="number"
                min={1}
                max={5}
                value={draft.conflictSlotNudge}
                onChange={e =>
                  patch({ conflictSlotNudge: Math.max(1, Math.min(5, Number(e.target.value) || 1)) })
                }
                className="w-16 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-center font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </section>
      )}

      {showActions && (
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              onChange(mergeSettings(DEFAULT_SETTINGS));
              onReset?.();
            }}
            className="flex-1 py-3 rounded-md font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 py-3 rounded-md font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Save Settings
          </button>
        </div>
      )}
    </div>
  );
}
