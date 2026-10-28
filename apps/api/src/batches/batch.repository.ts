import type { EvaluationConfig } from '@prediction-evaluator/core';

export interface Batch {
  id: string;
  /** The threshold here is the default for evaluations that do not provide one. */
  config: EvaluationConfig;
  /** Kept exactly as received: each evaluation re-validates records against the batch classes. */
  records: unknown[];
  createdAt: Date;
}

export abstract class BatchRepository {
  abstract save(batch: Batch): Promise<void>;
  abstract findById(id: string): Promise<Batch | undefined>;
}
