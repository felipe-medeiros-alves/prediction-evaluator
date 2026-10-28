import type { CSSProperties } from 'react';
import type { ConfusionMatrix } from '@prediction-evaluator/core';

export function ConfusionMatrixTable({ matrix }: { matrix: ConfusionMatrix }) {
  const max = Math.max(1, ...matrix.counts.flat());

  return (
    <div className="table-scroll">
      <table className="matrix">
        <thead>
          <tr>
            <th scope="col" className="corner">
              actual ↓ / predicted →
            </th>
            {matrix.classes.map((classId) => (
              <th key={classId} scope="col">
                {classId}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.classes.map((actual, row) => (
            <tr key={actual}>
              <th scope="row">{actual}</th>
              {matrix.classes.map((predicted, column) => {
                const count = matrix.counts[row]?.[column] ?? 0;
                const tone = row === column ? 'hit' : 'miss';
                return (
                  <td
                    key={predicted}
                    className={count > 0 ? tone : undefined}
                    style={{ '--intensity': count / max } as CSSProperties}
                  >
                    {count}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
