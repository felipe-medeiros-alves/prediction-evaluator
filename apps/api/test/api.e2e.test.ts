import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';

const caseExample = {
  config: { classes: ['cat', 'dog'] },
  records: [
    { id: 'R1', actual: 'cat', probabilities: { cat: 0.8, dog: 0.2 } },
    { id: 'R2', actual: 'dog', probabilities: { cat: 0.6, dog: 0.4 } },
    { id: 'R3', actual: 'dog', probabilities: { cat: 0.7, dog: 0.3 } },
    { id: 'R4', actual: 'cat', probabilities: { cat: 0.8, dog: 0.4 } },
    { id: 'R1', actual: 'cat', probabilities: { cat: 0.9, dog: 0.1 } },
  ],
};

describe('Prediction evaluator API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  describe('POST /evaluations', () => {
    it('evaluates a batch in one call using the default threshold', async () => {
      const response = await http()
        .post('/evaluations')
        .send(caseExample)
        .expect(200);

      expect(response.body.config.threshold).toBe(0.7);
      expect(response.body.totals).toMatchObject({ validUnique: 3, decisions: 2, abstentions: 1, correct: 1 });
      expect(response.body.coverage).toEqual({ numerator: 2, denominator: 3, value: 2 / 3 });
    });

    it('rejects an invalid configuration before looking at any record', async () => {
      const response = await http()
        .post('/evaluations')
        .send({ config: { classes: ['cat'], threshold: 1.5 }, records: 'not even an array' })
        .expect(400);

      expect(response.body).toMatchObject({
        message: 'Invalid configuration',
        errors: ['classes must contain at least two distinct identifiers', 'threshold must be a number between 0 and 1 (inclusive)'],
      });
    });

    it('requires records to be an array', async () => {
      const response = await http()
        .post('/evaluations')
        .send({ config: { classes: ['cat', 'dog'] }, records: {} })
        .expect(400);

      expect(response.body.errors).toEqual(['records must be an array']);
    });
  });

  describe('stored batches', () => {
    let batchId: string;

    beforeAll(async () => {
      const response = await http().post('/batches').send(caseExample).expect(201);
      batchId = response.body.id;
    });

    it('returns a summary of the stored batch', async () => {
      const response = await http().get(`/batches/${batchId}`).expect(200);

      expect(response.body).toMatchObject({
        id: batchId,
        config: { classes: ['cat', 'dog'], threshold: 0.7 },
        recordCount: 5,
      });
    });

    it('re-evaluates the same batch from scratch with a different threshold', async () => {
      const strict = await http().post(`/batches/${batchId}/evaluations`).send({ threshold: 0.9 }).expect(200);
      const standard = await http().post(`/batches/${batchId}/evaluations`).send({}).expect(200);

      expect(strict.body.totals).toMatchObject({ decisions: 0, abstentions: 3 });
      expect(strict.body.accuracy.value).toBeNull();
      expect(standard.body.totals).toMatchObject({ decisions: 2, abstentions: 1, correct: 1 });
    });

    it('rejects an out-of-range threshold for a stored batch', async () => {
      const response = await http().post(`/batches/${batchId}/evaluations`).send({ threshold: -1 }).expect(400);

      expect(response.body.errors).toEqual(['threshold must be a number between 0 and 1 (inclusive)']);
    });

    it('returns the coverage/accuracy trade-off across thresholds', async () => {
      const response = await http().get(`/batches/${batchId}/threshold-sweep`).expect(200);

      expect(response.body.points).toHaveLength(21);
      expect(response.body.points[14]).toMatchObject({ threshold: 0.7, decisions: 2, correct: 1 });
    });

    it('answers 404 for an unknown batch', async () => {
      await http().post('/batches/does-not-exist/evaluations').send({}).expect(404);
    });

    it('uses the threshold stored with the batch when none is given', async () => {
      const created = await http()
        .post('/batches')
        .send({ ...caseExample, config: { classes: ['cat', 'dog'], threshold: 0.9 } })
        .expect(201);
      const response = await http().post(`/batches/${created.body.id}/evaluations`).send({}).expect(200);

      expect(response.body.config.threshold).toBe(0.9);
      expect(response.body.totals).toMatchObject({ decisions: 0, abstentions: 3 });
    });

    it('refuses to store a batch with an invalid configuration, reporting every problem', async () => {
      const response = await http()
        .post('/batches')
        .send({ config: { classes: ['cat', 'cat'], threshold: 2 }, records: [] })
        .expect(400);

      expect(response.body.errors).toEqual([
        'classes[1] "cat" is repeated',
        'classes must contain at least two distinct identifiers',
        'threshold must be a number between 0 and 1 (inclusive)',
      ]);
    });
  });
});
