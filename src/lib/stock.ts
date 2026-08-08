import { safe } from './number';

export interface DailyPrice {
  date: string; // YYYY-MM-DD
  close: number; // unadjusted close, as actually traded that day
  adjClose: number; // split- and dividend-adjusted close (a total-return series)
  divCash: number; // cash dividend paid on this date (0 most days)
  splitFactor: number; // split ratio applied on this date (1 on non-split days)
}

export function sanitizeTicker(input: string): string | null {
  const trimmed = input.trim().toUpperCase();
  // Covers the vast majority of US tickers, including share classes like BRK.B.
  if (!/^[A-Z]{1,6}(\.[A-Z]{1,2})?$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Converts Tiingo's raw daily-prices JSON into our normalized shape.
 * Tiingo returns `date` as a full ISO timestamp ("2025-01-02T00:00:00.000Z"),
 * not a plain date, and can include non-numeric or missing fields for
 * malformed rows — both are normalized/filtered out here so the rest of this
 * module can assume a clean, ascending-by-date series of real trading days.
 */
export function mapTiingoResponse(json: unknown): DailyPrice[] {
  if (!Array.isArray(json)) return [];

  const rows: DailyPrice[] = [];
  for (const entry of json) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;

    const date = typeof e.date === 'string' ? e.date.slice(0, 10) : null;
    const close = safe(Number(e.close));
    if (!date || close <= 0) continue;

    const adjCloseRaw = safe(Number(e.adjClose));
    rows.push({
      date,
      close,
      adjClose: adjCloseRaw > 0 ? adjCloseRaw : close,
      divCash: Math.max(0, safe(Number(e.divCash))),
      splitFactor: safe(Number(e.splitFactor)) || 1,
    });
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows;
}

/**
 * The first trading day on or after `targetDate` — e.g. a purchase date that
 * falls on a weekend or market holiday resolves to the next open day. Falls
 * back to the most recent entry if `targetDate` is after all available data
 * (e.g. "today", when the latest close hasn't posted yet). Assumes `series`
 * is sorted ascending by date.
 */
export function findTradingDayOnOrAfter(series: DailyPrice[], targetDate: string): DailyPrice | null {
  if (series.length === 0) return null;
  return series.find((entry) => entry.date >= targetDate) ?? series[series.length - 1];
}

export function findLatestTradingDay(series: DailyPrice[]): DailyPrice | null {
  return series.length > 0 ? series[series.length - 1] : null;
}

/**
 * Product of every split factor applied strictly after `fromDate` through
 * `toDate` (inclusive) — i.e. how much a raw price *before* those splits
 * needs to be divided by to be comparable to a raw price after them.
 */
export function cumulativeSplitFactor(series: DailyPrice[], fromDate: string, toDate: string): number {
  let factor = 1;
  for (const entry of series) {
    if (entry.date > fromDate && entry.date <= toDate) {
      factor *= entry.splitFactor || 1;
    }
  }
  return factor;
}

/** Total cash dividends paid strictly after `fromDate` through `toDate`. */
export function sumDividendsReceived(series: DailyPrice[], fromDate: string, toDate: string): number {
  let total = 0;
  for (const entry of series) {
    if (entry.date > fromDate && entry.date <= toDate) {
      total += entry.divCash;
    }
  }
  return total;
}

export interface InvestmentReturnInput {
  series: DailyPrice[];
  /** The date the user asked to invest on — resolved to the next trading day if needed. */
  purchaseDateRequested: string;
  investmentAmount: number;
  /** Total return (dividends reinvested via adjClose) vs. price appreciation only. */
  includeDividends: boolean;
}

export interface InvestmentReturnResult {
  resolvedPurchaseDate: string;
  latestDate: string;
  shares: number;
  purchasePrice: number;
  latestPrice: number;
  valueToday: number;
  gainLoss: number;
  gainLossPercent: number;
  /** Cash dividends paid since purchase — informational in both modes. */
  dividendsReceived: number;
}

export function calculateInvestmentReturn(input: InvestmentReturnInput): InvestmentReturnResult | null {
  const purchase = findTradingDayOnOrAfter(input.series, input.purchaseDateRequested);
  const latest = findLatestTradingDay(input.series);
  if (!purchase || !latest) return null;

  const amount = Math.max(0, safe(input.investmentAmount));
  const dividendsReceived = sumDividendsReceived(input.series, purchase.date, latest.date);

  let purchasePrice: number;
  let latestPrice: number;

  if (input.includeDividends) {
    // adjClose is already a consistent total-return series — no manual
    // reinvestment simulation needed.
    purchasePrice = purchase.adjClose;
    latestPrice = latest.adjClose;
  } else {
    // Raw close prices aren't comparable across a split (e.g. a 4:1 split
    // makes pre-split prices look 4x too high) — rescale the purchase price
    // into today's post-split terms, but leave dividends out entirely.
    const splitFactor = cumulativeSplitFactor(input.series, purchase.date, latest.date);
    purchasePrice = splitFactor > 0 ? purchase.close / splitFactor : purchase.close;
    latestPrice = latest.close;
  }

  const shares = purchasePrice > 0 ? amount / purchasePrice : 0;
  const valueToday = shares * latestPrice;
  const gainLoss = valueToday - amount;

  return {
    resolvedPurchaseDate: purchase.date,
    latestDate: latest.date,
    shares,
    purchasePrice,
    latestPrice,
    valueToday,
    gainLoss,
    gainLossPercent: amount > 0 ? (gainLoss / amount) * 100 : 0,
    dividendsReceived,
  };
}
