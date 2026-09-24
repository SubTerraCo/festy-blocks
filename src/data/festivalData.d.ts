export type Artist = {
  name: string;
  stage: string;
  start: number;
  end: number;
};

export type FestivalTimeSlot = {
  id: string;
  label: string;
  start: number;
  end: number;
};

export const DAYS: string[];

export const TIME_SLOTS: FestivalTimeSlot[];

export const ARTISTS: Record<string, Artist[]>;

export function getArtistsForSlot(day: string, slotStart: number, slotEnd: number): Artist[];

export function formatTime(decimalTime: number): string;
