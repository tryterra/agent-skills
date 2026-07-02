# terra-lab-reports

Best practices and API reference for the [Terra Lab Reports API](https://docs.tryterra.co/lab-reports) (**pre-release**) – convert clinical lab report PDFs and images into structured, standardized biomarker data.

OCR plus AI extraction, fuzzy-matched against a 4,200+ biomarker dataset to produce canonical biomarker slugs, UCUM unit codes, and LOINC codes. This skill is a hybrid: a references-based `SKILL.md` (product overview, endpoints, data model, gotchas) plus a small `rules/` directory of standalone best-practice rules with incorrect/correct code examples.

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
| `references/api-reference.md`    | Full endpoint request/response/error specs                            |
| `references/webhook-payload.md`  | Event envelope, success/failure payloads, enum tables                 |
| `references/biomarkers.md`       | Standardization, UCUM mappings, LOINC coverage, common-biomarker tables |

### Rules

| Rule                                  | Impact | Summary                                                        |
| ------------------------------------- | ------ | -------------------------------------------------------------- |
| `webhooks-dedupe-event-id`            | HIGH   | Dedupe on `event_id`; reprocessing mints a new one            |
| `data-keep-unmatched-biomarkers`      | HIGH   | Never discard a null `biomarker`; fall back to `original_name` |
| `data-filter-ranges-by-demographics`  | HIGH   | Filter reference ranges by sex/age/context before interpreting |
| `data-store-ids-as-strings`           | MEDIUM | Snowflake session IDs lose precision as JS numbers            |
| `data-parse-utf8`                     | MEDIUM | Data contains `µ`, `×`, `±`, superscripts – parse as UTF-8    |
| `api-poll-at-most-every-5s`           | MEDIUM | Webhooks for production; poll no faster than every 5 seconds  |
| `api-space-bulk-uploads`              | MEDIUM | One file per request, 20 MB cap; space bulk uploads           |

## Highlights

- Upload returns an `upload_id`, **not** a `session_id` – one upload can yield multiple reports
- Webhooks are the reliable completion signal; `GET ?upload_id=` is eventually consistent
- `biomarker` and `loinc_code` are **present-but-null** when unmatched; other optional fields are omitted
- `flag` is a raw lab string, not an enum – and all enums are open (handle unknown values)
- Presigned file URLs expire – re-fetch `/files` to mint fresh ones

## Full Documentation

[docs.tryterra.co/lab-reports](https://docs.tryterra.co/lab-reports)
