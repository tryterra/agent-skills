# agent-skills

Agent skills for anyone building with [Terra API](https://tryterra.co) – the unified health & fitness data API for 500+ wearables and health data sources (Garmin, Fitbit, Oura, Whoop, Apple Health, Samsung Health, Strava, Dexcom, and more).

These skills follow the [Agent Skills](https://agentskills.io) open standard, so they work with Claude Code, Cursor, GitHub Copilot, Gemini CLI, and any other agent that supports the format. Once installed, your agent automatically uses them when you work on a Terra API integration.

## Installation

Install all skills with [skills.sh](https://skills.sh):

```bash
npx skills add tryterra/agent-skills
```

Or a single skill:

```bash
npx skills add tryterra/agent-skills --skill terra-api
```

**Claude Code plugin** (alternative):

```
/plugin marketplace add tryterra/agent-skills
/plugin install terra@terra-agent-skills
```

**Manual** (Claude Code):

```bash
cp -r skills/terra-api ~/.claude/skills/
```

## Skills

| Skill | Description | Status |
|---|---|---|
| [`terra-api`](skills/terra-api) | 21 best-practice rules: webhooks & signature verification, data idempotency, connection lifecycle, multi-device data, testing | ✅ Ready |
| [`terra-mobile-sdk`](skills/terra-mobile-sdk) | Mobile SDK: Apple Health, Samsung Health, Health Connect (iOS, Android, React Native, Flutter) | ✅ Ready |
| [`terra-streaming`](skills/terra-streaming) | Realtime streaming: websockets, Real-Time SDK, live sensor data (iOS, Android, React Native, Flutter, Wear OS) | ✅ Ready |
| [`terra-planned-workouts`](skills/terra-planned-workouts) | Planned Workouts API: push structured workouts with intervals and targets to wearables | 🧪 Pre-release |
| [`terra-routes`](skills/terra-routes) | Routes API: push GPS courses with waypoints to Garmin, COROS, Wahoo devices | 🧪 Pre-release |
| [`terra-lab-reports`](skills/terra-lab-reports) | Lab Reports API: parse lab report PDFs/images into standardized biomarkers (LOINC, UCUM) | 🧪 Pre-release |

## Contributing

See [AGENTS.md](AGENTS.md) for the authoring guide – repo layout, SKILL.md conventions, and how to validate. The Terra API docs are LLM-friendly: append `.md` to any [docs.tryterra.co](https://docs.tryterra.co) URL for markdown, or start from [docs.tryterra.co/llms.txt](https://docs.tryterra.co/llms.txt).

## License

[MIT](LICENSE)
