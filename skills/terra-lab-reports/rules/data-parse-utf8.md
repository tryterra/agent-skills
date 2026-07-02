---
title: Parse Response Bodies as UTF-8
impact: MEDIUM
impactDescription: mis-decoding mangles units and biomarker names
tags: data, encoding, units
---

## Parse Response Bodies as UTF-8

**Impact: MEDIUM (mis-decoding mangles units and biomarker names)**

Lab report data routinely contains multibyte characters: scientific symbols (`µ`, `×`, `±`), superscript notation, international characters in biomarker names and free-text notes, and special units (`µmol/L`, `µg/dL`). Decode every response body as UTF-8. Most HTTP clients default to UTF-8, but a hardcoded latin-1/ASCII decode, or writing to a non-UTF-8 database column, turns `µg/dL` into mojibake (`Âµg/dL`) and can throw on the raw bytes. Verify the whole path – HTTP client, JSON parser, and storage – preserves multibyte characters.

**Incorrect (forcing a non-UTF-8 decode):**

```python
text = response.content.decode("latin-1")  # corrupts µ, ×, ±
data = json.loads(text)
```

**Correct (decode as UTF-8 end to end):**

```python
response.encoding = "utf-8"
data = response.json()  # µmol/L, 10^9, ± survive intact
# ensure the DB column/connection is UTF-8 too
```

Reference: [Best Practices – UTF-8 Encoding](https://docs.tryterra.co/lab-reports/best-practices)
