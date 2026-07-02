# terra-lab-reports

Best practices and API reference for the [Terra Lab Reports API](https://docs.tryterra.co/lab-reports) (**pre-release**) – convert clinical lab report PDFs and images into structured, standardized biomarker data.

OCR plus AI extraction, fuzzy-matched against a ~4,130-entry biomarker dataset to produce canonical biomarker keys, UCUM unit codes, and LOINC codes. This skill is a hybrid: a references-based `SKILL.md` (product overview, endpoints, data model, gotchas) plus a small `rules/` directory of standalone best-practice rules with incorrect/correct code examples.

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-lab-reports
```

Or manually for Claude Code:

```bash
cp -r skills/terra-lab-reports ~/.claude/skills/
```

## Contents

| Path                             | What it covers                                                        |
| -------------------------------- | --------------------------------------------------------------------- |
| `SKILL.md`                       | Product overview, async lifecycle, endpoints, data model, gotchas, rule index |
| `rules/`                         | Seven best-practice rules with incorrect/correct examples             |
| `references/api-reference.md`    | Goal-to-endpoint routing with live spec links and key semantics        |
| `references/webhook-payload.md`  | The flat webhook shape, idempotency/correlation keys, and how failures surface via polling |
| `references/biomarkers.md`       | Standardization, UCUM mappings, LOINC coverage, common-biomarker tables |

### Rules

| Rule                                  | Impact | Summary                                                        |
| ------------------------------------- | ------ | -------------------------------------------------------------- |
| `webhooks-dedupe-session-id`          | HIGH   | Dedupe on `session_id` + content; a reprocess reuses the same `session_id` |
| `data-keep-unmatched-biomarkers`      | HIGH   | Never discard an absent `biomarker_key`; fall back to `original_name` |
| `data-filter-ranges-by-demographics`  | HIGH   | Filter reference ranges by sex/age/context before interpreting |
| `data-store-ids-as-strings`           | MEDIUM | Snowflake session IDs lose precision as JS numbers            |
| `data-parse-utf8`                     | MEDIUM | Data contains `µ`, `×`, `±`, superscripts – parse as UTF-8    |
| `api-poll-at-most-every-5s`           | MEDIUM | Webhooks for production; poll no faster than every 5 seconds  |
| `api-space-bulk-uploads`              | MEDIUM | One file per request, 20 MB cap; space bulk uploads           |

## Highlights

- Upload returns the `session_id` directly (`202` with `current_status: "processing"`) – one file, one session; there is no `upload_id`
- Webhooks fire only on success and carry a **flat** payload; detect `failed` by polling the session
- `biomarker_key` and `loinc_code` are **omitted** when unmatched, never present-but-null
- `flag` is a raw lab string, not an enum – and all enums are open (handle unknown values)
- Presigned file URLs are embedded inline in the GET-session response and expire – re-fetch the session to re-mint

## Full Documentation

[docs.tryterra.co/lab-reports](https://docs.tryterra.co/lab-reports)
