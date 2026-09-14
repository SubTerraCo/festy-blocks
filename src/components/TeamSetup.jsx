import { useState } from 'react';
import SettingsForm from './SettingsForm';
import CoverageDashboard from './CoverageDashboard';
import { PageShell, PageCard, InfoBanner } from './AppNav';
import { ui } from '../ui';
import { mergeSettings, getShiftsPerDay, formatDecimalHour } from '../data/settings';
import { generatePin, hashPin } from '../data/firebase';

export default function TeamSetup({
  team,
  setTeam,
  settings,
  setSettings,
  onComplete,
  sessionMode = false,
  sessionCode = null,
}) {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('regular');
  const [step, setStep] = useState('schedule');
  /** Plain PINs shown to facilitator (not stored in Firestore — only pinHash is). */
  const [memberPins, setMemberPins] = useState({});
  const [adding, setAdding] = useState(false);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newName.trim() || adding) return;
    setAdding(true);
    try {
      const id = crypto.randomUUID();
      const member = {
        id,
        name: newName.trim(),
        role: newRole,
        hoursWorked: 0,
      };
      if (sessionMode) {
        const plainPin = generatePin();
        member.pinHash = await hashPin(plainPin);
        setMemberPins((prev) => ({ ...prev, [id]: plainPin }));
      }
      setTeam([...team, member]);
      setNewName('');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = (id) => {
    setMemberPins((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setTeam(team.filter((member) => member.id !== id));
  };

  const copyPin = async (pin) => {
    try {
      await navigator.clipboard.writeText(pin);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const moveMember = (index, direction) => {
    const newTeam = [...team];
    if (direction === 'up' && index > 0) {
      [newTeam[index - 1], newTeam[index]] = [newTeam[index], newTeam[index - 1]];
    } else if (direction === 'down' && index < team.length - 1) {
      [newTeam[index + 1], newTeam[index]] = [newTeam[index], newTeam[index + 1]];
    }
    setTeam(newTeam);
  };

  const shifts = getShiftsPerDay(settings);
  const canContinueSchedule = shifts > 0;

  if (step === 'schedule') {
    return (
      <PageShell
        narrow
        title="Setup — Shift Schedule"
        subtitle="Set shifts per day, length, and start/end before building wishlists. Editable anytime in Settings."
      >
        <PageCard>
          <SettingsForm
            settings={settings}
            onChange={setSettings}
            mode="schedule"
            team={team}
          />
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={() => setSettings(mergeSettings(null))} className={`flex-1 ${ui.btnSecondary}`}>
              Reset Defaults
            </button>
            <button
              type="button"
              disabled={!canContinueSchedule}
              onClick={() => setStep('team')}
              className={`flex-1 ${ui.btnSuccess}`}
            >
              Next: Team & Draft Order
            </button>
          </div>
          {!canContinueSchedule && (
            <p className="text-sm text-red-500 mt-2 text-center">Fix start/end/length so at least one shift exists.</p>
          )}
        </PageCard>
      </PageShell>
    );
  }

  return (
    <PageShell
      narrow
      title="Team Setup & Draft Order"
      subtitle="Add members and set pick order with the arrows. Coverage math updates as you add people."
      actions={
        <button type="button" onClick={() => setStep('schedule')} className={ui.btnGhost}>
          &larr; Shift Schedule
        </button>
      }
    >
      {sessionMode && sessionCode && (
        <InfoBanner tone="blue">
          <strong>Session {sessionCode}</strong> — share this code with crew. Each member gets a PIN below when you add them.
        </InfoBanner>
      )}

      <InfoBanner>
        <strong>{shifts} shifts/day</strong>
        {' '}({formatDecimalHour(settings.dayStartHour)} – {formatDecimalHour(settings.dayEndHour)},{' '}
        {settings.shiftLengthHours}h each)
      </InfoBanner>

      <div className="mb-5">
        <CoverageDashboard team={team} settings={settings} onChange={setSettings} />
      </div>

      <PageCard>
        <form onSubmit={handleAddMember} className="mb-6 flex flex-col gap-3">
          <div>
            <label className={ui.label}>Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={ui.input}
              placeholder="Enter team member name"
            />
          </div>
          <div>
            <label className={ui.label}>Role</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={ui.input}>
              <option value="regular">Regular</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>
          <button type="submit" disabled={adding} className={ui.btnPrimary}>
            {adding ? 'Adding…' : 'Add Member'}
          </button>
        </form>

        <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-100">Draft Order ({team.length})</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Use the arrows to set the order people will pick in.</p>

        {team.length === 0 ? (
          <p className="text-slate-400 italic">No team members added yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg mb-6">
            {team.map((member, index) => (
              <li key={member.id} className="p-3 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-400 w-6">{index + 1}.</span>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{member.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{member.role}</p>
                    {sessionMode && memberPins[member.id] && (
                      <p className="text-xs mt-1 font-mono text-indigo-600 dark:text-indigo-400">
                        PIN: {memberPins[member.id]}
                        <button
                          type="button"
                          onClick={() => copyPin(memberPins[member.id])}
                          className="ml-2 text-indigo-500 hover:underline font-sans"
                        >
                          Copy
                        </button>
                      </p>
                    )}
                    {sessionMode && !memberPins[member.id] && member.pinHash && (
                      <p className="text-xs mt-1 text-slate-400 italic">PIN set (refresh to regenerate)</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => moveMember(index, 'up')} disabled={index === 0}
                      className={`p-1 rounded ${index === 0 ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>▲</button>
                    <button type="button" onClick={() => moveMember(index, 'down')} disabled={index === team.length - 1}
                      className={`p-1 rounded ${index === team.length - 1 ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>▼</button>
                  </div>
                  <button type="button" onClick={() => handleRemoveMember(member.id)} className="text-red-600 hover:text-red-800 ml-2 text-sm">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button type="button" onClick={onComplete} disabled={team.length < 3} className={`w-full ${ui.btnSuccess}`}>
          Continue to Wishlists
        </button>
        {team.length < 3 && (
          <p className="text-sm text-red-500 mt-2 text-center">Add at least 3 members to start.</p>
        )}
      </PageCard>
    </PageShell>
  );
}
