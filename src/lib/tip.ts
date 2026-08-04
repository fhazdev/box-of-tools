export { safe } from './number';
import { safe } from './number';

export function resolveTipPercent(customTip: string, selectedPreset: number | null): number {
  const custom = customTip.trim();
  if (custom !== '') {
    const n = Number(custom);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return selectedPreset ?? 0;
}

export interface TipCalculationInput {
  billTotal: number;
  addTaxSeparately: boolean;
  taxAmount: number;
  tipPercent: number;
  numPeople: number;
  roundUp: boolean;
}

export interface TipCalculationResult {
  subtotal: number;
  tax: number;
  tipAmount: number;
  total: number;
  peopleCount: number;
  perPersonSubtotal: number;
  perPersonTip: number;
  perPersonTotalRaw: number;
  perPersonOwed: number;
}

export function calculateTip(input: TipCalculationInput): TipCalculationResult {
  const subtotal = safe(input.billTotal);
  const tax = input.addTaxSeparately ? safe(input.taxAmount) : 0;
  const tipAmount = subtotal * (safe(input.tipPercent) / 100);
  const total = subtotal + tipAmount + tax;

  const peopleCount = Math.max(1, input.numPeople);
  const perPersonSubtotal = subtotal / peopleCount;
  const perPersonTip = tipAmount / peopleCount;
  const perPersonTotalRaw = total / peopleCount;
  const perPersonOwed = input.roundUp ? Math.ceil(perPersonTotalRaw) : perPersonTotalRaw;

  return {
    subtotal,
    tax,
    tipAmount,
    total,
    peopleCount,
    perPersonSubtotal,
    perPersonTip,
    perPersonTotalRaw,
    perPersonOwed,
  };
}
