import { Module } from '@nestjs/common';
import { BatchesModule } from './batches/batches.module.js';
import { EvaluationsController } from './evaluations/evaluations.controller.js';

@Module({
  imports: [BatchesModule],
  controllers: [EvaluationsController],
})
export class AppModule {}
