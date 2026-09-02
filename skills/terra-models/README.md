# terra-models

Guidance for building with the [Terra API](https://tryterra.co) Models product: run a health model over a connected user's data for a date range and get a ready-to-use insight back (no model to host).

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-models
```

Or manually for Claude Code:

```bash
cp -r skills/terra-models ~/.claude/skills/
```

## What It Covers

- The three generally-available models: `sleep_window` (a recommended sleep schedule), `cycle_phase_tracker` (per-day menstrual cycle phase with detected onsets and fertile windows) and `graph_impute` (Smart Fill: reconstructs the metrics a device did not record)
- The `GET /v2/models` catalog and `GET /v2/models/run` endpoints, auth, and a working example
- Reading empty or unsupported results (HTTP 200, not errors) and validating before you run to avoid wasted credits
- The per-model traps: Smart Fill's required `table`, Sleep Window ignoring the date range, and the cycle tracker's `results` carrying a row for every day including ones with no data
- Per-run pricing and the boundary with the Unified API

## Contents

| File       | Purpose                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| `SKILL.md` | The models, the run workflow, result-handling gotchas, pricing, boundaries |

Full API documentation: [docs.tryterra.co/models/models](https://docs.tryterra.co/models/models) (append `.md` to any docs URL for markdown).
