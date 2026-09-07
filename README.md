# Terra API Agent Skills

[![Validate skills]](https://github.com/tryterra/agent-skills/actions/workflows/validate.yml)

[Validate skills]: https://github.com/tryterra/agent-skills/actions/workflows/validate.yml/badge.svg?branch=main

Agent skills for anyone building with [Terra API](https://tryterra.co) – the unified health & fitness data API for 500+ wearables and health data sources (Garmin, Fitbit, Oura, Whoop, Apple Health, Samsung Health, Strava, Dexcom, and more).

These skills follow the [Agent Skills](https://agentskills.io) open standard, so they work with Claude Code, Cursor, GitHub Copilot, Gemini CLI, and any other agent that supports the format. Once installed, your agent automatically uses them when you work on a Terra API integration.

## Installation

Install all skills with [skills.sh](https://skills.sh):

```bash
npx skills add tryterra/agent-skills
```

Or a single skill:

```bash
npx skills add tryterra/agent-skills --skill terra-unified-api
```

**Claude Code plugin** (alternative):

```
/plugin marketplace add tryterra/agent-skills
/plugin install terra@terra-agent-skills
```

**Terra API CLI:**

```bash
brew install tryterra/tap/terra   # macOS; npm install -g @tryterra/cli elsewhere
terra agent setup
```

`terra agent setup` reads this repository's `skills/index.json` and writes the
skills into the current project, for the coding agents it detects. No Node
required. Pass `--skills` to pick a subset, `--global` to install for your user
rather than one project, or `--status-only` to see what would change.

**Manual** (Claude Code):

```bash
cp -r skills/terra-unified-api ~/.claude/skills/
```

## Skills

| Skill                                                     | Description                                                                                                                                              | Status         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| [`terra-cli`](skills/terra-cli)                           | Terra API CLI: read and change account configuration from the terminal instead of the dashboard, debug webhook delivery, and reach any endpoint directly | ✅ Ready       |
| [`terra-unified-api`](skills/terra-unified-api)           | Best-practice rules: webhooks & signature verification, data idempotency, connection lifecycle, multi-device data, testing                               | ✅ Ready       |
| [`terra-mobile-sdk`](skills/terra-mobile-sdk)             | Mobile SDK: Apple Health, Samsung Health, Health Connect (iOS, Android, React Native, Flutter)                                                           | ✅ Ready       |
| [`terra-streaming`](skills/terra-streaming)               | Realtime streaming: websockets, Real-Time SDK, live sensor data (iOS, Android, React Native, Flutter, Wear OS)                                           | ✅ Ready       |
| [`terra-planned-workouts`](skills/terra-planned-workouts) | Planned Workouts API: push structured workouts with intervals and targets to wearables                                                                   | 🧪 Pre-release |
| [`terra-routes`](skills/terra-routes)                     | Routes API: push GPS courses with waypoints to Garmin, COROS, Wahoo devices                                                                              | 🧪 Pre-release |
| [`terra-lab-reports`](skills/terra-lab-reports)           | Lab Reports API: parse lab report PDFs/images into standardized biomarkers (LOINC, UCUM)                                                                 | 🧪 Pre-release |
| [`terra-vantage`](skills/terra-vantage)                   | Vantage API: order blood/DNA test kits, track fulfillment, deliver and acknowledge FHIR results                                                          | ✅ Ready       |
| [`terra-models`](skills/terra-models)                     | Models: run health models (Sleep Window, Health Terrain) over a connected user's data for ready-to-use wellness insights                                 | ✅ Ready       |

## Contributing

These skills are written in a private source repository and published to [github.com/tryterra/agent-skills](https://github.com/tryterra/agent-skills) automatically. That published copy is read-only: a pull request opened against it cannot be merged, and an edit committed to it is overwritten by the next publish. Corrections, gaps and bug reports are very welcome as [issues](https://github.com/tryterra/agent-skills/issues).

The Terra API docs are LLM-friendly: append `.md` to any [docs.tryterra.co](https://docs.tryterra.co) URL for markdown, or start from [docs.tryterra.co/llms.txt](https://docs.tryterra.co/llms.txt).

## License

[MIT](LICENSE)
