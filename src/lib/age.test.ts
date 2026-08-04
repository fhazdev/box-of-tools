import { describe, it, expect } from 'vitest';
import { parseDateInput, ageBetween, nextBirthday, reverseEngineerDOB, isLeapYear } from './age';

describe('parseDateInput', () => {
  it('parses a valid YYYY-MM-DD string as a local date', () => {
    const date = parseDateInput('2000-01-15');
    expect(date).not.toBeNull();
    expect(date!.getFullYear()).toBe(2000);
    expect(date!.getMonth()).toBe(0);
    expect(date!.getDate()).toBe(15);
  });

  it('returns null for an empty string', () => {
    expect(parseDateInput('')).toBeNull();
  });

  it('returns null for a malformed string', () => {
    expect(parseDateInput('not-a-date')).toBeNull();
    expect(parseDateInput('2000/01/15')).toBeNull();
  });

  it('returns null for a calendar-invalid date instead of silently normalizing it', () => {
    expect(parseDateInput('2001-02-30')).toBeNull(); // Feb 30 doesn't exist
    expect(parseDateInput('2000-13-01')).toBeNull(); // month 13 doesn't exist
  });

  it('accepts Feb 29 on a leap year', () => {
    const date = parseDateInput('2000-02-29');
    expect(date).not.toBeNull();
    expect(date!.getMonth()).toBe(1);
    expect(date!.getDate()).toBe(29);
  });
});

describe('ageBetween', () => {
  it('computes a simple whole-year gap', () => {
    const result = ageBetween(new Date(2000, 0, 1), new Date(2025, 0, 1));
    expect(result).toMatchObject({ years: 25, months: 0, days: 0 });
  });

  it('computes years, months, and days for a partial gap', () => {
    // 2000-01-15 -> 2026-08-04 is 26y 6m 20d
    const result = ageBetween(new Date(2000, 0, 15), new Date(2026, 7, 4));
    expect(result).toMatchObject({ years: 26, months: 6, days: 20 });
  });

  it('falls back to a day count across a month-end gap that spans a shorter month', () => {
    // 2000-01-31 -> 2000-03-01: adding 1 month to Jan 31 overflows past Feb
    // (which only has 29 days in 2000) to Mar 2, already overshooting the
    // end date — so this can't cleanly be "1 month + N days" and correctly
    // resolves to 0 months, 30 raw days instead.
    const result = ageBetween(new Date(2000, 0, 31), new Date(2000, 2, 1));
    expect(result).toMatchObject({ years: 0, months: 0, days: 30, totalDays: 30 });
  });

  it('is order-independent — swapping the two dates gives the same breakdown', () => {
    const a = ageBetween(new Date(2000, 0, 1), new Date(2010, 5, 15));
    const b = ageBetween(new Date(2010, 5, 15), new Date(2000, 0, 1));
    expect(b).toEqual(a);
  });

  it('returns all zeros for the same date', () => {
    const result = ageBetween(new Date(2020, 3, 10), new Date(2020, 3, 10));
    expect(result).toMatchObject({ years: 0, months: 0, days: 0, totalDays: 0, totalWeeks: 0, totalMonths: 0 });
  });

  it('derives totalMonths, totalWeeks, and totalDays consistently', () => {
    const result = ageBetween(new Date(2000, 0, 1), new Date(2003, 0, 1));
    expect(result.totalDays).toBe(1096); // includes leap day 2000
    expect(result.totalWeeks).toBe(Math.floor(1096 / 7));
    expect(result.totalMonths).toBe(36);
  });

  it('ignores time-of-day components', () => {
    const start = new Date(2000, 0, 1, 23, 59);
    const end = new Date(2000, 0, 2, 0, 1);
    expect(ageBetween(start, end).totalDays).toBe(1);
  });
});

describe('nextBirthday', () => {
  it('lands later this year when the birthday has not happened yet', () => {
    const dob = new Date(2000, 11, 25); // Dec 25
    const asOf = new Date(2026, 0, 1); // Jan 1, 2026
    const result = nextBirthday(dob, asOf);
    expect(result.date.getFullYear()).toBe(2026);
    expect(result.isToday).toBe(false);
    expect(result.daysUntil).toBeGreaterThan(0);
  });

  it('rolls over to next year when the birthday already passed', () => {
    const dob = new Date(2000, 0, 15); // Jan 15
    const asOf = new Date(2026, 7, 4); // Aug 4, 2026
    const result = nextBirthday(dob, asOf);
    expect(result.date.getFullYear()).toBe(2027);
    expect(result.date.getMonth()).toBe(0);
    expect(result.date.getDate()).toBe(15);
  });

  it('flags the birthday as today with 0 days until', () => {
    const dob = new Date(1990, 6, 4); // Jul 4
    const asOf = new Date(2026, 6, 4); // Jul 4, 2026
    const result = nextBirthday(dob, asOf);
    expect(result.isToday).toBe(true);
    expect(result.daysUntil).toBe(0);
  });

  it('anchors a Feb 29 birthday to Feb 28 in a non-leap year', () => {
    const dob = new Date(2000, 1, 29); // Feb 29, 2000 (leap year)
    const asOf = new Date(2025, 0, 1); // Jan 1, 2025 (non-leap year)
    const result = nextBirthday(dob, asOf);
    expect(result.date.getFullYear()).toBe(2025);
    expect(result.date.getMonth()).toBe(1); // February
    expect(result.date.getDate()).toBe(28);
  });

  it('lands back on Feb 29 itself when the anniversary year is a leap year', () => {
    const dob = new Date(2000, 1, 29);
    // Feb 28, 2027 has already passed; 2028 is the next leap year.
    const asOf = new Date(2027, 2, 1); // Mar 1, 2027
    const result = nextBirthday(dob, asOf);
    expect(result.date.getFullYear()).toBe(2028);
    expect(result.date.getMonth()).toBe(1);
    expect(result.date.getDate()).toBe(29);
  });

  it('flags Feb 28 as today for a Feb 29 birthday in a non-leap year', () => {
    const dob = new Date(2000, 1, 29);
    const asOf = new Date(2025, 1, 28);
    const result = nextBirthday(dob, asOf);
    expect(result.isToday).toBe(true);
    expect(result.daysUntil).toBe(0);
  });
});

describe('isLeapYear', () => {
  it('treats years divisible by 4 as leap, except century years', () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2100)).toBe(false); // divisible by 100, not 400
    expect(isLeapYear(2400)).toBe(true); // divisible by 400
    expect(isLeapYear(2025)).toBe(false);
  });
});

describe('reverseEngineerDOB', () => {
  it('subtracts years, months, and days from the reference date', () => {
    const dob = reverseEngineerDOB(26, 6, 20, new Date(2026, 7, 4));
    expect(dob.getFullYear()).toBe(2000);
    expect(dob.getMonth()).toBe(0);
    expect(dob.getDate()).toBe(15);
  });

  it('round-trips through ageBetween for a whole-year age', () => {
    const asOf = new Date(2026, 7, 4);
    const dob = reverseEngineerDOB(30, 0, 0, asOf);
    expect(ageBetween(dob, asOf)).toMatchObject({ years: 30, months: 0, days: 0 });
  });

  it('treats non-finite inputs as 0', () => {
    const asOf = new Date(2026, 7, 4);
    const dob = reverseEngineerDOB(NaN, NaN, NaN, asOf);
    expect(dob.getTime()).toBe(new Date(2026, 7, 4).getTime());
  });

  it('returns today when all components are 0', () => {
    const asOf = new Date(2026, 7, 4);
    expect(reverseEngineerDOB(0, 0, 0, asOf).getTime()).toBe(asOf.getTime());
  });
});
