export const LOWER = 'abcdefghijklmnopqrstuvwxyz';
export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const NUMBERS = '0123456789';
export const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/|~';

export interface CharsetOptions {
  lower: boolean;
  upper: boolean;
  numbers: boolean;
  symbols: boolean;
}

export function buildCharPool(options: CharsetOptions): string {
  return (
    (options.lower ? LOWER : '') +
    (options.upper ? UPPER : '') +
    (options.numbers ? NUMBERS : '') +
    (options.symbols ? SYMBOLS : '')
  );
}

// Cryptographically secure integer in [0, max) via rejection sampling (no modulo bias)
export function randInt(max: number): number {
  if (max <= 0) throw new RangeError('max must be greater than 0');
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / max) * max;
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % max;
}

export function generatePassword(length: number, pool: string): string {
  if (pool.length === 0 || length <= 0) return '';
  return Array.from({ length }, () => pool[randInt(pool.length)]).join('');
}

export function capitalizeWord(word: string): string {
  return word.length === 0 ? word : word[0].toUpperCase() + word.slice(1);
}

export interface PassphraseOptions {
  words: string[];
  wordCount: number;
  separator: string;
  capitalize: boolean;
  appendNumber: boolean;
  appendSymbol: boolean;
}

export function generatePassphrase(options: PassphraseOptions): string {
  const { words, wordCount, separator, capitalize, appendNumber, appendSymbol } = options;
  if (words.length === 0 || wordCount <= 0) return '';

  const parts = Array.from({ length: wordCount }, () => {
    const word = words[randInt(words.length)];
    return capitalize ? capitalizeWord(word) : word;
  });

  let phrase = parts.join(separator);
  if (appendNumber) phrase += separator + randInt(100);
  if (appendSymbol) phrase += separator + SYMBOLS[randInt(SYMBOLS.length)];
  return phrase;
}

export function estimatePasswordBits(length: number, poolSize: number): number {
  if (poolSize <= 0 || length <= 0) return 0;
  return Math.floor(length * Math.log2(poolSize));
}

export interface PassphraseBitsOptions {
  wordCount: number;
  wordlistSize: number;
  appendNumber: boolean;
  appendSymbol: boolean;
  symbolsPoolSize: number;
}

export function estimatePassphraseBits(options: PassphraseBitsOptions): number {
  const { wordCount, wordlistSize, appendNumber, appendSymbol, symbolsPoolSize } = options;
  if (wordlistSize <= 0 || wordCount <= 0) return 0;

  let bits = wordCount * Math.log2(wordlistSize);
  if (appendNumber) bits += Math.log2(100);
  if (appendSymbol) bits += Math.log2(symbolsPoolSize);
  return Math.floor(bits);
}

export type StrengthLabel = 'Weak' | 'Fair' | 'Strong' | 'Very Strong';

export function strengthLabel(bits: number): StrengthLabel {
  if (bits >= 100) return 'Very Strong';
  if (bits >= 60) return 'Strong';
  if (bits >= 45) return 'Fair';
  return 'Weak';
}
