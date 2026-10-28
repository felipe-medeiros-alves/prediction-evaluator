import { BadRequestException } from '@nestjs/common';

export function invalidRequest(message: string, errors: string[]): BadRequestException {
  return new BadRequestException({ statusCode: 400, message, errors });
}
