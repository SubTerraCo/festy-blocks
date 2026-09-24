import { useState } from 'react';
import type { TeamMember, TimeLogEntry, TimeLogs, Updater } from '../types';
import { DAYS } from '../data/festivalData';
import { PageShell, PageCard } from './AppNav';
import { ui } from '../ui';

export default function TimeClock({
  team,
  timeLogs,
  setTimeLogs,
}: {
  team: TeamMember[];
  timeLogs: TimeLogs;
  setTimeLogs: (updater: Updater<TimeLogs>) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<string>('friday');
  const [editingLog, setEditingLog] = useState<{ memberId: string; logIndex: number } | null>(null);
  const [editIn, setEditIn] = useState('');
  const [editOut, setEditOut] = useState('');

  const currentDayLogs = timeLogs[selectedDay] || {};

  const handleClockIn = (memberId: string) => {
    const now = new Date().toISOString();
    const memberLogs = currentDayLogs[memberId] || [];
    setTimeLogs({
      ...timeLogs,
      [selectedDay]: {
        ...currentDayLogs,
        [memberId]: [...memberLogs, { in: now, out: null }]
      }
    });
  };

  const handleClockOut = (memberId: string) => {
    const now = new Date().toISOString();
    const memberLogs = [...(currentDayLogs[memberId] || [])];
    if (memberLogs.length > 0) {
      const lastLog = memberLogs[memberLogs.length - 1];
      if (!lastLog.out) {
        lastLog.out = now;
        setTimeLogs({
          ...timeLogs,
          [selectedDay]: {
            ...currentDayLogs,
            [memberId]: memberLogs
          }
        });
      }
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateHours = (logIn: string | null, logOut: string | null) => {
    if (!logIn || !logOut) return 0;
    return (((new Date(logOut) as unknown as number) - (new Date(logIn) as unknown as number)) / (1000 * 60 * 60)).toFixed(2);
  };

  const calculateTotalHours = (memberId: string) => {
    const logs = currentDayLogs[memberId] || [];
    let total = 0;
    logs.forEach(log => {
      if (log.in && log.out) total += parseFloat(calculateHours(log.in, log.out) as string);
    });
    return total.toFixed(2);
  };

  const startEdit = (memberId: string, logIndex: number, log: TimeLogEntry) => {
    setEditingLog({ memberId, logIndex });
    const toInputFormat = (iso: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    };
    setEditIn(toInputFormat(log.in));
    setEditOut(toInputFormat(log.out));
  };

  const saveEdit = () => {
    const { memberId, logIndex } = editingLog!;
    const memberLogs = [...currentDayLogs[memberId]];
    memberLogs[logIndex] = {
      in: editIn ? new Date(editIn).toISOString() : null,
      out: editOut ? new Date(editOut).toISOString() : null
    };
    setTimeLogs({
      ...timeLogs,
      [selectedDay]: { ...currentDayLogs, [memberId]: memberLogs }
    });
    setEditingLog(null);
  };

  const deleteLog = (memberId: string, logIndex: number) => {
    if (confirm('Delete this time entry?')) {
      const memberLogs = [...currentDayLogs[memberId]];
      memberLogs.splice(logIndex, 1);
      setTimeLogs({
        ...timeLogs,
        [selectedDay]: { ...currentDayLogs, [memberId]: memberLogs }
      });
    }
  };

  return (
    <PageShell
      wide
      title="Time Clock & Timesheets"
      subtitle="Clock in/out, edit punches, and print timesheets for each day."
      actions={
        <button type="button" onClick={() => window.print()} className={`${ui.btnSuccess} print:hidden`}>
          Print Timesheets
        </button>
      }
    >
      <div className="text-center mb-4 hidden print:block">
        <h2 className="text-3xl font-bold">Official Timesheet</h2>
        <p className="text-slate-500 mt-1 capitalize">{selectedDay}</p>
      </div>

      <div className="flex gap-2 mb-5 print:hidden">
        {DAYS.map(day => (
          <button
            key={day}
            type="button"
            onClick={() => setSelectedDay(day)}
            className={`flex-1 py-2 rounded-lg font-bold capitalize transition ${
              selectedDay === day
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map(member => {
          const logs = currentDayLogs[member.id] || [];
          const isClockedIn = logs.length > 0 && !logs[logs.length - 1].out;

          return (
            <PageCard key={member.id} className="page-break-inside-avoid">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{member.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{member.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Total Hours</p>
                  <p className="text-2xl font-black text-blue-600">{calculateTotalHours(member.id)}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4 print:hidden">
                {!isClockedIn ? (
                  <button type="button" onClick={() => handleClockIn(member.id)} className={`flex-1 ${ui.btnSuccess}`}>
                    CLOCK IN
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleClockOut(member.id)}
                    className="flex-1 py-2.5 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition"
                  >
                    CLOCK OUT
                  </button>
                )}
              </div>

              <div className="mb-4 print:hidden">
                {isClockedIn ? (
                  <div className="bg-green-100 text-green-800 p-2 rounded-lg text-center text-sm font-bold animate-pulse">
                    Currently Clocked In
                  </div>
                ) : (
                  <div className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-lg text-center text-sm font-bold">
                    Clocked Out
                  </div>
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 mb-2">Punch History</h4>
              {logs.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-2">No punches today</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => {
                    const isEditing = editingLog?.memberId === member.id && editingLog?.logIndex === index;
                    if (isEditing) {
                      return (
                        <div key={index} className="bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 p-3 rounded-lg shadow-sm print:hidden">
                          <div className="flex flex-col gap-2 mb-2">
                            <div>
                              <label className="text-xs text-slate-500">In</label>
                              <input type="datetime-local" value={editIn} onChange={e => setEditIn(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded p-1 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500">Out</label>
                              <input type="datetime-local" value={editOut} onChange={e => setEditOut(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 rounded p-1 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={saveEdit} className="flex-1 bg-blue-600 text-white text-xs py-1 rounded">Save</button>
                            <button type="button" onClick={() => setEditingLog(null)} className="flex-1 bg-slate-300 text-slate-700 text-xs py-1 rounded">Cancel</button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={index} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm group">
                        <div>
                          <span className="text-green-700 font-semibold">{formatTime(log.in)}</span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className={log.out ? 'text-red-700 font-semibold' : 'text-slate-400 italic'}>
                            {log.out ? formatTime(log.out) : 'Active'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-600">{calculateHours(log.in, log.out)}h</span>
                          <div className="hidden group-hover:flex gap-1 print:hidden">
                            <button type="button" onClick={() => startEdit(member.id, index, log)} className="text-blue-500 hover:text-blue-700 px-1">✎</button>
                            <button type="button" onClick={() => deleteLog(member.id, index)} className="text-red-500 hover:text-red-700 px-1">×</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="hidden print:block mt-8 border-t-2 border-slate-400 pt-2">
                <p className="text-xs text-slate-500">Employee Signature</p>
              </div>
            </PageCard>
          );
        })}
      </div>

      {team.length === 0 && (
        <PageCard>
          <p className="text-slate-400 italic text-center">No team members — add people in Setup.</p>
        </PageCard>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white; }
          .shadow-md { box-shadow: none; }
          .page-break-inside-avoid { page-break-inside: avoid; }
        }
      `}} />
    </PageShell>
  );
}
