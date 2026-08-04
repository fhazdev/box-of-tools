<script lang="ts">
  import { parseDateInput, ageBetween, nextBirthday, reverseEngineerDOB, type AgeBreakdown } from '../../lib/age';

  type Tab = 'today' | 'atDate' | 'dobFinder' | 'difference';
  let activeTab = $state<Tab>('today');

  const todayStr = new Date().toISOString().slice(0, 10);

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  function fmtDate(date: Date): string {
    return dateFormatter.format(date);
  }
  function fmtAge(age: AgeBreakdown): string {
    const parts = [
      `${age.years} ${age.years === 1 ? 'year' : 'years'}`,
      `${age.months} ${age.months === 1 ? 'month' : 'months'}`,
      `${age.days} ${age.days === 1 ? 'day' : 'days'}`,
    ];
    return parts.join(', ');
  }

  // --- Age Today ---
  let todayDob = $state('');
  let todayResult = $state<{ age: AgeBreakdown; birthday: ReturnType<typeof nextBirthday> } | null>(null);
  let todayError = $state('');

  function calculateToday() {
    todayResult = null;
    const dob = parseDateInput(todayDob);
    const now = new Date();
    if (!dob) {
      todayError = 'Enter a valid date of birth.';
      return;
    }
    if (dob.getTime() > now.getTime()) {
      todayError = "Date of birth can't be in the future.";
      return;
    }
    todayError = '';
    todayResult = { age: ageBetween(dob, now), birthday: nextBirthday(dob, now) };
  }

  // --- At Date ---
  let atDateDob = $state('');
  let atDateRef = $state(todayStr);
  let atDateResult = $state<{ age: AgeBreakdown; birthday: ReturnType<typeof nextBirthday> } | null>(null);
  let atDateError = $state('');

  function calculateAtDate() {
    atDateResult = null;
    const dob = parseDateInput(atDateDob);
    const ref = parseDateInput(atDateRef);
    if (!dob || !ref) {
      atDateError = 'Enter a valid date of birth and reference date.';
      return;
    }
    if (dob.getTime() > ref.getTime()) {
      atDateError = 'Reference date must be on or after the date of birth.';
      return;
    }
    atDateError = '';
    atDateResult = { age: ageBetween(dob, ref), birthday: nextBirthday(dob, ref) };
  }

  // --- DOB Finder ---
  let findYears = $state(0);
  let findMonths = $state(0);
  let findDays = $state(0);
  let dobFinderResult = $state<Date | null>(null);
  let dobFinderError = $state('');

  function calculateDobFinder() {
    dobFinderResult = null;
    const y = Number(findYears);
    const m = Number(findMonths);
    const d = Number(findDays);
    if (![y, m, d].every(Number.isFinite) || y < 0 || m < 0 || d < 0) {
      dobFinderError = 'Enter zero or positive whole numbers for years, months, and days.';
      return;
    }
    dobFinderError = '';
    dobFinderResult = reverseEngineerDOB(y, m, d, new Date());
  }

  // --- Age Difference ---
  let dobA = $state('');
  let dobB = $state('');
  let diffResult = $state<{ age: AgeBreakdown; older: 'A' | 'B' | 'same' } | null>(null);
  let diffError = $state('');

  function calculateDifference() {
    diffResult = null;
    const a = parseDateInput(dobA);
    const b = parseDateInput(dobB);
    if (!a || !b) {
      diffError = 'Enter both dates of birth.';
      return;
    }
    diffError = '';
    const older = a.getTime() === b.getTime() ? 'same' : a.getTime() < b.getTime() ? 'A' : 'B';
    diffResult = { age: ageBetween(a, b), older };
  }

  const labelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';
  const inputClass =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
  const buttonClass =
    'mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900';
  const errorClass = 'mt-3 text-sm text-red-600 dark:text-red-400';
  const tabBase = 'rounded-t-md border px-4 py-2 text-sm font-medium transition-colors';
  const tabActive =
    'border-slate-200 border-b-white bg-white text-slate-900 underline dark:border-slate-700 dark:border-b-slate-900 dark:bg-slate-900 dark:text-slate-100';
  const tabInactive =
    'border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700';

  const TABS: { id: Tab; label: string }[] = [
    { id: 'today', label: 'Age Today' },
    { id: 'atDate', label: 'At Date' },
    { id: 'dobFinder', label: 'DOB Finder' },
    { id: 'difference', label: 'Age Difference' },
  ];
</script>

{#snippet ageStats(age: AgeBreakdown)}
  <div class="mt-4 grid grid-cols-3 gap-3">
    <div class="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
      <p class="text-xs text-slate-500 dark:text-slate-400">Total Days</p>
      <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{age.totalDays.toLocaleString()}</p>
    </div>
    <div class="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
      <p class="text-xs text-slate-500 dark:text-slate-400">Total Weeks</p>
      <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{age.totalWeeks.toLocaleString()}</p>
    </div>
    <div class="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
      <p class="text-xs text-slate-500 dark:text-slate-400">Total Months</p>
      <p class="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{age.totalMonths.toLocaleString()}</p>
    </div>
  </div>
{/snippet}

{#snippet birthdayNote(birthday: ReturnType<typeof nextBirthday>)}
  <div
    class="mt-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40"
  >
    <div>
      <p class="font-semibold text-blue-900 dark:text-blue-100">
        {birthday.isToday ? "🎉 It's the birthday!" : 'Next birthday'}
      </p>
      <p class="text-sm text-blue-700 dark:text-blue-300">{fmtDate(birthday.date)}</p>
    </div>
    {#if !birthday.isToday}
      <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{birthday.daysUntil}d</p>
    {/if}
  </div>
{/snippet}

<div class="age-calc rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
  <!-- Tabs -->
  <div class="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700" role="tablist">
    {#each TABS as tab (tab.id)}
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === tab.id}
        class="{tabBase} {activeTab === tab.id ? tabActive : tabInactive} -mb-px"
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="mt-5">
    {#if activeTab === 'today'}
      <label class="block">
        <span class={labelClass}>Date of Birth</span>
        <input type="date" bind:value={todayDob} max={todayStr} class="{inputClass} mt-1" />
      </label>
      <button type="button" onclick={calculateToday} class={buttonClass}>Calculate Age</button>

      {#if todayError}
        <p class={errorClass}>{todayError}</p>
      {:else if todayResult}
        <div class="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <p class="text-2xl font-bold text-slate-900 dark:text-slate-100">{fmtAge(todayResult.age)}</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">as of today, {fmtDate(new Date())}</p>
        </div>
        {@render ageStats(todayResult.age)}
        {@render birthdayNote(todayResult.birthday)}
      {/if}
    {:else if activeTab === 'atDate'}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label class="block">
          <span class={labelClass}>Date of Birth</span>
          <input type="date" bind:value={atDateDob} class="{inputClass} mt-1" />
        </label>
        <label class="block">
          <span class={labelClass}>Reference Date</span>
          <input type="date" bind:value={atDateRef} class="{inputClass} mt-1" />
        </label>
      </div>
      <button type="button" onclick={calculateAtDate} class={buttonClass}>Calculate Age</button>

      {#if atDateError}
        <p class={errorClass}>{atDateError}</p>
      {:else if atDateResult}
        <div class="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <p class="text-2xl font-bold text-slate-900 dark:text-slate-100">{fmtAge(atDateResult.age)}</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">as of {fmtDate(parseDateInput(atDateRef)!)}</p>
        </div>
        {@render ageStats(atDateResult.age)}
        {@render birthdayNote(atDateResult.birthday)}
      {/if}
    {:else if activeTab === 'dobFinder'}
      <span class={labelClass}>Age to Reverse-Engineer</span>
      <div class="mt-1 grid grid-cols-3 gap-3">
        <label class="block">
          <input type="number" inputmode="numeric" min="0" step="1" bind:value={findYears} class={inputClass} />
          <span class="mt-1 block text-center text-xs text-slate-500 dark:text-slate-400">Years</span>
        </label>
        <label class="block">
          <input type="number" inputmode="numeric" min="0" step="1" bind:value={findMonths} class={inputClass} />
          <span class="mt-1 block text-center text-xs text-slate-500 dark:text-slate-400">Months</span>
        </label>
        <label class="block">
          <input type="number" inputmode="numeric" min="0" step="1" bind:value={findDays} class={inputClass} />
          <span class="mt-1 block text-center text-xs text-slate-500 dark:text-slate-400">Days</span>
        </label>
      </div>
      <button type="button" onclick={calculateDobFinder} class={buttonClass}>Find DOB</button>

      {#if dobFinderError}
        <p class={errorClass}>{dobFinderError}</p>
      {:else if dobFinderResult}
        <div class="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
          <p class="text-sm text-blue-700 dark:text-blue-300">You were born on</p>
          <p class="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100">{fmtDate(dobFinderResult)}</p>
        </div>
      {/if}
    {:else}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label class="block">
          <span class={labelClass}>Person A DOB</span>
          <input type="date" bind:value={dobA} class="{inputClass} mt-1" />
        </label>
        <label class="block">
          <span class={labelClass}>Person B DOB</span>
          <input type="date" bind:value={dobB} class="{inputClass} mt-1" />
        </label>
      </div>
      <button type="button" onclick={calculateDifference} class={buttonClass}>Find Gap</button>

      {#if diffError}
        <p class={errorClass}>{diffError}</p>
      {:else if diffResult}
        <div class="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <p class="text-2xl font-bold text-slate-900 dark:text-slate-100">{fmtAge(diffResult.age)}</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {#if diffResult.older === 'same'}
              Person A and Person B were born on the same day
            {:else if diffResult.older === 'A'}
              Person A is older than Person B
            {:else}
              Person B is older than Person A
            {/if}
          </p>
        </div>
        {@render ageStats(diffResult.age)}
      {/if}
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
