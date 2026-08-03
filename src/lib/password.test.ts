import { describe, it, expect } from 'vitest';
import {
  LOWER,
  UPPER,
  NUMBERS,
  SYMBOLS,
  buildCharPool,
  randInt,
  generatePassword,
  capitalizeWord,
  generatePassphrase,
  estimatePasswordBits,
  estimatePassphraseBits,
  strengthLabel,
} from './password';

describe('buildCharPool', () => {
  it('returns an empty string when no character sets are selected', () => {
    expect(buildCharPool({ lower: false, upper: false, numbers: false, symbols: false })).toBe('');
  });

  it('concatenates selected sets in lower/upper/numbers/symbols order', () => {
    expect(buildCharPool({ lower: true, upper: true, numbers: true, symbols: true })).toBe(
      LOWER + UPPER + NUMBERS + SYMBOLS
    );
  });

  it('includes only the selected sets', () => {
    expect(buildCharPool({ lower: true, upper: false, numbers: true, symbols: false })).toBe(
      LOWER + NUMBERS
    );
  });
});

describe('randInt', () => {
  it('always returns an integer within [0, max)', () => {
    for (let i = 0; i < 500; i++) {
      const n = randInt(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('always returns 0 when max is 1', () => {
    for (let i = 0; i < 20; i++) expect(randInt(1)).toBe(0);
  });

  it('covers the full range across many samples', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(randInt(5));
    expect(seen.size).toBe(5);
  });

  it('throws for a non-positive max', () => {
    expect(() => randInt(0)).toThrow(RangeError);
    expect(() => randInt(-1)).toThrow(RangeError);
  });
});

describe('generatePassword', () => {
  it('returns an empty string when the pool is empty', () => {
    expect(generatePassword(16, '')).toBe('');
  });

  it('returns an empty string when length is 0 or negative', () => {
    expect(generatePassword(0, LOWER)).toBe('');
    expect(generatePassword(-5, LOWER)).toBe('');
  });

  it('generates a string of the requested length', () => {
    expect(generatePassword(24, LOWER + NUMBERS)).toHaveLength(24);
  });

  it('only uses characters from the given pool', () => {
    const pool = 'ab';
    const pw = generatePassword(200, pool);
    expect([...pw].every((c) => pool.includes(c))).toBe(true);
  });

  it('produces different output across calls', () => {
    const a = generatePassword(32, LOWER + UPPER + NUMBERS + SYMBOLS);
    const b = generatePassword(32, LOWER + UPPER + NUMBERS + SYMBOLS);
    expect(a).not.toBe(b);
  });
});

describe('capitalizeWord', () => {
  it('capitalizes the first letter', () => {
    expect(capitalizeWord('hello')).toBe('Hello');
  });

  it('leaves an already-capitalized word unchanged', () => {
    expect(capitalizeWord('Hello')).toBe('Hello');
  });

  it('handles an empty string', () => {
    expect(capitalizeWord('')).toBe('');
  });

  it('handles single-character words', () => {
    expect(capitalizeWord('a')).toBe('A');
  });
});

describe('generatePassphrase', () => {
  const words = ['apple', 'brave', 'cider', 'dwarf', 'eagle'];

  it('returns an empty string when the word list is empty', () => {
    expect(
      generatePassphrase({
        words: [],
        wordCount: 5,
        separator: '-',
        capitalize: true,
        appendNumber: false,
        appendSymbol: false,
      })
    ).toBe('');
  });

  it('returns an empty string when wordCount is 0 or negative', () => {
    expect(
      generatePassphrase({
        words,
        wordCount: 0,
        separator: '-',
        capitalize: true,
        appendNumber: false,
        appendSymbol: false,
      })
    ).toBe('');
  });

  it('joins the requested number of words with the separator', () => {
    const phrase = generatePassphrase({
      words,
      wordCount: 4,
      separator: '-',
      capitalize: false,
      appendNumber: false,
      appendSymbol: false,
    });
    expect(phrase.split('-')).toHaveLength(4);
  });

  it('capitalizes each word when capitalize is true', () => {
    const phrase = generatePassphrase({
      words,
      wordCount: 3,
      separator: '-',
      capitalize: true,
      appendNumber: false,
      appendSymbol: false,
    });
    for (const part of phrase.split('-')) {
      expect(part[0]).toBe(part[0].toUpperCase());
    }
  });

  it('leaves words lowercase when capitalize is false', () => {
    const phrase = generatePassphrase({
      words,
      wordCount: 3,
      separator: '-',
      capitalize: false,
      appendNumber: false,
      appendSymbol: false,
    });
    expect(phrase).toBe(phrase.toLowerCase());
  });

  it('only uses words from the given list', () => {
    const phrase = generatePassphrase({
      words,
      wordCount: 30,
      separator: '-',
      capitalize: false,
      appendNumber: false,
      appendSymbol: false,
    });
    for (const part of phrase.split('-')) {
      expect(words).toContain(part);
    }
  });

  it('supports an empty separator', () => {
    const phrase = generatePassphrase({
      words: ['ab'],
      wordCount: 3,
      separator: '',
      capitalize: false,
      appendNumber: false,
      appendSymbol: false,
    });
    expect(phrase).toBe('ababab');
  });

  // Uses a letters-only separator here (rather than '-') because SYMBOLS itself
  // contains '-', which would make phrase.split('-') unreliable when that's the
  // symbol randomly chosen to append.
  it('appends a random 0-99 number when appendNumber is true', () => {
    const phrase = generatePassphrase({
      words,
      wordCount: 2,
      separator: 'SEP',
      capitalize: false,
      appendNumber: true,
      appendSymbol: false,
    });
    const parts = phrase.split('SEP');
    expect(parts).toHaveLength(3);
    const n = Number(parts[2]);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(100);
  });

  it('appends a symbol when appendSymbol is true', () => {
    const phrase = generatePassphrase({
      words,
      wordCount: 2,
      separator: 'SEP',
      capitalize: false,
      appendNumber: false,
      appendSymbol: true,
    });
    const parts = phrase.split('SEP');
    expect(parts).toHaveLength(3);
    expect(SYMBOLS.includes(parts[2])).toBe(true);
  });

  it('appends both a number and a symbol when both are requested', () => {
    const phrase = generatePassphrase({
      words,
      wordCount: 2,
      separator: 'SEP',
      capitalize: false,
      appendNumber: true,
      appendSymbol: true,
    });
    expect(phrase.split('SEP')).toHaveLength(4);
  });
});

describe('estimatePasswordBits', () => {
  it('returns 0 when poolSize is 0', () => {
    expect(estimatePasswordBits(20, 0)).toBe(0);
  });

  it('returns 0 when length is 0', () => {
    expect(estimatePasswordBits(0, 26)).toBe(0);
  });

  it('computes floor(length * log2(poolSize)) for a power-of-two pool', () => {
    // log2(2) = 1 exactly, so 10 chars from a 2-char pool = 10 bits
    expect(estimatePasswordBits(10, 2)).toBe(10);
  });

  it('matches the reference calculation for a full 95-char pool', () => {
    expect(estimatePasswordBits(20, 95)).toBe(Math.floor(20 * Math.log2(95)));
  });
});

describe('estimatePassphraseBits', () => {
  it('returns 0 when wordlistSize is 0', () => {
    expect(
      estimatePassphraseBits({
        wordCount: 5,
        wordlistSize: 0,
        appendNumber: false,
        appendSymbol: false,
        symbolsPoolSize: 10,
      })
    ).toBe(0);
  });

  it('returns 0 when wordCount is 0', () => {
    expect(
      estimatePassphraseBits({
        wordCount: 0,
        wordlistSize: 1296,
        appendNumber: false,
        appendSymbol: false,
        symbolsPoolSize: 10,
      })
    ).toBe(0);
  });

  it('computes floor(wordCount * log2(wordlistSize)) with no extras', () => {
    expect(
      estimatePassphraseBits({
        wordCount: 5,
        wordlistSize: 1296,
        appendNumber: false,
        appendSymbol: false,
        symbolsPoolSize: 10,
      })
    ).toBe(Math.floor(5 * Math.log2(1296)));
  });

  it('adds roughly log2(100) bits when a number is appended', () => {
    const base = estimatePassphraseBits({
      wordCount: 5,
      wordlistSize: 1296,
      appendNumber: false,
      appendSymbol: false,
      symbolsPoolSize: 10,
    });
    const withNumber = estimatePassphraseBits({
      wordCount: 5,
      wordlistSize: 1296,
      appendNumber: true,
      appendSymbol: false,
      symbolsPoolSize: 10,
    });
    const diff = withNumber - base;
    expect(diff).toBeGreaterThanOrEqual(5);
    expect(diff).toBeLessThanOrEqual(7);
  });

  it('adds bits for the symbol pool when a symbol is appended', () => {
    const base = estimatePassphraseBits({
      wordCount: 5,
      wordlistSize: 1296,
      appendNumber: false,
      appendSymbol: false,
      symbolsPoolSize: 28,
    });
    const withSymbol = estimatePassphraseBits({
      wordCount: 5,
      wordlistSize: 1296,
      appendNumber: false,
      appendSymbol: true,
      symbolsPoolSize: 28,
    });
    expect(withSymbol).toBeGreaterThan(base);
  });
});

describe('strengthLabel', () => {
  it('classifies bit thresholds correctly', () => {
    expect(strengthLabel(0)).toBe('Weak');
    expect(strengthLabel(44)).toBe('Weak');
    expect(strengthLabel(45)).toBe('Fair');
    expect(strengthLabel(59)).toBe('Fair');
    expect(strengthLabel(60)).toBe('Strong');
    expect(strengthLabel(99)).toBe('Strong');
    expect(strengthLabel(100)).toBe('Very Strong');
    expect(strengthLabel(200)).toBe('Very Strong');
  });
});
