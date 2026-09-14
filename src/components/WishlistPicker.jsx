import { useMemo, useRef, useState } from 'react';
import { DAYS, getArtistsForSlot, formatTime } from '../data/festivalData';
import { getHoursOffTarget, buildTimeSlots } from '../data/settings';
import { DayJumpBar } from './AppNav';
import { ui } from '../ui';

export default function WishlistPicker({ team, memberId, wishlists, setWishlists, onSave, settings, readOnly = false }) {
  const [graphicDay, setGraphicDay] = useState('friday');
  const [showOfficialSchedule, setShowOfficialSchedule] = useState(false);
  const dayRefs = useRef({});

  const member = team.find(m => m.id === memberId);
  const timeSlots = useMemo(() => buildTimeSlots(settings), [settings]);
  const maxOff = getHoursOffTarget(member, settings);

  const memberPicks = wishlists[memberId] || [];
  const getDayPicks = (day) => memberPicks.filter(p => p.startsWith(day + '|')).map(p => p.split('|')[1]);

  const getPicksLeft = (day) => Math.max(0, maxOff - getDayPicks(day).length);
  const isDayComplete = (day) => getDayPicks(day).length >= maxOff && maxOff > 0;

  const scrollToDay = (day) => {
    setGraphicDay(day);
    dayRefs.current[day]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleSlot = (day, slotId) => {
    if (readOnly) return;
    const pickStr = `${day}|${slotId}`;
    setWishlists((prev) => {
      const current = prev[memberId] || [];
      if (current.includes(pickStr)) {
        // Unselect always unlocks the day
        return { ...prev, [memberId]: current.filter(p => p !== pickStr) };
      }

      const dayPicks = current.filter(p => p.startsWith(day + '|'));
      if (dayPicks.length >= maxOff) {
        // Don't add more — day is at exact target
        return prev;
      }

      return { ...prev, [memberId]: [...current, pickStr] };
    });
  };

  const clearDayPicks = (day) => {
    if (readOnly) return;
    if (confirm(`Clear all of ${member.name}'s picks for ${day}?`)) {
      setWishlists((prev) => {
        const current = prev[memberId] || [];
        return { ...prev, [memberId]: current.filter(p => !p.startsWith(day + '|')) };
      });
    }
  };

  const clearAllPicks = () => {
    if (readOnly) return;
    if (confirm(`Clear all of ${member.name}'s picks for the whole weekend?`)) {
      setWishlists((prev) => ({ ...prev, [memberId]: [] }));
    }
  };

  const getOthersWantingSlot = (day, slotId) => {
    const pickStr = `${day}|${slotId}`;
    const others = [];
    Object.entries(wishlists).forEach(([otherId, theirPicks]) => {
      if (otherId !== memberId && Array.isArray(theirPicks) && theirPicks.includes(pickStr)) {
        const otherMember = team.find(m => m.id === otherId);
        if (otherMember) {
          const priority = theirPicks.indexOf(pickStr) + 1;
          others.push(`${otherMember.name} (#${priority})`);
        }
      }
    });
    return others;
  };

  const totalPicks = memberPicks.length;
  const nextPriority = totalPicks + 1;
  const allDaysComplete = DAYS.every(isDayComplete);

  if (!member) {
    return (
      <div className={ui.page}>
        <p className="text-slate-500">Member not found.</p>
        <button type="button" onClick={onSave} className={ui.btnPrimary}>Back</button>
      </div>
    );
  }

  return (
    <div className={ui.page}>
      <div className={`${ui.stickyBar} ${ui.stickyBlue}`}>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{member.name}'s Preferred Time Off</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-1">
                Next priority: #{nextPriority} · Target: <strong>exactly {maxOff} hours off</strong> / day
                ({timeSlots.length - maxOff}h on)
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {DAYS.map(day => {
                  const picks = getDayPicks(day).length;
                  const complete = isDayComplete(day);
                  return (
                    <span
                      key={day}
                      className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${
                        complete
                          ? 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                          : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                      }`}
                    >
                      {day}: {picks}/{maxOff} off{complete ? ' ✓' : ''}
                    </span>
                  );
                })}
              </div>
              {allDaysComplete && (
                <p className="text-sm text-green-700 dark:text-green-400 font-semibold mt-2">
                  All days complete — tap a green selected block to edit again.
                </p>
              )}
            </div>

            <div className="flex gap-2 w-full md:w-auto flex-wrap">
              {!readOnly && (
                <button type="button" onClick={clearAllPicks} className="px-3 py-2 rounded-lg font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-sm">
                  Clear All
                </button>
              )}
              <button type="button" onClick={() => setShowOfficialSchedule(!showOfficialSchedule)} className={ui.btnPurple}>
                {showOfficialSchedule ? 'Hide Graphic' : 'Show Graphic'}
              </button>
              <button type="button" onClick={onSave} className={ui.btnPrimary}>
                Save & Exit
              </button>
            </div>
          </div>

          <DayJumpBar
            days={DAYS}
            onJump={scrollToDay}
            lockedDays={{}}
          />
        </div>
      </div>

      {showOfficialSchedule && (
        <div className="w-full overflow-hidden bg-black rounded-xl mb-6 shadow-inner mt-4">
          <div className="flex gap-2 p-2 bg-slate-900">
            {DAYS.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => setGraphicDay(day)}
                className={`flex-1 py-1 rounded text-xs font-bold capitalize ${
                  graphicDay === day ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <img
            src="/schedule.png"
            alt="Official Schedule"
            className="max-w-none w-[300%] transition-transform duration-500 origin-top-left"
            style={{
              transform: graphicDay === 'friday' ? 'translateX(0%)' : graphicDay === 'saturday' ? 'translateX(-33.33%)' : 'translateX(-66.66%)'
            }}
          />
        </div>
      )}

      <div className="mt-4 space-y-8">
        {DAYS.map(day => {
          const currentDayPicks = getDayPicks(day);
          const dayComplete = isDayComplete(day);
          const picksLeft = getPicksLeft(day);

          return (
            <section
              key={day}
              id={`wishlist-${day}`}
              ref={(el) => { dayRefs.current[day] = el; }}
              className="scroll-under-stickies"
            >
              <div className={`${ui.dayBanner} ${dayComplete ? ui.dayBannerGray : ui.dayBannerBlue}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold capitalize">
                      {day}{dayComplete ? ` — Complete (${maxOff}/${maxOff} off)` : ''}
                    </h3>
                    <p className="text-white/80 text-sm mt-1">
                      {currentDayPicks.length}/{maxOff} hours off
                      {dayComplete
                        ? ' — tap a selected (green) block to unselect and edit'
                        : ` — ${picksLeft} remaining`}
                    </p>
                  </div>
                  {!readOnly && currentDayPicks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearDayPicks(day)}
                      className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-semibold text-sm transition"
                    >
                      Clear Day
                    </button>
                  )}
                </div>
              </div>

              <div className={ui.dayBody}>
                <div className="flex flex-col gap-4">
                  {timeSlots.map((slot) => {
                    const pickStr = `${day}|${slot.id}`;
                    const rankIndex = memberPicks.indexOf(pickStr);
                    const isSelected = rankIndex !== -1;
                    const rankNumber = rankIndex + 1;
                    const others = getOthersWantingSlot(day, slot.id);
                    const artistsPlaying = getArtistsForSlot(day, slot.start, slot.end);
                    // No longer gray out unselected blocks when day is complete
                    const isGrayed = false;

                    const totalOff = others.length + (isSelected ? 1 : 0);
                    const workingCount = team.length - totalOff;
                    const minCoverage = settings.minCoverage || 3;
                    const stillNeeded = Math.max(0, minCoverage - workingCount);

                    return (
                      <div key={slot.id} className={ui.slotRow}>
                        <div className="md:w-1/2">
                          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{slot.label}</h4>
                          <div className="mt-2 space-y-2">
                            {artistsPlaying.length > 0 ? (
                              artistsPlaying.map((artist, idx) => (
                                <div key={idx} className={ui.artistChip}>
                                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                                  <div>
                                    <p className="font-semibold text-purple-900 dark:text-purple-200 leading-tight">
                                      {artist.name}
                                      <span className="text-xs font-normal text-purple-600 dark:text-purple-400 block sm:inline sm:ml-1">
                                        ({formatTime(artist.start)} - {formatTime(artist.end)})
                                      </span>
                                    </p>
                                    <p className="text-xs text-purple-700 dark:text-purple-400">{artist.stage}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-400 italic">No major sets listed</p>
                            )}
                          </div>
                        </div>

                        <div className="md:w-1/2 flex flex-col justify-center">
                          <button
                            type="button"
                            disabled={isGrayed || readOnly}
                            onClick={() => handleToggleSlot(day, slot.id)}
                            className={`border-2 rounded-lg p-4 h-full min-h-[6.5rem] flex flex-col justify-center transition relative overflow-hidden text-left w-full ${
                              isSelected
                                ? 'bg-green-100 dark:bg-green-900/40 border-green-500 dark:border-green-500 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/60'
                                : isGrayed
                                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-45 cursor-not-allowed'
                                  : 'bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-600 cursor-pointer'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-0 left-0 bg-green-700 text-white font-bold px-3 py-1 rounded-br-lg text-sm pointer-events-none">
                                Choice #{rankNumber}
                              </div>
                            )}

                            <div className={`text-center mt-4 mb-2 font-semibold ${
                              isSelected
                                ? 'text-green-800 dark:text-green-300'
                                : isGrayed
                                  ? 'text-slate-400'
                                  : 'text-blue-600 dark:text-blue-400'
                            }`}>
                              {isSelected
                                ? 'SELECTED — tap to unselect & edit'
                                : 'Click to Request Time Off'}
                            </div>

                            <div className="text-xs text-center text-slate-500 dark:text-slate-400 mb-1">
                              Priority #{isSelected ? rankNumber : memberPicks.length + 1}
                              <span className="mx-2 opacity-50">|</span>
                              <span className="font-semibold">{totalOff} off</span>
                              <span className="mx-1 opacity-50">·</span>
                              {stillNeeded > 0 ? (
                                <span className="text-red-600 dark:text-red-400 font-bold">{stillNeeded} still needed</span>
                              ) : (
                                <span className="text-green-600 dark:text-green-400 font-semibold">Coverage met</span>
                              )}
                            </div>

                            {others.length > 0 && (
                              <div className="text-sm text-center text-orange-700 dark:text-orange-300 mt-2 bg-orange-50 dark:bg-orange-950/40 p-2 rounded border border-orange-100 dark:border-orange-900/50">
                                <span className="font-bold">{others.length} other request{others.length !== 1 ? 's' : ''}:</span> {others.join(', ')}
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
