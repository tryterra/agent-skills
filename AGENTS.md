# Authoring guide

How to build and maintain skills in this repository. Skills follow the [Agent Skills](https://agentskills.io/specification) open standard, so they work in Claude Code, Cursor, Copilot, Gemini CLI, and any other agent that implements the spec.

## Repository layout

```
skills/
└── <skill-name>/          # directory name MUST equal the frontmatter `name`
    ├── SKILL.md           # required: frontmatter + instructions
    ├── references/        # optional: docs loaded on demand
    ├── scripts/           # optional: executable helpers
    └── assets/            # optional: templates, schemas, static files
```

One directory per skill under `skills/`. Everything a skill needs lives inside its directory – no cross-skill imports.

## SKILL.md frontmatter

```yaml
---
name: terra-example
description: <what it does AND when to use it, with concrete trigger keywords>
license: MIT
metadata:
  author: terra
  version: "1.0.0"
---
```

Rules:

- `name`: 1–64 chars; lowercase letters, digits, and hyphens only; no leading/trailing/consecutive hyphens; **must match the directory name**.
- `description`: 1–1024 chars. State both _what_ the skill does and _when_ an agent should use it. Include the keywords a user's request would actually contain – product names, provider names, header names, error strings.
  - Good: `Integrate Terra API – the unified health & fitness data API for 500+ wearables. Use when building with Terra API, tryterra.co, or handling terra-signature webhooks.`
  - Bad: `Helps with health data.`
- In all prose, write "Terra API" – never bare "Terra".
- Never use em dashes (—); use en dashes (–) if needed.
- Put the most important use case first – some agents truncate long descriptions.

## Writing the body

- **Skills are not doc copies.** Terra API docs are LLM-friendly (append `.md` to any docs.tryterra.co URL; index at docs.tryterra.co/llms.txt; also exposed as an MCP server at https://docs.tryterra.co/~gitbook/mcp), so an agent can always fetch the current spec. A skill's value is what the agent lacks: distilled workflows, gotchas, incorrect/correct patterns, decision tables, defaults, and cross-product boundaries. The content test: _would the agent get this wrong without this instruction?_ If not, cut it.
- **Bundle the stable, point to the volatile.** Keep bundled: gotchas (inline in SKILL.md), decision aids (which endpoint/provider for which job, routing tables mapping goal to doc URL), workflows and defaults, deterministic scripts. Point to the live `.md` doc page for: exact request/response shapes, field lists, enum values, and payload examples – bundled copies of those drift the moment the API changes. Make fetch instructions conditional and precise ("fetch <url>.md when building the request body"), and declare the dependency with the `compatibility` frontmatter field (e.g. `Requires network access to docs.tryterra.co for full API schemas`).
- **Keep SKILL.md under 500 lines** (~5k tokens). Agents load the whole body when the skill activates; every token competes for attention.
- **Gotchas belong in the body**, not in references – surprising, environment-specific facts (e.g. "HMAC verification must use the raw unaltered request body") are the highest-value content and the agent may not know to load a reference file for them.
- **Provide defaults, not menus.** Pick one recommended approach; mention alternatives in a sentence.
- **Procedures over declarations.** Teach how to approach a class of problems, with one working example, rather than exhaustively documenting everything.
- Move deep material (full endpoint references, per-platform setup, protocol details) to `references/`, and link each file from SKILL.md **with an explicit trigger condition**:
  - Good: `Read references/webhooks.md when implementing the webhook endpoint or debugging signature failures.`
  - Bad: `See references/ for more details.`
- Keep references one level deep from SKILL.md – no chains of files referencing files.
- Rules-based skills (like `terra-api`) use `rules/` instead of `references/`: SKILL.md is an index with a category priority table and a one-liner per rule; each rule lives in `rules/<prefix>-<name>.md` with frontmatter (title, impact, tags) and incorrect/correct code examples. `rules/_sections.md` defines the categories; copy `rules/_template.md` for new rules.
- Scripts in `scripts/` should be self-contained, print status to stderr and machine-readable output to stdout, and fail with helpful error messages.
- Source content from the live docs: append `.md` to any `docs.tryterra.co` URL for markdown, or start from the index at `docs.tryterra.co/llms.txt`. Cite the source URL at the top of each reference file so it can be refreshed later.

## Adding a new skill

1. Copy `template/SKILL.md` into `skills/<skill-name>/SKILL.md` and fill it in.
2. Register the skill name in `skills.sh.json` (under a grouping).
3. Register the skill path in `.claude-plugin/marketplace.json` (under the `terra` plugin's `skills` array).
4. Add it to the catalog table in `README.md`.
5. Validate locally (below) before opening a PR.

## Validating

CI runs the official reference validator on every skill (the [`skills-ref`](https://pypi.org/project/skills-ref/) package, whose CLI is named `agentskills`). To run it locally:

```bash
uvx --from skills-ref agentskills validate skills/*
# or: pip install skills-ref && agentskills validate skills/*
```

Also check that no SKILL.md exceeds 500 lines.
