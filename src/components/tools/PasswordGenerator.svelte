<script lang="ts">
  import { words } from '../../data/wordlist';

  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const NUMBERS = '0123456789';
  const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/|~';

  type Mode = 'password' | 'passphrase';
  type Separator = '-' | '.' | '_' | ' ' | '';

  let mode = $state<Mode>('password');

  // Password options
  let length = $state(20);
  let useNumbers = $state(true);
  let useLower = $state(true);
  let useUpper = $state(true);
  let useSymbols = $state(true);

  // Passphrase options
  let wordCount = $state(5);
  let separator = $state<Separator>('-');
  let capitalize = $state(true);
  let appendNumber = $state(false);
  let appendSymbol = $state(false);

  let output = $state('');
  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  // Cryptographically secure integer in [0, max) via rejection sampling (no modulo bias)
  function randInt(max: number): number {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0xffffffff / max) * max;
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return buf[0] % max;
  }

  function pool(): string {
    return (
      (useLower ? LOWER : '') +
      (useUpper ? UPPER : '') +
      (useNumbers ? NUMBERS : '') +
      (useSymbols ? SYMBOLS : '')
    );
  }

  function generate() {
    if (mode === 'password') {
      const chars = pool();
      if (chars.length === 0) {
        output = '';
        return;
      }
      output = Array.from({ length }, () => chars[randInt(chars.length)]).join('');
    } else {
      const parts = Array.from({ length: wordCount }, () => {
        const w = words[randInt(words.length)];
        return capitalize ? w[0].toUpperCase() + w.slice(1) : w;
      });
      let phrase = parts.join(separator);
      if (appendNumber) phrase += separator + randInt(100);
      if (appendSymbol) phrase += separator + SYMBOLS[randInt(SYMBOLS.length)];
      output = phrase;
    }
  }

  // Keep at least one character set selected
  function guardSets(toggled: 'lower' | 'upper' | 'numbers' | 'symbols') {
    if (!useLower && !useUpper && !useNumbers && !useSymbols) {
      if (toggled === 'lower') useLower = true;
      else if (toggled === 'upper') useUpper = true;
      else if (toggled === 'numbers') useNumbers = true;
      else useSymbols = true;
    }
  }

  const bits = $derived.by(() => {
    if (mode === 'password') {
      const size = pool().length;
      return size > 0 ? Math.floor(length * Math.log2(size)) : 0;
    }
    let b = wordCount * Math.log2(words.length);
    if (appendNumber) b += Math.log2(100);
    if (appendSymbol) b += Math.log2(SYMBOLS.length);
    return Math.floor(b);
  });

  const strength = $derived(
    bits >= 100
      ? { label: 'Very Strong', bar: 'bg-green-600', text: 'text-green-700 dark:text-green-400' }
      : bits >= 60
        ? { label: 'Strong', bar: 'bg-lime-500', text: 'text-lime-600 dark:text-lime-400' }
        : bits >= 45
          ? { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
          : { label: 'Weak', bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' }
  );

  const barWidth = $derived(Math.min(100, (bits / 128) * 100));

  // Regenerate whenever the mode or any option changes (also runs once on mount)
  $effect(() => {
    void mode;
    void length;
    void useNumbers;
    void useLower;
    void useUpper;
    void useSymbols;
    void wordCount;
    void separator;
    void capitalize;
    void appendNumber;
    void appendSymbol;
    generate();
  });

  async function copy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    copied = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied = false), 1500);
  }

  const tabBase = 'rounded-t-md border px-4 py-2 text-sm font-medium transition-colors';
  const tabActive =
    'border-slate-200 border-b-white bg-white text-slate-900 underline dark:border-slate-700 dark:border-b-slate-900 dark:bg-slate-900 dark:text-slate-100';
  const tabInactive =
    'border-transparent bg-slate-100 text-red-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-slate-700';
  const checkboxClass =
    'h-4 w-4 rounded border-slate-300 accent-blue-600 dark:border-slate-600';
</script>

<div>
  <!-- Tabs -->
  <div class="flex gap-1 border-b border-slate-200 dark:border-slate-700" role="tablist">
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'password'}
      class="{tabBase} {mode === 'password' ? tabActive : tabInactive} -mb-px"
      onclick={() => (mode = 'password')}
    >
      Password
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'passphrase'}
      class="{tabBase} {mode === 'passphrase' ? tabActive : tabInactive} -mb-px"
      onclick={() => (mode = 'passphrase')}
    >
      Passphrase
    </button>
  </div>

  <!-- Output + copy -->
  <div class="mt-4 flex">
    <input
      type="text"
      readonly
      value={output}
      aria-label="Generated {mode}"
      onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
      class="w-full rounded-l-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-base text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    />
    <button
      type="button"
      onclick={copy}
      class="flex items-center gap-1.5 rounded-r-md border border-l-0 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
        <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h5.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12A1.5 1.5 0 0 1 18 5.622V12.5a1.5 1.5 0 0 1-1.5 1.5H15v-2.5A3.5 3.5 0 0 0 11.5 8H7V3.5Z" />
        <path d="M3.5 6A1.5 1.5 0 0 0 2 7.5v9A1.5 1.5 0 0 0 3.5 18h8a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 10h-8Z" />
      </svg>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  </div>

  <!-- Strength meter -->
  <div class="mt-3 flex items-center gap-3">
    <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div class="h-full rounded-full transition-all {strength.bar}" style="width: {barWidth}%"></div>
    </div>
    <span class="whitespace-nowrap text-sm font-semibold {strength.text}">
      {strength.label} – {bits} bits
    </span>
  </div>

  <!-- Options -->
  <div class="mt-4 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    {#if mode === 'password'}
      <label class="block">
        <span class="text-sm text-slate-700 dark:text-slate-300">Length: <strong class="text-slate-900 dark:text-slate-100">{length}</strong></span>
        <input type="range" min="8" max="64" bind:value={length} class="mt-2 w-full accent-blue-600" />
      </label>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" bind:checked={useNumbers} onchange={() => guardSets('numbers')} class={checkboxClass} />
          Numbers
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" bind:checked={useLower} onchange={() => guardSets('lower')} class={checkboxClass} />
          Lowercase
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" bind:checked={useUpper} onchange={() => guardSets('upper')} class={checkboxClass} />
          Uppercase
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" bind:checked={useSymbols} onchange={() => guardSets('symbols')} class={checkboxClass} />
          Symbols
        </label>
      </div>
    {:else}
      <label class="block">
        <span class="text-sm text-slate-700 dark:text-slate-300">Words: <strong class="text-slate-900 dark:text-slate-100">{wordCount}</strong></span>
        <input type="range" min="3" max="12" bind:value={wordCount} class="mt-2 w-full accent-blue-600" />
      </label>
      <label class="mt-4 block">
        <span class="text-sm text-slate-700 dark:text-slate-300">Separator</span>
        <select
          bind:value={separator}
          class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="-">Hyphen (-)</option>
          <option value=".">Period (.)</option>
          <option value="_">Underscore (_)</option>
          <option value=" ">Space</option>
          <option value="">None</option>
        </select>
      </label>
      <div class="mt-4 space-y-2">
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" bind:checked={capitalize} class={checkboxClass} />
          Capitalize first letter of each word
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" bind:checked={appendNumber} class={checkboxClass} />
          Append a random number (0–99)
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" bind:checked={appendSymbol} class={checkboxClass} />
          Append a symbol
        </label>
      </div>
    {/if}

    <button
      type="button"
      onclick={generate}
      class="mt-5 flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
        <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" />
      </svg>
      Generate New
    </button>
  </div>
</div>
