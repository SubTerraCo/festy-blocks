export type AppMode = 'none' | 'solo' | 'session';

export type AppRole = 'none' | 'solo' | 'facilitator' | 'member' | 'viewer';

export type AppScreen =
  | 'setup'
  | 'wishlist_hub'
  | 'wishlist_picker'
  | 'resolve'
  | 'draft'
  | 'schedule'
  | 'timeclock'
  | 'settings';

export type ScheduleViewMode = 'master' | 'personal' | 'manual' | 'swaps';

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  hoursWorked?: number;
  pinHash?: string;
  claimedByUid?: string;
  order?: number;
};

export type WishlistMap = Record<string, string[]>;

export type SlotOffMap = Record<string, string[]>;

export type Schedule = {
  friday: SlotOffMap;
  saturday: SlotOffMap;
  sunday: SlotOffMap;
  [day: string]: SlotOffMap;
};

export type AllHands = {
  friday: string[];
  saturday: string[];
  sunday: string[];
  [day: string]: string[];
};

export type TimeLogEntry = {
  in: string | null;
  out: string | null;
};

export type TimeLogs = Record<string, Record<string, TimeLogEntry[]>>;

export type HoursOnByRole = {
  volunteer: number;
  regular: number;
  [role: string]: number;
};

export type Settings = {
  minCoverage: number;
  hoursOnByRole: HoursOnByRole;
  dayStartHour: number;
  dayEndHour: number;
  shiftLengthHours: number;
  conflictStrategy: string;
  conflictSlotNudge: number;
  theme: string;
};

export type Updater<T> = T | ((prev: T) => T);

export type SessionDoc = {
  facilitatorUid?: string;
  facilitatorPinHash?: string | null;
  status?: string;
  settings?: Partial<Settings> | null;
  schedule?: Schedule;
  allHands?: AllHands;
  timeLogs?: TimeLogs;
  createdAt?: unknown;
};
