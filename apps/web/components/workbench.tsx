'use client';

import type { EvaluationReport, SweepPoint } from '@prediction-evaluator/core';
import { useEffect, useRef, useState } from 'react';
import { ApiError, type BatchSummary, createBatch, evaluateBatch, sweepBatch } from '@/lib/api';
import type { Sample } from '@/lib/samples';
import { ConfusionMatrixTable } from './confusion-matrix';
import { MetricsPanel } from './metrics-panel';
import { ResultsTable } from './results-table';
import { SweepChart } from './sweep-chart';

interface Problem {
  message: string;
  details: string[];
}

const THRESHOLD_DEBOUNCE_MS = 120;

export function Workbench({ samples }: { samples: Sample[] }) {
  const [sampleKey, setSampleKey] = useState(samples[0]?.key ?? '');
  const [batchText, setBatchText] = useState(() => toJson(samples[0]?.batch));
  const [batch, setBatch] = useState<BatchSummary | null>(null);
  const [threshold, setThreshold] = useState(0.7);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [sweep, setSweep] = useState<SweepPoint[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const skipNextEvaluation = useRef(false);

  useEffect(() => {
    if (!batch) return;
    if (skipNextEvaluation.current) {
      skipNextEvaluation.current = false;
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      evaluateBatch(batch.id, threshold, controller.signal)
        .then((next) => {
          setReport(next);
          setProblem(null);
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) setProblem(toProblem(error));
        });
    }, THRESHOLD_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [batch, threshold]);

  function selectSample(key: string) {
    setSampleKey(key);
    const sample = samples.find((candidate) => candidate.key === key);
    if (sample) setBatchText(toJson(sample.batch));
  }

  async function submitBatch() {
    setIsLoading(true);
    setProblem(null);
    try {
      const parsed = parseBatchText(batchText);
      const created = await createBatch(parsed.config, parsed.records);
      const initialReport = await evaluateBatch(created.id);
      const points = await sweepBatch(created.id);

      skipNextEvaluation.current = true;
      setBatch(created);
      setThreshold(initialReport.config.threshold);
      setReport(initialReport);
      setSweep(points);
    } catch (error) {
      setBatch(null);
      setReport(null);
      setSweep([]);
      setProblem(toProblem(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="workbench">
      <section className="card batch-card" aria-labelledby="batch-heading">
        <h2 id="batch-heading">1. Batch</h2>
        <div className="sample-picker" role="radiogroup" aria-label="Sample batches">
          {samples.map((sample) => (
            <label key={sample.key} className={sample.key === sampleKey ? 'sample selected' : 'sample'}>
              <input
                type="radio"
                name="sample"
                value={sample.key}
                checked={sample.key === sampleKey}
                onChange={() => selectSample(sample.key)}
              />
              <span className="sample-label">{sample.label}</span>
              <span className="sample-description">{sample.description}</span>
            </label>
          ))}
        </div>
        <label className="field-label" htmlFor="batch-json">
          Batch JSON: <code>{'{ config: { classes, threshold }, records: [{ id, actual, probabilities }] }'}</code>
        </label>
        <textarea
          id="batch-json"
          className="batch-json"
          spellCheck={false}
          value={batchText}
          onChange={(event) => {
            setBatchText(event.target.value);
            setSampleKey('');
          }}
        />
        <button type="button" className="primary" onClick={submitBatch} disabled={isLoading}>
          {isLoading ? 'Evaluating…' : 'Upload and evaluate'}
        </button>
        {batch && (
          <p className="batch-meta">
            Batch <code>{batch.id.slice(0, 8)}</code> stored with {batch.recordCount} records and classes{' '}
            {batch.config.classes.join(', ')}.
          </p>
        )}
      </section>

      {problem && (
        <section className="card problem" role="alert">
          <strong>{problem.message}</strong>
          {problem.details.length > 0 && (
            <ul>
              {problem.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {batch && report && (
        <>
          <section className="card threshold-card" aria-labelledby="threshold-heading">
            <h2 id="threshold-heading">2. Confidence threshold</h2>
            <div className="threshold-controls">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={threshold}
                aria-label="Confidence threshold"
                onChange={(event) => setThreshold(Number(event.target.value))}
              />
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={threshold}
                aria-label="Confidence threshold value"
                onChange={(event) => setThreshold(Number(event.target.value))}
              />
            </div>
            <p className="hint">
              A record is decided when its top probability is at or above the threshold, otherwise the classifier
              abstains. Every change re-evaluates the stored batch from scratch.
            </p>
            <SweepChart points={sweep} threshold={threshold} />
          </section>

          <MetricsPanel report={report} />

          <section className="card" aria-labelledby="matrix-heading">
            <h2 id="matrix-heading">Confusion matrix (decisions only)</h2>
            <ConfusionMatrixTable matrix={report.confusionMatrix} />
          </section>

          <section className="card" aria-labelledby="records-heading">
            <h2 id="records-heading">Records</h2>
            <ResultsTable results={report.results} />
          </section>
        </>
      )}
    </div>
  );
}

function parseBatchText(text: string): { config: unknown; records: unknown } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ApiError('The batch is not valid JSON', 0, [error instanceof Error ? error.message : String(error)]);
  }
  const batch = (parsed ?? {}) as { config?: unknown; records?: unknown };
  return { config: batch.config, records: batch.records };
}

function toProblem(error: unknown): Problem {
  if (error instanceof ApiError) return { message: error.message, details: error.details };
  return { message: 'Could not reach the evaluation API', details: [String(error)] };
}

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
