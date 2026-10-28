# Case 06 — Prediction evaluator with abstentions

A local tool that evaluates pre-computed classifier predictions: for each record it decides whether the classifier **decided** (and was right or wrong), **abstained** (top probability below the confidence threshold), or whether the record is **invalid** or a **duplicate**. It reports coverage, decision accuracy and a confusion matrix, and shows how those numbers move as the threshold changes.

**Focus:** full stack in TypeScript. A pure domain library holds every rule, a NestJS API stores batches and evaluates them, and a Next.js (App Router) UI lets you explore the coverage/accuracy trade-off.

**Time spent:** _fill in before submitting_.

Why this case: the threshold is the line between work that can be automated and work that has to go to a person. Coverage measures how much of the batch gets automated; decision accuracy measures how much of that automation can be trusted. The second sample batch frames it as triaging attachments on insurance claims, where every abstention is a document a human adjuster reviews.

## Requirements

- Node.js 24 (tested with 24.14.0; `.tool-versions` and `.nvmrc` pin it). The npm that ships with Node 20.12 (10.5) crashes while resolving this workspace, so use Node 24 or npm 10.8 or newer.
- No database, Docker or network services are required.

## Quick start

```bash
npm install
npm test                                   # core rules + API end-to-end tests
npm run demo -- examples/case-example.json # the example from the case, in the terminal
```

Run the full stack in two terminals:

```bash
npm run dev:api   # NestJS on http://localhost:3001
npm run dev:web   # Next.js on http://localhost:3000 (proxies /api/* to the API)
```

Open http://localhost:3000, pick a sample batch (or paste your own JSON), click **Upload and evaluate**, then move the threshold slider.

Other useful commands:

```bash
npm run typecheck
npm run build
npm run demo -- examples/claim-documents.json --threshold 0.4
npm run demo -- examples/case-example.json --sweep        # coverage/accuracy for thresholds 0.00…1.00
npm run demo -- examples/case-example.json --json         # the raw report
```

Set `API_URL` before `npm run dev:web` if the API runs somewhere other than `http://localhost:3001`.

## Layout

```text
packages/core     Domain library: validation, decision rules, metrics, threshold sweep, CLI
apps/api          NestJS 12: stores batches and evaluates them via @prediction-evaluator/core
apps/web          Next.js 16 App Router UI that talks to the API through a rewrite
examples          Batch files used by the CLI, the UI samples and the tests
```

The rules live only in `packages/core`. The API adds transport and storage, and the UI adds presentation, so the CLI, the API and the browser cannot disagree about an outcome. The API stores records exactly as received and re-validates them on every evaluation; that is what "evaluate the same batch again with another threshold, starting from scratch" means here.

## Input format

```json
{
  "config": { "classes": ["cat", "dog"], "threshold": 0.7 },
  "records": [{ "id": "R1", "actual": "cat", "probabilities": { "cat": 0.8, "dog": 0.2 } }]
}
```

`threshold` is optional and defaults to `0.7`.

## Rules as implemented

- **Configuration:** at least two distinct, non-blank class identifiers, and a threshold that is a number in `[0, 1]`. An invalid configuration is rejected with every problem listed, before any record is looked at.
- **Valid record:** a non-empty string `id`, an `actual` class that is configured, and exactly one probability per configured class (missing or unknown keys are errors). Each probability is in `[0, 1]`, and they sum to 1 within `0.000001`.
- **Prediction:** the class with the highest probability. Ties go to the lowest class identifier in ascending order (plain UTF-16 code-unit comparison, so `"Zebra"` sorts before `"ant"`).
- **Abstention:** the top probability is below the threshold. A probability exactly equal to the threshold is a decision.
- **Order of checks:** validation first, then de-duplication. An invalid record does not take its `id`. Only the first valid record with a given `id` is counted; later valid ones are `duplicate`, even if their content differs.
- **Metrics:** coverage = decisions ÷ valid unique records, decision accuracy = correct ÷ decisions. When a denominator is zero the value is `null` and shown as "not available".
- **Confusion matrix:** decisions only. Rows are the actual class, columns the predicted class, both in ascending class order.

## Demo

### The example from the case

`npm run demo -- examples/case-example.json`

| Record | Outcome |
|---|---|
| R1 | correct (cat at 0.8) |
| R2 | abstention (cat at 0.6 < 0.7) |
| R3 | incorrect (cat at exactly 0.7, actual dog) |
| R4 | invalid: probabilities sum to 1.2 |
| R1 again | duplicate of record #1 |

Totals: 3 valid unique records, 2 decisions, 1 abstention, 1 correct. Coverage is 2/3 and decision accuracy 1/2. In the confusion matrix, actual cat/predicted cat and actual dog/predicted cat are 1; every other cell is 0.

### A different scenario: claim document triage

`examples/claim-documents.json` has three classes (`invoice`, `estimate`, `police_report`) and a threshold of 0.75. It exercises each rule:

| Record | What it tests | Expected at 0.75 |
|---|---|---|
| DOC-01 | confident and right | correct |
| DOC-02 | below the threshold | abstention |
| DOC-03 | confident and wrong | incorrect (invoice for an estimate) |
| DOC-04 | top probability exactly 0.75 | correct (equal to the threshold decides) |
| DOC-05 (1st) | probabilities sum to 0.9 | invalid, does not take the id |
| DOC-05 (2nd) | same id, now valid | counted, abstention at 0.6 |
| DOC-01 again | valid repeat with different content | duplicate |
| DOC-06 | confident and right | correct |
| DOC-07 | actual class `photo` is not configured | invalid |
| DOC-08 | tie between estimate and invoice at 0.45 | abstention; at 0.4 it predicts `estimate` |

Expected at 0.75: 7 valid unique records, 4 decisions, 3 abstentions, 3 correct, so coverage is 4/7 and accuracy 3/4. Lowering the threshold to 0.4 (`--threshold 0.4`, or the slider) gives coverage 7/7 and accuracy 6/7. More automation is bought with one more mistake.

## API

| Method and path | Body | Result |
|---|---|---|
| `POST /evaluations` | `{ config, records }` | `200` report. Stateless, one call. |
| `POST /batches` | `{ config, records }` | `201` `{ id, config, recordCount, createdAt }` |
| `GET /batches/:id` | | `200` summary plus the stored records |
| `POST /batches/:id/evaluations` | `{ threshold? }` | `200` report. Without a threshold, the batch's own is used. |
| `GET /batches/:id/threshold-sweep` | | `200` `{ points }` for thresholds 0.00, 0.05, …, 1.00 |

An invalid configuration answers `400 { message: "Invalid configuration", errors: [...] }`, and an unknown batch answers `404`. Invalid records never fail a request; they appear as `invalid` results in the report.

```bash
curl -s -X POST localhost:3001/evaluations -H 'content-type: application/json' \
  -d @examples/case-example.json | jq '.totals, .coverage, .accuracy'
```

## Tests

`npm test` runs 34 unit tests on the core rules (Vitest) and 10 end-to-end tests that boot the Nest application and call it over HTTP (Vitest, SWC and Supertest). Three of them explain the solution best:

1. **The threshold boundary** (`evaluate.test.ts`, "decides when the top probability equals the threshold exactly"). R3 has cat at exactly 0.7 with a 0.7 threshold, so it must be `incorrect`, not an abstention. A companion test checks that 0.6999999 abstains. This catches the most likely bug in the whole case: writing `>` where the rule says "at or above".
2. **Invalid, then valid, then repeated `id`** (`evaluate.test.ts`, "lets a later valid record claim an id whose first attempt was invalid"). The sequence must be `invalid`, `correct`, `duplicate`, with the duplicate pointing at the second record. It checks how the validation and de-duplication rules interact, and fails if de-duplication runs before validation or if a rejected record takes the `id`.
3. **The sweep agrees with a full evaluation** (`sweep.test.ts`, "agrees with a full evaluation at every threshold"). The sweep uses a faster path (see below), so this test compares it with `evaluate` at 24 thresholds on the claim-documents batch. To check that the test has teeth, I temporarily changed the sweep to compare with `>`; this test and the coverage/accuracy test both failed.

## Decisions

**"At least two classes" means two distinct classes.** My first version counted array entries, so `["cat", "cat"]` passed that check and was rejected only for the repetition. An API test expecting both messages failed, and that made me decide what the rule is about. A configuration with one distinct class cannot produce a meaningful matrix, so the check now counts distinct, valid identifiers. I changed the core test first, watched it fail, then fixed the code.

**The sweep scores each record once.** The first sweep called `evaluate` 21 times. I measured it on a synthetic batch of 500,000 records with four classes: one evaluation took about 0.45 s, the sweep about 7.8 s. Validation, de-duplication and finding the top class do not depend on the threshold, so the core now does that work once (`scoreBatch`), and each threshold only compares confidences. The sweep went down to about 0.42 s. The risk was the two paths drifting apart, so both use the same `isDecided` function, and test 3 above pins them together.

**Batches store their whole configuration.** At first `POST /batches` only accepted `classes`, and the threshold was checked on the first evaluation. While testing the UI with a batch where both were wrong, the errors arrived in two separate responses, which goes against "report the invalid configuration before processing". Batches now take the same `{ config, records }` shape as the example files and `POST /evaluations`, and all problems come back at once.

### Use of AI

I built this with an AI coding assistant. I used it to scaffold the monorepo, draft tests and code, and write documentation. Everything it produced went through the same checks: tests written first and seen failing for the right reason, the mutation check above, the CLI output compared line by line with the case's example, and the UI exercised in a browser (sample batches, threshold changes, an invalid configuration, the API switched off). Two of the decisions above came out of those checks, not out of the first draft.

## Assumptions

- Class identifiers are compared exactly, with no trimming or case folding. Record ids are compared exactly too.
- Probabilities are compared as given, with no epsilon on the threshold. Only the sum has a tolerance, because only the sum is specified with one.
- A record's `actual` class must be one of the configured classes; otherwise it would be impossible to place it in the matrix.
- Invalid records are reported with every error found, not just the first, and with their `id` when one was readable.

## Limits and what is pending

- Batches are kept in memory and are lost when the API restarts. Storage sits behind the `BatchRepository` port, so a PostgreSQL adapter would be a new provider. A likely schema: `batches(id uuid pk, classes text[], threshold numeric, created_at)` and `batch_records(batch_id, position, payload jsonb, pk(batch_id, position))`. With a generated `confidence` column and an index on it, the sweep could become a single `GROUP BY` query.
- Request bodies are limited to 20 MB (about 140,000 records). Larger batches would need streaming upload or file ingestion.
- The UI has no automated tests. It was checked by hand in the browser as described above.
- The sweep chart samples every 0.05 and draws straight lines between the samples; the real curves are step functions.
- No authentication, multi-user isolation or deletion of batches.
