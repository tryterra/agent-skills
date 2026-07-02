# terra-planned-workouts

Guidance for building with the [Terra API](https://tryterra.co) Planned Workouts product (pre-release) – define a structured workout once and the Terra API pushes it to your users' devices (Garmin, COROS, Wahoo, Suunto, TrainingPeaks, Huawei, Zepp, Hevy, Apple).

A references-based skill: `SKILL.md` is the index and quick reference; deeper lookup material lives in `references/`.

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-planned-workouts
```

Or manually for Claude Code:

```bash
cp -r skills/terra-planned-workouts ~/.claude/skills/
```

## What It Covers

- The two-phase workflow: `POST /workouts` creates a reusable template, `POST /workouts/{id}/plan?user_id=X` applies athlete parameters and pushes to the device
- The full endpoint list and the condensed data model (blocks, steps, completion conditions, intensity targets)
- Athlete parameters and percentage-to-absolute conversion for per-athlete personalization
- The coercion model: what happens when a provider cannot represent a feature
- Provider-specific operations, limits, and gotchas across nine providers

## Contents

| File                                   | Purpose                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `SKILL.md`                             | Index, workflow, endpoints, data model, athlete params, coercion, gotchas |
| `references/provider-compatibility.md` | Operations matrix and per-provider feature support and behaviors          |
| `references/coercion-scenarios.md`     | Coercion warning catalog, handling patterns, prevention checklist         |
| `references/exercise-reference.md`     | Exercise name normalization and not-found behavior                        |

The full Garmin exercise catalog and the sport-specific payload examples are not bundled; the skill directs agents to fetch the live `.md` doc pages, which stay current with the API.

Full API documentation: [docs.tryterra.co/planned-workouts-api](https://docs.tryterra.co/planned-workouts-api) (append `.md` to any docs URL for markdown).
