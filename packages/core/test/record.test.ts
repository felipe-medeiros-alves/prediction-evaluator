import { describe, expect, it } from 'vitest';
import { validateRecord } from '../src/index.js';

const classes = ['cat', 'dog'];

describe('validateRecord', () => {
  it('accepts a well-formed record', () => {
    const input = { id: 'R1', actual: 'cat', probabilities: { cat: 0.8, dog: 0.2 } };

    expect(validateRecord(input, classes)).toEqual({ ok: true, value: input });
  });

  it('accepts a sum that is off by no more than the tolerance', () => {
    const input = { id: 'R1', actual: 'cat', probabilities: { cat: 0.8000004, dog: 0.2000004 } };

    expect(validateRecord(input, classes).ok).toBe(true);
  });

  it('rejects a sum just beyond the tolerance', () => {
    const input = { id: 'R1', actual: 'cat', probabilities: { cat: 0.800001, dog: 0.2000001 } };

    expect(validateRecord(input, classes).ok).toBe(false);
  });

  it('explains why probabilities that sum to 1.2 are invalid', () => {
    const result = validateRecord({ id: 'R4', actual: 'cat', probabilities: { cat: 0.8, dog: 0.4 } }, classes);

    expect(!result.ok && result.errors).toEqual(['probabilities sum to 1.2; expected 1 within ±0.000001']);
  });

  it('requires exactly one probability per configured class', () => {
    const result = validateRecord({ id: 'R1', actual: 'cat', probabilities: { cat: 1, bird: 0 } }, classes);

    expect(!result.ok && result.errors).toEqual([
      'probabilities.dog is missing',
      'probabilities.bird is not a configured class',
    ]);
  });

  it('rejects probabilities outside [0, 1] without also reporting the sum', () => {
    const result = validateRecord({ id: 'R1', actual: 'cat', probabilities: { cat: 1.5, dog: -0.5 } }, classes);

    expect(!result.ok && result.errors).toEqual([
      'probabilities.cat must be a number between 0 and 1',
      'probabilities.dog must be a number between 0 and 1',
    ]);
  });

  it('rejects a missing id and an unknown actual class', () => {
    const result = validateRecord({ id: '', actual: 'bird', probabilities: { cat: 0.5, dog: 0.5 } }, classes);

    expect(!result.ok && result.errors).toEqual([
      'id must be a non-empty string',
      'actual "bird" is not a configured class',
    ]);
  });

  it('rejects a record that is not an object', () => {
    expect(validateRecord(42, classes)).toEqual({ ok: false, errors: ['record must be an object'] });
  });
});
