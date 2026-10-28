import { isNonEmptyString, isPlainObject, isUnitInterval } from './guards.js';
import type { ClassId, PredictionRecord, Validation } from './types.js';

export const PROBABILITY_SUM_TOLERANCE = 0.000001;

export function validateRecord(input: unknown, classes: readonly ClassId[]): Validation<PredictionRecord> {
  if (!isPlainObject(input)) {
    return { ok: false, errors: ['record must be an object'] };
  }

  const errors: string[] = [];
  if (!isNonEmptyString(input.id)) {
    errors.push('id must be a non-empty string');
  }
  if (typeof input.actual !== 'string' || !classes.includes(input.actual)) {
    errors.push(`actual ${JSON.stringify(input.actual ?? null)} is not a configured class`);
  }
  errors.push(...probabilityErrors(input.probabilities, classes));

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      id: input.id as string,
      actual: input.actual as ClassId,
      probabilities: input.probabilities as Record<ClassId, number>,
    },
  };
}

function probabilityErrors(probabilities: unknown, classes: readonly ClassId[]): string[] {
  if (!isPlainObject(probabilities)) {
    return ['probabilities must be an object with one entry per configured class'];
  }

  const errors: string[] = [];
  for (const classId of classes) {
    if (!(classId in probabilities)) {
      errors.push(`probabilities.${classId} is missing`);
    } else if (!isUnitInterval(probabilities[classId])) {
      errors.push(`probabilities.${classId} must be a number between 0 and 1`);
    }
  }
  for (const key of Object.keys(probabilities)) {
    if (!classes.includes(key)) {
      errors.push(`probabilities.${key} is not a configured class`);
    }
  }
  if (errors.length > 0) {
    return errors;
  }

  const sum = classes.reduce((total, classId) => total + (probabilities[classId] as number), 0);
  if (Math.abs(sum - 1) > PROBABILITY_SUM_TOLERANCE) {
    return [`probabilities sum to ${roundForDisplay(sum)}; expected 1 within ±${PROBABILITY_SUM_TOLERANCE.toFixed(6)}`];
  }
  return [];
}

function roundForDisplay(value: number): number {
  return Number(value.toPrecision(12));
}
