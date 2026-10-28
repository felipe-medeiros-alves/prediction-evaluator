import { Injectable } from '@nestjs/common';
import { type Batch, BatchRepository } from './batch.repository.js';

@Injectable()
export class InMemoryBatchRepository extends BatchRepository {
  private readonly batches = new Map<string, Batch>();

  async save(batch: Batch): Promise<void> {
    this.batches.set(batch.id, batch);
  }

  async findById(id: string): Promise<Batch | undefined> {
    return this.batches.get(id);
  }
}
