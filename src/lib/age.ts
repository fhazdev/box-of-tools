import { safe } from './number';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Parses a `<input type="date">` value ("YYYY-MM-DD") as a local calendar
// date at midnight. `new Date(value)` would parse it as UTC midnight
// instead, which shifts to the previous day in negative UTC offsets.
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // Guard against JS silently normalizing an invalid date (e.g. Feb 30)
  // into a different, wrong one instead of rejecting it.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

export interface AgeBreakdown {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalWeeks: number;
  totalDays: number;
}

/**
 * Calendar-accurate breakdown of the gap between two dates. Order-independent
 * — the earlier date is always treated as the start, so this also works for
 * comparing two people's dates of birth.
 *
 * Walks forward from `start` in whole months to find the largest month count
 * that doesn't overshoot `end`, then counts the remaining days. This (rather
 * than naive field-by-field subtraction) is what correctly handles gaps
 * between month-end dates in months of different lengths — e.g. Jan 31 to
 * Mar 1, where "borrow a month" doesn't cleanly work because February is
 * shorter than January.
 */
export function ageBetween(dateA: Date, dateB: Date): AgeBreakdown {
  const [start, end] =
    dateA.getTime() <= dateB.getTime() ? [startOfDay(dateA), startOfDay(dateB)] : [startOfDay(dateB), startOfDay(dateA)];

  let totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  let anchor = addMonths(start, totalMonths);
  while (anchor.getTime() > end.getTime()) {
    totalMonths -= 1;
    anchor = addMonths(start, totalMonths);
  }

  const days = Math.round((end.getTime() - anchor.getTime()) / MS_PER_DAY);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths - years * 12;
  const totalDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);

  return {
    years,
    months,
    days,
    totalMonths,
    totalWeeks: Math.floor(totalDays / 7),
    totalDays,
  };
}

export interface NextBirthday {
  date: Date;
  daysUntil: number;
  isToday: boolean;
}

/** The next occurrence of `dob`'s month/day on or after `asOf`. */
export function nextBirthday(dob: Date, asOf: Date): NextBirthday {
  const from = startOfDay(asOf);
  let date = new Date(from.getFullYear(), dob.getMonth(), dob.getDate());
  if (date.getTime() < from.getTime()) {
    date = new Date(from.getFullYear() + 1, dob.getMonth(), dob.getDate());
  }

  const daysUntil = Math.round((date.getTime() - from.getTime()) / MS_PER_DAY);
  return { date, daysUntil, isToday: daysUntil === 0 };
}

/** Subtracts a Y/M/D age from `asOf` to reverse-engineer a date of birth. */
export function reverseEngineerDOB(years: number, months: number, days: number, asOf: Date): Date {
  const date = startOfDay(asOf);
  date.setFullYear(date.getFullYear() - safe(years));
  date.setMonth(date.getMonth() - safe(months));
  date.setDate(date.getDate() - safe(days));
  return date;
}
