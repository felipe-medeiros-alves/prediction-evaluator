import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

const port = Number(process.env.PORT ?? 3001);

const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
await app.listen(port);
Logger.log(`Prediction evaluator API listening on http://localhost:${port}`, 'Bootstrap');
