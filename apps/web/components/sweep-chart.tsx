import type { Ratio, SweepPoint } from '@prediction-evaluator/core';

const WIDTH = 560;
const HEIGHT = 220;
const PADDING = { top: 12, right: 16, bottom: 32, left: 40 };

const x = (threshold: number) => PADDING.left + threshold * (WIDTH - PADDING.left - PADDING.right);
const y = (value: number) => HEIGHT - PADDING.bottom - value * (HEIGHT - PADDING.top - PADDING.bottom);

export function SweepChart({ points, threshold }: { points: SweepPoint[]; threshold: number }) {
  if (points.length === 0) return null;

  return (
    <figure className="sweep">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Coverage and accuracy across thresholds">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line className="grid" x1={x(0)} x2={x(1)} y1={y(tick)} y2={y(tick)} />
            <text className="axis" x={PADDING.left - 6} y={y(tick) + 4} textAnchor="end">
              {tick * 100}%
            </text>
            <text className="axis" x={x(tick)} y={HEIGHT - PADDING.bottom + 18} textAnchor="middle">
              {tick.toFixed(2)}
            </text>
          </g>
        ))}
        <line className="marker" x1={x(threshold)} x2={x(threshold)} y1={y(0)} y2={y(1)} />
        {segments(points, (point) => point.coverage).map((path) => (
          <path key={`coverage-${path}`} className="series coverage" d={path} />
        ))}
        {segments(points, (point) => point.accuracy).map((path) => (
          <path key={`accuracy-${path}`} className="series accuracy" d={path} />
        ))}
      </svg>
      <figcaption>
        <span className="legend coverage">coverage</span>
        <span className="legend accuracy">decision accuracy</span>
        <span className="legend-note">The accuracy line stops where there are no decisions left to measure.</span>
      </figcaption>
    </figure>
  );
}

function segments(points: SweepPoint[], pick: (point: SweepPoint) => Ratio): string[] {
  const paths: string[] = [];
  let current: string[] = [];
  for (const point of points) {
    const { value } = pick(point);
    if (value === null) {
      if (current.length > 0) paths.push(current.join(' '));
      current = [];
      continue;
    }
    current.push(`${current.length === 0 ? 'M' : 'L'}${x(point.threshold).toFixed(1)},${y(value).toFixed(1)}`);
  }
  if (current.length > 0) paths.push(current.join(' '));
  return paths;
}
