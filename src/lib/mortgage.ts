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

export function downPaymentPercentFromAmount(homePrice: number, amount: number): number {
  const price = safe(homePrice);
  return price > 0 ? (safe(amount) / price) * 100 : 0;
}

export function downPaymentAmountFromPercent(homePrice: number, percent: number): number {
  return safe(homePrice) * (safe(percent) / 100);
}

export type MortgageBreakdownKey = 'pi' | 'tax' | 'insurance' | 'pmi' | 'hoa';

export interface MortgageBreakdownItem {
  key: MortgageBreakdownKey;
  label: string;
  value: number;
}

export interface MortgageInput {
  homePrice: number;
  downPayment: number;
  termYears: number;
  interestRatePercent: number;
  propertyTaxMonthly: number;
  homeownersInsuranceMonthly: number;
  pmiMonthly: number;
  hoaMonthly: number;
}

export interface MortgageResult {
  loanAmount: number;
  monthlyPI: number;
  totalMonthlyPayment: number;
  breakdown: MortgageBreakdownItem[];
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const homePrice = safe(input.homePrice);
  const downPayment = safe(input.downPayment);
  const loanAmount = Math.max(0, homePrice - downPayment);
  const monthlyPI = calculateMonthlyPI(loanAmount, input.interestRatePercent, input.termYears);

  const propertyTax = safe(input.propertyTaxMonthly);
  const insurance = safe(input.homeownersInsuranceMonthly);
  const pmi = safe(input.pmiMonthly);
  const hoa = safe(input.hoaMonthly);

  const breakdown: MortgageBreakdownItem[] = [
    { key: 'pi', label: 'Principal & Interest', value: monthlyPI },
    { key: 'tax', label: 'Property Tax', value: propertyTax },
    { key: 'insurance', label: "Homeowner's Insurance", value: insurance },
    { key: 'pmi', label: 'PMI', value: pmi },
    { key: 'hoa', label: 'HOA Fees', value: hoa },
  ];

  const totalMonthlyPayment = breakdown.reduce((sum, item) => sum + item.value, 0);

  return { loanAmount, monthlyPI, totalMonthlyPayment, breakdown };
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

// Simulates the loan month by month — interest accrues on the remaining
// balance, which changes every payment, so this can't be computed from
// yearly totals alone. Payments are assumed to start the month after
// `startDate` (the standard mortgage convention), defaulting to today.
export function buildMonthlyAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  termYears: number,
  startDate: Date = new Date()
): AmortizationMonthRow[] {
  const p = safe(principal);
  const years = safe(termYears);
  if (p <= 0 || years <= 0) return [];

  const monthlyRate = safe(annualRatePercent) / 100 / 12;
  const totalMonths = Math.round(years * 12);
  const payment = calculateMonthlyPI(p, annualRatePercent, years);

  const rows: AmortizationMonthRow[] = [];
  let balance = p;

  for (let i = 1; i <= totalMonths; i++) {
    const interestPortion = balance * monthlyRate;
    let principalPortion = payment - interestPortion;
    // Guard against floating-point overshoot on the final payment
    if (principalPortion > balance) principalPortion = balance;
    if (principalPortion < 0) principalPortion = 0;

    balance -= principalPortion;

    // Date constructor normalizes month overflow (e.g. month 13 → next Jan),
    // so this rolls over calendar years correctly without extra bookkeeping.
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);

    rows.push({
      monthIndex: i,
      year: date.getFullYear(),
      date,
      principalPaid: principalPortion,
      interestPaid: interestPortion,
      totalPayment: principalPortion + interestPortion,
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
