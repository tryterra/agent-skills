---
title: Prefer Webhooks; Poll No Faster Than Every 5 Seconds
impact: MEDIUM
impactDescription: tight polling loops waste requests and hit rate limits
tags: api, polling, webhooks
---

## Prefer Webhooks; Poll No Faster Than Every 5 Seconds

**Impact: MEDIUM (tight polling loops waste requests and hit rate limits)**

Webhooks are the intended production path: they are real-time and waste no requests, and they are the reliable completion signal (a `GET ?upload_id=` right after upload is eventually consistent and can return an empty or partial list). Use polling only in development or as a fallback when your webhook endpoint is unavailable. When you must poll `GET /v2/lab-reports/{session_id}`, poll no faster than every 5 seconds and stop on a terminal status – processing typically takes 30 seconds to 3 minutes, so a sub-second loop just burns rate limit for no faster answer.

**Incorrect (busy-waiting with no delay):**

```python
while True:
    status = get_session(session_id)["current_status"]
    if status in ("sent", "failed"):
        break
    # no sleep – hammers the API and risks 429
```

**Correct (5s interval, terminal-status exit):**

```python
import time

TERMINAL = {"sent", "partially_sent", "failed", "cancelled", "deleted"}
while True:
    status = get_session(session_id)["current_status"]
    if status in TERMINAL:
        break
    time.sleep(5)  # never faster than every 5 seconds
```

Results are queryable once the session reaches `standardized`, before delivery – so you do not have to wait for `sent` to read them.

Reference: [Best Practices – Polling vs. Webhooks](https://docs.tryterra.co/lab-reports/best-practices)
