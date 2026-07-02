---
title: Filter Reference Ranges by Demographics Before Interpreting
impact: HIGH
impactDescription: applying the wrong range misclassifies results
tags: data, reference-ranges, interpretation
---

## Filter Reference Ranges by Demographics Before Interpreting

**Impact: HIGH (applying the wrong range misclassifies results)**

A single result can carry multiple `reference_ranges`, each with a `context` scoping it to a sex, age band, pregnancy status, cycle phase, or other modifier. Picking the first range, or ignoring context entirely, can flag a normal value as abnormal (or vice versa). Match the patient's demographics to the range's context before deciding normal/low/high. Treat an absent context field as "applies to all" – if `sex` is not present the range is not sex-specific, so do not exclude it. For bounded results (`value_gt` / `value_lt`), there is no exact `value`; interpret conservatively, for example treating `<X` as `X` against the upper bound.

**Incorrect (interpreting against the first range, ignoring context):**

```python
ref = result["reference_ranges"][0]  # may be the female or pregnancy range
value = result["value"]
status = "high" if value > ref["upper_bound"] else "normal"
```

**Correct (filter by context, then interpret):**

```python
def applicable_range(result, patient_sex, patient_age):
    for r in result["reference_ranges"]:
        ctx = r.get("context", {})
        if "sex" in ctx and ctx["sex"] != patient_sex:      # absent = all sexes
            continue
        if "age_lower" in ctx and patient_age < ctx["age_lower"]:
            continue
        if "age_upper" in ctx and patient_age > ctx["age_upper"]:
            continue
        return r
    return None

ref = applicable_range(result, patient_sex, patient_age)
value = result.get("value")
if value is None and "value_lt" in result:
    value = result["value_lt"]  # conservative: treat "<X" as X
```

Reference: [Best Practices – Reference Range Interpretation](https://docs.tryterra.co/lab-reports/best-practices)
