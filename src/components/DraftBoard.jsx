import { useState, useEffect, useRef, useMemo } from 'react';
import { DAYS, getArtistsForSlot, formatTime } from '../data/festivalData';
import {
  getHoursOffTarget,
  getHoursOnRequired,
  getMinCoverage,
  buildTimeSlots,
  emptyScheduleSkeleton,
  isTeamScheduleComplete,
} from '../data/settings';
import { DayJumpBar } from './AppNav';
import { ui } from '../ui';

export default function DraftBoard({ team, wishlists, schedule, setSchedule, onComplete, onBack, settings, onOpenSettings, onGoToSwaps }) {
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [graphicDay, setGraphicDay] = useState('friday');
  const [showOfficialSchedule, setShowOfficialSchedule] = useState(false);

  // { mode: 'off' | 'work', day, slotId }
  const [pendingPick, setPendingPick] = useState(null);
  const [swapFlow, setSwapFlow] = useState(null);

  const dayRefs = useRef({});
  const currentPicker = team[currentTurnIndex];
  const minCoverage = getMinCoverage(settings);
  const timeSlots = useMemo(() => buildTimeSlots(settings), [settings]);

  useEffect(() => {
    if (!schedule.friday) {
      setSchedule(emptyScheduleSkeleton(settings, DAYS));
      return;
    }
    // Ensure all current slots exist (settings may have changed)
    const next = { ...schedule };
    let changed = false;
    DAYS.forEach(day => {
      next[day] = { ...(next[day] || {}) };
      timeSlots.forEach(slot => {
        if (!next[day][slot.id]) {
          next[day][slot.id] = [];
          changed = true;
        }
      });
    });
    if (changed) setSchedule(next);
  }, [timeSlots]);

  const getHoursOff = (memberId, day) => {
    if (!schedule[day]) return 0;
    return timeSlots.filter(slot => (schedule[day][slot.id] || []).includes(memberId)).length;
  };

  const getHoursWorking = (memberId, day) => timeSlots.length - getHoursOff(memberId, day);

  const getTargetOff = (member) => getHoursOffTarget(member, settings);

  const getDayStatus = (member, day) => {
    const actual = getHoursOff(member.id, day);
    const target = getTargetOff(member);
    return {
      actual,
      target,
      delta: actual - target, // negative = need more off; positive = over (need more work); 0 = exact
      complete: actual === target,
      needsOff: actual < target,
      needsWork: actual > target,
    };
  };

  const getPeopleOffMembers = (day, slotId) => {
    const ids = schedule[day]?.[slotId] || [];
    return team.filter(m => ids.includes(m.id));
  };

  const getSlotLabel = (slotId) => timeSlots.find(s => s.id === slotId)?.label || slotId;

  const scrollToDay = (day) => {
    setGraphicDay(day);
    dayRefs.current[day]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const advanceTurn = () => {
    setPendingPick(null);
    if (currentTurnIndex < team.length - 1) {
      setCurrentTurnIndex(currentTurnIndex + 1);
    } else {
      setCurrentTurnIndex(0);
      setRound(round + 1);
    }
  };

  const handleSelectSlot = (day, slotId) => {
    const status = getDayStatus(currentPicker, day);
    const peopleOff = schedule[day][slotId] || [];
    const isPickerOff = peopleOff.includes(currentPicker.id);

    // Day already exact — only allow swap, not draft pick
    if (status.complete) {
      alert(`You already have exactly ${status.target} hours off on ${day}. Use Request Swap to change a block.`);
      return;
    }

    if (status.needsOff) {
      // Prefer time OFF: only pick slots where currently WORKING
      if (isPickerOff) {
        alert('You already have this slot OFF. Pick a WORKING slot to take off, or choose another day.');
        return;
      }
      const peopleWorking = team.length - peopleOff.length;
      if (peopleWorking <= minCoverage) {
        alert(`Cannot take off — would drop below ${minCoverage} people working.`);
        return;
      }
      setPendingPick({ mode: 'off', day, slotId });
      return;
    }

    if (status.needsWork) {
      // Over target: must pick WORK (convert OFF → WORK)
      if (!isPickerOff) {
        alert('You are already WORKING this slot. Pick a slot where you are OFF to convert it to work.');
        return;
      }
      setPendingPick({ mode: 'work', day, slotId });
    }
  };

  const confirmPick = () => {
    if (!pendingPick) return;
    const { mode, day, slotId } = pendingPick;
    const peopleOff = schedule[day][slotId] || [];

    if (mode === 'off') {
      setSchedule({
        ...schedule,
        [day]: {
          ...schedule[day],
          [slotId]: [...peopleOff, currentPicker.id]
        }
      });
    } else {
      setSchedule({
        ...schedule,
        [day]: {
          ...schedule[day],
          [slotId]: peopleOff.filter(id => id !== currentPicker.id)
        }
      });
    }

    setPendingPick(null);
    advanceTurn();
  };

  const openSwapPicker = (day, slotId) => {
    const peopleOff = getPeopleOffMembers(day, slotId).filter(m => m.id !== currentPicker.id);
    if (peopleOff.length === 0) {
      alert('No one else has this block off to swap with.');
      return;
    }
    setSwapFlow({ step: 'pick-partner', day, slotId });
  };

  const selectSwapPartner = (partnerId) => {
    setSwapFlow(prev => ({ ...prev, step: 'requester-confirm', partnerId }));
  };

  const confirmRequesterSwap = () => {
    setSwapFlow(prev => ({ ...prev, step: 'swapee-confirm' }));
  };

  const confirmSwapeeSwap = () => {
    const { day, slotId, partnerId } = swapFlow;
    const peopleOff = [...(schedule[day][slotId] || [])];
    const pickerIsOff = peopleOff.includes(currentPicker.id);
    const partnerIsOff = peopleOff.includes(partnerId);

    let nextOff = peopleOff.filter(id => id !== currentPicker.id && id !== partnerId);

    if (pickerIsOff && !partnerIsOff) {
      nextOff.push(partnerId);
    } else if (!pickerIsOff && partnerIsOff) {
      nextOff.push(currentPicker.id);
    } else if (partnerIsOff) {
      nextOff = nextOff.filter(id => id !== partnerId);
      if (!pickerIsOff) nextOff.push(currentPicker.id);
    }

    const hoursOffAfter = (memberId) =>
      timeSlots.filter(slot => {
        const offs = slot.id === slotId ? nextOff : (schedule[day][slot.id] || []);
        return offs.includes(memberId);
      }).length;

    const wouldExceed = (memberId) => {
      const member = team.find(m => m.id === memberId);
      return hoursOffAfter(memberId) > getTargetOff(member);
    };

    if (wouldExceed(currentPicker.id) || wouldExceed(partnerId)) {
      const ok = confirm(
        'This swap would put someone over their exact hours-off target. Continue anyway? (You can fix it on the next draft turns.)'
      );
      if (!ok) {
        setSwapFlow(null);
        return;
      }
    }

    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        [slotId]: nextOff
      }
    });
    setSwapFlow(null);
  };

  if (!currentPicker || !schedule.friday) return null;

  const targetOff = getTargetOff(currentPicker);
  const hoursOn = getHoursOnRequired(currentPicker, settings);
  const partner = swapFlow?.partnerId ? team.find(m => m.id === swapFlow.partnerId) : null;

  // Prefer days that need off first for messaging
  const dayStatuses = Object.fromEntries(DAYS.map(d => [d, getDayStatus(currentPicker, d)]));
  const needsAnyOff = DAYS.some(d => dayStatuses[d].needsOff);
  const needsAnyWork = DAYS.some(d => dayStatuses[d].needsWork);
  const allExact = DAYS.every(d => dayStatuses[d].complete);
  const teamScheduleFilled = isTeamScheduleComplete(team, schedule, settings);

  return (
    <div className={ui.page}>
      <div className={`${ui.stickyBar} ${ui.stickyOrange}`}>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <p className="text-sm text-slate-500 font-medium">Round {round} · Bidirectional Draft</p>
              <h2 className="text-xl font-bold text-slate-800">
                <span className="text-blue-600">{currentPicker.name}'s</span> Turn
              </h2>
              <p className="text-sm text-slate-600 capitalize mt-1">
                {currentPicker.role} · target {hoursOn}h on / <strong>exactly {targetOff}h off</strong> per day
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              {onOpenSettings && (
                <button type="button" onClick={onOpenSettings} className={ui.btnSecondary}>
                  Settings
                </button>
              )}
              <button type="button" onClick={() => setShowOfficialSchedule(!showOfficialSchedule)} className={ui.btnPurple}>
                {showOfficialSchedule ? 'Hide Graphic' : 'Show Graphic'}
              </button>
              <button type="button" onClick={advanceTurn} className={ui.btnSecondary}>
                Skip Turn
              </button>
            </div>
          </div>

          <div className={`${ui.infoBox} ${ui.infoOrange}`}>
            <p className="font-bold mb-1">This round — pick ONE slot (then confirm):</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {needsAnyOff && (
                <li><strong>Prefer time OFF:</strong> under target — pick a WORKING slot to take OFF</li>
              )}
              {needsAnyWork && (
                <li><strong>Need WORK:</strong> over target — pick an OFF slot to convert to WORKING</li>
              )}
              {allExact && (
                <li>Exact targets on all days — skip or use Request Swap only</li>
              )}
              <li>Never more than {targetOff} hours off per day. Min {minCoverage} people working.</li>
            </ul>
          </div>

          <div className="flex gap-2 overflow-x-auto py-1">
            {team.map((member, index) => (
              <div
                key={member.id}
                className={`${ui.pill} ${index === currentTurnIndex ? ui.pillActive : ui.pillIdle}`}
              >
                {index + 1}. {member.name}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => {
              const s = dayStatuses[day];
              return (
                <span
                  key={day}
                  className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${
                    s.complete
                      ? 'bg-green-100 text-green-800'
                      : s.needsOff
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {day}: {s.actual}/{s.target} off
                  {s.complete ? ' ✓' : s.needsOff ? ` need ${s.target - s.actual} off` : ` over by ${s.delta}`}
                </span>
              );
            })}
          </div>

          <DayJumpBar
            days={DAYS}
            onJump={scrollToDay}
            lockedDays={Object.fromEntries(DAYS.map(d => [d, dayStatuses[d].complete]))}
            accent="orange"
          />
        </div>
      </div>

      <div className="mb-4 mt-4">
        <button type="button" onClick={onBack} className={ui.btnGhost}>
          &larr; Back to Auto-Resolve
        </button>
      </div>

      {showOfficialSchedule && (
        <div className="w-full overflow-hidden bg-black rounded-xl mb-6 shadow-inner mx-4">
          <div className="flex gap-2 p-2 bg-gray-900">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => setGraphicDay(day)}
                className={`flex-1 py-1 rounded text-xs font-bold capitalize ${
                  graphicDay === day ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
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

      <div className="px-4 space-y-8">
        {DAYS.map(day => {
          const status = dayStatuses[day];

          return (
            <section
              key={day}
              id={`draft-${day}`}
              ref={(el) => { dayRefs.current[day] = el; }}
              className="scroll-under-stickies"
            >
              <div
                className={`rounded-t-xl px-6 py-4 shadow-md text-white ${
                  status.complete ? 'bg-gray-500' : status.needsOff ? 'bg-blue-600' : 'bg-orange-600'
                }`}
              >
                <h3 className="text-2xl font-bold capitalize">
                  {day}
                  {status.complete
                    ? ` — Exact (${status.target}h off)`
                    : status.needsOff
                      ? ` — Need ${status.target - status.actual} more OFF`
                      : ` — Over by ${status.delta} (pick WORK)`}
                </h3>
                <p className="text-white/80 text-sm mt-1">
                  {getHoursWorking(currentPicker.id, day)}h working &bull; {status.actual}/{status.target} hours off
                </p>
              </div>

              <div className={`rounded-b-xl shadow-md p-6 ${status.complete ? 'bg-gray-100' : 'bg-white'}`}>
                <div className={`flex flex-col gap-4 ${status.complete ? 'opacity-70' : ''}`}>
                  {timeSlots.map((slot) => {
                    const peopleOffIds = schedule[day][slot.id] || [];
                    const peopleOff = team.filter(m => peopleOffIds.includes(m.id));
                    const isPickerOff = peopleOffIds.includes(currentPicker.id);
                    const peopleWorking = team.length - peopleOffIds.length;
                    const artistsPlaying = getArtistsForSlot(day, slot.start, slot.end);

                    let actionHint = '';
                    let canPick = false;
                    if (!status.complete) {
                      if (status.needsOff && !isPickerOff && peopleWorking > minCoverage) {
                        canPick = true;
                        actionHint = 'Tap to take OFF';
                      } else if (status.needsWork && isPickerOff) {
                        canPick = true;
                        actionHint = 'Tap to WORK (give up this off)';
                      } else if (status.needsOff && isPickerOff) {
                        actionHint = 'Already OFF';
                      } else if (status.needsOff && peopleWorking <= minCoverage) {
                        actionHint = 'Coverage locked';
                      } else if (status.needsWork && !isPickerOff) {
                        actionHint = 'Already WORKING';
                      }
                    }

                    return (
                      <div key={slot.id} className="flex flex-col md:flex-row gap-4 border-b pb-4 last:border-0">
                        <div className="md:w-1/2">
                          <h4 className="text-lg font-bold text-gray-800">{slot.label}</h4>
                          <div className="mt-2 space-y-2">
                            {artistsPlaying.length > 0 ? (
                              artistsPlaying.map((artist, idx) => (
                                <div key={idx} className="flex items-start gap-2 bg-purple-50 p-2 rounded">
                                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5"></div>
                                  <div>
                                    <p className="font-semibold text-purple-900 leading-tight">
                                      {artist.name}
                                      <span className="text-xs font-normal text-purple-600 block sm:inline sm:ml-1">
                                        ({formatTime(artist.start)} - {formatTime(artist.end)})
                                      </span>
                                    </p>
                                    <p className="text-xs text-purple-700">{artist.stage}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-400 italic">No major sets listed</p>
                            )}
                          </div>
                        </div>

                        <div className="md:w-1/2 flex flex-col justify-center gap-2">
                          <div
                            onClick={() => canPick && handleSelectSlot(day, slot.id)}
                            className={`border-2 rounded-lg p-4 transition ${
                              canPick
                                ? status.needsOff
                                  ? 'bg-blue-50 border-blue-400 cursor-pointer hover:bg-blue-100'
                                  : 'bg-green-50 border-green-400 cursor-pointer hover:bg-green-100'
                                : isPickerOff
                                  ? 'bg-gray-100 border-gray-300'
                                  : 'bg-green-50/50 border-green-200'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-gray-700">
                                {isPickerOff ? 'You are OFF' : 'You are WORKING'}
                                {actionHint ? ` — ${actionHint}` : ''}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full text-white ${isPickerOff ? 'bg-gray-500' : 'bg-green-600'}`}>
                                {isPickerOff ? 'OFF' : 'WORKING'}
                              </span>
                            </div>
                            <div className="text-sm flex justify-between items-center mb-2">
                              <span className="text-gray-500">{peopleOff.length} people off</span>
                              <span className={peopleWorking < minCoverage ? 'text-red-600 font-bold' : 'text-blue-600 font-medium'}>
                                {peopleWorking} working
                              </span>
                            </div>
                            {peopleOff.length > 0 ? (
                              <div className="text-xs text-orange-700 bg-orange-50 p-2 rounded">
                                <span className="font-semibold">Who has this block off: </span>
                                {peopleOff.map(m => {
                                  const picks = wishlists?.[m.id] || [];
                                  const pickStr = `${day}|${slot.id}`;
                                  const priority = picks.indexOf(pickStr) + 1;
                                  return priority > 0 ? `${m.name} (#${priority})` : m.name;
                                }).join(', ')}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 italic">Nobody off this block</div>
                            )}
                          </div>

                          {peopleOff.filter(m => m.id !== currentPicker.id).length > 0 && (
                            <button
                              onClick={() => openSwapPicker(day, slot.id)}
                              className="text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-2 rounded font-semibold transition"
                            >
                              Request Swap
                            </button>
                          )}
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

      <div className="mt-6 mb-10 space-y-3">
        {teamScheduleFilled && (
          <div className={`${ui.infoBox} ${ui.infoBlue}`}>
            <strong>All working hours are filled.</strong> Continue on Schedule with Request Shift Swap (or Manual Edit).
          </div>
        )}
        <button
          type="button"
          onClick={teamScheduleFilled && onGoToSwaps ? onGoToSwaps : onComplete}
          className={`w-full py-4 text-lg ${teamScheduleFilled ? ui.btnSuccess.replace('py-2.5', 'py-4') : ui.btnPrimary.replace('py-2.5', 'py-4')}`}
        >
          {teamScheduleFilled ? 'Go to Schedule Swaps' : 'Finish Draft & View Schedule'}
        </button>
      </div>

      {pendingPick && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Confirm {pendingPick.mode === 'off' ? 'Time Off' : 'Work'} Pick?
            </h3>
            <p className="text-gray-600 mb-4">
              <strong>{currentPicker.name}</strong> will{' '}
              <strong>{pendingPick.mode === 'off' ? 'take OFF' : 'WORK'}</strong>{' '}
              <span className="capitalize">{pendingPick.day}</span> — {getSlotLabel(pendingPick.slotId)}.
              Then the turn passes to the next worker.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingPick(null)}
                className="flex-1 py-3 rounded-md font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Go Back
              </button>
              <button
                onClick={confirmPick}
                className={`flex-1 py-3 rounded-md font-bold text-white transition ${
                  pendingPick.mode === 'off' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                Confirm & Pass Turn
              </button>
            </div>
          </div>
        </div>
      )}

      {swapFlow?.step === 'pick-partner' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Request Swap</h3>
            <p className="text-gray-600 mb-4">
              Who has <strong className="capitalize">{swapFlow.day}</strong> — {getSlotLabel(swapFlow.slotId)} off?
            </p>
            <div className="space-y-2 mb-4">
              {getPeopleOffMembers(swapFlow.day, swapFlow.slotId)
                .filter(m => m.id !== currentPicker.id)
                .map(m => {
                  const picks = wishlists?.[m.id] || [];
                  const pickStr = `${swapFlow.day}|${swapFlow.slotId}`;
                  const priority = picks.indexOf(pickStr) + 1;
                  return (
                  <button
                    key={m.id}
                    onClick={() => selectSwapPartner(m.id)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 font-semibold transition"
                  >
                    {m.name} {priority > 0 ? <span className="text-indigo-600 font-bold ml-1">(Priority #{priority})</span> : ''}
                    <span className="block text-xs text-gray-500 font-normal capitalize">{m.role}</span>
                  </button>
                  );
                })}
            </div>
            <button
              onClick={() => setSwapFlow(null)}
              className="w-full py-3 rounded-md font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {swapFlow?.step === 'requester-confirm' && partner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <p className="text-xs font-bold uppercase text-indigo-600 mb-1">Confirmation 1 of 2 — Requester</p>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {currentPicker.name}, confirm this swap?
            </h3>
            <div className="bg-indigo-50 rounded-lg p-4 mb-4 text-sm text-gray-700 space-y-2">
              <p>
                <strong>Block:</strong>{' '}
                <span className="capitalize">{swapFlow.day}</span> — {getSlotLabel(swapFlow.slotId)}
              </p>
              <p>
                <strong>You ({currentPicker.name}):</strong>{' '}
                {(schedule[swapFlow.day][swapFlow.slotId] || []).includes(currentPicker.id)
                  ? 'Currently OFF → will WORK'
                  : 'Currently WORKING → will go OFF'}
              </p>
              <p>
                <strong>{partner.name}:</strong>{' '}
                {(schedule[swapFlow.day][swapFlow.slotId] || []).includes(partner.id)
                  ? 'Currently OFF → will WORK'
                  : 'Currently WORKING → will go OFF'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSwapFlow(null)}
                className="flex-1 py-3 rounded-md font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Go Back
              </button>
              <button
                onClick={confirmRequesterSwap}
                className="flex-1 py-3 rounded-md font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                I Confirm — Ask {partner.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {swapFlow?.step === 'swapee-confirm' && partner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <p className="text-xs font-bold uppercase text-green-600 mb-1">Confirmation 2 of 2 — Swapee</p>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {partner.name}, do you accept this swap?
            </h3>
            <div className="bg-green-50 rounded-lg p-4 mb-4 text-sm text-gray-700 space-y-2">
              <p>
                <strong>{currentPicker.name}</strong> wants to swap{' '}
                <span className="capitalize">{swapFlow.day}</span> — {getSlotLabel(swapFlow.slotId)}
              </p>
              <p>
                <strong>You ({partner.name}):</strong>{' '}
                {(schedule[swapFlow.day][swapFlow.slotId] || []).includes(partner.id)
                  ? 'You are OFF → you will WORK this block'
                  : 'You are WORKING → you will go OFF'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSwapFlow(null)}
                className="flex-1 py-3 rounded-md font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Decline
              </button>
              <button
                onClick={confirmSwapeeSwap}
                className="flex-1 py-3 rounded-md font-bold bg-green-600 text-white hover:bg-green-700 transition"
              >
                Accept Swap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
