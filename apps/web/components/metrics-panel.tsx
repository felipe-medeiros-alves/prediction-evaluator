import { type EvaluationReport, formatRatio, type Ratio } from '@prediction-evaluator/core';

export function MetricsPanel({ report }: { report: EvaluationReport }) {
  const { totals } = report;
  const counters: Array<[string, number]> = [
    ['Received', totals.received],
    ['Valid unique', totals.validUnique],
    ['Decisions', totals.decisions],
    ['Abstentions', totals.abstentions],
    ['Correct', totals.correct],
    ['Invalid', totals.invalid],
    ['Duplicates', totals.duplicates],
  ];

  return (
    <section className="card" aria-labelledby="metrics-heading">
      <h2 id="metrics-heading">Metrics at threshold {report.config.threshold.toFixed(2)}</h2>
      <div className="ratios">
        <RatioCard label="Coverage" hint="decisions ÷ valid unique records" ratio={report.coverage} />
        <RatioCard label="Decision accuracy" hint="correct ÷ decisions" ratio={report.accuracy} />
      </div>
      <dl className="counters">
        {counters.map(([label, value]) => (
          <div key={label} className="counter">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RatioCard({ label, hint, ratio }: { label: string; hint: string; ratio: Ratio }) {
  return (
    <div className="ratio">
      <span className="ratio-label">{label}</span>
      <span className="ratio-value">{ratio.value === null ? 'n/a' : `${(ratio.value * 100).toFixed(1)}%`}</span>
      <span className="ratio-detail">{formatRatio(ratio)}</span>
      <span className="ratio-hint">{hint}</span>
    </div>
  );
}
