<script lang="ts">
  import { sanitizeTicker } from '../../lib/stock';

  interface StockReturnResponse {
    ticker: string;
    resolvedPurchaseDate: string;
    latestDate: string;
    shares: number;
    purchasePrice: number;
    latestPrice: number;
    valueToday: number;
    gainLoss: number;
    gainLossPercent: number;
    dividendsReceived: number;
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  let tickerInput = $state('VTI');
  let purchaseDate = $state('');
  let investmentAmount = $state(1000);
  let includeDividends = $state(true);

  let loading = $state(false);
  let errorMessage = $state('');
  let result = $state<StockReturnResponse | null>(null);
  let requestedDateForResult = $state('');

  async function calculate() {
    errorMessage = '';
    result = null;

    const ticker = sanitizeTicker(tickerInput);
    if (!ticker) {
      errorMessage = 'Enter a valid U.S. stock ticker (e.g. VTI, AAPL).';
      return;
    }
    if (!purchaseDate) {
      errorMessage = 'Pick a purchase date.';
      return;
    }
    if (purchaseDate > todayStr) {
      errorMessage = "Purchase date can't be in the future.";
      return;
    }
    const amount = Number(investmentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errorMessage = 'Enter a valid investment amount.';
      return;
    }

    loading = true;
    try {
      const params = new URLSearchParams({
        ticker,
        date: purchaseDate,
        amount: String(amount),
        dividends: String(includeDividends),
      });
      const res = await fetch(`/api/stock-return?${params}`);
      const body = await res.json();
      if (!res.ok) {
        errorMessage = body?.error ?? 'Something went wrong. Try again in a moment.';
        return;
      }
      result = body as StockReturnResponse;
      requestedDateForResult = purchaseDate;
    } catch {
      errorMessage = 'Could not reach the price data service. Check your connection and try again.';
    } finally {
      loading = false;
    }
  }

  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const currencyPrecise = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const dateFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  function fmt(n: number): string {
    return currency.format(Number.isFinite(n) ? n : 0);
  }
  function fmtPrecise(n: number): string {
    return currencyPrecise.format(Number.isFinite(n) ? n : 0);
  }
  function fmtDate(isoDate: string): string {
    // Parsed as a plain calendar date, not a UTC instant, to avoid an
    // off-by-one-day shift in negative UTC offsets.
    const [y, m, d] = isoDate.split('-').map(Number);
    return dateFormatter.format(new Date(y, m - 1, d));
  }

  const dateResolved = $derived(!!result && result.resolvedPurchaseDate !== requestedDateForResult);

  const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';
  const inputClass =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
  const buttonClass =
    'mt-2 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-900';
</script>

<div class="stock-calc rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
  <div class="space-y-5">
    <label class="block">
      <span class={labelClass}>Step 1 — Select a U.S. Stock</span>
      <input
        type="text"
        inputmode="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="e.g. VTI"
        bind:value={tickerInput}
        class="{inputClass} mt-1 uppercase"
      />
    </label>

    <label class="block">
      <span class={labelClass}>Step 2 — Select a Purchase Date</span>
      <input type="date" max={todayStr} bind:value={purchaseDate} class="{inputClass} mt-1" />
    </label>

    <label class="block">
      <span class={labelClass}>Step 3 — Select the Investment Amount</span>
      <div class="relative mt-1">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
        <input
          type="number"
          inputmode="decimal"
          min="0"
          step="100"
          bind:value={investmentAmount}
          class="{inputClass} pl-7"
        />
      </div>
    </label>

    <div class="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
      <div>
        <p class="text-sm font-medium text-slate-700 dark:text-slate-300">Include reinvested dividends</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {includeDividends ? 'Total return — dividends reinvested along the way.' : 'Price appreciation only, dividends excluded.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={includeDividends}
        aria-label="Include reinvested dividends"
        onclick={() => (includeDividends = !includeDividends)}
        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors {includeDividends
          ? 'bg-blue-600'
          : 'bg-slate-300 dark:bg-slate-600'}"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {includeDividends
            ? 'translate-x-6'
            : 'translate-x-1'}"
        ></span>
      </button>
    </div>

    <div>
      <span class={labelClass}>Step 4 — Find Out What You Could've Made</span>
      <button type="button" onclick={calculate} disabled={loading} class={buttonClass}>
        {loading ? 'Calculating…' : 'Calculate'}
      </button>
    </div>

    {#if errorMessage}
      <p class="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
    {/if}

    {#if result}
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <p class={labelClass}>Value Today</p>
        <p class="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{fmt(result.valueToday)}</p>
        <p class="mt-1 text-sm {result.gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
          {result.gainLoss >= 0 ? '+' : ''}{fmt(result.gainLoss)} ({result.gainLossPercent >= 0 ? '+' : ''}{result.gainLossPercent.toFixed(2)}%)
        </p>

        <hr class="my-4 border-slate-200 dark:border-slate-700" />

        <div class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p class="text-slate-500 dark:text-slate-400">Purchase Price</p>
            <p class="font-semibold text-slate-900 dark:text-slate-100">{fmtPrecise(result.purchasePrice)}</p>
          </div>
          <div>
            <p class="text-slate-500 dark:text-slate-400">Price Today</p>
            <p class="font-semibold text-slate-900 dark:text-slate-100">{fmtPrecise(result.latestPrice)}</p>
          </div>
          <div>
            <p class="text-slate-500 dark:text-slate-400">Dividends Received</p>
            <p class="font-semibold text-slate-900 dark:text-slate-100">{fmt(result.dividendsReceived)}</p>
          </div>
        </div>

        <p class="mt-4 text-xs text-slate-500 dark:text-slate-400">
          {#if dateResolved}
            Markets were closed on your requested date — priced as of {fmtDate(result.resolvedPurchaseDate)} instead.
          {/if}
          Current price as of {fmtDate(result.latestDate)}.
          {#if includeDividends}
            Assumes every dividend was reinvested on its payment date.
          {:else}
            Dividends received are shown for reference but not included in the value above.
          {/if}
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  input[type='number']::-webkit-outer-spin-button,
  input[type='number']::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type='number'] {
    -moz-appearance: textfield;
  }
</style>
