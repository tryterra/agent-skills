# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
The section ID (in parentheses) lists the filename prefixes used to group rules.

---

## 1. Webhooks & Delivery (webhooks, api-poll)

**Impact:** HIGH
**Description:** Webhooks are the completion signal for successful lab reports (failures surface only via polling), and reprocessing emits a new webhook with the same session_id. Correct deduplication and a sane polling fallback keep delivery exactly-once without hammering the API.

## 2. Data Handling & API Usage (data, api)

**Impact:** HIGH-MEDIUM
**Description:** Standardized results carry nulls, multiple demographic ranges, snowflake IDs, and multibyte symbols. Handling them faithfully – and spacing bulk uploads within the file and rate limits – keeps clinical data intact and ingestion healthy.
