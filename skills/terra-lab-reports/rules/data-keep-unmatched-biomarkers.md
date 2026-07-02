---
title: Never Discard Results With a Null biomarker
impact: HIGH
impactDescription: dropping unmatched results silently loses clinical data
tags: data, biomarkers, standardization
---

## Never Discard Results With a Null biomarker

**Impact: HIGH (dropping unmatched results silently loses clinical data)**

The `biomarker` field is always present but is explicitly `null` when fuzzy matching cannot confidently map the extracted name to a known biomarker – common for lab-specific proprietary names, uncommon assays, ambiguous abbreviations, and composite panels. A null `biomarker` is NOT an error and NOT empty data: `original_name`, `display_name`, `raw_value`, and reference ranges are still populated and may be clinically relevant. Filtering these out (for example, by treating `null` as "skip") silently discards real results. Instead, fall back to `original_name` for display and aggregation, and flag the row for manual review.

**Incorrect (skipping results whose biomarker did not match):**

```python
for result in session["results"]:
    if not result.get("biomarker"):
        continue  # silently drops real, clinically relevant data
    store_by_biomarker(result["biomarker"], result)
```

**Correct (keep everything, fall back to original_name):**

```python
for result in session["results"]:
    if result.get("biomarker") is not None:
        store_by_biomarker(result["biomarker"], result)  # matched
    else:
        store_by_name(result["original_name"], result)   # unmatched, keep it
        flag_for_review(result["original_name"])
```

`loinc_code` follows the same present-but-null convention when the matched biomarker has no LOINC mapping; other unset optional fields are omitted entirely rather than set to null.

Reference: [Best Practices – Handling Unmatched Biomarkers](https://docs.tryterra.co/lab-reports/best-practices)
