<script lang="ts">
  import {
    calculateMortgage,
    buildMonthlyAmortizationSchedule,
    groupAmortizationByYear,
    downPaymentAmountFromPercent,
    downPaymentPercentFromAmount,
    type MortgageBreakdownKey,
  } from '../../lib/mortgage';

  const TERM_OPTIONS = [30, 20, 15, 10] as const;

  let homePrice = $state(425000);
  let downPaymentAmount = $state(85000);
  let downPaymentPercent = $state(20);
  let termYears = $state<number>(30);
  let interestRate = $state(5);

  let propertyTaxMonthly = $state(0);
  let homeownersInsuranceMonthly = $state(0);
  let pmiMonthly = $state(0);
  let hoaMonthly = $state(0);

  let activeTab = $state<'breakdown' | 'amortization'>('breakdown');
  let expandedYears = $state<Set<number>>(new Set());

  function round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  // Down payment $ and % stay in sync with each other; editing the home
  // price keeps the percent fixed and recomputes the dollar amount.
  function syncAmountFromPercent() {
    downPaymentAmount = round2(downPaymentAmountFromPercent(homePrice, downPaymentPercent));
  }

  function syncPercentFromAmount() {
    downPaymentPercent = round2(downPaymentPercentFromAmount(homePrice, downPaymentAmount));
  }

  const result = $derived.by(() =>
    calculateMortgage({
      homePrice,
      downPayment: downPaymentAmount,
      termYears,
      interestRatePercent: interestRate,
      propertyTaxMonthly,
      homeownersInsuranceMonthly,
      pmiMonthly,
      hoaMonthly,
    })
  );

  const amortizationMonths = $derived.by(() =>
    buildMonthlyAmortizationSchedule(result.loanAmount, interestRate, termYears)
  );
  const amortizationByYear = $derived.by(() => groupAmortizationByYear(amortizationMonths));

  const allYearsExpanded = $derived(
    amortizationByYear.length > 0 && amortizationByYear.every((g) => expandedYears.has(g.year))
  );

  function toggleExpandAll() {
    expandedYears = allYearsExpanded
      ? new Set()
      : new Set(amortizationByYear.map((g) => g.year));
  }

  function toggleYear(year: number) {
    const next = new Set(expandedYears);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    expandedYears = next;
  }

  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const currencyWhole = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
  function fmt(n: number): string {
    return currency.format(Number.isFinite(n) ? n : 0);
  }
  function fmtWhole(n: number): string {
    return currencyWhole.format(Number.isFinite(n) ? n : 0);
  }
  function fmtMonth(date: Date): string {
    return monthFormatter.format(date);
  }

  // Fixed color per category (not per chart position), so identity never
  // shifts when a category's value goes to/from zero and drops out of the ring.
  const COLOR_VAR: Record<MortgageBreakdownKey, string> = {
    pi: 'var(--slot-1)',
    tax: 'var(--slot-2)',
    insurance: 'var(--slot-3)',
    pmi: 'var(--slot-4)',
    hoa: 'var(--slot-5)',
  };

  const CHART_R = 70;
  const CHART_CIRCUMFERENCE = 2 * Math.PI * CHART_R;
  const CHART_GAP = 3;

  const chartSegments = $derived.by(() => {
    const total = result.totalMonthlyPayment;
    const items = result.breakdown.filter((item) => item.value > 0);
    if (total <= 0 || items.length === 0) return [];

    let cumulative = 0;
    return items.map((item) => {
      const fraction = item.value / total;
      const rawLength = fraction * CHART_CIRCUMFERENCE;
      const gap = items.length > 1 ? CHART_GAP : 0;
      const dash = Math.max(0, rawLength - gap);
      const dashOffset = -cumulative * CHART_CIRCUMFERENCE;
      cumulative += fraction;
      return { key: item.key, dash, dashOffset };
    });
  });

  const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';
  const inputClass =
    'w-full rounded-md border border-slate-300 bg-white py-2 pl-7 pr-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
  const tabBase = 'rounded-t-md border px-4 py-2 text-sm font-medium transition-colors';
  const tabActive =
    'border-slate-200 border-b-white bg-white text-slate-900 underline dark:border-slate-700 dark:border-b-slate-900 dark:bg-slate-900 dark:text-slate-100';
  const tabInactive =
    'border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700';
</script>

<div class="mortgage-calc rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
  <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
    <label class="block sm:col-span-2">
      <span class={labelClass}>Home Price</span>
      <div class="relative mt-1">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
        <input
          type="number"
          inputmode="decimal"
          min="0"
          step="1000"
          bind:value={homePrice}
          oninput={syncAmountFromPercent}
          class={inputClass}
        />
      </div>
    </label>

    <div class="sm:col-span-2">
      <span class={labelClass}>Down Payment</span>
      <div class="mt-1 flex gap-2">
        <div class="relative flex-1">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <input
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            bind:value={downPaymentAmount}
            oninput={syncPercentFromAmount}
            class={inputClass}
          />
        </div>
        <div class="relative w-24">
          <input
            type="number"
            inputmode="decimal"
            min="0"
            max="100"
            step="0.1"
            bind:value={downPaymentPercent}
            oninput={syncAmountFromPercent}
            class="w-full rounded-md border border-slate-300 bg-white py-2 pl-3 pr-7 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
        </div>
      </div>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Loan amount: {fmt(result.loanAmount)}</p>
    </div>

    <label class="block">
      <span class={labelClass}>Loan Term</span>
      <select
        bind:value={termYears}
        class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        {#each TERM_OPTIONS as term (term)}
          <option value={term}>{term} Years</option>
        {/each}
      </select>
    </label>

    <label class="block">
      <span class={labelClass}>Interest Rate</span>
      <div class="relative mt-1">
        <input
          type="number"
          inputmode="decimal"
          min="0"
          step="0.125"
          bind:value={interestRate}
          class="w-full rounded-md border border-slate-300 bg-white py-2 pl-3 pr-7 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
      </div>
    </label>
  </div>

  <hr class="my-5 border-slate-200 dark:border-slate-700" />

  <div>
    <span class={labelClass}>Additional Monthly Costs</span>
    <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Optional, enter as monthly dollar amounts.</p>
    <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label class="block">
        <span class="text-sm text-slate-700 dark:text-slate-300">Property Tax</span>
        <div class="relative mt-1">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <input
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            bind:value={propertyTaxMonthly}
            class={inputClass}
          />
        </div>
      </label>
      <label class="block">
        <span class="text-sm text-slate-700 dark:text-slate-300">Homeowner's Insurance</span>
        <div class="relative mt-1">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <input
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            bind:value={homeownersInsuranceMonthly}
            class={inputClass}
          />
        </div>
      </label>
      <label class="block">
        <span class="text-sm text-slate-700 dark:text-slate-300">PMI</span>
        <div class="relative mt-1">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <input
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            bind:value={pmiMonthly}
            class={inputClass}
          />
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Typically required when your down payment is under 20%
        </p>
      </label>
      <label class="block">
        <span class="text-sm text-slate-700 dark:text-slate-300">HOA Fees</span>
        <div class="relative mt-1">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <input
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            bind:value={hoaMonthly}
            class={inputClass}
          />
        </div>
      </label>
    </div>
  </div>

  <!-- Tabs -->
  <div class="mt-6 flex gap-1 border-b border-slate-200 dark:border-slate-700" role="tablist">
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === 'breakdown'}
      class="{tabBase} {activeTab === 'breakdown' ? tabActive : tabInactive} -mb-px"
      onclick={() => (activeTab = 'breakdown')}
    >
      Payment Breakdown
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === 'amortization'}
      class="{tabBase} {activeTab === 'amortization' ? tabActive : tabInactive} -mb-px"
      onclick={() => (activeTab = 'amortization')}
    >
      Amortization
    </button>
  </div>

  {#if activeTab === 'breakdown'}
    <div class="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div class="relative h-48 w-48 shrink-0">
        <svg viewBox="0 0 200 200" class="h-full w-full -rotate-90" aria-hidden="true">
          <circle
            cx="100"
            cy="100"
            r={CHART_R}
            fill="none"
            stroke-width="28"
            class="stroke-slate-100 dark:stroke-slate-800"
          />
          {#each chartSegments as seg (seg.key)}
            <circle
              cx="100"
              cy="100"
              r={CHART_R}
              fill="none"
              stroke-width="28"
              style="stroke: {COLOR_VAR[seg.key]}"
              stroke-dasharray="{seg.dash} {CHART_CIRCUMFERENCE - seg.dash}"
              stroke-dashoffset={seg.dashOffset}
            />
          {/each}
        </svg>
        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span class="text-xl font-bold text-slate-900 dark:text-slate-100">
            {fmtWhole(result.totalMonthlyPayment)}
          </span>
          <span class="text-xs text-slate-500 dark:text-slate-400">per month</span>
        </div>
      </div>

      <div class="w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        {#each result.breakdown as item (item.key)}
          <div class="flex items-center justify-between py-2">
            <span class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background-color: {COLOR_VAR[item.key]}"
              ></span>
              {item.label}
            </span>
            <span class="font-medium text-slate-900 dark:text-slate-100">{fmt(item.value)}</span>
          </div>
        {/each}
        <div class="flex items-center justify-between py-2 font-semibold text-slate-900 dark:text-slate-100">
          <span>Total Monthly Payment</span>
          <span>{fmt(result.totalMonthlyPayment)}</span>
        </div>
      </div>
    </div>
  {:else}
    <div class="mt-5">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Expand all years</span>
        <button
          type="button"
          role="switch"
          aria-checked={allYearsExpanded}
          aria-label="Expand all years"
          onclick={toggleExpandAll}
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors {allYearsExpanded
            ? 'bg-blue-600'
            : 'bg-slate-300 dark:bg-slate-600'}"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {allYearsExpanded
              ? 'translate-x-6'
              : 'translate-x-1'}"
          ></span>
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th class="py-2 pr-3 font-semibold">Date</th>
              <th class="px-3 py-2 font-semibold">Principal</th>
              <th class="px-3 py-2 font-semibold">Interest</th>
              <th class="px-3 py-2 font-semibold">Total Payment</th>
              <th class="py-2 pl-3 text-right font-semibold">Remaining Balance</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            {#each amortizationByYear as group (group.year)}
              {@const expanded = expandedYears.has(group.year)}
              <tr
                tabindex="0"
                role="button"
                aria-expanded={expanded}
                class="cursor-pointer bg-blue-50 font-semibold hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60"
                onclick={() => toggleYear(group.year)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleYear(group.year);
                  }
                }}
              >
                <td class="py-2 pr-3 text-slate-900 dark:text-slate-100">
                  <span class="inline-flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      class="h-3.5 w-3.5 shrink-0 transition-transform {expanded ? 'rotate-90' : ''}"
                      aria-hidden="true"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                    {group.year}
                  </span>
                </td>
                <td class="px-3 py-2 text-slate-900 dark:text-slate-100">{fmt(group.principalPaid)}</td>
                <td class="px-3 py-2 text-slate-900 dark:text-slate-100">{fmt(group.interestPaid)}</td>
                <td class="px-3 py-2 text-slate-900 dark:text-slate-100">{fmt(group.totalPayment)}</td>
                <td class="py-2 pl-3 text-right text-slate-900 dark:text-slate-100">
                  {fmt(group.endingBalance)}
                </td>
              </tr>
              {#if expanded}
                {#each group.months as month (month.monthIndex)}
                  <tr class="text-slate-600 dark:text-slate-400">
                    <td class="py-2 pl-8 pr-3">{fmtMonth(month.date)}</td>
                    <td class="px-3 py-2">{fmt(month.principalPaid)}</td>
                    <td class="px-3 py-2">{fmt(month.interestPaid)}</td>
                    <td class="px-3 py-2">{fmt(month.totalPayment)}</td>
                    <td class="py-2 pl-3 text-right">{fmt(month.endingBalance)}</td>
                  </tr>
                {/each}
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
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

  .mortgage-calc {
    --slot-1: #2a78d6;
    --slot-2: #eb6834;
    --slot-3: #1baf7a;
    --slot-4: #eda100;
    --slot-5: #e87ba4;
  }
  :global(.dark) .mortgage-calc {
    --slot-1: #3987e5;
    --slot-2: #d95926;
    --slot-3: #199e70;
    --slot-4: #c98500;
    --slot-5: #d55181;
  }
</style>
