// src/utils/index.ts

// Month name → number (for parsing JAN, FEB, etc.)
export const MONTH_MAP: Record<string, string> = {
  JAN: '1', FEB: '2', MAR: '3', APR: '4', MAY: '5', JUN: '6',
  JUL: '7', AUG: '8', SEP: '9', OCT: '10', NOV: '11', DEC: '12',
  JANUARY: '1', FEBRUARY: '2', MARCH: '3', APRIL: '4',
  JUNE: '6', JULY: '7', AUGUST: '8', SEPTEMBER: '9',
  OCTOBER: '10', NOVEMBER: '11', DECEMBER: '12'
};

// Human-readable month names
export const MONTH_NAMES: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December'
};

// Day-of-week names (1 = Monday, 7 = Sunday)
export const DAY_NAMES: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
  5: 'Friday', 6: 'Saturday', 7: 'Sunday'
};

// Unix-style DOW mapping (used when parsing non-Quartz crons)
export const DOW_MAP_UNIX: Record<string, number> = {
  SUN: 7, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
  SUNDAY: 7, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
  THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
};

// Quartz-style DOW mapping (1 = Sunday, 7 = Saturday) — not used directly in parsing
export const DOW_MAP_QUARTZ: Record<string, number> = {
  SUN: 1, MON: 2, TUE: 3, WED: 4, THU: 5, FRI: 6, SAT: 7,
  SUNDAY: 1, MONDAY: 2, TUESDAY: 3, WEDNESDAY: 4,
  THURSDAY: 5, FRIDAY: 6, SATURDAY: 7
};

export const LIMITS: Record<string, [number, number]> = {
  second: [0, 59],
  minute: [0, 59],
  hour: [0, 23],
  dom: [1, 31],
  month: [1, 12],
  dow: [1, 7],
  year: [1970, 2099]
};

// Standard Quartz aliases
export const ALIASES: Record<string, string> = {
  '@YEARLY': '0 0 0 1 1 ? *',
  '@ANNUALLY': '0 0 0 1 1 ? *',
  '@MONTHLY': '0 0 0 L * ? *',
  '@WEEKLY': '0 0 0 ? * 1 *',
  '@DAILY': '0 0 0 * * ? *',
  '@MIDNIGHT': '0 0 0 * * ? *',
  '@HOURLY': '0 0 * * * ? *',
};

// English ordinal suffix: 1st, 2nd, 3rd, 4th…
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Format seconds/minutes/hours → "2:30 PM", "midnight", etc.
export function formatTime(sec: number, min: number, hour: number): string {
  if (hour === 0 && min === 0 && sec === 0) return 'midnight';
  //if (hour === 12 && min === 0 && sec === 0) return 'noon';

  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;

  if (min && sec) {
    return `${h12}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')} ${ampm}`;
  }
  if (min) {
    return `${h12}:${min.toString().padStart(2, '0')} ${ampm}`;
  }
  return `${h12} ${ampm}`;
}
