import { useState, useMemo, useEffect } from 'react';
import { DAYS, getArtistsForSlot, formatTime } from '../data/festivalData';
import {
  buildTimeSlots,
  emptyScheduleSkeleton,
  getHoursOffTarget,
  getMinCoverage,
  getMemberDayOffCount,
  isTeamScheduleComplete,
} from '../data/settings';
import { PageShell, PageCard, InfoBanner } from './AppNav';
import { ui } from '../ui';

export default function ScheduleView({
  team,
  wishlists,
  schedule,
  setSchedule,
  allHands,
  setAllHands,
  settings,
  onBack,
  initialMode = 'master', // 'master' | 'personal' | 'manual' | 'swaps'
  role = 'solo',
  currentMemberId = null,
  isPublished = false,
  onPublish = null,
}) {
  const readOnly = role === 'member';
  const initialViewMode = readOnly ? 'personal' : initialMode;
  const [selectedDay, setSelectedDay] = useState('friday');
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [selectedMember, setSelectedMember] = useState(
    readOnly ? currentMemberId : team[0]?.id || null
  );
  const [swapFlow, setSwapFlow] = useState(null);
  // { step, day, slotId, requesterId, partnerId }

  const timeSlots = useMemo(() => buildTimeSlots(settings), [settings]);
  const minCoverage = getMinCoverage(settings);
  const complete = isTeamScheduleComplete(team, schedule, settings);

  useEffect(() => {
    if (readOnly) {
      setViewMode('personal');
      if (currentMemberId) setSelectedMember(currentMemberId);
      return;
    }
    if (initialMode) setViewMode(initialMode);
  }, [initialMode, readOnly, currentMemberId]);

  // Ensure schedule has all slots for current settings
  useEffect(() => {
    if (!setSchedule) return;
    if (!schedule?.friday) {
      setSchedule(emptyScheduleSkeleton(settings, DAYS));
      return;
    }
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

  const handlePrint = () => window.print();

  const toggleAllHands = (slotId) => {
    const current = allHands[selectedDay] || [];
    setAllHands({
      ...allHands,
      [selectedDay]: current.includes(slotId)
        ? current.filter(id => id !== slotId)
        : [...current, slotId],
    });
  };

  const togglePersonOff = (day, slotId, memberId) => {
    if (!setSchedule) return;
    const isAllHands = (allHands[day] || []).includes(slotId);
    if (isAllHands) {
      alert('This block is All Hands. Turn off All Hands first to edit individuals.');
      return;
    }

    const peopleOff = schedule[day]?.[slotId] || [];
    const isOff = peopleOff.includes(memberId);

    if (isOff) {
      // Put them back to WORKING
      setSchedule({
        ...schedule,
        [day]: {
          ...schedule[day],
          [slotId]: peopleOff.filter(id => id !== memberId),
        },
      });
      return;
    }

    // Take OFF — warn if coverage would drop, but allow override (manual mode)
    const workingAfter = team.length - peopleOff.length - 1;
    if (workingAfter < minCoverage) {
      const ok = confirm(
        `This would leave only ${workingAfter} working (min ${minCoverage}). Override anyway?`
      );
      if (!ok) return;
    }

    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        [slotId]: [...peopleOff, memberId],
      },
    });
  };

  const openSwapFromSlot = (day, slotId, requesterId) => {
    const peopleOff = (schedule[day]?.[slotId] || []).filter(id => id !== requesterId);
    const partners = team.filter(m => peopleOff.includes(m.id));
    if (partners.length === 0) {
      // Requester might be working and wants off — partners are people who are OFF
      // Or requester is off and wants work — partners are people who are WORKING
      const isRequesterOff = (schedule[day]?.[slotId] || []).includes(requesterId);
      const candidates = isRequesterOff
        ? team.filter(m => m.id !== requesterId && !(schedule[day]?.[slotId] || []).includes(m.id))
        : team.filter(m => m.id !== requesterId && (schedule[day]?.[slotId] || []).includes(m.id));
      if (candidates.length === 0) {
        alert('No one available to swap with on this block.');
        return;
      }
      setSwapFlow({ step: 'pick-partner', day, slotId, requesterId, candidates });
      return;
    }
    setSwapFlow({
      step: 'pick-partner',
      day,
      slotId,
      requesterId,
      candidates: partners,
    });
  };

  const confirmRequester = () => setSwapFlow(prev => ({ ...prev, step: 'swapee-confirm' }));

  const applySwap = () => {
    const { day, slotId, requesterId, partnerId } = swapFlow;
    const peopleOff = [...(schedule[day][slotId] || [])];
    const requesterOff = peopleOff.includes(requesterId);
    const partnerOff = peopleOff.includes(partnerId);

    let nextOff = peopleOff.filter(id => id !== requesterId && id !== partnerId);
    if (requesterOff && !partnerOff) nextOff.push(partnerId);
    else if (!requesterOff && partnerOff) nextOff.push(requesterId);
    else if (partnerOff) {
      nextOff = nextOff.filter(id => id !== partnerId);
      if (!requesterOff) nextOff.push(requesterId);
    }

    setSchedule({
      ...schedule,
      [day]: { ...schedule[day], [slotId]: nextOff },
    });
    setSwapFlow(null);
  };

  const requester = swapFlow ? team.find(m => m.id === swapFlow.requesterId) : null;
  const partner = swapFlow?.partnerId ? team.find(m => m.id === swapFlow.partnerId) : null;
  const slotLabel = (id) => timeSlots.find(s => s.id === id)?.label || id;

  if (!schedule?.friday) {
    return (
      <PageShell wide title="Schedule" subtitle="Building schedule skeleton…">
        <PageCard><p className="text-slate-500 text-center py-8">Preparing slots…</p></PageCard>
      </PageShell>
    );
  }

  return (
    <PageShell
      wide
      title={readOnly ? 'Your Festival Schedule' : 'Festival Shift Schedule'}
      subtitle={
        readOnly
          ? isPublished
            ? 'Read-only view — updates automatically when the facilitator makes changes.'
            : 'Waiting for the facilitator to publish the final schedule.'
          : complete
            ? 'Hours are filled — use Manual Edit or Request Shift Swap to fine-tune.'
            : 'Tentative schedule from wishlist/draft. Use Manual Edit anytime, or finish hours then swap.'
      }
      actions={
        <>
          {!readOnly && (
            <button type="button" onClick={onBack} className={`${ui.btnGhost} print:hidden`}>&larr; Draft</button>
          )}
          <button type="button" onClick={handlePrint} className={`${ui.btnSuccess} print:hidden`}>Print</button>
          {onPublish && (
            <button
              type="button"
              onClick={onPublish}
              className={`${isPublished ? ui.btnSecondary : ui.btnPrimary} print:hidden`}
              title={isPublished ? 'Schedule is already published to members' : 'Publish this schedule so members can view it read-only'}
            >
              {isPublished ? 'Re-publish' : 'Publish to members'}
            </button>
          )}
        </>
      }
    >
      {complete && !readOnly && (
        <InfoBanner tone="blue">
          <strong>Schedule ready.</strong> All working hours are filled to target. Use <strong>Swaps</strong> or{' '}
          <strong>Manual Edit</strong> below.
        </InfoBanner>
      )}

      {readOnly && !isPublished && (
        <InfoBanner tone="orange">
          <strong>Not published yet.</strong> The facilitator will publish once the draft is finalized. This screen will update automatically.
        </InfoBanner>
      )}

      <PageCard>
        {!readOnly && (
          <div className="flex justify-center mb-5 print:hidden">
            <div className="bg-slate-200 dark:bg-slate-700 p-1 rounded-lg flex flex-wrap gap-1">
              {[
                { id: 'master', label: 'Master' },
                { id: 'manual', label: 'Manual Edit' },
                { id: 'swaps', label: 'Swaps' },
                { id: 'personal', label: 'Per Person' },
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  className={`px-4 py-2 rounded-md font-bold text-sm transition ${
                    viewMode === mode.id
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-5 print:hidden">
          {DAYS.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`flex-1 py-2 rounded-lg font-bold capitalize transition ${
                selectedDay === day ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* MASTER */}
        {viewMode === 'master' && (
          <>
            <h3 className="text-2xl font-bold capitalize mb-3">{selectedDay}</h3>
            <p className="text-sm text-slate-500 mb-4 print:hidden">
              Read-only overview. Use Manual Edit to override, or Swaps to trade blocks.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="border-b-2 border-slate-300 dark:border-slate-600 p-3 bg-slate-50 dark:bg-slate-800/60">Time & Artists</th>
                    <th className="border-b-2 border-slate-300 dark:border-slate-600 p-3 bg-slate-50 dark:bg-slate-800/60">Working</th>
                    <th className="border-b-2 border-slate-300 dark:border-slate-600 p-3 bg-slate-50 dark:bg-slate-800/60">Time Off</th>
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(slot => {
                    const isAllHands = (allHands[selectedDay] || []).includes(slot.id);
                    const peopleOffIds = isAllHands ? [] : (schedule[selectedDay][slot.id] || []);
                    const peopleOff = team.filter(m => peopleOffIds.includes(m.id));
                    const peopleWorking = team.filter(m => !peopleOffIds.includes(m.id));
                    const artistsPlaying = getArtistsForSlot(selectedDay, slot.start, slot.end);

                    return (
                      <tr key={slot.id} className={`border-b border-slate-200 dark:border-slate-700 ${isAllHands ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                        <td className="p-3 align-top">
                          <div className="font-bold text-slate-800 dark:text-slate-100 mb-1">{slot.label}</div>
                          <button
                            type="button"
                            onClick={() => toggleAllHands(slot.id)}
                            className={`mb-2 text-xs px-2 py-1 rounded font-bold print:hidden ${
                              isAllHands ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {isAllHands ? '★ ALL HANDS ACTIVE' : 'Set All Hands'}
                          </button>
                          <div className="space-y-1">
                            {artistsPlaying.map((artist, idx) => (
                              <div key={idx} className="text-xs text-purple-700">
                                <span className="font-semibold">{artist.name}</span>
                                <span className="text-slate-500 block">
                                  {artist.stage} ({formatTime(artist.start)} - {formatTime(artist.end)})
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          <div className="flex flex-wrap gap-1">
                            {peopleWorking.map(m => (
                              <span key={m.id} className={`text-xs px-2 py-1 rounded border ${isAllHands ? 'bg-red-100 text-red-800 border-red-200 font-bold' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                                {m.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          {isAllHands ? (
                            <span className="text-red-500 font-bold text-sm">ALL HANDS</span>
                          ) : peopleOff.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {peopleOff.map(m => {
                              const picks = wishlists?.[m.id] || [];
                              const pickStr = `${selectedDay}|${slot.id}`;
                              const priority = picks.indexOf(pickStr) + 1;
                                return (
                                <span key={m.id} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600">
                                  {m.name} {priority > 0 ? <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-1">(#{priority})</span> : ''}
                                </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm italic">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* MANUAL EDIT */}
        {viewMode === 'manual' && (
          <>
            <InfoBanner tone="orange">
              <strong>Manual override:</strong> Tap a name to toggle WORKING ↔ OFF for that block.
              Coverage warnings still appear, but you can override.
            </InfoBanner>
            <div className="space-y-4">
              {timeSlots.map(slot => {
                const isAllHands = (allHands[selectedDay] || []).includes(slot.id);
                const peopleOffIds = isAllHands ? [] : (schedule[selectedDay][slot.id] || []);
                const artistsPlaying = getArtistsForSlot(selectedDay, slot.start, slot.end);
                const workingCount = team.length - peopleOffIds.length;

                return (
                  <div key={slot.id} className={`border rounded-xl p-4 ${isAllHands ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <div>
                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{slot.label}</h4>
                        <p className={`text-sm ${workingCount < minCoverage ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                          {workingCount} working · {peopleOffIds.length} off
                          {workingCount < minCoverage ? ` (below min ${minCoverage})` : ''}
                        </p>
                        {artistsPlaying.length > 0 && (
                          <p className="text-xs text-purple-700 mt-1">
                            {artistsPlaying.map(a => a.name).join(' · ')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleAllHands(slot.id)}
                        className={`text-xs px-3 py-1.5 rounded font-bold ${
                          isAllHands ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isAllHands ? 'Clear All Hands' : 'All Hands'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {team.map(m => {
                        const isOff = !isAllHands && peopleOffIds.includes(m.id);
                        const offCount = getMemberDayOffCount(schedule, m.id, selectedDay, settings);
                        const target = getHoursOffTarget(m, settings);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            disabled={isAllHands}
                            onClick={() => togglePersonOff(selectedDay, slot.id, m.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                              isAllHands
                                ? 'bg-red-100 text-red-800 border-red-200 cursor-not-allowed'
                                : isOff
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-400 dark:border-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600'
                                  : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                            }`}
                            title={`${offCount}/${target} off today`}
                          >
                            {m.name}
                            <span className="block text-[10px] font-normal opacity-80">
                              {isAllHands ? 'ALL HANDS' : isOff ? `OFF · ${offCount}/${target}` : `ON · ${offCount}/${target} off`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* SWAPS */}
        {viewMode === 'swaps' && (
          <>
            <InfoBanner>
              <strong>Request Shift Swap:</strong> Pick who is requesting, then pick a block and a partner.
              Both people must confirm.
            </InfoBanner>

            <div className="mb-4">
              <label className={ui.label}>Requester</label>
              <select
                className={ui.input}
                value={selectedMember || ''}
                onChange={e => setSelectedMember(e.target.value)}
              >
                {team.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              {timeSlots.map(slot => {
                const isAllHands = (allHands[selectedDay] || []).includes(slot.id);
                const peopleOffIds = isAllHands ? [] : (schedule[selectedDay][slot.id] || []);
                const isRequesterOff = selectedMember && peopleOffIds.includes(selectedMember);
                const peopleOff = team.filter(m => peopleOffIds.includes(m.id));

                return (
                  <div key={slot.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{slot.label}</p>
                      <p className="text-sm text-slate-500">
                        {selectedMember
                          ? (isRequesterOff ? 'Requester is OFF' : 'Requester is WORKING')
                          : 'Select a requester'}
                      </p>
                      {peopleOff.length > 0 && (
                        <p className="text-xs text-orange-700 mt-1">
                          Off: {peopleOff.map(m => {
                              const picks = wishlists?.[m.id] || [];
                              const pickStr = `${selectedDay}|${slot.id}`;
                              const priority = picks.indexOf(pickStr) + 1;
                            return priority > 0 ? `${m.name} (#${priority})` : m.name;
                          }).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!selectedMember || isAllHands}
                      onClick={() => openSwapFromSlot(selectedDay, slot.id, selectedMember)}
                      className={ui.btnPrimary}
                    >
                      Request Swap
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* PERSONAL */}
        {viewMode === 'personal' && (
          <>
            {!readOnly && (
              <div className="mb-4 print:hidden">
                <label className={ui.label}>Team Member</label>
                <select
                  value={selectedMember || ''}
                  onChange={e => setSelectedMember(e.target.value)}
                  className={ui.input}
                >
                  {team.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedMember && (
              <div className="border-2 border-slate-800 p-5 rounded-xl">
                <div className="text-center mb-5 border-b-2 border-slate-800 pb-3">
                  <h2 className="text-3xl font-black uppercase">
                    {team.find(m => m.id === selectedMember)?.name}
                  </h2>
                  <h3 className="text-lg font-bold text-slate-600 capitalize mt-1">{selectedDay} Schedule</h3>
                </div>
                <div className="space-y-3">
                  {timeSlots.map(slot => {
                    const isAllHands = (allHands[selectedDay] || []).includes(slot.id);
                    const isOff = !isAllHands && (schedule[selectedDay][slot.id] || []).includes(selectedMember);
                    const artistsPlaying = getArtistsForSlot(selectedDay, slot.start, slot.end);
                    return (
                      <div key={slot.id} className={`flex items-stretch border rounded-lg overflow-hidden ${isOff ? 'bg-slate-100' : 'bg-white'}`}>
                        <div className={`w-28 flex flex-col justify-center items-center p-3 font-bold text-white ${isOff ? 'bg-slate-500' : isAllHands ? 'bg-red-600' : 'bg-blue-600'}`}>
                          <span>{isOff ? 'OFF' : 'WORKING'}</span>
                          {isAllHands && <span className="text-xs text-red-200">ALL HANDS</span>}
                        </div>
                        <div className="p-4 flex-1">
                          <p className="font-bold text-lg">{slot.label}</p>
                          {isOff && artistsPlaying.length > 0 && (
                            <ul className="mt-2 text-sm text-purple-700 list-disc pl-4">
                              {artistsPlaying.map((a, i) => (
                                <li key={i}>{a.name} @ {a.stage}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Hours summary */}
        <div className="mt-8 page-break-inside-avoid">
          <h3 className="text-xl font-bold mb-3 capitalize">{selectedDay} Hours</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {team.map(member => {
              const allHandsSlots = allHands[selectedDay] || [];
              const offIgnoringAllHands = timeSlots.filter(slot => {
                if (allHandsSlots.includes(slot.id)) return false;
                return (schedule[selectedDay][slot.id] || []).includes(member.id);
              }).length;
              const hoursWorking = timeSlots.length - offIgnoringAllHands;
              const target = getHoursOffTarget(member, settings);
              return (
                <div key={member.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/60">
                  <p className="font-bold">{member.name}</p>
                  <p className="text-xs text-slate-500 capitalize mb-1">{member.role}</p>
                  <p className="text-sm">Working: <span className="font-semibold text-blue-600">{hoursWorking}h</span></p>
                  <p className="text-sm">
                    Off: <span className={`font-semibold ${offIgnoringAllHands === target ? 'text-green-600' : 'text-orange-600'}`}>
                      {offIgnoringAllHands}/{target}h
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </PageCard>

      {/* Swap dialogs */}
      {swapFlow?.step === 'pick-partner' && (
        <div className={ui.modalOverlay}>
          <div className={ui.modal}>
            <h3 className="text-xl font-bold mb-2">Choose swap partner</h3>
            <p className="text-slate-600 mb-4 text-sm">
              <span className="capitalize">{swapFlow.day}</span> — {slotLabel(swapFlow.slotId)}
              <br />
              Requester: <strong>{requester?.name}</strong>
            </p>
            <div className="space-y-2 mb-4">
              {(swapFlow.candidates || []).map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSwapFlow(prev => ({ ...prev, partnerId: m.id, step: 'requester-confirm' }))}
                  className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-semibold"
                >
                  {m.name}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setSwapFlow(null)} className={`w-full ${ui.btnSecondary}`}>Cancel</button>
          </div>
        </div>
      )}

      {swapFlow?.step === 'requester-confirm' && requester && partner && (
        <div className={ui.modalOverlay}>
          <div className={ui.modal}>
            <p className="text-xs font-bold uppercase text-indigo-600 mb-1">Confirmation 1 of 2 — Requester</p>
            <h3 className="text-xl font-bold mb-2">{requester.name}, confirm this swap?</h3>
            <p className="text-sm text-slate-600 mb-4">
              <span className="capitalize">{swapFlow.day}</span> — {slotLabel(swapFlow.slotId)} with {partner.name}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSwapFlow(null)} className={`flex-1 ${ui.btnSecondary}`}>Go Back</button>
              <button type="button" onClick={confirmRequester} className={`flex-1 ${ui.btnPrimary}`}>
                Confirm — Ask {partner.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {swapFlow?.step === 'swapee-confirm' && requester && partner && (
        <div className={ui.modalOverlay}>
          <div className={ui.modal}>
            <p className="text-xs font-bold uppercase text-green-600 mb-1">Confirmation 2 of 2 — Swapee</p>
            <h3 className="text-xl font-bold mb-2">{partner.name}, accept this swap?</h3>
            <p className="text-sm text-slate-600 mb-4">
              {requester.name} wants to swap <span className="capitalize">{swapFlow.day}</span> — {slotLabel(swapFlow.slotId)}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSwapFlow(null)} className={`flex-1 ${ui.btnSecondary}`}>Decline</button>
              <button type="button" onClick={applySwap} className={`flex-1 ${ui.btnSuccess}`}>Accept Swap</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white; }
          .shadow-md { box-shadow: none; }
          .page-break-inside-avoid { page-break-inside: avoid; }
        }
      `}} />
    </PageShell>
  );
}
