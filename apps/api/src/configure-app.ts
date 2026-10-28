import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

export const JSON_BODY_LIMIT = '20mb';

export function configureApp<T extends INestApplication>(app: T): T {
  (app as unknown as NestExpressApplication).useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.enableShutdownHooks();
  return app;
}
