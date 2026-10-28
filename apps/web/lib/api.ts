import type { EvaluationConfig, EvaluationReport, SweepPoint } from '@prediction-evaluator/core';

export interface BatchSummary {
  id: string;
  config: EvaluationConfig;
  recordCount: number;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: string[],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok && body === null && response.status >= 500) {
    throw new ApiError('The evaluation API is not reachable', response.status, [
      'Start it with `npm run dev:api` (port 3001), or point API_URL at it before starting the web app.',
    ]);
  }
  if (!response.ok) {
    throw new ApiError(
      typeof body?.message === 'string' ? body.message : `Request failed with status ${response.status}`,
      response.status,
      Array.isArray(body?.errors) ? body.errors : [],
    );
  }
  return body as T;
}

export function createBatch(config: unknown, records: unknown): Promise<BatchSummary> {
  return request('/batches', { method: 'POST', body: JSON.stringify({ config, records }) });
}

export function evaluateBatch(id: string, threshold?: number, signal?: AbortSignal): Promise<EvaluationReport> {
  return request(`/batches/${encodeURIComponent(id)}/evaluations`, {
    method: 'POST',
    body: JSON.stringify({ threshold }),
    signal,
  });
}

export async function sweepBatch(id: string): Promise<SweepPoint[]> {
  const body = await request<{ points: SweepPoint[] }>(`/batches/${encodeURIComponent(id)}/threshold-sweep`);
  return body.points;
}
