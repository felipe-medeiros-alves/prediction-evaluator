import { Module } from '@nestjs/common';
import { BatchRepository } from './batch.repository.js';
import { BatchesController } from './batches.controller.js';
import { BatchesService } from './batches.service.js';
import { InMemoryBatchRepository } from './in-memory-batch.repository.js';

@Module({
  controllers: [BatchesController],
  providers: [BatchesService, { provide: BatchRepository, useClass: InMemoryBatchRepository }],
})
export class BatchesModule {}
