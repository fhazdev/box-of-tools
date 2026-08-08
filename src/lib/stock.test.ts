import { describe, it, expect } from 'vitest';
import {
  sanitizeTicker,
  mapTiingoResponse,
  findTradingDayOnOrAfter,
  findLatestTradingDay,
  cumulativeSplitFactor,
  sumDividendsReceived,
  calculateInvestmentReturn,
  type DailyPrice,
} from './stock';

describe('sanitizeTicker', () => {
  it('uppercases and trims a valid ticker', () => {
    expect(sanitizeTicker('  vti ')).toBe('VTI');
  });

  it('accepts a share-class suffix', () => {
    expect(sanitizeTicker('brk.b')).toBe('BRK.B');
  });

  it('rejects empty, malformed, or overly long input', () => {
    expect(sanitizeTicker('')).toBeNull();
    expect(sanitizeTicker('   ')).toBeNull();
    expect(sanitizeTicker('TOOLONGTICKER')).toBeNull();
    expect(sanitizeTicker('VTI; DROP TABLE')).toBeNull();
    expect(sanitizeTicker('123')).toBeNull();
  });
});

describe('mapTiingoResponse', () => {
  it('normalizes ISO timestamps to plain dates and sorts ascending', () => {
    const result = mapTiingoResponse([
      { date: '2025-01-03T00:00:00.000Z', close: 102, adjClose: 102, divCash: 0, splitFactor: 1 },
      { date: '2025-01-02T00:00:00.000Z', close: 101, adjClose: 101, divCash: 0, splitFactor: 1 },
    ]);
    expect(result.map((r) => r.date)).toEqual(['2025-01-02', '2025-01-03']);
  });

  it('falls back to close when adjClose is missing or non-positive', () => {
    const result = mapTiingoResponse([{ date: '2025-01-02', close: 100, adjClose: 0, divCash: 0, splitFactor: 1 }]);
    expect(result[0].adjClose).toBe(100);
  });

  it('defaults a missing splitFactor to 1', () => {
    const result = mapTiingoResponse([{ date: '2025-01-02', close: 100, adjClose: 100, divCash: 0 }]);
    expect(result[0].splitFactor).toBe(1);
  });

  it('drops rows with no usable date or a non-positive close', () => {
    const result = mapTiingoResponse([
      { date: null, close: 100 },
      { date: '2025-01-02', close: 0 },
      { date: '2025-01-02', close: 100, adjClose: 100 },
    ]);
    expect(result).toHaveLength(1);
  });

  it('returns an empty array for non-array input', () => {
    expect(mapTiingoResponse(null)).toEqual([]);
    expect(mapTiingoResponse({ error: 'not found' })).toEqual([]);
  });
});

function series(rows: Array<[string, number, number, number, number]>): DailyPrice[] {
  return rows.map(([date, close, adjClose, divCash, splitFactor]) => ({ date, close, adjClose, divCash, splitFactor }));
}

describe('findTradingDayOnOrAfter', () => {
  const s = series([
    ['2025-01-02', 100, 100, 0, 1],
    ['2025-01-03', 101, 101, 0, 1],
    ['2025-01-06', 102, 102, 0, 1], // Jan 4-5 is a weekend, skipped
  ]);

  it('returns the exact day when it exists', () => {
    expect(findTradingDayOnOrAfter(s, '2025-01-03')?.date).toBe('2025-01-03');
  });

  it('rolls a weekend/holiday forward to the next trading day', () => {
    expect(findTradingDayOnOrAfter(s, '2025-01-04')?.date).toBe('2025-01-06');
  });

  it('falls back to the most recent entry when the date is beyond all data', () => {
    expect(findTradingDayOnOrAfter(s, '2030-01-01')?.date).toBe('2025-01-06');
  });

  it('returns null for an empty series', () => {
    expect(findTradingDayOnOrAfter([], '2025-01-03')).toBeNull();
  });
});

describe('findLatestTradingDay', () => {
  it('returns the last entry', () => {
    const s = series([
      ['2025-01-02', 100, 100, 0, 1],
      ['2025-01-03', 101, 101, 0, 1],
    ]);
    expect(findLatestTradingDay(s)?.date).toBe('2025-01-03');
  });

  it('returns null for an empty series', () => {
    expect(findLatestTradingDay([])).toBeNull();
  });
});

describe('cumulativeSplitFactor', () => {
  const s = series([
    ['2025-01-02', 500, 480, 0, 1],
    ['2025-01-03', 510, 490, 0, 1],
    ['2025-01-06', 127.5, 122.5, 0, 4], // 4:1 split lands here
    ['2025-01-07', 130, 125, 0, 1],
  ]);

  it('multiplies split factors strictly after the start date through the end date', () => {
    expect(cumulativeSplitFactor(s, '2025-01-02', '2025-01-07')).toBe(4);
  });

  it('excludes the split when the range starts on the split day itself (fromDate is exclusive)', () => {
    expect(cumulativeSplitFactor(s, '2025-01-06', '2025-01-07')).toBe(1);
  });

  it('excludes a split that falls entirely before the queried range', () => {
    expect(cumulativeSplitFactor(s, '2025-01-06', '2025-01-06')).toBe(1);
  });
});

describe('sumDividendsReceived', () => {
  it('sums dividends strictly after the start date through the end date', () => {
    const s = series([
      ['2025-01-02', 100, 100, 0, 1],
      ['2025-04-01', 100, 100, 0.5, 1],
      ['2025-07-01', 100, 100, 0.5, 1],
    ]);
    expect(sumDividendsReceived(s, '2025-01-02', '2025-07-01')).toBeCloseTo(1, 5);
    expect(sumDividendsReceived(s, '2025-04-01', '2025-07-01')).toBeCloseTo(0.5, 5);
  });
});

describe('calculateInvestmentReturn', () => {
  it('returns null when the series is empty', () => {
    expect(
      calculateInvestmentReturn({
        series: [],
        purchaseDateRequested: '2025-01-02',
        investmentAmount: 1000,
        includeDividends: true,
      })
    ).toBeNull();
  });

  it('computes total return directly from adjClose', () => {
    const s = series([
      ['2025-01-02', 100, 100, 0, 1],
      ['2025-06-01', 120, 120, 0, 1],
    ]);
    const result = calculateInvestmentReturn({
      series: s,
      purchaseDateRequested: '2025-01-02',
      investmentAmount: 1000,
      includeDividends: true,
    });
    expect(result!.shares).toBeCloseTo(10, 5);
    expect(result!.valueToday).toBeCloseTo(1200, 5);
    expect(result!.gainLoss).toBeCloseTo(200, 5);
    expect(result!.gainLossPercent).toBeCloseTo(20, 5);
  });

  it('computes price-only return using raw close, ignoring dividend-driven adjClose gaps', () => {
    // adjClose is well below close (as if a large dividend had been paid),
    // but price-only mode should ignore that entirely and use raw close.
    const s = series([
      ['2025-01-02', 100, 90, 0, 1],
      ['2025-06-01', 110, 99, 0, 1],
    ]);
    const result = calculateInvestmentReturn({
      series: s,
      purchaseDateRequested: '2025-01-02',
      investmentAmount: 1000,
      includeDividends: false,
    });
    expect(result!.shares).toBeCloseTo(10, 5);
    expect(result!.valueToday).toBeCloseTo(1100, 5);
  });

  it('correctly rescales the purchase price across a stock split in price-only mode', () => {
    // Bought pre-split at 500; a 4:1 split follows; latest raw close is 130.
    const s = series([
      ['2025-01-02', 500, 480, 0, 1],
      ['2025-01-03', 510, 490, 0, 1],
      ['2025-01-06', 127.5, 122.5, 0, 4],
      ['2025-01-07', 130, 125, 0, 1],
    ]);
    const result = calculateInvestmentReturn({
      series: s,
      purchaseDateRequested: '2025-01-02',
      investmentAmount: 125, // = 500 / 4, i.e. exactly 1 split-adjusted share
      includeDividends: false,
    });
    expect(result!.purchasePrice).toBeCloseTo(125, 5);
    expect(result!.shares).toBeCloseTo(1, 5);
    expect(result!.valueToday).toBeCloseTo(130, 5);
  });

  it('rolls a weekend purchase date forward to the next trading day', () => {
    const s = series([
      ['2025-01-03', 100, 100, 0, 1], // Friday
      ['2025-01-06', 102, 102, 0, 1], // Monday
    ]);
    const result = calculateInvestmentReturn({
      series: s,
      purchaseDateRequested: '2025-01-04', // Saturday
      investmentAmount: 100,
      includeDividends: true,
    });
    expect(result!.resolvedPurchaseDate).toBe('2025-01-06');
  });

  it('reports dividends received regardless of mode', () => {
    const s = series([
      ['2025-01-02', 100, 100, 0, 1],
      ['2025-04-01', 100, 100, 2.5, 1],
      ['2025-06-01', 110, 102.5, 0, 1],
    ]);
    const priceOnly = calculateInvestmentReturn({
      series: s,
      purchaseDateRequested: '2025-01-02',
      investmentAmount: 1000,
      includeDividends: false,
    });
    expect(priceOnly!.dividendsReceived).toBeCloseTo(2.5, 5);
  });

  it('treats a negative or non-finite investment amount as 0', () => {
    const s = series([
      ['2025-01-02', 100, 100, 0, 1],
      ['2025-06-01', 120, 120, 0, 1],
    ]);
    const result = calculateInvestmentReturn({
      series: s,
      purchaseDateRequested: '2025-01-02',
      investmentAmount: -500,
      includeDividends: true,
    });
    expect(result!.shares).toBe(0);
    expect(result!.valueToday).toBe(0);
  });
});
