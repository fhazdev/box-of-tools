import { safe } from './number';

export function calculateMonthlyPI(
  principal: number,
  annualRatePercent: number,
  termYears: number
): number {
  const p = safe(principal);
  const years = safe(termYears);
  if (p <= 0 || years <= 0) return 0;

  const monthlyRate = safe(annualRatePercent) / 100 / 12;
  const numPayments = Math.round(years * 12);
  if (monthlyRate === 0) return p / numPayments;

  const factor = Math.pow(1 + monthlyRate, numPayments);
  return (p * (monthlyRate * factor)) / (factor - 1);
}

export interface AmortizationMonthRow {
  monthIndex: number; // 1-based payment number over the life of the loan
  year: number; // calendar year of this payment, for grouping
  date: Date; // first of the calendar month this payment is due
  principalPaid: number;
  interestPaid: number;
  totalPayment: number;
  endingBalance: number;
}

export type ExtraPaymentFrequency = 'monthly' | 'yearly' | 'oneTime';

export interface ExtraPaymentInput {
  amount: number;
  frequency: ExtraPaymentFrequency;
  /** Only used when frequency is 'oneTime' — the calendar month this payment lands in. */
  oneTimeDate?: Date;
}

function extraPaymentForMonth(
  extraPayment: ExtraPaymentInput | undefined,
  monthIndex: number,
  date: Date
): number {
  if (!extraPayment) return 0;
  const amount = Math.max(0, safe(extraPayment.amount));
  if (amount <= 0) return 0;

  switch (extraPayment.frequency) {
    case 'monthly':
      return amount;
    case 'yearly':
      return monthIndex % 12 === 0 ? amount : 0;
    case 'oneTime': {
      const target = extraPayment.oneTimeDate;
      if (!target) return 0;
      return target.getFullYear() === date.getFullYear() && target.getMonth() === date.getMonth()
        ? amount
        : 0;
    }
    default:
      return 0;
  }
}

// Simulates the loan month by month — interest accrues on the remaining
// balance, which changes every payment, so this can't be computed from
// yearly totals alone. Payments are assumed to start the month after
// `startDate` (the standard loan convention), defaulting to today.
//
// An optional extra payment (monthly, yearly, or a single one-time payment)
// goes entirely toward principal and can pay the loan off before its
// scheduled term — the loop stops as soon as the balance is cleared.
export function buildMonthlyAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  termYears: number,
  startDate: Date = new Date(),
  extraPayment?: ExtraPaymentInput
): AmortizationMonthRow[] {
  const p = safe(principal);
  const years = safe(termYears);
  if (p <= 0 || years <= 0) return [];

  const monthlyRate = safe(annualRatePercent) / 100 / 12;
  const totalMonths = Math.round(years * 12);
  const payment = calculateMonthlyPI(p, annualRatePercent, years);

  const rows: AmortizationMonthRow[] = [];
  let balance = p;

  for (let i = 1; i <= totalMonths && balance > 0.005; i++) {
    // Date constructor normalizes month overflow (e.g. month 13 → next Jan),
    // so this rolls over calendar years correctly without extra bookkeeping.
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);

    const interestPortion = balance * monthlyRate;
    let principalPortion = payment - interestPortion;
    // Guard against floating-point overshoot on the final scheduled payment
    if (principalPortion > balance) principalPortion = balance;
    if (principalPortion < 0) principalPortion = 0;

    let extra = extraPaymentForMonth(extraPayment, i, date);
    const remainingAfterScheduled = balance - principalPortion;
    if (extra > remainingAfterScheduled) extra = Math.max(0, remainingAfterScheduled);

    balance -= principalPortion + extra;

    rows.push({
      monthIndex: i,
      year: date.getFullYear(),
      date,
      principalPaid: principalPortion + extra,
      interestPaid: interestPortion,
      totalPayment: principalPortion + interestPortion + extra,
      endingBalance: Math.max(0, balance),
    });
  }

  return rows;
}

export interface AmortizationYearGroup {
  year: number;
  principalPaid: number;
  interestPaid: number;
  totalPayment: number;
  endingBalance: number;
  months: AmortizationMonthRow[];
}

export function groupAmortizationByYear(months: AmortizationMonthRow[]): AmortizationYearGroup[] {
  const groups: AmortizationYearGroup[] = [];
  const byYear = new Map<number, AmortizationYearGroup>();

  for (const month of months) {
    let group = byYear.get(month.year);
    if (!group) {
      group = { year: month.year, principalPaid: 0, interestPaid: 0, totalPayment: 0, endingBalance: 0, months: [] };
      byYear.set(month.year, group);
      groups.push(group);
    }
    group.principalPaid += month.principalPaid;
    group.interestPaid += month.interestPaid;
    group.totalPayment += month.totalPayment;
    group.endingBalance = month.endingBalance;
    group.months.push(month);
  }

  return groups;
}

export interface LoanSummaryInput {
  loanAmount: number;
  termYears: number;
  interestRatePercent: number;
  originationFeePercent: number;
  otherFees: number;
  extraPayment?: ExtraPaymentInput;
  startDate?: Date;
}

export interface LoanSummaryResult {
  /** The scheduled principal & interest payment — before any extra payments. */
  monthlyPayment: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  originationFeeAmount: number;
  totalFees: number;
  /** Principal + interest actually paid, plus fees. */
  totalCostOfLoan: number;
  payoffDate: Date | null;
  monthsToPayoff: number;
  schedule: AmortizationMonthRow[];
}

export function calculateLoanSummary(input: LoanSummaryInput): LoanSummaryResult {
  const loanAmount = Math.max(0, safe(input.loanAmount));
  const termYears = Math.max(0, safe(input.termYears));
  const monthlyPayment = calculateMonthlyPI(loanAmount, input.interestRatePercent, termYears);

  const schedule = buildMonthlyAmortizationSchedule(
    loanAmount,
    input.interestRatePercent,
    termYears,
    input.startDate ?? new Date(),
    input.extraPayment
  );

  const totalPrincipalPaid = schedule.reduce((sum, row) => sum + row.principalPaid, 0);
  const totalInterestPaid = schedule.reduce((sum, row) => sum + row.interestPaid, 0);
  const originationFeeAmount = loanAmount * (Math.max(0, safe(input.originationFeePercent)) / 100);
  const otherFees = Math.max(0, safe(input.otherFees));
  const totalFees = originationFeeAmount + otherFees;
  const lastRow = schedule.length > 0 ? schedule[schedule.length - 1] : null;

  return {
    monthlyPayment,
    totalPrincipalPaid,
    totalInterestPaid,
    originationFeeAmount,
    totalFees,
    totalCostOfLoan: totalPrincipalPaid + totalInterestPaid + totalFees,
    payoffDate: lastRow ? lastRow.date : null,
    monthsToPayoff: schedule.length,
    schedule,
  };
}
