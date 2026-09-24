import { DAYS } from '../data/festivalData';
import type { Schedule, Settings, TeamMember, WishlistMap } from '../types';
import {
  getHoursOffTarget,
  getHoursOnRequired,
  getShiftsPerDay,
  formatDecimalHour,
  isTeamScheduleComplete,
} from '../data/settings';
import { PageShell, PageCard, InfoBanner } from './AppNav';
import { ui } from '../ui';

export default function WishlistHub({
  team,
  wishlists,
  schedule,
  settings,
  onPickFor,
  onResolve,
  onBack,
  onOpenSettings,
  onGoToSwaps,
  role = 'solo',
  currentMemberId = null,
}: {
  team: TeamMember[];
  wishlists: WishlistMap;
  schedule: Schedule;
  settings: Settings;
  onPickFor: (memberId: string) => void;
  onResolve: () => void;
  onBack: () => void;
  onOpenSettings: () => void;
  onGoToSwaps: () => void;
  role?: string;
  currentMemberId?: string | null;
}) {
  const isMember = role === 'member';
  const visibleTeam = isMember
    ? team.filter((m) => m.id === currentMemberId)
    : team;

  const getProgress = (member: TeamMember) => {
    const target = getHoursOffTarget(member, settings);
    const picks = wishlists[member.id] || [];
    const totalPicks = picks.length;
    let daysComplete = 0;
    DAYS.forEach(day => {
      const count = picks.filter(p => p.startsWith(day + '|')).length;
      if (count === target) daysComplete++;
    });
    return { totalPicks, daysComplete, target, targetTotal: target * DAYS.length };
  };

  const shifts = getShiftsPerDay(settings);
  const allWishlistsExact = team.length > 0 && team.every(m => getProgress(m).daysComplete === 3);
  const scheduleFilled = isTeamScheduleComplete(team, schedule, settings);

  return (
    <PageShell
      title={isMember ? 'My Wishlist' : 'Team Wishlists'}
      subtitle={
        isMember
          ? 'Request your preferred time off. Your picks sync to the facilitator in real time.'
          : 'Request preferred time off. Resolve fills a tentative schedule. When hours are filled, use Schedule Swaps.'
      }
      actions={
        isMember ? null : (
          <>
            <button type="button" onClick={onBack} className={ui.btnGhost}>&larr; Setup</button>
            <button type="button" onClick={onOpenSettings} className={ui.btnSecondary}>Settings</button>
          </>
        )
      }
    >
      <InfoBanner>
        <strong>{shifts} shifts/day</strong>
        {' '}· {formatDecimalHour(settings.dayStartHour)} – {formatDecimalHour(settings.dayEndHour)}
        {' '}· {settings.shiftLengthHours}h each
        {!isMember && (
          <>
            {' '}· conflict: <span className="capitalize">{(settings.conflictStrategy || '').replace(/_/g, ' ')}</span>
          </>
        )}
      </InfoBanner>

      {scheduleFilled && !isMember && (
        <InfoBanner tone="blue">
          <strong>Working hours are filled.</strong> Further changes should go through Schedule → Swaps (or Manual Edit).
          <div className="mt-3">
            <button type="button" onClick={onGoToSwaps} className={ui.btnPrimary}>
              Go to Schedule Swaps
            </button>
          </div>
        </InfoBanner>
      )}

      <PageCard className="mb-5">
        <div className="space-y-3">
          {visibleTeam.length === 0 ? (
            <p className="text-slate-400 italic">
              {isMember ? 'Your profile is not loaded yet.' : 'No team members yet — go to Setup first.'}
            </p>
          ) : visibleTeam.map(member => {
            const { totalPicks, daysComplete, target, targetTotal } = getProgress(member);
            const hoursOn = getHoursOnRequired(member, settings);
            const canEdit = !isMember || member.id === currentMemberId;
            return (
              <div key={member.id} className="flex items-center justify-between border border-slate-200 dark:border-slate-700 p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 gap-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{member.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                    {member.role} · {hoursOn}h on / exactly {target}h off per day
                  </p>
                  <p className="text-sm mt-1">
                    {totalPicks > 0 ? (
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        {totalPicks}/{targetTotal} off requested · {daysComplete}/3 days at exact target
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">No picks yet</span>
                    )}
                  </p>
                </div>
                {canEdit && (
                  scheduleFilled && !isMember ? (
                    <button type="button" onClick={onGoToSwaps} className={ui.btnSecondary}>
                      Request Swap
                    </button>
                  ) : (
                    <button type="button" onClick={() => onPickFor(member.id)} className={ui.btnSecondary}>
                      {totalPicks > 0 ? 'Edit Picks' : 'Start Picks'}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </PageCard>

      {!isMember && !scheduleFilled && (
        <button type="button" onClick={onResolve} className={`w-full py-4 text-lg ${ui.btnPrimary.replace('py-2.5', 'py-4')}`}>
          {allWishlistsExact ? 'Resolve Schedule & Conflicts' : 'Resolve Tentative Schedule'}
        </button>
      )}

      {!isMember && scheduleFilled && (
        <button type="button" onClick={onGoToSwaps} className={`w-full py-4 text-lg ${ui.btnSuccess.replace('py-2.5', 'py-4')}`}>
          Open Schedule Swaps
        </button>
      )}
    </PageShell>
  );
}
