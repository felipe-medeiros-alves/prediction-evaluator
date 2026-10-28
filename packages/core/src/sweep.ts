import { isDecided, ratio, scoreBatch, type ScoredRecord } from './evaluate.js';
import type { ClassId, Ratio } from './types.js';

export interface SweepPoint {
  threshold: number;
  decisions: number;
  abstentions: number;
  correct: number;
  coverage: Ratio;
  accuracy: Ratio;
}

/** Built from integer steps (`i / 20`) rather than repeated `+= 0.05`, which drifts to 0.15000000000000002. */
export function defaultSweepThresholds(): number[] {
  return Array.from({ length: 21 }, (_, step) => step / 20);
}

export function sweepThresholds(
  classes: ClassId[],
  records: readonly unknown[],
  thresholds: readonly number[] = defaultSweepThresholds(),
): SweepPoint[] {
  const scored = scoreBatch(classes, records).filter(
    (entry): entry is { outcome: 'scored' } & ScoredRecord => entry.outcome === 'scored',
  );

  return thresholds.map((threshold) => {
    let decisions = 0;
    let correct = 0;
    for (const record of scored) {
      if (isDecided(record.confidence, threshold)) {
        decisions += 1;
        if (record.topClass === record.actual) correct += 1;
      }
    }
    return {
      threshold,
      decisions,
      abstentions: scored.length - decisions,
      correct,
      coverage: ratio(decisions, scored.length),
      accuracy: ratio(correct, decisions),
    };
  });
}
