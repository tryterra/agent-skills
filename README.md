# Terra API Agent Skills

[![Validate skills]](https://github.com/tryterra/agent-skills/actions/workflows/validate.yml)
[![Validate plugin]](https://github.com/tryterra/agent-skills/actions/workflows/validate-plugin.yml)

[Validate skills]: https://github.com/tryterra/agent-skills/actions/workflows/validate.yml/badge.svg?branch=main
[Validate plugin]: https://github.com/tryterra/agent-skills/actions/workflows/validate-plugin.yml/badge.svg?branch=main

Install instructions that help AI agents create more accurate [Terra API](https://tryterra.co) integrations.

[Agent skills](https://agentskills.io) give AI coding agents reusable guidance for building Terra API integrations. Terra maintained skills provide the newest product and API guidance based on the latest recommended practices. They follow the Agent Skills open standard, so they work with Claude Code, Cursor, GitHub Copilot, Gemini CLI, and any other agent that supports the format.

The same set ships as a plugin for Claude Code, Codex and Cursor. The plugin connects your agent directly to your Terra API account, so it can set up, manage and debug your Terra API integration without you clicking through the [Terra Dashboard](https://dashboard.tryterra.co). It works through the [Terra CLI](https://docs.tryterra.co/developer-tools/terra-cli/terra-cli), and bundles the Terra API [admin MCP server](https://docs.tryterra.co/developer-tools/mcp-server) for when the CLI cannot be installed: sign in to it once from your agent, and it asks you to approve sensitive changes in the dashboard. If the CLI is missing or logged out, the agent offers to install it and log you in. It never does either without asking.

Assistants without a shell, such as claude.ai and ChatGPT, can use the admin MCP server on its own: add `https://access.tryterra.co/api/v3/admin/mcp` as a custom connector. The `terra-mcp` skill tells an agent how to use it.

## Install

### Plugin

**Claude Code**

```
/plugin marketplace add tryterra/agent-skills
/plugin install terra@terra
```

**Codex**

```bash
codex plugin marketplace add tryterra/agent-skills
```

Then pick Terra API in the plugins browser.

**Cursor and other [Agent Plugin](https://agent-plugins.org) hosts**

```bash
npx plugins add tryterra/agent-skills
```

### Skills only

The [Terra CLI](https://docs.tryterra.co/developer-tools/terra-cli/terra-cli) installs the skills and configures every coding agent it finds, so you get the latest set without configuration or maintenance. This is the recommended path.

```bash
curl -fsSL https://cli.tryterra.co/install.sh | sh   # macOS and Linux
irm "https://cli.tryterra.co/install.ps1" | iex      # Windows PowerShell
```

Homebrew (`brew install tryterra/tap/terra`) and npm (`npm install -g @tryterra/cli`) work too; see [Installation](https://docs.tryterra.co/developer-tools/terra-cli/installation).

```bash
terra agent setup
```

This command detects which agents you use, and writes the skills to the directory each one reads. See [Coding agents](https://docs.tryterra.co/developer-tools/terra-cli/coding-agents) for the flags that pick an agent, a subset of skills, or a user-wide install.

Or install every skill with [skills.sh](https://skills.sh):

```bash
npx skills add tryterra/agent-skills
```

Or a single skill:

```bash
npx skills add tryterra/agent-skills --skill terra-unified-api
```

Manually installed skills do not update themselves. Run `npx skills update -y` to get the latest versions.

## Included skills

| Skill                                                     | What it covers                                                                                                              | Status         |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------- |
| [`terra-cli`](skills/terra-cli)                           | Read and change account configuration from the terminal instead of the dashboard, and reach any endpoint directly           | ✅ Ready       |
| [`terra-mcp`](skills/terra-mcp)                           | Manage the account over the admin MCP server from assistants without a shell, with dashboard approval for sensitive changes | ✅ Ready       |
| [`terra-unified-api`](skills/terra-unified-api)           | API best practices: webhooks and signature verification, data idempotency, connection lifecycle, multi-device data, testing | ✅ Ready       |
| [`terra-mobile-sdk`](skills/terra-mobile-sdk)             | Mobile integration for Apple Health, Samsung Health, and Health Connect on iOS, Android, React Native, and Flutter          | ✅ Ready       |
| [`terra-streaming`](skills/terra-streaming)               | Realtime websocket data and the Real-Time SDK on iOS, Android, React Native, Flutter, and Wear OS                           | ✅ Ready       |
| [`terra-models`](skills/terra-models)                     | Running health models (Sleep Window, Menstrual Cycle Tracker, Smart Fill) over a connected user's data                      | ✅ Ready       |
| [`terra-vantage`](skills/terra-vantage)                   | Blood and DNA test kit ordering, fulfillment tracking, and FHIR result delivery                                             | ✅ Ready       |
| [`terra-planned-workouts`](skills/terra-planned-workouts) | Pushing structured interval workouts, with targets, to wearables                                                            | 🧪 Pre-release |
| [`terra-routes`](skills/terra-routes)                     | Pushing GPS courses with waypoints to devices like Garmin, COROS, and Wahoo                                                 | 🧪 Pre-release |
| [`terra-lab-reports`](skills/terra-lab-reports)           | Parsing lab report PDFs and images into standardised biomarkers, with LOINC and UCUM codes                                  | 🧪 Pre-release |

[`skills/index.json`](skills/index.json) lists every skill, what it does, and the files it ships. Both `terra agent setup` and `npx skills add` read it, so it is the authoritative list.

## Contributing

This repository is published automatically from a private source and is read-only: pull requests here cannot be merged. Please report corrections, gaps and bugs as [issues](https://github.com/tryterra/agent-skills/issues).

The Terra API docs are LLM-friendly: append `.md` to any [docs.tryterra.co](https://docs.tryterra.co) URL for markdown, or start from [docs.tryterra.co/llms.txt](https://docs.tryterra.co/llms.txt).

## License

[MIT](LICENSE)
