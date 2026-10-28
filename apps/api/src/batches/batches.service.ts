import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { type EvaluationReport, evaluate, parseConfig, type SweepPoint, sweepThresholds } from '@prediction-evaluator/core';
import { invalidRequest } from '../request-errors.js';
import { type Batch, BatchRepository } from './batch.repository.js';

export interface CreateBatchBody {
  config?: unknown;
  records?: unknown;
}

export interface EvaluateBatchBody {
  threshold?: unknown;
}

@Injectable()
export class BatchesService {
  constructor(private readonly repository: BatchRepository) {}

  async create(body: CreateBatchBody): Promise<Batch> {
    const config = parseConfig(body.config);
    if (!config.ok) {
      throw invalidRequest('Invalid configuration', config.errors);
    }
    if (!Array.isArray(body.records)) {
      throw invalidRequest('Invalid batch', ['records must be an array']);
    }

    const batch: Batch = { id: randomUUID(), config: config.value, records: body.records, createdAt: new Date() };
    await this.repository.save(batch);
    return batch;
  }

  async get(id: string): Promise<Batch> {
    const batch = await this.repository.findById(id);
    if (!batch) {
      throw new NotFoundException(`Batch ${id} not found`);
    }
    return batch;
  }

  async evaluate(id: string, body: EvaluateBatchBody): Promise<EvaluationReport> {
    const batch = await this.get(id);
    const threshold = body.threshold === undefined ? batch.config.threshold : body.threshold;
    const config = parseConfig({ classes: batch.config.classes, threshold });
    if (!config.ok) {
      throw invalidRequest('Invalid configuration', config.errors);
    }
    return evaluate(config.value, batch.records);
  }

  async sweep(id: string): Promise<SweepPoint[]> {
    const batch = await this.get(id);
    return sweepThresholds(batch.config.classes, batch.records);
  }
}
