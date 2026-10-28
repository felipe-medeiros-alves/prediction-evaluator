import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { defaultSweepThresholds, evaluate, sweepThresholds } from '../src/index.js';

const records = [
  { id: 'R1', actual: 'cat', probabilities: { cat: 0.8, dog: 0.2 } },
  { id: 'R2', actual: 'dog', probabilities: { cat: 0.6, dog: 0.4 } },
  { id: 'R3', actual: 'dog', probabilities: { cat: 0.7, dog: 0.3 } },
];

describe('sweepThresholds', () => {
  it('uses 21 evenly spaced thresholds from 0 to 1 without floating-point drift', () => {
    const thresholds = defaultSweepThresholds();

    expect(thresholds).toHaveLength(21);
    expect(thresholds[0]).toBe(0);
    expect(thresholds[7]).toBe(0.35);
    expect(thresholds[14]).toBe(0.7);
    expect(thresholds[20]).toBe(1);
  });

  it('trades coverage for accuracy as the threshold rises', () => {
    const points = sweepThresholds(['cat', 'dog'], records, [0.5, 0.7, 0.8, 0.9]);

    expect(points.map(({ threshold, coverage, accuracy }) => [threshold, coverage.value, accuracy.value])).toEqual([
      [0.5, 1, 1 / 3],
      [0.7, 2 / 3, 0.5],
      [0.8, 1 / 3, 1],
      [0.9, 0, null],
    ]);
  });

  it('agrees with a full evaluation at every threshold, including invalid and duplicate records', () => {
    const batch = JSON.parse(readFileSync(new URL('../../../examples/claim-documents.json', import.meta.url), 'utf8'));
    const thresholds = [...defaultSweepThresholds(), 0.45, 0.75, 0.92];

    for (const point of sweepThresholds(batch.config.classes, batch.records, thresholds)) {
      const report = evaluate({ classes: batch.config.classes, threshold: point.threshold }, batch.records);
      expect(point).toEqual({
        threshold: point.threshold,
        decisions: report.totals.decisions,
        abstentions: report.totals.abstentions,
        correct: report.totals.correct,
        coverage: report.coverage,
        accuracy: report.accuracy,
      });
    }
  });
});
