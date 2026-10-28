import { describe, expect, it } from 'vitest';
import { evaluate, type EvaluationConfig } from '../src/index.js';

const catsAndDogs: EvaluationConfig = { classes: ['cat', 'dog'], threshold: 0.7 };

const caseExample = [
  { id: 'R1', actual: 'cat', probabilities: { cat: 0.8, dog: 0.2 } },
  { id: 'R2', actual: 'dog', probabilities: { cat: 0.6, dog: 0.4 } },
  { id: 'R3', actual: 'dog', probabilities: { cat: 0.7, dog: 0.3 } },
  { id: 'R4', actual: 'cat', probabilities: { cat: 0.8, dog: 0.4 } },
  { id: 'R1', actual: 'dog', probabilities: { cat: 0.1, dog: 0.9 } },
];

describe('evaluate — the worked example from the case', () => {
  const report = evaluate(catsAndDogs, caseExample);

  it('classifies each record in input order', () => {
    expect(report.results.map((result) => [result.id, result.outcome])).toEqual([
      ['R1', 'correct'],
      ['R2', 'abstention'],
      ['R3', 'incorrect'],
      ['R4', 'invalid'],
      ['R1', 'duplicate'],
    ]);
  });

  it('counts only the first valid record of each id', () => {
    expect(report.totals).toEqual({
      received: 5,
      invalid: 1,
      duplicates: 1,
      validUnique: 3,
      decisions: 2,
      abstentions: 1,
      correct: 1,
    });
  });

  it('reports coverage 2/3 and decision accuracy 1/2', () => {
    expect(report.coverage).toEqual({ numerator: 2, denominator: 3, value: 2 / 3 });
    expect(report.accuracy).toEqual({ numerator: 1, denominator: 2, value: 0.5 });
  });

  it('builds the confusion matrix from decisions only, rows actual and columns predicted', () => {
    expect(report.confusionMatrix).toEqual({
      classes: ['cat', 'dog'],
      counts: [
        [1, 0],
        [1, 0],
      ],
    });
  });
});

describe('evaluate — decision rules', () => {
  it('decides when the top probability equals the threshold exactly', () => {
    const report = evaluate(catsAndDogs, [{ id: 'R3', actual: 'dog', probabilities: { cat: 0.7, dog: 0.3 } }]);

    expect(report.results[0]).toMatchObject({ outcome: 'incorrect', predicted: 'cat', confidence: 0.7 });
  });

  it('abstains when the top probability is just below the threshold', () => {
    const report = evaluate(catsAndDogs, [{ id: 'R', actual: 'cat', probabilities: { cat: 0.6999999, dog: 0.3000001 } }]);

    expect(report.results[0]).toMatchObject({ outcome: 'abstention', topClass: 'cat' });
  });

  it('breaks ties by ascending class identifier, independent of configuration order', () => {
    const config = { classes: ['zebra', 'ant', 'mole'], threshold: 0.4 };
    const report = evaluate(config, [
      { id: 'T', actual: 'zebra', probabilities: { zebra: 0.45, ant: 0.1, mole: 0.45 } },
    ]);

    expect(report.results[0]).toMatchObject({ outcome: 'incorrect', predicted: 'mole' });
    expect(report.confusionMatrix.classes).toEqual(['ant', 'mole', 'zebra']);
  });

  it('lets a later valid record claim an id whose first attempt was invalid', () => {
    const report = evaluate(catsAndDogs, [
      { id: 'R1', actual: 'cat', probabilities: { cat: 0.9, dog: 0.9 } },
      { id: 'R1', actual: 'cat', probabilities: { cat: 0.9, dog: 0.1 } },
      { id: 'R1', actual: 'cat', probabilities: { cat: 0.9, dog: 0.1 } },
    ]);

    expect(report.results.map((result) => result.outcome)).toEqual(['invalid', 'correct', 'duplicate']);
    expect(report.results[2]).toMatchObject({ duplicateOf: 1 });
  });

  it('marks metrics as unavailable when their denominator is zero', () => {
    const allAbstain = evaluate({ classes: ['cat', 'dog'], threshold: 1 }, [
      { id: 'R1', actual: 'cat', probabilities: { cat: 0.6, dog: 0.4 } },
    ]);
    const empty = evaluate(catsAndDogs, []);

    expect(allAbstain.coverage).toEqual({ numerator: 0, denominator: 1, value: 0 });
    expect(allAbstain.accuracy).toEqual({ numerator: 0, denominator: 0, value: null });
    expect(empty.coverage).toEqual({ numerator: 0, denominator: 0, value: null });
  });

  it('starts from scratch when the same batch is evaluated with another threshold', () => {
    const strict = evaluate({ classes: ['cat', 'dog'], threshold: 0.9 }, caseExample);
    const lenient = evaluate({ classes: ['cat', 'dog'], threshold: 0.5 }, caseExample);

    expect(strict.totals).toMatchObject({ validUnique: 3, decisions: 0, abstentions: 3 });
    expect(lenient.totals).toMatchObject({ validUnique: 3, decisions: 3, abstentions: 0, correct: 1 });
  });
});
