import { useEffect, useState } from 'react';
import type { Schedule, Settings, TeamMember, Updater, WishlistMap } from '../types';
import { DAYS } from '../data/festivalData';
import {
  getHoursOffTarget,
  getMinCoverage,
  getConflictStrategy,
  buildTimeSlots,
  emptyScheduleSkeleton,
  mergeSettings,
} from '../data/settings';
import { PageShell, PageCard } from './AppNav';
import { ui } from '../ui';

function tryGrantOff(
  newSchedule: Schedule,
  team: TeamMember[],
  day: string,
  slotId: string,
  memberId: string,
  minCoverage: number,
) {
  if (newSchedule[day][slotId].includes(memberId)) return false;
  const peopleOff = newSchedule[day][slotId];
  const peopleWorking = team.length - peopleOff.length;
  if (peopleWorking <= minCoverage) return false;
  newSchedule[day][slotId].push(memberId);
  return true;
}

type ResolveResults = {
  granted: number;
  conflicts: number;
  capped: number;
  nudged: number;
  strategy: string;
  balance: {
    id: string;
    name: string;
    byDay: Record<string, { target: number; actual: number; delta: number }>;
  }[];
};

export default function ConflictResolver({
  team,
  wishlists,
  setSchedule,
  onComplete,
  onBack,
  settings,
}: {
  team: TeamMember[];
  wishlists: WishlistMap;
  schedule: Schedule;
  setSchedule: (updater: Updater<Schedule>) => void;
  onComplete: () => void;
  onBack: () => void;
  settings: Settings;
}) {
  const [isResolving, setIsResolving] = useState(true);
  const [results, setResults] = useState<ResolveResults | null>(null);

  useEffect(() => {
    const s = mergeSettings(settings);
    const minCoverage = getMinCoverage(s);
    const strategy = getConflictStrategy(s);
    const timeSlots = buildTimeSlots(s);
    const nudge = s.conflictSlotNudge || 1;
    const newSchedule = emptyScheduleSkeleton(s, DAYS);

    const hoursOffCount: Record<string, Record<string, number>> = {};
    team.forEach(m => {
      hoursOffCount[m.id] = { friday: 0, saturday: 0, sunday: 0 };
    });

    let grantedCount = 0;
    let conflictCount = 0;
    let cappedCount = 0;
    let nudgedCount = 0;

    if (strategy !== 'manual_only') {
      const wishlistIndex: Record<string, number> = {};
      let maxTarget = 0;
      
      team.forEach(member => {
        wishlistIndex[member.id] = 0;
        const target = getHoursOffTarget(member, s) * DAYS.length;
        if (target > maxTarget) maxTarget = target;
      });

      for (let round = 0; round < maxTarget; round++) {
        team.forEach(member => {
          const picks = wishlists[member.id] || [];
          const maxOff = getHoursOffTarget(member, s);
          
          let grantedThisRound = false;
          
          while (!grantedThisRound && wishlistIndex[member.id] < picks.length) {
            const pickStr = picks[wishlistIndex[member.id]];
            wishlistIndex[member.id]++; // Advance to next pick
            
            const [day, preferredId] = pickStr.split('|') as [string, string];

            if (hoursOffCount[member.id][day] >= maxOff) {
              cappedCount++;
              continue; // Day is full, immediately try next pick
            }

            const preferredIndex = timeSlots.findIndex(slot => slot.id === preferredId);
            const tryIds = [];
            if (preferredIndex >= 0) {
              tryIds.push(preferredId);
              if (strategy === 'adjust_start_earlier') {
                for (let n = 1; n <= nudge; n++) {
                  const idx = preferredIndex - n;
                  if (idx >= 0) tryIds.push(timeSlots[idx].id);
                }
              } else if (strategy === 'adjust_start_later') {
                for (let n = 1; n <= nudge; n++) {
                  const idx = preferredIndex + n;
                  if (idx < timeSlots.length) tryIds.push(timeSlots[idx].id);
                }
              }
            } else if (preferredId) {
              tryIds.push(preferredId);
            }

            let granted = false;
            for (let i = 0; i < tryIds.length; i++) {
              const slotId = tryIds[i];
              if (!newSchedule[day][slotId]) continue;
              if (tryGrantOff(newSchedule, team, day, slotId, member.id, minCoverage)) {
                hoursOffCount[member.id][day]++;
                grantedCount++;
                if (i > 0) nudgedCount++;
                granted = true;
                break;
              }
            }
            
            if (granted) {
              grantedThisRound = true;
            } else {
              conflictCount++;
            }
          }
        });
      }
    } else {
      team.forEach(member => {
        conflictCount += (wishlists[member.id] || []).length;
      });
    }

    const balance = team.map(member => {
      const byDay: Record<string, { target: number; actual: number; delta: number }> = {};
      DAYS.forEach(day => {
        const target = getHoursOffTarget(member, s);
        const actual = hoursOffCount[member.id][day];
        byDay[day] = { target, actual, delta: actual - target };
      });
      return { id: member.id, name: member.name, byDay };
    });

    setSchedule(newSchedule);
    setResults({ granted: grantedCount, conflicts: conflictCount, capped: cappedCount, nudged: nudgedCount, strategy, balance });
    setIsResolving(false);
  }, []);

  if (isResolving) {
    return (
      <PageShell narrow title="Auto-resolving…">
        <PageCard><p className="text-center text-lg font-semibold text-slate-600 dark:text-slate-300 py-10">Working on your schedule…</p></PageCard>
      </PageShell>
    );
  }

  const resolved = results as ResolveResults;

  const strategyLabel = {
    prefer_off: 'Prefer time off first',
    prefer_work: 'Prefer coverage / work first',
    adjust_start_earlier: 'On conflict, try earlier shift',
    adjust_start_later: 'On conflict, try later shift',
    manual_only: 'Manual draft only',
  }[resolved.strategy] || resolved.strategy;

  const needsDraft =
    resolved.strategy === 'manual_only' ||
    resolved.conflicts > 0 ||
    resolved.balance.some(b => DAYS.some(day => b.byDay[day].delta !== 0));

  return (
    <PageShell
      narrow
      title="Auto-Resolve Complete"
      subtitle={`Strategy: ${strategyLabel}`}
    >
      <PageCard>
        <div className="flex justify-center gap-3 mb-6 flex-wrap">
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg min-w-[100px] text-center">
            <p className="text-3xl font-bold text-green-600">{resolved.granted}</p>
            <p className="text-slate-600 dark:text-slate-400 text-xs font-medium mt-1">Granted</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg min-w-[100px] text-center">
            <p className="text-3xl font-bold text-orange-600">{resolved.conflicts}</p>
            <p className="text-slate-600 dark:text-slate-400 text-xs font-medium mt-1">Conflicts</p>
          </div>
          {resolved.nudged > 0 && (
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg min-w-[100px] text-center">
              <p className="text-3xl font-bold text-purple-600">{resolved.nudged}</p>
              <p className="text-slate-600 dark:text-slate-400 text-xs font-medium mt-1">Nudged</p>
            </div>
          )}
        </div>

        <div className={`${ui.infoBox} ${ui.infoGray} text-left mb-6`}>
          <p className="font-bold text-slate-800 dark:text-slate-100 mb-2">Hours off vs exact target</p>
          {resolved.balance.map(b => (
            <div key={b.id} className="mb-2 last:mb-0 text-sm">
              <span className="font-semibold">{b.name}:</span>{' '}
              {DAYS.map(day => {
                const { actual, target, delta } = b.byDay[day];
                const color = delta === 0 ? 'text-green-700' : delta < 0 ? 'text-orange-700' : 'text-red-700';
                return (
                  <span key={day} className={`capitalize mr-2 ${color}`}>
                    {day} {actual}/{target}{delta === 0 ? ' ✓' : delta < 0 ? ` (−${-delta})` : ` (+${delta})`}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">
          {needsDraft
            ? 'Next: bidirectional draft to finish exact targets and swaps.'
            : 'Everyone is at their exact target. You can still open draft to swap.'}
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <button type="button" onClick={onBack} className={ui.btnSecondary}>Back to Wishlists</button>
          <button type="button" onClick={onComplete} className={ui.btnPrimary}>
            {needsDraft ? 'Proceed to Draft' : 'Open Draft'}
          </button>
        </div>
      </PageCard>
    </PageShell>
  );
}
