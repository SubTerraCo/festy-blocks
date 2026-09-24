import type { Schedule, Settings, TeamMember } from '../types';

/** Decimal hours: 12.5 = 12:30 PM, 24.5 = 12:30 AM next day */

export const DEFAULT_SETTINGS: Settings = {
  minCoverage: 3,
  hoursOnByRole: {
    volunteer: 6,
    regular: 6,
  },
  // Shift schedule (drives wishlist + draft slots)
  dayStartHour: 12.5, // 12:30 PM
  dayEndHour: 24.5, // 12:30 AM
  shiftLengthHours: 1,
  // Conflict handling
  conflictStrategy: 'prefer_off',
  // When strategy is adjust_start_*: try this many slots away
  conflictSlotNudge: 1,
  // Appearance
  theme: 'dark', // 'dark' | 'light'
};

export const CONFLICT_STRATEGIES = [
  {
    id: 'prefer_off',
    label: 'Prefer time off first',
    description: 'Grant wishlist time-off by priority until coverage or exact off target blocks it.',
  },
  {
    id: 'prefer_work',
    label: 'Prefer coverage / work first',
    description: 'Only grant time off when at least min coverage remains; otherwise leave for draft.',
  },
  {
    id: 'adjust_start_earlier',
    label: 'On conflict, try earlier shift',
    description: 'If preferred off slot is full, try the previous slot(s) as a start-time change.',
  },
  {
    id: 'adjust_start_later',
    label: 'On conflict, try later shift',
    description: 'If preferred off slot is full, try the next slot(s) as a start-time change.',
  },
  {
    id: 'manual_only',
    label: 'Manual draft only',
    description: 'Do not auto-grant any wishlist picks — resolve everything in the bidirectional draft.',
  },
];

export function mergeSettings(partial?: Partial<Settings> | null): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...(partial || {}),
    hoursOnByRole: {
      ...DEFAULT_SETTINGS.hoursOnByRole,
      ...(partial?.hoursOnByRole || {}),
    },
  };
}

export function formatDecimalHour(decimal: number) {
  const totalMinutes = Math.round(decimal * 60);
  let hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const nextDay = hours24 >= 24;
  hours24 = hours24 % 24;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  const minsStr = minutes.toString().padStart(2, '0');
  return `${hours12}:${minsStr} ${ampm}${nextDay ? ' (+1)' : ''}`;
}

export function decimalToTimeInput(decimal: number) {
  const totalMinutes = Math.round(decimal * 60);
  const hours24 = ((Math.floor(totalMinutes / 60) % 24) + 24) % 24;
  const minutes = ((totalMinutes % 60) + 60) % 60;
  return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function timeInputToDecimal(value: string) {
  if (!value || !value.includes(':')) return 12.5;
  const [h, m] = value.split(':').map(Number);
  return h + m / 60;
}

/** Build slot list from settings. dayEnd may be next calendar day (>= 24). */
export function buildTimeSlots(settings?: Partial<Settings> | null) {
  const s = mergeSettings(settings);
  const length = Math.max(0.25, Number(s.shiftLengthHours) || 1);
  let start = Number(s.dayStartHour);
  let end = Number(s.dayEndHour);

  // If end is earlier than start on a 24h clock without overnight, treat as next day
  if (end <= start) {
    end += 24;
  }

  const slots = [];
  let cursor = start;
  let guard = 0;
  while (cursor + length <= end + 0.001 && guard < 48) {
    const slotEnd = cursor + length;
    const id = `s${Math.round(cursor * 100)}`;
    slots.push({
      id,
      label: `${formatDecimalHour(cursor)} - ${formatDecimalHour(slotEnd)}`,
      start: cursor,
      end: slotEnd,
    });
    cursor = slotEnd;
    guard++;
  }

  return slots;
}

export function getShiftsPerDay(settings?: Partial<Settings> | null) {
  return buildTimeSlots(settings).length;
}

/** Derive end hour from start + shifts * length */
export function endFromStartCountLength(
  startHour: number,
  shiftsPerDay: number,
  shiftLengthHours: number,
) {
  return Number(startHour) + Number(shiftsPerDay) * Number(shiftLengthHours);
}

export function getHoursOnRequired(
  member: { role?: string } | null | undefined,
  settings?: Partial<Settings> | null,
) {
  const role = member?.role || 'regular';
  const map = mergeSettings(settings).hoursOnByRole;
  return map[role] ?? DEFAULT_SETTINGS.hoursOnByRole.regular;
}

export function getHoursOffTarget(
  member: { role?: string } | null | undefined,
  settings?: Partial<Settings> | null,
) {
  const slots = buildTimeSlots(settings).length;
  const on = getHoursOnRequired(member, settings);
  return Math.max(0, slots - on);
}

/**
 * Coverage / hours planner for Setup + Settings dashboards.
 * Demand = shiftsPerDay × minCoverage person-slots per day.
 * Volunteer supply is locked to their hours ON; remainder is split across regulars.
 */
export function computeCoveragePlan(team: TeamMember[] = [], settings?: Partial<Settings> | null) {
  const s = mergeSettings(settings);
  const slots = buildTimeSlots(s).length;
  const minCoverage = Math.max(1, Number(s.minCoverage) || 1);
  const demand = slots * minCoverage;

  const members = Array.isArray(team) ? team : [];
  const volunteers = members.filter(m => m.role === 'volunteer');
  const regulars = members.filter(m => m.role !== 'volunteer');
  const volunteerCount = volunteers.length;
  const regularCount = regulars.length;
  const teamCount = members.length;

  const volunteerHoursOn = Math.max(0, Number(s.hoursOnByRole.volunteer) || 0);
  const regularHoursOn = Math.max(0, Number(s.hoursOnByRole.regular) || 0);

  const volunteerSupply = volunteerCount * volunteerHoursOn;
  const remainingForRegulars = demand - volunteerSupply;
  const regularHoursExact =
    regularCount > 0 ? remainingForRegulars / regularCount : null;
  const regularHoursSuggested =
    regularCount > 0
      ? clampHoursOn(Math.round(regularHoursExact as number), slots)
      : null;

  const equalHoursExact = teamCount > 0 ? demand / teamCount : null;
  const equalHoursSuggested =
    teamCount > 0 ? clampHoursOn(Math.round(equalHoursExact as number), slots) : null;

  const currentSupply =
    volunteerCount * volunteerHoursOn + regularCount * regularHoursOn;
  const surplus = currentSupply - demand;

  const headcountOk = teamCount >= minCoverage;
  const regularsCanCover =
    regularCount === 0
      ? remainingForRegulars <= 0
      : regularHoursSuggested != null &&
        regularHoursSuggested <= slots &&
        remainingForRegulars <= regularCount * slots;

  return {
    slots,
    minCoverage,
    demand,
    teamCount,
    volunteerCount,
    regularCount,
    volunteerHoursOn,
    regularHoursOn,
    volunteerSupply,
    remainingForRegulars,
    regularHoursExact,
    regularHoursSuggested,
    equalHoursExact,
    equalHoursSuggested,
    currentSupply,
    surplus,
    headcountOk,
    regularsCanCover,
  };
}

export function clampHoursOn(value: number | string, slots: number) {
  const maxOn = Math.max(0, slots);
  const n = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(maxOn, n));
}

export function getMinCoverage(settings?: Partial<Settings> | null) {
  return mergeSettings(settings).minCoverage;
}

export function getConflictStrategy(settings?: Partial<Settings> | null) {
  return mergeSettings(settings).conflictStrategy;
}

export function emptyScheduleSkeleton(
  settings?: Partial<Settings> | null,
  days: string[] = ['friday', 'saturday', 'sunday'],
): Schedule {
  const slots = buildTimeSlots(settings);
  const schedule = {} as Schedule;
  days.forEach(day => {
    schedule[day] = {};
    slots.forEach(slot => {
      schedule[day][slot.id] = [];
    });
  });
  return schedule;
}

export function emptyWishlistsSkeleton(
  settings?: Partial<Settings> | null,
  days: string[] = ['friday', 'saturday', 'sunday'],
) {
  const schedule: Record<string, Record<string, never>> = {};
  days.forEach(day => {
    schedule[day] = {};
  });
  return schedule;
}

export function getMemberDayOffCount(
  schedule: Schedule | null | undefined,
  memberId: string,
  day: string,
  settings?: Partial<Settings> | null,
) {
  const slots = buildTimeSlots(settings);
  if (!schedule?.[day]) return 0;
  return slots.filter(slot => (schedule[day][slot.id] || []).includes(memberId)).length;
}

/** True when every member has exactly their off-target hours for every day */
export function isTeamScheduleComplete(
  team: TeamMember[] | null | undefined,
  schedule: Schedule | null | undefined,
  settings?: Partial<Settings> | null,
) {
  if (!team?.length || !schedule) return false;
  const days = ['friday', 'saturday', 'sunday'];
  return team.every(member => {
    const target = getHoursOffTarget(member, settings);
    return days.every(day => getMemberDayOffCount(schedule, member.id, day, settings) === target);
  });
}

