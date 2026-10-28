export type ClassId = string;

export interface EvaluationConfig {
  classes: ClassId[];
  threshold: number;
}

export interface PredictionRecord {
  id: string;
  actual: ClassId;
  probabilities: Record<ClassId, number>;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };

interface ResultBase {
  index: number;
  id: string | null;
}

export interface InvalidResult extends ResultBase {
  outcome: 'invalid';
  errors: string[];
}

export interface DuplicateResult extends ResultBase {
  outcome: 'duplicate';
  duplicateOf: number;
}

export interface AbstentionResult extends ResultBase {
  outcome: 'abstention';
  actual: ClassId;
  topClass: ClassId;
  confidence: number;
}

export interface DecisionResult extends ResultBase {
  outcome: 'correct' | 'incorrect';
  actual: ClassId;
  predicted: ClassId;
  confidence: number;
}

export type RecordResult = InvalidResult | DuplicateResult | AbstentionResult | DecisionResult;

export type Outcome = RecordResult['outcome'];

export interface Ratio {
  numerator: number;
  denominator: number;
  /** `null` when the denominator is zero and the metric is not available. */
  value: number | null;
}

export interface Totals {
  received: number;
  invalid: number;
  duplicates: number;
  validUnique: number;
  decisions: number;
  abstentions: number;
  correct: number;
}

export interface ConfusionMatrix {
  /** Row and column order, ascending by class identifier. */
  classes: ClassId[];
  /** `counts[actual][predicted]`, decisions only. */
  counts: number[][];
}

export interface EvaluationReport {
  config: EvaluationConfig;
  results: RecordResult[];
  totals: Totals;
  coverage: Ratio;
  accuracy: Ratio;
  confusionMatrix: ConfusionMatrix;
}
