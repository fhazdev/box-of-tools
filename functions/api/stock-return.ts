// Cloudflare Pages Function — GET /api/stock-return
//
// This is the one tool on the site that needs live external data (historical
// stock prices), which a fully static site can't provide on its own. Kept
// deliberately thin: validate input, fetch-or-serve-from-cache a ticker's
// full daily price history from Tiingo, then hand off to the same tested,
// framework-agnostic calculation used everywhere else in this repo
// (src/lib/stock.ts) to compute the actual result.
//
// Requires two things configured in the Cloudflare Pages dashboard (Settings
// → Functions), not committed here:
//   - A KV namespace bound as STOCK_CACHE
//   - A secret environment variable TIINGO_API_KEY
// See README.md for the one-time setup steps.

import {
  sanitizeTicker,
  mapTiingoResponse,
  calculateInvestmentReturn,
  type DailyPrice,
} from '../../src/lib/stock';

interface Env {
  TIINGO_API_KEY: string;
  STOCK_CACHE: KVNamespace;
}

// A closing price for a past date never changes, so the whole series is
// cached as one unit per ticker. ~20 hours keeps "today"'s price fresh
// without a network round-trip to Tiingo on every request.
const CACHE_TTL_SECONDS = 60 * 60 * 20;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

class UpstreamError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function fetchSeries(ticker: string, env: Env): Promise<DailyPrice[]> {
  const cacheKey = `series:${ticker}`;
  const cached = await env.STOCK_CACHE.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as DailyPrice[];
    } catch {
      // Corrupt cache entry — fall through and refetch.
    }
  }

  const url = `https://api.tiingo.com/tiingo/daily/${encodeURIComponent(ticker)}/prices?startDate=1970-01-01`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Token ${env.TIINGO_API_KEY}`,
      'content-type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new UpstreamError(`Tiingo request failed (${response.status})`, response.status);
  }

  const raw = await response.json();
  const series = mapTiingoResponse(raw);
  if (series.length > 0) {
    await env.STOCK_CACHE.put(cacheKey, JSON.stringify(series), { expirationTtl: CACHE_TTL_SECONDS });
  }
  return series;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const ticker = sanitizeTicker(url.searchParams.get('ticker') ?? '');
  const dateParam = url.searchParams.get('date') ?? '';
  const amountParam = Number(url.searchParams.get('amount'));
  const includeDividends = url.searchParams.get('dividends') !== 'false';

  if (!ticker) {
    return jsonResponse({ error: 'Enter a valid stock ticker.' }, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return jsonResponse({ error: 'Enter a valid purchase date.' }, 400);
  }
  const today = new Date().toISOString().slice(0, 10);
  if (dateParam > today) {
    return jsonResponse({ error: "Purchase date can't be in the future." }, 400);
  }
  if (!Number.isFinite(amountParam) || amountParam <= 0) {
    return jsonResponse({ error: 'Enter a valid investment amount.' }, 400);
  }

  let series: DailyPrice[];
  try {
    series = await fetchSeries(ticker, env);
  } catch (err) {
    if (err instanceof UpstreamError && err.status === 404) {
      return jsonResponse({ error: `"${ticker}" isn't a recognized ticker.` }, 404);
    }
    return jsonResponse({ error: 'Could not fetch stock data right now — try again in a moment.' }, 502);
  }

  if (series.length === 0) {
    return jsonResponse({ error: `"${ticker}" isn't a recognized ticker.` }, 404);
  }

  const result = calculateInvestmentReturn({
    series,
    purchaseDateRequested: dateParam,
    investmentAmount: amountParam,
    includeDividends,
  });

  if (!result) {
    return jsonResponse({ error: 'No price data available for that date.' }, 404);
  }

  return jsonResponse({ ticker, ...result });
};
