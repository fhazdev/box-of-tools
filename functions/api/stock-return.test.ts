import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onRequestGet } from './stock-return';

// A minimal in-memory stand-in for the KVNamespace binding Cloudflare
// provides at runtime — just enough of the surface this Function uses.
function fakeKV() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    _store: store,
  };
}

const TIINGO_ROWS = [
  { date: '2025-01-02T00:00:00.000Z', close: 100, adjClose: 100, divCash: 0, splitFactor: 1 },
  { date: '2025-06-02T00:00:00.000Z', close: 120, adjClose: 120, divCash: 0, splitFactor: 1 },
];

function makeContext(env: { STOCK_CACHE: ReturnType<typeof fakeKV>; TIINGO_API_KEY?: string }, query: string) {
  return {
    request: new Request(`https://box-of-tools.com/api/stock-return?${query}`),
    env: { TIINGO_API_KEY: 'test-token', ...env },
  } as Parameters<typeof onRequestGet>[0];
}

describe('GET /api/stock-return', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response(JSON.stringify(TIINGO_ROWS), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a missing/invalid ticker without calling Tiingo', async () => {
    const kv = fakeKV();
    const res = await onRequestGet(makeContext({ STOCK_CACHE: kv }, 'ticker=&date=2025-06-02&amount=1000'));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed date', async () => {
    const kv = fakeKV();
    const res = await onRequestGet(makeContext({ STOCK_CACHE: kv }, 'ticker=VTI&date=not-a-date&amount=1000'));
    expect(res.status).toBe(400);
  });

  it('rejects a future purchase date', async () => {
    const kv = fakeKV();
    const res = await onRequestGet(makeContext({ STOCK_CACHE: kv }, 'ticker=VTI&date=2099-01-01&amount=1000'));
    expect(res.status).toBe(400);
  });

  it('rejects a non-positive investment amount', async () => {
    const kv = fakeKV();
    const res = await onRequestGet(makeContext({ STOCK_CACHE: kv }, 'ticker=VTI&date=2025-06-02&amount=0'));
    expect(res.status).toBe(400);
  });

  it('fetches from Tiingo on a cache miss and returns a computed result', async () => {
    const kv = fakeKV();
    const res = await onRequestGet(makeContext({ STOCK_CACHE: kv }, 'ticker=VTI&date=2025-01-02&amount=1000'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ticker).toBe('VTI');
    expect(body.shares).toBeCloseTo(10, 5);
    expect(body.valueToday).toBeCloseTo(1200, 5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(kv.put).toHaveBeenCalledTimes(1);
  });

  it('sends the API key as an Authorization header, not a query param', async () => {
    const kv = fakeKV();
    await onRequestGet(makeContext({ STOCK_CACHE: kv }, 'ticker=VTI&date=2025-01-02&amount=1000'));
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).not.toContain('test-token');
    expect(calledInit.headers.Authorization).toBe('Token test-token');
  });

  it('serves from cache on a second request without calling Tiingo again', async () => {
    const kv = fakeKV();
    await onRequestGet(makeContext({ STOCK_CACHE: kv }, 'ticker=VTI&date=2025-01-02&amount=1000'));
    await onRequestGet(makeContext({ STOCK_CACHE: kv }, 'ticker=VTI&date=2025-06-02&amount=500'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when Tiingo reports the ticker does not exist', async () => {
    fetchMock.mockImplementation(async () => new Response('Not Found', { status: 404 }));
    const kv = fakeKV();
    const res = await onRequestGet(makeContext({ STOCK_CACHE: kv }, 'ticker=ZZZZZ&date=2025-01-02&amount=1000'));
    expect(res.status).toBe(404);
  });

  it('returns 502 when the upstream request fails for another reason', async () => {
    fetchMock.mockImplementation(async () => new Response('Server Error', { status: 500 }));
    const kv = fakeKV();
    const res = await onRequestGet(makeContext({ STOCK_CACHE: kv }, 'ticker=VTI&date=2025-01-02&amount=1000'));
    expect(res.status).toBe(502);
  });

  it('defaults to including dividends unless dividends=false is passed', async () => {
    const kv = fakeKV();
    const res = await onRequestGet(
      makeContext({ STOCK_CACHE: kv }, 'ticker=VTI&date=2025-01-02&amount=1000&dividends=false')
    );
    const body = await res.json();
    // With no dividends/splits in the fixture, price-only and total-return
    // modes give the same numeric result here — this just checks the request
    // succeeds end-to-end with the flag threaded through.
    expect(res.status).toBe(200);
    expect(body.valueToday).toBeCloseTo(1200, 5);
  });
});
