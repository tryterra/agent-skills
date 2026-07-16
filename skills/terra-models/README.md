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

- The two generally-available models: `sleep_window` (a recommended sleep schedule) and `health_terrain` (a weekly whole-body shift relative to the user's baseline)
- The `GET /v2/models` catalog and `GET /v2/models/run` endpoints, auth, and a working example
- Reading empty or unsupported results (HTTP 200, not errors) and validating before you run to avoid wasted credits
- Per-run pricing and the boundary with the Unified API

## Contents

| File       | Purpose                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| `SKILL.md` | The models, the run workflow, result-handling gotchas, pricing, boundaries |

Full API documentation: [docs.tryterra.co/models/models](https://docs.tryterra.co/models/models) (append `.md` to any docs URL for markdown).
