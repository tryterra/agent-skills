# terra-lab-reports

Best practices and API reference for the [Terra Lab Reports API](https://docs.tryterra.co/lab-reports) (**pre-release**) – convert clinical lab report PDFs and images into structured, standardized biomarker data.

OCR plus AI extraction, fuzzy-matched against a 4,000+ entry biomarker dataset to produce canonical biomarker keys, UCUM unit codes, and LOINC codes. This skill is a hybrid: a references-based `SKILL.md` (product overview, endpoints, data model, gotchas) plus a small `rules/` directory of standalone best-practice rules with incorrect/correct code examples.

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-lab-reports
```

Or manually for Claude Code:

```bash
cp -r skills/terra-lab-reports ~/.claude/skills/
```

## Contents

| Path                            | What it covers                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                      | Product overview, async lifecycle, endpoints, data model, gotchas, rule index                                        |
| `rules/`                        | Seven best-practice rules with incorrect/correct examples                                                            |
| `references/api-reference.md`   | Goal-to-endpoint routing with live spec links and key semantics                                                      |
| `references/webhook-payload.md` | The event envelope (`type`, `event_id`, `occurred_at`, `upload_id`, `data`), idempotency keys, and the failure event |
| `references/biomarkers.md`      | Standardization, UCUM mappings, LOINC coverage, common-biomarker tables                                              |

### Rules

| Rule                                 | Impact | Summary                                                                      |
| ------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| `webhooks-dedupe-event-id`           | HIGH   | Dedupe on `event_id`; a reprocess mints a new one with the same `session_id` |
| `data-keep-unmatched-biomarkers`     | HIGH   | Never discard a null `biomarker.key`; fall back to `source.name`             |
| `data-filter-ranges-by-demographics` | HIGH   | Use `applied_range` first, then filter ranges by sex/age/context             |
| `data-store-ids-as-strings`          | MEDIUM | Snowflake session IDs lose precision as JS numbers                           |
| `data-parse-utf8`                    | MEDIUM | Data contains `µ`, `×`, `±`, superscripts – parse as UTF-8                   |
| `api-poll-at-most-every-5s`          | MEDIUM | Webhooks for production; poll no faster than every 5 seconds                 |
| `api-space-bulk-uploads`             | MEDIUM | One file per request, 20 MB cap; space bulk uploads                          |

## Highlights

- Upload returns an `upload_id` (`202` with `current_status: "processing"`), not a `session_id` – one upload can fan out to several sessions
- Every webhook is an **event envelope**: `lab_report.completed` or `lab_report.failed`, with `event_id` to dedupe on and `upload_id` to correlate
- Results are layered (`source` / `biomarker` / `measurement` / `interpretation` / `reference_ranges`), identical between webhook and GET
- `biomarker.key` is **null** when unmatched – the sole no-match signal; never key off `loinc_code`
- All enums are open (handle unknown values); `source.flag` is the raw lab string, `interpretation.flag` the coded signal
- Presigned file URLs live on the `/files` sub-resource and expire – re-fetch to re-mint

## Full Documentation

[docs.tryterra.co/lab-reports](https://docs.tryterra.co/lab-reports)
