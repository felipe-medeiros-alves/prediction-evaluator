import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { Batch } from './batch.repository.js';
import { BatchesService, type CreateBatchBody, type EvaluateBatchBody } from './batches.service.js';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Post()
  async create(@Body() body: CreateBatchBody) {
    return summarize(await this.batches.create(body ?? {}));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const batch = await this.batches.get(id);
    return { ...summarize(batch), records: batch.records };
  }

  @Post(':id/evaluations')
  @HttpCode(200)
  evaluate(@Param('id') id: string, @Body() body: EvaluateBatchBody) {
    return this.batches.evaluate(id, body ?? {});
  }

  @Get(':id/threshold-sweep')
  async sweep(@Param('id') id: string) {
    return { points: await this.batches.sweep(id) };
  }
}

function summarize(batch: Batch) {
  return { id: batch.id, config: batch.config, recordCount: batch.records.length, createdAt: batch.createdAt };
}
