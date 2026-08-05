<script lang="ts">
  import { calculateLoanSummary, groupAmortizationByYear, type ExtraPaymentFrequency } from '../../lib/loan';
  import { parseDateInput } from '../../lib/date';

  let loanAmount = $state(10000);
  let termValue = $state(5);
  let termUnit = $state<'months' | 'years'>('years');
  let interestRate = $state(10);

  let showOptional = $state(false);
  let extraFrequency = $state<ExtraPaymentFrequency>('monthly');
  let extraAmount = $state(0);
  let extraDate = $state('');
  let originationFeePercent = $state(0);
  let otherFees = $state(0);

  let showAmortization = $state(false);
  let expandedYears = $state<Set<number>>(new Set());

  const termYears = $derived(termUnit === 'years' ? termValue : termValue / 12);

  // Payments start the month after today (the standard loan convention the
  // amortization schedule itself follows), so a one-time payment dated this
  // month or earlier would never land on an actual scheduled payment — it'd
  // silently have no effect. Steer the date picker away from that entirely.
  const firstPaymentDate = (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  })();
  const minOneTimeDateStr = `${firstPaymentDate.getFullYear()}-${String(firstPaymentDate.getMonth() + 1).padStart(2, '0')}-01`;

  const extraPaymentInput = $derived.by(() => {
    if (!showOptional || extraAmount <= 0) return undefined;
    if (extraFrequency === 'oneTime') {
      const oneTimeDate = parseDateInput(extraDate);
      if (!oneTimeDate || oneTimeDate.getTime() < firstPaymentDate.getTime()) return undefined;
      return { amount: extraAmount, frequency: extraFrequency, oneTimeDate };
    }
    return { amount: extraAmount, frequency: extraFrequency };
  });

  // A one-time payment needs a valid, upcoming date to know which month to
  // land in — without one it silently has no effect, so surface that instead
  // of looking broken.
  const oneTimeDateWarning = $derived.by(() => {
    if (!showOptional || extraFrequency !== 'oneTime' || extraAmount <= 0) return '';
    const parsed = parseDateInput(extraDate);
    if (!parsed) return "Pick a date above to apply this payment — until then it won't affect the totals below.";
    if (parsed.getTime() < firstPaymentDate.getTime()) {
      return 'Payments start next month, so pick a date from then onward for this to take effect.';
    }
    return '';
  });

  const summary = $derived.by(() =>
    calculateLoanSummary({
      loanAmount,
      termYears,
      interestRatePercent: interestRate,
      originationFeePercent: showOptional ? originationFeePercent : 0,
      otherFees: showOptional ? otherFees : 0,
      extraPayment: extraPaymentInput,
    })
  );

  const amortizationByYear = $derived.by(() => groupAmortizationByYear(summary.schedule));

  const allYearsExpanded = $derived(
    amortizationByYear.length > 0 && amortizationByYear.every((g) => expandedYears.has(g.year))
  );

  function toggleExpandAll() {
    expandedYears = allYearsExpanded ? new Set() : new Set(amortizationByYear.map((g) => g.year));
  }

  function toggleYear(year: number) {
    const next = new Set(expandedYears);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    expandedYears = next;
  }

  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
  function fmt(n: number): string {
    return currency.format(Number.isFinite(n) ? n : 0);
  }
  function fmtMonth(date: Date): string {
    return monthFormatter.format(date);
  }

  // Fixed color per slice (not per chart position), so identity never shifts
  // if interest happens to be 0 and drops out of the ring.
  const CHART_R = 70;
  const CHART_CIRCUMFERENCE = 2 * Math.PI * CHART_R;
  const CHART_GAP = 3;

  const chartSegments = $derived.by(() => {
    const items = [
      { key: 'principal' as const, value: summary.totalPrincipalPaid, color: 'var(--slot-principal)' },
      { key: 'interest' as const, value: summary.totalInterestPaid, color: 'var(--slot-interest)' },
    ].filter((item) => item.value > 0);
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) return [];

    let cumulative = 0;
    return items.map((item) => {
      const fraction = item.value / total;
      const rawLength = fraction * CHART_CIRCUMFERENCE;
      const gap = items.length > 1 ? CHART_GAP : 0;
      const dash = Math.max(0, rawLength - gap);
      const dashOffset = -cumulative * CHART_CIRCUMFERENCE;
      cumulative += fraction;
      return { key: item.key, color: item.color, dash, dashOffset };
    });
  });

  const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';
  const inputClass =
    'w-full rounded-md border border-slate-300 bg-white py-2 pl-7 pr-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
</script>

<div class="loan-calc rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <div class="space-y-5">
      <label class="block">
        <span class={labelClass}>Loan Amount</span>
        <div class="relative mt-1">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <input type="number" inputmode="decimal" min="0" step="100" bind:value={loanAmount} class={inputClass} />
        </div>
      </label>

      <div>
        <span class={labelClass}>Loan Term</span>
        <input
          type="number"
          inputmode="numeric"
          min="1"
          step="1"
          bind:value={termValue}
          class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <div class="mt-2 flex gap-4 text-sm text-slate-700 dark:text-slate-300">
          <label class="flex items-center gap-1.5">
            <input type="radio" name="term-unit" value="months" bind:group={termUnit} class="accent-blue-600" />
            Months
          </label>
          <label class="flex items-center gap-1.5">
            <input type="radio" name="term-unit" value="years" bind:group={termUnit} class="accent-blue-600" />
            Years
          </label>
        </div>
      </div>

      <label class="block">
        <span class={labelClass}>Interest Rate</span>
        <div class="relative mt-1">
          <input
            type="number"
            inputmode="decimal"
            min="0"
            step="0.1"
            bind:value={interestRate}
            class="w-full rounded-md border border-slate-300 bg-white py-2 pl-3 pr-7 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
        </div>
      </label>

      <div>
        <button
          type="button"
          onclick={() => (showOptional = !showOptional)}
          class="flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Optional: extra payments and fees
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-4 w-4 transition-transform {showOptional ? 'rotate-180' : ''}"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </button>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Making extra payments can help you pay off your loan faster and save on interest.
        </p>

        {#if showOptional}
          <div class="mt-4 space-y-4">
            <label class="block">
              <span class="text-sm text-slate-700 dark:text-slate-300">Extra Payment Frequency</span>
              <select
                bind:value={extraFrequency}
                class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="oneTime">One-time</option>
              </select>
            </label>

            <label class="block">
              <span class="text-sm text-slate-700 dark:text-slate-300">Extra Payment Amount</span>
              <div class="relative mt-1">
                <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="10"
                  placeholder="0"
                  bind:value={extraAmount}
                  class={inputClass}
                />
              </div>
            </label>

            {#if extraFrequency === 'oneTime'}
              <label class="block">
                <span class="text-sm text-slate-700 dark:text-slate-300">Extra Payment Date</span>
                <input
                  type="date"
                  min={minOneTimeDateStr}
                  bind:value={extraDate}
                  class="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                {#if oneTimeDateWarning}
                  <p class="mt-1 text-sm text-amber-600 dark:text-amber-400">{oneTimeDateWarning}</p>
                {/if}
              </label>
            {/if}

            <label class="block">
              <span class="text-sm text-slate-700 dark:text-slate-300">Origination Fee</span>
              <div class="relative mt-1">
                <input
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  bind:value={originationFeePercent}
                  class="w-full rounded-md border border-slate-300 bg-white py-2 pl-3 pr-7 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </label>

            <label class="block">
              <span class="text-sm text-slate-700 dark:text-slate-300">Other Fees</span>
              <div class="relative mt-1">
                <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="10"
                  placeholder="0"
                  bind:value={otherFees}
                  class={inputClass}
                />
              </div>
            </label>
          </div>
        {/if}
      </div>
    </div>

    <div class="rounded-lg bg-slate-50 p-5 dark:bg-slate-800/50">
      <p class={labelClass}>Estimated Monthly Payment</p>
      <p class="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{fmt(summary.monthlyPayment)}</p>
      {#if extraPaymentInput}
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Your scheduled payment — extra payments reduce the payoff time and total interest below,
          not this amount.
        </p>
      {/if}

      <hr class="my-4 border-slate-200 dark:border-slate-700" />

      <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div class="w-full space-y-3 text-sm">
          <div>
            <p class="text-slate-500 dark:text-slate-400">Total Loan Amount Paid</p>
            <p class="font-semibold text-slate-900 dark:text-slate-100">{fmt(summary.totalPrincipalPaid)}</p>
          </div>
          <div>
            <p class="text-slate-500 dark:text-slate-400">Total Interest Paid</p>
            <p class="font-semibold text-slate-900 dark:text-slate-100">{fmt(summary.totalInterestPaid)}</p>
          </div>
          <div>
            <p class="text-slate-500 dark:text-slate-400">Total Cost of Loan</p>
            <p class="font-semibold text-slate-900 dark:text-slate-100">{fmt(summary.totalCostOfLoan)}</p>
          </div>
          {#if summary.totalFees > 0}
            <div>
              <p class="text-slate-500 dark:text-slate-400">Total Fees</p>
              <p class="font-semibold text-slate-900 dark:text-slate-100">{fmt(summary.totalFees)}</p>
            </div>
          {/if}
          {#if summary.payoffDate}
            <div>
              <p class="text-slate-500 dark:text-slate-400">Payoff Date</p>
              <p class="font-semibold text-slate-900 dark:text-slate-100">{fmtMonth(summary.payoffDate)}</p>
            </div>
          {/if}
        </div>

        {#if chartSegments.length > 0}
          <div class="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 200 200" class="h-full w-full -rotate-90" aria-hidden="true">
              <circle
                cx="100"
                cy="100"
                r={CHART_R}
                fill="none"
                stroke-width="28"
                class="stroke-slate-200 dark:stroke-slate-700"
              />
              {#each chartSegments as seg (seg.key)}
                <circle
                  cx="100"
                  cy="100"
                  r={CHART_R}
                  fill="none"
                  stroke-width="28"
                  style="stroke: {seg.color}"
                  stroke-dasharray="{seg.dash} {CHART_CIRCUMFERENCE - seg.dash}"
                  stroke-dashoffset={seg.dashOffset}
                ></circle>
              {/each}
            </svg>
          </div>
        {/if}
      </div>

      <div class="mt-4 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background-color: var(--slot-principal)"></span>
          Total loan amount paid
        </span>
        <span class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background-color: var(--slot-interest)"></span>
          Total interest paid
        </span>
      </div>
    </div>
  </div>

  <div class="mt-6">
    <button
      type="button"
      onclick={() => (showAmortization = !showAmortization)}
      class="flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
    >
      Show amortization schedule
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="h-4 w-4 transition-transform {showAmortization ? 'rotate-180' : ''}"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
          clip-rule="evenodd"
        ></path>
      </svg>
    </button>

    {#if showAmortization}
      <div class="mt-4">
        {#if amortizationByYear.length === 0}
          <p class="text-sm text-slate-500 dark:text-slate-400">Enter a loan amount, term, and rate to see a schedule.</p>
        {:else}
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
        {/if}
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

  .loan-calc {
    --slot-principal: #2a78d6;
    --slot-interest: #1baf7a;
  }
  :global(.dark) .loan-calc {
    --slot-principal: #3987e5;
    --slot-interest: #199e70;
  }
</style>
