import { safe } from './number';
// The month-by-month amortization simulation is loan-agnostic, so it lives
// in loan.ts and is reused here rather than duplicated.
export {
  calculateMonthlyPI,
  buildMonthlyAmortizationSchedule,
  groupAmortizationByYear,
  type AmortizationMonthRow,
  type AmortizationYearGroup,
} from './loan';
import { calculateMonthlyPI } from './loan';

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
