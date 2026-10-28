'use client';

import { describeResult, type Outcome, type RecordResult } from '@prediction-evaluator/core';
import { type ReactNode, useState } from 'react';

const outcomes: Outcome[] = ['correct', 'incorrect', 'abstention', 'duplicate', 'invalid'];

export function ResultsTable({ results }: { results: RecordResult[] }) {
  const [filter, setFilter] = useState<Outcome | 'all'>('all');
  const visible = filter === 'all' ? results : results.filter((result) => result.outcome === filter);
  const countOf = (outcome: Outcome) => results.filter((result) => result.outcome === outcome).length;

  return (
    <>
      <div className="filters" role="group" aria-label="Filter records by outcome">
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          all ({results.length})
        </FilterButton>
        {outcomes.map((outcome) => (
          <FilterButton key={outcome} active={filter === outcome} onClick={() => setFilter(outcome)}>
            {outcome} ({countOf(outcome)})
          </FilterButton>
        ))}
      </div>
      <div className="table-scroll">
        <table className="results">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">ID</th>
              <th scope="col">Outcome</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((result) => (
              <tr key={result.index}>
                <td>{result.index + 1}</td>
                <td>
                  <code>{result.id ?? '—'}</code>
                </td>
                <td>
                  <span className={`badge ${result.outcome}`}>{result.outcome}</span>
                </td>
                <td>{describeResult(result)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={active ? 'chip active' : 'chip'} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}
