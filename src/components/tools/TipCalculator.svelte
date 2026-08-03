<script lang="ts">
  import { resolveTipPercent, calculateTip } from '../../lib/tip';

  const TIP_PRESETS = [10, 15, 18, 20, 25] as const;

  let billTotal = $state(0);
  let addTaxSeparately = $state(false);
  let taxAmount = $state(0);
  let selectedPreset = $state<number | null>(15);
  let customTip = $state('');
  let numPeople = $state(1);
  let roundUp = $state(false);

  function isPresetActive(preset: number): boolean {
    return customTip.trim() === '' && selectedPreset === preset;
  }

  function selectPreset(preset: number) {
    selectedPreset = preset;
    customTip = '';
  }

  const tipPercent = $derived(resolveTipPercent(customTip, selectedPreset));

  const tipPercentLabel = $derived(
    Number.isInteger(tipPercent) ? `${tipPercent}` : tipPercent.toFixed(1)
  );

  const result = $derived.by(() =>
    calculateTip({ billTotal, addTaxSeparately, taxAmount, tipPercent, numPeople, roundUp })
  );

  const subtotal = $derived(result.subtotal);
  const tipAmount = $derived(result.tipAmount);
  const total = $derived(result.total);
  const peopleCount = $derived(result.peopleCount);
  const perPersonSubtotal = $derived(result.perPersonSubtotal);
  const perPersonTip = $derived(result.perPersonTip);
  const perPersonTotalRaw = $derived(result.perPersonTotalRaw);
  const perPersonOwed = $derived(result.perPersonOwed);

  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  function fmt(n: number): string {
    return currency.format(Number.isFinite(n) ? n : 0);
  }

  function decreasePeople() {
    numPeople = Math.max(1, peopleCount - 1);
  }

  function increasePeople() {
    numPeople = Math.min(100, peopleCount + 1);
  }

  const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';
  const inputClass =
    'w-full rounded-md border border-slate-300 bg-white py-2 pl-7 pr-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
</script>

<div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
  <div class="space-y-5">
    <!-- Bill total -->
    <label class="block">
      <span class={labelClass}>Bill Total</span>
      <div class="relative mt-1">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
        <input
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          bind:value={billTotal}
          class={inputClass}
        />
      </div>
    </label>

    <!-- Add tax separately -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class={labelClass}>Add Tax Separately</p>
        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Enter tax as its own amount instead of folding it into the bill
        </p>
      </div>
      <label class="relative inline-flex shrink-0 cursor-pointer items-center">
        <input type="checkbox" bind:checked={addTaxSeparately} class="peer sr-only" aria-label="Add tax separately" />
        <span
          class="h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-blue-600 dark:bg-slate-600"
        ></span>
        <span
          class="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5"
        ></span>
      </label>
    </div>

    {#if addTaxSeparately}
      <label class="block">
        <span class={labelClass}>Tax Amount</span>
        <div class="relative mt-1">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <input
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            bind:value={taxAmount}
            class={inputClass}
          />
        </div>
      </label>
    {/if}

    <!-- Tip percentage -->
    <div>
      <span class={labelClass}>Tip Percentage</span>
      <div class="mt-2 grid grid-cols-5 gap-1.5">
        {#each TIP_PRESETS as preset (preset)}
          <button
            type="button"
            onclick={() => selectPreset(preset)}
            class="rounded-md border py-2 text-sm font-medium transition-colors {isPresetActive(preset)
              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'}"
          >
            {preset}%
          </button>
        {/each}
      </div>
      <input
        type="text"
        inputmode="decimal"
        placeholder="Or enter a custom tip %"
        bind:value={customTip}
        aria-label="Custom tip percentage"
        class="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </div>

    <!-- Split between -->
    <div class="flex items-center justify-between gap-4">
      <span class={labelClass}>Split Between</span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={decreasePeople}
          aria-label="Decrease number of people"
          class="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          −
        </button>
        <span class="w-20 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
          {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
        </span>
        <button
          type="button"
          onclick={increasePeople}
          aria-label="Increase number of people"
          class="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          +
        </button>
      </div>
    </div>

    <!-- Round up per person -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class={labelClass}>Round Up Per Person</p>
        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Rounds each person's total up to the nearest dollar
        </p>
      </div>
      <label class="relative inline-flex shrink-0 cursor-pointer items-center">
        <input type="checkbox" bind:checked={roundUp} class="peer sr-only" aria-label="Round up per person" />
        <span
          class="h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-blue-600 dark:bg-slate-600"
        ></span>
        <span
          class="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5"
        ></span>
      </label>
    </div>
  </div>

  <hr class="my-5 border-slate-200 dark:border-slate-700" />

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-3">
    <div class="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
      <p class="text-xs text-slate-500 dark:text-slate-400">Subtotal</p>
      <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{fmt(subtotal)}</p>
    </div>
    <div class="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
      <p class="text-xs text-slate-500 dark:text-slate-400">Tip</p>
      <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{fmt(tipAmount)}</p>
      <p class="text-xs text-slate-400 dark:text-slate-500">at {tipPercentLabel}%</p>
    </div>
    <div class="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
      <p class="text-xs text-slate-500 dark:text-slate-400">Total</p>
      <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{fmt(total)}</p>
    </div>
  </div>

  <!-- Each person owes -->
  <div
    class="mt-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40"
  >
    <div>
      <p class="font-semibold text-blue-900 dark:text-blue-100">Each person owes</p>
      <p class="text-sm text-blue-700 dark:text-blue-300">includes {fmt(perPersonTip)} tip</p>
    </div>
    <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{fmt(perPersonOwed)}</p>
  </div>

  <!-- Breakdown -->
  <div class="mt-4 divide-y divide-slate-200 text-sm dark:divide-slate-800">
    <div class="flex justify-between py-2">
      <span class="text-slate-500 dark:text-slate-400">Subtotal per person</span>
      <span class="font-medium text-slate-900 dark:text-slate-100">{fmt(perPersonSubtotal)}</span>
    </div>
    <div class="flex justify-between py-2">
      <span class="text-slate-500 dark:text-slate-400">Tip per person</span>
      <span class="font-medium text-slate-900 dark:text-slate-100">{fmt(perPersonTip)}</span>
    </div>
    <div class="flex justify-between py-2">
      <span class="text-slate-500 dark:text-slate-400">Total per person</span>
      <span class="font-medium text-slate-900 dark:text-slate-100">{fmt(perPersonTotalRaw)}</span>
    </div>
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
