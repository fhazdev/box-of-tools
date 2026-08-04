import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyPI,
  downPaymentPercentFromAmount,
  downPaymentAmountFromPercent,
  calculateMortgage,
  buildMonthlyAmortizationSchedule,
  groupAmortizationByYear,
} from './mortgage';

describe('calculateMonthlyPI', () => {
  it('matches a known reference value ($300k, 4%, 30yr ≈ $1,432.25)', () => {
    expect(calculateMonthlyPI(300000, 4, 30)).toBeCloseTo(1432.25, 1);
  });

  it('matches a known reference value ($340k, 5%, 30yr ≈ $1,825.19)', () => {
    expect(calculateMonthlyPI(340000, 5, 30)).toBeCloseTo(1825.19, 1);
  });

  it('divides evenly with a 0% interest rate', () => {
    expect(calculateMonthlyPI(120000, 0, 10)).toBeCloseTo(1000, 2); // 120000 / 120 months
  });

  it('returns 0 when principal is 0 or negative', () => {
    expect(calculateMonthlyPI(0, 5, 30)).toBe(0);
    expect(calculateMonthlyPI(-1000, 5, 30)).toBe(0);
  });

  it('returns 0 when termYears is 0 or negative', () => {
    expect(calculateMonthlyPI(200000, 5, 0)).toBe(0);
    expect(calculateMonthlyPI(200000, 5, -5)).toBe(0);
  });

  it('treats non-finite inputs as 0 via the safe() guard', () => {
    expect(calculateMonthlyPI(NaN, 5, 30)).toBe(0);
    expect(calculateMonthlyPI(200000, NaN, 30)).toBeCloseTo(200000 / 360, 2);
  });

  it('increases the payment as the interest rate increases', () => {
    const low = calculateMonthlyPI(300000, 3, 30);
    const high = calculateMonthlyPI(300000, 7, 30);
    expect(high).toBeGreaterThan(low);
  });

  it('increases the payment as the term shortens', () => {
    const long = calculateMonthlyPI(300000, 5, 30);
    const short = calculateMonthlyPI(300000, 5, 15);
    expect(short).toBeGreaterThan(long);
  });
});

describe('downPaymentPercentFromAmount / downPaymentAmountFromPercent', () => {
  it('round-trips between amount and percent', () => {
    const percent = downPaymentPercentFromAmount(425000, 85000);
    expect(percent).toBeCloseTo(20, 5);
    expect(downPaymentAmountFromPercent(425000, percent)).toBeCloseTo(85000, 5);
  });

  it('returns 0% when home price is 0', () => {
    expect(downPaymentPercentFromAmount(0, 10000)).toBe(0);
  });

  it('returns $0 for a 0% down payment', () => {
    expect(downPaymentAmountFromPercent(425000, 0)).toBe(0);
  });

  it('treats non-finite inputs as 0', () => {
    expect(downPaymentPercentFromAmount(NaN, 1000)).toBe(0);
    expect(downPaymentAmountFromPercent(425000, NaN)).toBe(0);
  });
});

describe('calculateMortgage', () => {
  it('matches the reference scenario ($425k home, $85k down, 30yr, 5%)', () => {
    const result = calculateMortgage({
      homePrice: 425000,
      downPayment: 85000,
      termYears: 30,
      interestRatePercent: 5,
      propertyTaxMonthly: 280,
      homeownersInsuranceMonthly: 66,
      pmiMonthly: 0,
      hoaMonthly: 0,
    });
    expect(result.loanAmount).toBe(340000);
    expect(result.monthlyPI).toBeCloseTo(1825.19, 1);
    expect(result.totalMonthlyPayment).toBeCloseTo(2171.19, 1);
  });

  it('produces a breakdown with all five fixed categories in order', () => {
    const result = calculateMortgage({
      homePrice: 300000,
      downPayment: 60000,
      termYears: 30,
      interestRatePercent: 5,
      propertyTaxMonthly: 100,
      homeownersInsuranceMonthly: 50,
      pmiMonthly: 20,
      hoaMonthly: 10,
    });
    expect(result.breakdown.map((b) => b.key)).toEqual(['pi', 'tax', 'insurance', 'pmi', 'hoa']);
    expect(result.breakdown.find((b) => b.key === 'tax')?.value).toBe(100);
    expect(result.breakdown.find((b) => b.key === 'hoa')?.value).toBe(10);
  });

  it('clamps the loan amount to 0 when the down payment exceeds the home price', () => {
    const result = calculateMortgage({
      homePrice: 100000,
      downPayment: 150000,
      termYears: 30,
      interestRatePercent: 5,
      propertyTaxMonthly: 0,
      homeownersInsuranceMonthly: 0,
      pmiMonthly: 0,
      hoaMonthly: 0,
    });
    expect(result.loanAmount).toBe(0);
    expect(result.monthlyPI).toBe(0);
  });

  it('totals the P&I plus every extra monthly cost', () => {
    const result = calculateMortgage({
      homePrice: 300000,
      downPayment: 60000,
      termYears: 30,
      interestRatePercent: 0,
      propertyTaxMonthly: 100,
      homeownersInsuranceMonthly: 50,
      pmiMonthly: 20,
      hoaMonthly: 10,
    });
    // 0% interest: P&I = 240000 / 360 = 666.67
    expect(result.totalMonthlyPayment).toBeCloseTo(666.67 + 100 + 50 + 20 + 10, 1);
  });

  it('treats non-finite extra costs as 0', () => {
    const result = calculateMortgage({
      homePrice: 300000,
      downPayment: 60000,
      termYears: 30,
      interestRatePercent: 5,
      propertyTaxMonthly: NaN,
      homeownersInsuranceMonthly: NaN,
      pmiMonthly: NaN,
      hoaMonthly: NaN,
    });
    expect(result.totalMonthlyPayment).toBeCloseTo(result.monthlyPI, 5);
  });
});

describe('buildMonthlyAmortizationSchedule', () => {
  // Fixed reference date so date-based assertions don't depend on when the
  // test suite happens to run.
  const START = new Date(2026, 7, 3); // August 3, 2026

  it('returns one row per month', () => {
    const rows = buildMonthlyAmortizationSchedule(300000, 5, 30, START);
    expect(rows).toHaveLength(360);
    expect(rows[0].monthIndex).toBe(1);
    expect(rows[359].monthIndex).toBe(360);
  });

  it('starts the first payment the month after the start date', () => {
    const rows = buildMonthlyAmortizationSchedule(300000, 5, 30, START);
    expect(rows[0].date.getFullYear()).toBe(2026);
    expect(rows[0].date.getMonth()).toBe(8); // September (0-indexed)
    expect(rows[0].year).toBe(2026);
  });

  it('rolls over into the next calendar year correctly', () => {
    const rows = buildMonthlyAmortizationSchedule(300000, 5, 30, START);
    // Payments 1-4 are Sep-Dec 2026, payment 5 is Jan 2027
    expect(rows[3].year).toBe(2026);
    expect(rows[4].year).toBe(2027);
    expect(rows[4].date.getMonth()).toBe(0); // January
  });

  it('returns an empty array for a 0 or negative principal', () => {
    expect(buildMonthlyAmortizationSchedule(0, 5, 30, START)).toEqual([]);
    expect(buildMonthlyAmortizationSchedule(-1000, 5, 30, START)).toEqual([]);
  });

  it('returns an empty array for a 0 or negative term', () => {
    expect(buildMonthlyAmortizationSchedule(300000, 5, 0, START)).toEqual([]);
  });

  it('pays off the loan in full by the last month', () => {
    const rows = buildMonthlyAmortizationSchedule(300000, 5, 30, START);
    expect(rows[rows.length - 1].endingBalance).toBeCloseTo(0, 1);
  });

  it('sums monthly principal paid to the original loan amount', () => {
    const principal = 300000;
    const rows = buildMonthlyAmortizationSchedule(principal, 5, 30, START);
    const totalPrincipalPaid = rows.reduce((sum, r) => sum + r.principalPaid, 0);
    expect(totalPrincipalPaid).toBeCloseTo(principal, 0);
  });

  it('has a strictly decreasing ending balance month over month', () => {
    const rows = buildMonthlyAmortizationSchedule(300000, 5, 15, START);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].endingBalance).toBeLessThan(rows[i - 1].endingBalance);
    }
  });

  it('shifts more of each payment toward principal over time', () => {
    const rows = buildMonthlyAmortizationSchedule(300000, 5, 30, START);
    expect(rows[rows.length - 1].principalPaid).toBeGreaterThan(rows[0].principalPaid);
    expect(rows[rows.length - 1].interestPaid).toBeLessThan(rows[0].interestPaid);
  });

  it('amortizes evenly with a 0% interest rate', () => {
    const rows = buildMonthlyAmortizationSchedule(120000, 0, 10, START);
    for (const row of rows) {
      expect(row.interestPaid).toBeCloseTo(0, 5);
      expect(row.principalPaid).toBeCloseTo(1000, 2); // 120000 / 120 months
    }
  });

  it('sets totalPayment to principal plus interest for each month', () => {
    const rows = buildMonthlyAmortizationSchedule(300000, 5, 30, START);
    for (const row of rows) {
      expect(row.totalPayment).toBeCloseTo(row.principalPaid + row.interestPaid, 8);
    }
  });
});

describe('groupAmortizationByYear', () => {
  const START = new Date(2026, 7, 3); // August 3, 2026 → first payment Sep 2026

  it('returns an empty array for no months', () => {
    expect(groupAmortizationByYear([])).toEqual([]);
  });

  it('groups a 30-year loan into 31 calendar years (partial first and last year)', () => {
    // First payment is Sep 2026, so year 2026 only has 4 months (Sep-Dec);
    // the 360th payment lands in Aug 2056, an 8-month final year.
    const months = buildMonthlyAmortizationSchedule(300000, 5, 30, START);
    const groups = groupAmortizationByYear(months);
    expect(groups).toHaveLength(31);
    expect(groups[0].year).toBe(2026);
    expect(groups[0].months).toHaveLength(4);
    expect(groups[groups.length - 1].year).toBe(2056);
    expect(groups[groups.length - 1].months).toHaveLength(8);

    const totalMonths = groups.reduce((sum, g) => sum + g.months.length, 0);
    expect(totalMonths).toBe(360);
  });

  it('preserves calendar-year order', () => {
    const months = buildMonthlyAmortizationSchedule(300000, 5, 30, START);
    const groups = groupAmortizationByYear(months);
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i].year).toBe(groups[i - 1].year + 1);
    }
  });

  it('sums each year’s principal, interest, and total payment from its months', () => {
    const months = buildMonthlyAmortizationSchedule(300000, 5, 30, START);
    const groups = groupAmortizationByYear(months);
    const fullYear = groups[1]; // 2027 — a full 12-month year
    const expectedPrincipal = fullYear.months.reduce((s, m) => s + m.principalPaid, 0);
    const expectedInterest = fullYear.months.reduce((s, m) => s + m.interestPaid, 0);
    expect(fullYear.principalPaid).toBeCloseTo(expectedPrincipal, 8);
    expect(fullYear.interestPaid).toBeCloseTo(expectedInterest, 8);
    expect(fullYear.totalPayment).toBeCloseTo(expectedPrincipal + expectedInterest, 8);
  });

  it("sets a year's endingBalance to its last month's balance", () => {
    const months = buildMonthlyAmortizationSchedule(300000, 5, 30, START);
    const groups = groupAmortizationByYear(months);
    const fullYear = groups[1];
    expect(fullYear.endingBalance).toBe(fullYear.months[fullYear.months.length - 1].endingBalance);
  });
});
