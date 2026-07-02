# terra-api

Best practices for integrating [Terra API](https://tryterra.co) – the unified health & fitness data API for 500+ wearables and health data sources.

Rules across 5 categories, distilled from a production multi-device integration. Each rule is a standalone file with incorrect/correct code examples, prioritized by impact so agents (and humans) fix the critical things first.

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-api
```

Or manually for Claude Code:

```bash
cp -r skills/terra-api ~/.claude/skills/
```

## Categories

| Priority | Category                    | Impact     | Rules |
| -------- | --------------------------- | ---------- | ----- |
| 1        | Webhook Handling            | CRITICAL   | 5     |
| 2        | Data Handling & Idempotency | CRITICAL   | 6     |
| 3        | Auth & Connection Lifecycle | HIGH       | 6     |
| 4        | Multi-Device Data           | MEDIUM     | 2     |
| 5        | Testing                     | LOW-MEDIUM | 2     |

## Highlights

- Verify the signature header (`terra-signature` / `X-Terra-Signature`, case-insensitive) over the **raw** request body, before JSON parsing
- Ack webhooks within the timeout (8s default), process async
- Dedupe on `X-Terra-Trace-Id` – `terra-reference` is shared by every chunk of a large request
- `data_enrichment` scores do NOT follow the superset guarantee – COALESCE upserts or you lose data
- `user_reauth` issues a new Terra user ID – swap it or orphan the connection
- The integrations catalogue is dev-scoped only when you send `dev-id` – without it you get every provider Terra API supports

## Structure

```
terra-api/
├── SKILL.md        # index: categories, priorities, quick reference
└── rules/
    ├── _sections.md
    ├── _template.md
    └── <prefix>-<name>.md   # one rule per file
```

Full API documentation: [docs.tryterra.co](https://docs.tryterra.co) (append `.md` to any docs URL for markdown).
