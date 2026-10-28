import type { EvaluationReport, Ratio, RecordResult } from './types.js';

export function formatRatio(ratio: Ratio): string {
  if (ratio.value === null) {
    return `not available (${ratio.numerator}/${ratio.denominator})`;
  }
  return `${ratio.numerator}/${ratio.denominator} (${(ratio.value * 100).toFixed(2)}%)`;
}

export function describeResult(result: RecordResult): string {
  switch (result.outcome) {
    case 'invalid':
      return `invalid: ${result.errors.join('; ')}`;
    case 'duplicate':
      return `duplicate of record #${result.duplicateOf + 1}, not counted`;
    case 'abstention':
      return `abstention: top class ${result.topClass} at ${result.confidence} is below the threshold`;
    case 'correct':
    case 'incorrect':
      return `${result.outcome}: predicted ${result.predicted} at ${result.confidence}, actual ${result.actual}`;
  }
}

export function formatReport(report: EvaluationReport): string {
  const { config, results, totals, confusionMatrix } = report;
  const lines = [
    `classes: ${config.classes.join(', ')}`,
    `threshold: ${config.threshold}`,
    '',
    'records:',
    ...results.map((result) => `  #${result.index + 1} ${result.id ?? '(no id)'} -> ${describeResult(result)}`),
    '',
    'totals:',
    `  received: ${totals.received}`,
    `  invalid: ${totals.invalid}`,
    `  duplicates: ${totals.duplicates}`,
    `  valid unique: ${totals.validUnique}`,
    `  decisions: ${totals.decisions}`,
    `  abstentions: ${totals.abstentions}`,
    `  correct: ${totals.correct}`,
    '',
    `coverage: ${formatRatio(report.coverage)}`,
    `decision accuracy: ${formatRatio(report.accuracy)}`,
    '',
    'confusion matrix (rows = actual, columns = predicted):',
    ...formatMatrix(confusionMatrix.classes, confusionMatrix.counts),
  ];
  return lines.join('\n');
}

function formatMatrix(classes: string[], counts: number[][]): string[] {
  const width = Math.max(...classes.map((classId) => classId.length), 6);
  const cell = (text: string | number) => String(text).padStart(width);
  return [
    `  ${cell('')} ${classes.map(cell).join(' ')}`,
    ...classes.map((classId, row) => `  ${cell(classId)} ${(counts[row] ?? []).map(cell).join(' ')}`),
  ];
}
