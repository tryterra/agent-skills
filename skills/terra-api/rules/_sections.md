# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
The section ID (in parentheses) is the filename prefix used to group rules.

---

## 1. Webhook Handling (webhooks)

**Impact:** CRITICAL
**Description:** Webhooks are the delivery channel for all Terra API data. Broken verification, slow acks, or missing dedup means forged, lost, or duplicated health data.

## 2. Data Handling & Idempotency (data)

**Impact:** CRITICAL
**Description:** Terra API re-delivers data as providers sync. Correct natural keys, date handling, and per-field upsert strategies keep storage idempotent and prevent silent data loss.

## 3. Auth & Connection Lifecycle (auth)

**Impact:** HIGH
**Description:** Connections change state through six event types and can drift when webhooks are missed. Correct lifecycle handling and reconciliation keep your database matching Terra API's actual state.

## 4. Multi-Device Data (devices)

**Impact:** MEDIUM
**Description:** Users connect multiple sources, and the same day or session arrives once per device. Know the data reality; the selection/merge policy itself is your product's decision.

## 5. Testing (testing)

**Impact:** LOW-MEDIUM
**Description:** Boundary mocks and an edge-case checklist make the webhook pipeline testable without live devices, tunnels, or databases.
