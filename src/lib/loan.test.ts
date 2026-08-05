import { describe, it, expect } from 'vitest';
import { buildMonthlyAmortizationSchedule, calculateLoanSummary } from './loan';

// calculateMonthlyPI, the base (no-extra-payment) amortization schedule, and
// groupAmortizationByYear are already covered thoroughly by mortgage.test.ts
// (which now exercises this same implementation via mortgage.ts's re-export).
// These tests focus on what's new here: extra payments and loan summaries.

describe('buildMonthlyAmortizationSchedule with extra payments', () => {
  const START = new Date(2026, 7, 3); // August 3, 2026

  it('pays the loan off early with a monthly extra payment', () => {
    const withoutExtra = buildMonthlyAmortizationSchedule(120000, 0, 10, START);
    const withExtra = buildMonthlyAmortizationSchedule(120000, 0, 10, START, {
      amount: 500,
      frequency: 'monthly',
    });
    expect(withExtra.length).toBeLessThan(withoutExtra.length);
    expect(withExtra[withExtra.length - 1].endingBalance).toBeCloseTo(0, 1);
  });

  it('reduces total interest paid compared to no extra payment', () => {
    const withoutExtra = buildMonthlyAmortizationSchedule(120000, 5, 10, START);
    const withExtra = buildMonthlyAmortizationSchedule(120000, 5, 10, START, {
      amount: 200,
      frequency: 'monthly',
    });
    const interestWithout = withoutExtra.reduce((s, r) => s + r.interestPaid, 0);
    const interestWith = withExtra.reduce((s, r) => s + r.interestPaid, 0);
    expect(interestWith).toBeLessThan(interestWithout);
  });

  it('applies a yearly extra payment only every 12th payment', () => {
    const rows = buildMonthlyAmortizationSchedule(120000, 0, 10, START, {
      amount: 1000,
      frequency: 'yearly',
    });
    const extraMonths = rows.filter((r) => r.monthIndex % 12 === 0);
    const otherMonths = rows.filter((r) => r.monthIndex % 12 !== 0);
    // At 0% interest, the regular monthly principal is a flat 120000/120 = 1000.
    // Every 12th payment's principal should be 1000 more than that.
    for (const row of extraMonths) {
      expect(row.principalPaid).toBeCloseTo(120000 / 120 + 1000, 2);
    }
    for (const row of otherMonths) {
      expect(row.principalPaid).toBeCloseTo(120000 / 120, 2);
    }
  });

  it('applies a one-time extra payment only in its target month', () => {
    const target = new Date(2027, 0, 1); // matches the calendar month of payment #5 (Jan 2027)
    const rows = buildMonthlyAmortizationSchedule(120000, 0, 10, START, {
      amount: 5000,
      frequency: 'oneTime',
      oneTimeDate: target,
    });
    const targetRow = rows.find((r) => r.date.getFullYear() === 2027 && r.date.getMonth() === 0);
    expect(targetRow).toBeDefined();
    expect(targetRow!.principalPaid).toBeCloseTo(120000 / 120 + 5000, 2);

    const otherRows = rows.filter((r) => r !== targetRow);
    for (const row of otherRows) {
      expect(row.principalPaid).toBeCloseTo(120000 / 120, 2);
    }
  });

  it('caps the extra payment so the balance never goes negative', () => {
    const rows = buildMonthlyAmortizationSchedule(1000, 0, 1, START, {
      amount: 10000,
      frequency: 'monthly',
    });
    // Loan should be paid off on the very first payment, not overshoot into a negative balance.
    expect(rows).toHaveLength(1);
    expect(rows[0].endingBalance).toBe(0);
    expect(rows[0].principalPaid).toBeCloseTo(1000, 5);
  });

  it('ignores a non-positive extra payment amount', () => {
    const rows = buildMonthlyAmortizationSchedule(120000, 5, 10, START, {
      amount: 0,
      frequency: 'monthly',
    });
    const baseline = buildMonthlyAmortizationSchedule(120000, 5, 10, START);
    expect(rows).toHaveLength(baseline.length);
  });
});

describe('calculateLoanSummary', () => {
  it('matches a known reference scenario with no fees or extra payments', () => {
    const result = calculateLoanSummary({
      loanAmount: 10000,
      termYears: 5,
      interestRatePercent: 10,
      originationFeePercent: 0,
      otherFees: 0,
    });
    expect(result.monthlyPayment).toBeCloseTo(212.47, 1);
    expect(result.totalPrincipalPaid).toBeCloseTo(10000, 0);
    expect(result.totalInterestPaid).toBeCloseTo(2748.23, 0);
    expect(result.totalFees).toBe(0);
    expect(result.totalCostOfLoan).toBeCloseTo(12748.23, 0);
    expect(result.monthsToPayoff).toBe(60);
  });

  it('adds origination fee and other fees to the total cost without changing the payment', () => {
    const withoutFees = calculateLoanSummary({
      loanAmount: 10000,
      termYears: 5,
      interestRatePercent: 10,
      originationFeePercent: 0,
      otherFees: 0,
    });
    const withFees = calculateLoanSummary({
      loanAmount: 10000,
      termYears: 5,
      interestRatePercent: 10,
      originationFeePercent: 3,
      otherFees: 50,
    });
    expect(withFees.monthlyPayment).toBeCloseTo(withoutFees.monthlyPayment, 5);
    expect(withFees.originationFeeAmount).toBeCloseTo(300, 5);
    expect(withFees.totalFees).toBeCloseTo(350, 5);
    expect(withFees.totalCostOfLoan).toBeCloseTo(withoutFees.totalCostOfLoan + 350, 1);
  });

  it('reports a payoff date matching the last amortization row', () => {
    const start = new Date(2026, 0, 1);
    const result = calculateLoanSummary({
      loanAmount: 10000,
      termYears: 1,
      interestRatePercent: 5,
      originationFeePercent: 0,
      otherFees: 0,
      startDate: start,
    });
    expect(result.payoffDate).not.toBeNull();
    expect(result.payoffDate!.getFullYear()).toBe(2027);
    expect(result.payoffDate!.getMonth()).toBe(0); // January, 12 months after Jan 2026
    expect(result.monthsToPayoff).toBe(12);
  });

  it('returns a null payoff date and empty schedule for a zero loan amount', () => {
    const result = calculateLoanSummary({
      loanAmount: 0,
      termYears: 5,
      interestRatePercent: 10,
      originationFeePercent: 0,
      otherFees: 0,
    });
    expect(result.payoffDate).toBeNull();
    expect(result.monthsToPayoff).toBe(0);
    expect(result.schedule).toEqual([]);
  });

  it('shortens the payoff date when an extra payment is applied', () => {
    const withoutExtra = calculateLoanSummary({
      loanAmount: 120000,
      termYears: 10,
      interestRatePercent: 5,
      originationFeePercent: 0,
      otherFees: 0,
    });
    const withExtra = calculateLoanSummary({
      loanAmount: 120000,
      termYears: 10,
      interestRatePercent: 5,
      originationFeePercent: 0,
      otherFees: 0,
      extraPayment: { amount: 500, frequency: 'monthly' },
    });
    expect(withExtra.monthsToPayoff).toBeLessThan(withoutExtra.monthsToPayoff);
    expect(withExtra.totalInterestPaid).toBeLessThan(withoutExtra.totalInterestPaid);
  });

  it('treats a negative loan amount as 0', () => {
    const result = calculateLoanSummary({
      loanAmount: -5000,
      termYears: 5,
      interestRatePercent: 10,
      originationFeePercent: 0,
      otherFees: 0,
    });
    expect(result.monthlyPayment).toBe(0);
    expect(result.schedule).toEqual([]);
  });
});
