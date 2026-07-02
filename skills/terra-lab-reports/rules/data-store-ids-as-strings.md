---
title: Store Session IDs as Strings
impact: MEDIUM
impactDescription: snowflake IDs lose precision as JavaScript numbers
tags: data, ids, serialization
---

## Store Session IDs as Strings

**Impact: MEDIUM (snowflake IDs lose precision as JavaScript numbers)**

`session_id` is a snowflake int64, serialized in JSON as a string (e.g. `"297405620317847552"`) specifically because it exceeds the safe integer range of languages like JavaScript, where `Number` cannot represent the full int64. Parsing it into a number – or letting a JSON codec coerce it – silently corrupts the low-order digits, so lookups and joins against Terra API's records fail. Keep it a string end to end: in memory, in your database column, and in any URL you build.

**Incorrect (coercing the ID to a number loses precision):**

```javascript
const sessionId = Number(payload.session_id); // 297405620317847552 -> 297405620317847550
await db.reports.insert({ session_id: sessionId });
```

**Correct (keep it a string throughout):**

```javascript
const sessionId = payload.session_id; // "297405620317847552"
await db.reports.insert({ session_id: sessionId }); // string column
```

The same rule applies to any ID field – compare and store them as strings.

Reference: [Best Practices – Storing Session IDs](https://docs.tryterra.co/lab-reports/best-practices)
