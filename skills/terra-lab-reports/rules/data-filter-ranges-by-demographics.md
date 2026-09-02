---
title: Use applied_range First, Then Filter Reference Ranges by Demographics
impact: HIGH
impactDescription: applying the wrong range misclassifies results
tags: data, reference-ranges, interpretation
---

## Use applied_range First, Then Filter Reference Ranges by Demographics

**Impact: HIGH (applying the wrong range misclassifies results)**

A single result can carry multiple `reference_ranges`, each with a `context` scoping it to a sex, age band, pregnancy status, cycle phase, or other modifier. Picking the first range, or ignoring context entirely, can flag a normal value as abnormal (or vice versa).

Check `interpretation.applied_range` first: when present, it is the range Terra API already resolved against the patient's context – use it. It is deliberately conservative and can be **null even when ranges exist** (it is only set when exactly one range unambiguously applies), so when it is null, match the patient's demographics to each range's `context` yourself. Treat an absent context field as "applies to all" – if `sex` is not present the range is not sex-specific, so do not exclude it. For bounded measurements (`measurement.type == "bounded"`), there is no exact value; interpret conservatively, for example treating `<X` as `X` against the upper bound.

**Incorrect (interpreting against the first range, ignoring context):**

```python
ref = result["reference_ranges"][0]  # may be the female or pregnancy range
value = result["measurement"]["numeric"]
status = "high" if value > ref["upper"] else "normal"
```

**Correct (applied_range first, then context filtering, bounded handled):**

```python
def applicable_range(result, patient_sex, patient_age):
    applied = result["interpretation"].get("applied_range")
    if applied is not None:
        return applied                                      # already resolved
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
m = result["measurement"]
if m["type"] == "numeric":
    value = m["numeric"]
elif m["type"] == "bounded":
    value = m["bounded"]["value"]  # conservative: treat "<X" as X
```

A range's `type` field is a label describing the range (was `classification`), not a verdict on the result – the coded verdict is `interpretation.flag`.

Reference: [Best Practices – Reference Range Interpretation](https://docs.tryterra.co/lab-reports/best-practices)
