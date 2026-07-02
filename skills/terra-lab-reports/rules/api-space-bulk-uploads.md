---
title: One File Per Upload; Space Out Bulk Uploads
impact: MEDIUM
impactDescription: oversized or bursty uploads get rejected
tags: api, upload, rate-limits
---

## One File Per Upload; Space Out Bulk Uploads

**Impact: MEDIUM (oversized or bursty uploads get rejected)**

`POST /v2/lab-reports` accepts exactly one file per request, in a multipart field that MUST be named `file` (singular), up to 20 MB. A file over 20 MB is rejected with `400` ("invalid multipart form or file too large") in the common case, and with `413` only when the multipart part declares a Content-Length over the cap – so expect `400`, sometimes `413`. A misnamed field is a `400`. Each report takes 30 seconds to 3 minutes to process. When ingesting many reports, do not fire them all at once – space the requests to stay within rate limits, and tag each upload with your own `reference_id` (query param) so you can correlate the resulting sessions back to the right patient. The `202` returns the `session_id` directly (`{ session_id, current_status: "processing" }`); one file yields exactly one session.

**Incorrect (wrong field name, unbounded parallel burst):**

```javascript
// field named "report" – rejected with 400
form.append("report", fileStream);
await Promise.all(files.map(f => uploadNow(f))); // bursts past rate limits
```

**Correct (field "file", one per request, spaced, with reference_id):**

```javascript
for (const f of files) {
  const form = new FormData();
  form.append("file", f.stream); // field MUST be "file"
  await upload(`/v2/lab-reports?reference_id=${f.patientId}`, form);
  await sleep(1000); // space the requests
}
```

Reference: [Best Practices – Rate Limits](https://docs.tryterra.co/lab-reports/best-practices)
