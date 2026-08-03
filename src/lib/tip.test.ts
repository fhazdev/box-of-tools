import { describe, it, expect } from 'vitest';
import { safe, resolveTipPercent, calculateTip } from './tip';

describe('safe', () => {
  it('passes through finite numbers unchanged', () => {
    expect(safe(42.5)).toBe(42.5);
    expect(safe(0)).toBe(0);
    expect(safe(-3)).toBe(-3);
  });

  it('replaces NaN and Infinity with 0', () => {
    expect(safe(NaN)).toBe(0);
    expect(safe(Infinity)).toBe(0);
    expect(safe(-Infinity)).toBe(0);
  });
});

describe('resolveTipPercent', () => {
  it('uses the preset when custom tip is empty', () => {
    expect(resolveTipPercent('', 18)).toBe(18);
  });

  it('uses the preset when custom tip is only whitespace', () => {
    expect(resolveTipPercent('   ', 20)).toBe(20);
  });

  it('returns 0 when custom tip is empty and no preset is selected', () => {
    expect(resolveTipPercent('', null)).toBe(0);
  });

  it('uses the custom value when provided, overriding the preset', () => {
    expect(resolveTipPercent('22', 15)).toBe(22);
  });

  it('supports decimal custom values', () => {
    expect(resolveTipPercent('17.5', 15)).toBe(17.5);
  });

  it('clamps negative custom values to 0', () => {
    expect(resolveTipPercent('-10', 15)).toBe(0);
  });

  it('falls back to 0 for a non-numeric custom value', () => {
    expect(resolveTipPercent('abc', 15)).toBe(0);
  });
});

describe('calculateTip', () => {
  it('computes a simple even split with no tax', () => {
    const result = calculateTip({
      billTotal: 100,
      addTaxSeparately: false,
      taxAmount: 0,
      tipPercent: 20,
      numPeople: 4,
      roundUp: false,
    });
    expect(result.subtotal).toBe(100);
    expect(result.tax).toBe(0);
    expect(result.tipAmount).toBe(20);
    expect(result.total).toBe(120);
    expect(result.peopleCount).toBe(4);
    expect(result.perPersonSubtotal).toBe(25);
    expect(result.perPersonTip).toBe(5);
    expect(result.perPersonTotalRaw).toBe(30);
    expect(result.perPersonOwed).toBe(30);
  });

  it('calculates tip on the subtotal only, then adds tax on top', () => {
    const result = calculateTip({
      billTotal: 100,
      addTaxSeparately: true,
      taxAmount: 8,
      tipPercent: 20,
      numPeople: 1,
      roundUp: false,
    });
    expect(result.tipAmount).toBe(20); // 20% of the 100 subtotal, not 108
    expect(result.total).toBe(128);
  });

  it('ignores taxAmount when addTaxSeparately is false', () => {
    const result = calculateTip({
      billTotal: 100,
      addTaxSeparately: false,
      taxAmount: 999,
      tipPercent: 10,
      numPeople: 1,
      roundUp: false,
    });
    expect(result.tax).toBe(0);
    expect(result.total).toBe(110);
  });

  it('rounds each person up to the nearest dollar when roundUp is true', () => {
    const result = calculateTip({
      billTotal: 50,
      addTaxSeparately: false,
      taxAmount: 0,
      tipPercent: 15,
      numPeople: 3,
      roundUp: true,
    });
    // total = 57.5, raw per-person = 19.1666...
    expect(result.perPersonTotalRaw).toBeCloseTo(19.1667, 3);
    expect(result.perPersonOwed).toBe(20);
  });

  it('leaves per-person totals unrounded when roundUp is false', () => {
    const result = calculateTip({
      billTotal: 50,
      addTaxSeparately: false,
      taxAmount: 0,
      tipPercent: 15,
      numPeople: 3,
      roundUp: false,
    });
    expect(result.perPersonOwed).toBeCloseTo(19.1667, 3);
  });

  it('does not round up when the per-person total is already a whole dollar', () => {
    const result = calculateTip({
      billTotal: 100,
      addTaxSeparately: false,
      taxAmount: 0,
      tipPercent: 20,
      numPeople: 4,
      roundUp: true,
    });
    expect(result.perPersonOwed).toBe(30);
  });

  it('treats 0 or negative numPeople as 1 person', () => {
    const zero = calculateTip({
      billTotal: 100,
      addTaxSeparately: false,
      taxAmount: 0,
      tipPercent: 10,
      numPeople: 0,
      roundUp: false,
    });
    const negative = calculateTip({
      billTotal: 100,
      addTaxSeparately: false,
      taxAmount: 0,
      tipPercent: 10,
      numPeople: -5,
      roundUp: false,
    });
    expect(zero.peopleCount).toBe(1);
    expect(negative.peopleCount).toBe(1);
    expect(zero.perPersonTotalRaw).toBe(110);
  });

  it('treats non-finite inputs as 0 via the safe() guard', () => {
    const result = calculateTip({
      billTotal: NaN,
      addTaxSeparately: true,
      taxAmount: NaN,
      tipPercent: 15,
      numPeople: 2,
      roundUp: false,
    });
    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });

  it('handles a 0% tip', () => {
    const result = calculateTip({
      billTotal: 40,
      addTaxSeparately: false,
      taxAmount: 0,
      tipPercent: 0,
      numPeople: 2,
      roundUp: false,
    });
    expect(result.tipAmount).toBe(0);
    expect(result.total).toBe(40);
  });

  it('handles a 0 bill total with tax still applied', () => {
    const result = calculateTip({
      billTotal: 0,
      addTaxSeparately: true,
      taxAmount: 5,
      tipPercent: 20,
      numPeople: 2,
      roundUp: false,
    });
    expect(result.tipAmount).toBe(0);
    expect(result.total).toBe(5);
  });
});
