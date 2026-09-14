import {
  mergeSettings,
  computeCoveragePlan,
  clampHoursOn,
} from '../data/settings';
import { ui } from '../ui';

/**
 * Live coverage / hours calculator for Setup + Settings.
 * More volunteers or higher volunteer hours → fewer hours ON for regulars.
 */
export default function CoverageDashboard({ team = [], settings, onChange }) {
  const draft = mergeSettings(settings);
  const plan = computeCoveragePlan(team, draft);
  const maxOn = Math.max(0, plan.slots);

  const patch = (partial) => onChange(mergeSettings({ ...draft, ...partial }));

  const setHoursOn = (role, value) => {
    patch({
      hoursOnByRole: {
        ...draft.hoursOnByRole,
        [role]: clampHoursOn(value, plan.slots),
      },
    });
  };

  const applySuggestedRegular = () => {
    if (plan.regularHoursSuggested == null) return;
    setHoursOn('regular', plan.regularHoursSuggested);
  };

  const applyEqualLoad = () => {
    if (plan.equalHoursSuggested == null) return;
    patch({
      hoursOnByRole: {
        volunteer: plan.equalHoursSuggested,
        regular: plan.equalHoursSuggested,
      },
    });
  };

  const fmtExact = (n) =>
    n == null || Number.isNaN(n) ? '—' : (Math.round(n * 10) / 10).toString();

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/40">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Coverage & hours calculator
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Live plan from team size, volunteer hours, shifts, and min coverage.
          More people (or higher volunteer hours) lowers regular hours ON.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Shifts / day" value={plan.slots} />
          <Stat label="Min coverage" value={plan.minCoverage} />
          <Stat
            label="Person-shifts needed"
            value={plan.demand}
            hint={`${plan.slots} × ${plan.minCoverage}`}
          />
          <Stat
            label="Team"
            value={plan.teamCount}
            hint={`${plan.volunteerCount} vol · ${plan.regularCount} reg`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2">
            <label className={ui.label}>
              Volunteer hours ON / day ({plan.volunteerCount} people)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={maxOn}
                value={plan.volunteerHoursOn}
                onChange={(e) => setHoursOn('volunteer', e.target.value)}
                className="w-20 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-center font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                → supply <strong>{plan.volunteerSupply}</strong> person-shifts
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Off target: {Math.max(0, plan.slots - plan.volunteerHoursOn)}h
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2">
            <label className={ui.label}>
              Regular hours ON / day ({plan.regularCount} people)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={maxOn}
                value={plan.regularHoursOn}
                onChange={(e) => setHoursOn('regular', e.target.value)}
                className="w-20 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-center font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                suggested <strong>{plan.regularHoursSuggested ?? '—'}</strong>
                {plan.regularHoursExact != null && (
                  <span className="text-slate-400"> ({fmtExact(plan.regularHoursExact)} exact)</span>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Off target: {Math.max(0, plan.slots - plan.regularHoursOn)}h · remaining after vols:{' '}
              <strong>{plan.remainingForRegulars}</strong>
            </p>
          </div>
        </div>

        <div
          className={`rounded-lg border p-3 text-sm ${
            plan.surplus === 0
              ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-200'
              : plan.surplus > 0
                ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100'
                : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100'
          }`}
        >
          {!plan.teamCount ? (
            <p>Add team members to calculate how hours split between volunteers and regulars.</p>
          ) : !plan.headcountOk ? (
            <p>
              Team ({plan.teamCount}) is below min coverage ({plan.minCoverage}). Add people or lower coverage.
            </p>
          ) : plan.surplus === 0 ? (
            <p>
              Balanced: current hours supply <strong>{plan.currentSupply}</strong> matches demand{' '}
              <strong>{plan.demand}</strong> person-shifts/day.
            </p>
          ) : plan.surplus > 0 ? (
            <p>
              Over by <strong>{plan.surplus}</strong> person-shifts/day (supply {plan.currentSupply} vs need{' '}
              {plan.demand}). Lower hours ON or raise min coverage.
            </p>
          ) : (
            <p>
              Short by <strong>{Math.abs(plan.surplus)}</strong> person-shifts/day (supply {plan.currentSupply} vs need{' '}
              {plan.demand}). Raise hours ON or add people.
            </p>
          )}
          {plan.teamCount > 0 && plan.equalHoursExact != null && (
            <p className="mt-1 text-xs opacity-90">
              Equal load across everyone ≈ {fmtExact(plan.equalHoursExact)} hours ON
              {plan.equalHoursSuggested != null ? ` (round to ${plan.equalHoursSuggested})` : ''}.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={plan.regularHoursSuggested == null || plan.regularCount === 0}
            onClick={applySuggestedRegular}
            className={`flex-1 ${ui.btnPrimary}`}
          >
            Apply suggested regular hours
            {plan.regularHoursSuggested != null ? ` (${plan.regularHoursSuggested})` : ''}
          </button>
          <button
            type="button"
            disabled={plan.equalHoursSuggested == null}
            onClick={applyEqualLoad}
            className={`flex-1 ${ui.btnSecondary}`}
          >
            Equalize all roles
            {plan.equalHoursSuggested != null ? ` (${plan.equalHoursSuggested})` : ''}
          </button>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Min coverage
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={plan.minCoverage}
            onChange={(e) =>
              patch({ minCoverage: Math.max(1, Number(e.target.value) || 1) })
            }
            className="w-20 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-center font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            people working every shift
          </span>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{value}</p>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}
