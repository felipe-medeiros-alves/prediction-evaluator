import { isNonEmptyString, isPlainObject, isUnitInterval } from './guards.js';
import type { ClassId, EvaluationConfig, Validation } from './types.js';

export const DEFAULT_THRESHOLD = 0.7;

export function parseConfig(input: unknown): Validation<EvaluationConfig> {
  if (!isPlainObject(input)) {
    return { ok: false, errors: ['configuration must be an object'] };
  }

  const classes = parseClasses(input.classes);
  const threshold = input.threshold === undefined ? DEFAULT_THRESHOLD : input.threshold;
  const errors = classes.ok ? [] : [...classes.errors];

  if (!isUnitInterval(threshold)) {
    errors.push('threshold must be a number between 0 and 1 (inclusive)');
  }

  if (!classes.ok || errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { classes: classes.value, threshold: threshold as number } };
}

export function parseClasses(input: unknown): Validation<ClassId[]> {
  if (!Array.isArray(input)) {
    return { ok: false, errors: ['classes must be an array of class identifiers'] };
  }

  const errors: string[] = [];
  const seen = new Set<string>();
  input.forEach((candidate, position) => {
    if (!isNonEmptyString(candidate)) {
      errors.push(`classes[${position}] must be a non-empty string`);
    } else if (seen.has(candidate)) {
      errors.push(`classes[${position}] "${candidate}" is repeated`);
    } else {
      seen.add(candidate);
    }
  });

  if (seen.size < 2) {
    errors.push('classes must contain at least two distinct identifiers');
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as ClassId[] };
}
