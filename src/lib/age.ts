import { safe } from './number';
// Shared with other tools that take a raw `<input type="date">` value.
export { parseDateInput } from './date';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
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

/**
 * The next occurrence of `dob`'s month/day on or after `asOf`.
 *
 * For a Feb 29 birth date, JS Date would silently roll the anniversary
 * forward to Mar 1 in non-leap years. Instead this follows the common
 * civil-registration convention of anchoring the anniversary to Feb 28
 * in non-leap years, landing back on Feb 29 itself in leap years.
 */
export function nextBirthday(dob: Date, asOf: Date): NextBirthday {
  const from = startOfDay(asOf);
  const isLeapDayBirthday = dob.getMonth() === 1 && dob.getDate() === 29;

  function anniversaryInYear(year: number): Date {
    if (isLeapDayBirthday && !isLeapYear(year)) {
      return new Date(year, 1, 28);
    }
    return new Date(year, dob.getMonth(), dob.getDate());
  }

  let date = anniversaryInYear(from.getFullYear());
  if (date.getTime() < from.getTime()) {
    date = anniversaryInYear(from.getFullYear() + 1);
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
