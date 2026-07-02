---
title: Never Discard Results With an Absent biomarker_key
impact: HIGH
impactDescription: dropping unmatched results silently loses clinical data
tags: data, biomarkers, standardization
---

## Never Discard Results With an Absent biomarker_key

**Impact: HIGH (dropping unmatched results silently loses clinical data)**

The `biomarker_key` field is present only when fuzzy matching confidently maps the extracted name to a known biomarker. When it cannot – common for lab-specific proprietary names, uncommon assays, ambiguous abbreviations, and composite panels – the field is **omitted entirely** (not present-but-null). An absent `biomarker_key` is NOT an error and NOT empty data: `original_name`, `display_name`, `raw_value`, and reference ranges are still populated and may be clinically relevant. Filtering these out silently discards real results. Instead, detect the absent field, fall back to `original_name` for display and aggregation, and flag the row for manual review.

**Incorrect (skipping results whose biomarker did not match):**

```python
for result in session["results"]:
    if "biomarker_key" not in result:
        continue  # silently drops real, clinically relevant data
    store_by_biomarker(result["biomarker_key"], result)
```

**Correct (keep everything, fall back to original_name):**

```python
for result in session["results"]:
    key = result.get("biomarker_key")
    if key is not None:
        store_by_biomarker(key, result)              # matched
    else:
        store_by_name(result["original_name"], result)  # unmatched, keep it
        flag_for_review(result["original_name"])
```

`loinc_code` follows the same convention: it is omitted when the matched biomarker has no LOINC mapping. Detect these by the field being absent, never by a null value.

Reference: [Best Practices – Handling Unmatched Biomarkers](https://docs.tryterra.co/lab-reports/best-practices)
