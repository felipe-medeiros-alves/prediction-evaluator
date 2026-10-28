#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { parseConfig } from './config.js';
import { evaluate } from './evaluate.js';
import { formatRatio, formatReport } from './format.js';
import { sweepThresholds } from './sweep.js';
import { isPlainObject } from './guards.js';

const usage = 'usage: npm run demo -- <batch.json> [--threshold <0..1>] [--sweep] [--json]';

function main(): number {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      threshold: { type: 'string' },
      sweep: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
  });

  const [file] = positionals;
  if (!file) {
    console.error(usage);
    return 2;
  }

  const batch: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isPlainObject(batch) || !Array.isArray(batch.records)) {
    console.error('batch file must be an object with "config" and a "records" array');
    return 2;
  }

  const rawConfig = isPlainObject(batch.config) ? { ...batch.config } : batch.config;
  if (values.threshold !== undefined && isPlainObject(rawConfig)) {
    rawConfig.threshold = Number(values.threshold);
  }

  const config = parseConfig(rawConfig);
  if (!config.ok) {
    console.error(['invalid configuration, no records were processed:', ...config.errors.map((e) => `  - ${e}`)].join('\n'));
    return 1;
  }

  if (values.sweep) {
    const points = sweepThresholds(config.value.classes, batch.records);
    if (values.json) {
      console.log(JSON.stringify(points, null, 2));
    } else {
      for (const point of points) {
        console.log(
          `threshold ${point.threshold.toFixed(2)}  coverage ${formatRatio(point.coverage)}  accuracy ${formatRatio(point.accuracy)}`,
        );
      }
    }
    return 0;
  }

  const report = evaluate(config.value, batch.records);
  console.log(values.json ? JSON.stringify(report, null, 2) : formatReport(report));
  return 0;
}

process.exitCode = main();
