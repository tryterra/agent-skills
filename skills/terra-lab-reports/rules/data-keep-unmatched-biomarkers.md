---
title: Never Discard Results With a Null biomarker.key
impact: HIGH
impactDescription: dropping unmatched results silently loses clinical data
tags: data, biomarkers, standardization
---

## Never Discard Results With a Null biomarker.key

**Impact: HIGH (dropping unmatched results silently loses clinical data)**

`biomarker.key` is non-null only when fuzzy matching confidently maps the extracted name to a known biomarker. When it cannot – common for lab-specific proprietary names, uncommon assays, ambiguous abbreviations, and composite panels – the key is **null**. It is the SOLE no-match signal: do not key off `loinc_code`, which can be null even on a matched biomarker. A null `biomarker.key` is NOT an error and NOT empty data: `source.name`, `biomarker.display_name`, `measurement`, and `reference_ranges` are still populated and may be clinically relevant. Filtering these out silently discards real results. Instead, fall back to `source.name` for display and aggregation, and flag the row for manual review.

**Incorrect (skipping results whose biomarker did not match):**

```python
for result in session["results"]:
    if result["biomarker"]["key"] is None:
        continue  # silently drops real, clinically relevant data
    store_by_biomarker(result["biomarker"]["key"], result)
```

**Correct (keep everything, fall back to source.name):**

```python
for result in session["results"]:
    key = result["biomarker"]["key"]
    if key is not None:
        store_by_biomarker(key, result)                    # matched
    else:
        store_by_name(result["source"]["name"], result)    # unmatched, keep it
        flag_for_review(result["source"]["name"])
```

Unlike `biomarker.key` (always present, nullable), most other unset optional fields are omitted entirely – `loinc_code` may be either absent or null when unmapped, so read it defensively and never use it to detect a match.

Reference: [Best Practices – Handling Unmatched Biomarkers](https://docs.tryterra.co/lab-reports/best-practices)
