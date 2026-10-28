import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLD, parseConfig } from '../src/index.js';

describe('parseConfig', () => {
  it('defaults the confidence threshold to 0.7', () => {
    const result = parseConfig({ classes: ['cat', 'dog'] });

    expect(result).toEqual({ ok: true, value: { classes: ['cat', 'dog'], threshold: DEFAULT_THRESHOLD } });
    expect(DEFAULT_THRESHOLD).toBe(0.7);
  });

  it.each([0, 1])('accepts the inclusive threshold bound %s', (threshold) => {
    expect(parseConfig({ classes: ['cat', 'dog'], threshold }).ok).toBe(true);
  });

  it.each([-0.01, 1.01, Number.NaN, '0.7', null])('rejects threshold %s', (threshold) => {
    const result = parseConfig({ classes: ['cat', 'dog'], threshold });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toEqual(['threshold must be a number between 0 and 1 (inclusive)']);
  });

  it('requires at least two classes', () => {
    const result = parseConfig({ classes: ['cat'] });

    expect(!result.ok && result.errors).toEqual(['classes must contain at least two distinct identifiers']);
  });

  it('rejects repeated and blank class identifiers', () => {
    const result = parseConfig({ classes: ['cat', 'cat', ' ', 3, 'dog'] });

    expect(!result.ok && result.errors).toEqual([
      'classes[1] "cat" is repeated',
      'classes[2] must be a non-empty string',
      'classes[3] must be a non-empty string',
    ]);
  });

  it('counts distinct classes, not entries, toward the minimum of two', () => {
    const result = parseConfig({ classes: ['cat', 'cat'] });

    expect(!result.ok && result.errors).toEqual([
      'classes[1] "cat" is repeated',
      'classes must contain at least two distinct identifiers',
    ]);
  });

  it('reports every configuration problem at once', () => {
    const result = parseConfig({ threshold: 2 });

    expect(!result.ok && result.errors).toEqual([
      'classes must be an array of class identifiers',
      'threshold must be a number between 0 and 1 (inclusive)',
    ]);
  });

  it('rejects a configuration that is not an object', () => {
    expect(parseConfig('cat,dog')).toEqual({ ok: false, errors: ['configuration must be an object'] });
  });
});
