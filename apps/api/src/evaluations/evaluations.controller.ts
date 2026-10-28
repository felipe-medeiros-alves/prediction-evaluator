import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { evaluate, parseConfig } from '@prediction-evaluator/core';
import { invalidRequest } from '../request-errors.js';

interface EvaluateBody {
  config?: unknown;
  records?: unknown;
}

@Controller('evaluations')
export class EvaluationsController {
  @Post()
  @HttpCode(200)
  evaluate(@Body() body: EvaluateBody) {
    const config = parseConfig(body?.config);
    if (!config.ok) {
      throw invalidRequest('Invalid configuration', config.errors);
    }
    if (!Array.isArray(body.records)) {
      throw invalidRequest('Invalid batch', ['records must be an array']);
    }
    return evaluate(config.value, body.records);
  }
}
