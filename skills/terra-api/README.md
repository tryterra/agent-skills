# terra-api

Best practices for integrating [Terra API](https://tryterra.co) – the unified health & fitness data API for 500+ wearables and health data sources.

25 rules across 6 categories, distilled from a production multi-device integration. Each rule is a standalone file with incorrect/correct code examples, prioritized by impact so agents (and humans) fix the critical things first.

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-api
```

Or manually for Claude Code:

```bash
cp -r skills/terra-api ~/.claude/skills/
```

## Categories

| Priority | Category | Impact | Rules |
|----------|----------|--------|-------|
| 1 | Webhook Handling | CRITICAL | 5 |
| 2 | Data Handling & Idempotency | CRITICAL | 6 |
| 3 | Auth & Connection Lifecycle | HIGH | 6 |
| 4 | Multi-Device Merging | MEDIUM | 5 |
| 5 | SDK & Types | MEDIUM | 1 |
| 6 | Testing | LOW-MEDIUM | 2 |

## Highlights

- Verify `terra-signature` over the **raw** request body, before JSON parsing
- Ack webhooks within the 8-second timeout, process async
- `data_enrichment` scores do NOT follow the superset guarantee – COALESCE upserts or you lose data
- `user_reauth` issues a new Terra user ID – swap it or orphan the connection
- The integrations catalogue returns **empty** when you send both `dev-id` and `x-api-key`

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
