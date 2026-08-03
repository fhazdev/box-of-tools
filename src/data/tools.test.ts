import { describe, it, expect } from 'vitest';
import { tools } from './tools';

describe('tools registry', () => {
  it('is not empty', () => {
    expect(tools.length).toBeGreaterThan(0);
  });

  it('gives every tool a non-empty title and description', () => {
    for (const tool of tools) {
      expect(tool.title.trim()).not.toBe('');
      expect(tool.description.trim()).not.toBe('');
    }
  });

  it('gives every tool a valid, unique, absolute href', () => {
    const hrefs = tools.map((t) => t.href);
    for (const href of hrefs) {
      expect(href.startsWith('/')).toBe(true);
    }
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
