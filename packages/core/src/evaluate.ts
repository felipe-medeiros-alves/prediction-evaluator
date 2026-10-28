import { validateRecord } from './record.js';
import type {
  ClassId,
  ConfusionMatrix,
  DuplicateResult,
  EvaluationConfig,
  EvaluationReport,
  InvalidResult,
  Ratio,
  RecordResult,
  Totals,
} from './types.js';

export interface ScoredRecord {
  index: number;
  id: string;
  actual: ClassId;
  topClass: ClassId;
  confidence: number;
}

export type ScoredEntry = InvalidResult | DuplicateResult | ({ outcome: 'scored' } & ScoredRecord);

/**
 * Validates, de-duplicates and finds the top class of every record. None of this depends on the
 * threshold, so a sweep scores a batch once and only re-applies the threshold per point.
 */
export function scoreBatch(classes: readonly ClassId[], records: readonly unknown[]): ScoredEntry[] {
  const classOrder = [...classes].sort();
  const firstValidIndexById = new Map<string, number>();

  return records.map((input, index): ScoredEntry => {
    const validation = validateRecord(input, classes);
    if (!validation.ok) {
      return { index, id: idOf(input), outcome: 'invalid', errors: validation.errors };
    }

    const record = validation.value;
    const firstIndex = firstValidIndexById.get(record.id);
    if (firstIndex !== undefined) {
      return { index, id: record.id, outcome: 'duplicate', duplicateOf: firstIndex };
    }
    firstValidIndexById.set(record.id, index);

    const top = topClass(record.probabilities, classOrder);
    return {
      outcome: 'scored',
      index,
      id: record.id,
      actual: record.actual,
      topClass: top.classId,
      confidence: top.probability,
    };
  });
}

/** A confidence exactly equal to the threshold is a decision, not an abstention. */
export function isDecided(confidence: number, threshold: number): boolean {
  return confidence >= threshold;
}

export function applyThreshold(entry: ScoredEntry, threshold: number): RecordResult {
  if (entry.outcome !== 'scored') {
    return entry;
  }
  const { topClass: top, outcome: _scored, ...base } = entry;
  if (!isDecided(entry.confidence, threshold)) {
    return { ...base, outcome: 'abstention', topClass: top };
  }
  return { ...base, outcome: top === entry.actual ? 'correct' : 'incorrect', predicted: top };
}

/**
 * Evaluates a batch from scratch. Records are processed in input order and kept as `unknown`
 * so that one malformed record is reported instead of rejecting the whole batch.
 */
export function evaluate(config: EvaluationConfig, records: readonly unknown[]): EvaluationReport {
  const results = scoreBatch(config.classes, records).map((entry) => applyThreshold(entry, config.threshold));
  const totals = summarize(results);
  return {
    config,
    results,
    totals,
    coverage: ratio(totals.decisions, totals.validUnique),
    accuracy: ratio(totals.correct, totals.decisions),
    confusionMatrix: confusionMatrix(results, [...config.classes].sort()),
  };
}

/** Strict `>` over the ascending class order, so ties resolve to the lowest class identifier. */
function topClass(probabilities: Record<ClassId, number>, classOrder: ClassId[]) {
  let best = { classId: classOrder[0] as ClassId, probability: -1 };
  for (const classId of classOrder) {
    const probability = probabilities[classId] as number;
    if (probability > best.probability) {
      best = { classId, probability };
    }
  }
  return best;
}

function summarize(results: RecordResult[]): Totals {
  const count = (outcome: RecordResult['outcome']) => results.filter((result) => result.outcome === outcome).length;
  const correct = count('correct');
  const decisions = correct + count('incorrect');
  const abstentions = count('abstention');

  return {
    received: results.length,
    invalid: count('invalid'),
    duplicates: count('duplicate'),
    validUnique: decisions + abstentions,
    decisions,
    abstentions,
    correct,
  };
}

function confusionMatrix(results: RecordResult[], classOrder: ClassId[]): ConfusionMatrix {
  const position = new Map(classOrder.map((classId, index) => [classId, index]));
  const counts = classOrder.map(() => classOrder.map(() => 0));

  for (const result of results) {
    if (result.outcome === 'correct' || result.outcome === 'incorrect') {
      const row = position.get(result.actual)!;
      const column = position.get(result.predicted)!;
      counts[row]![column]! += 1;
    }
  }
  return { classes: classOrder, counts };
}

export function ratio(numerator: number, denominator: number): Ratio {
  return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator };
}

function idOf(input: unknown): string | null {
  const id = typeof input === 'object' && input !== null ? (input as { id?: unknown }).id : undefined;
  return typeof id === 'string' ? id : null;
}
