# terra-routes

Author GPS routes and push them to your users' fitness devices with [Terra API](https://tryterra.co) Routes (pre-release). Define a route once as a template with waypoints, and Terra API delivers it to Garmin, COROS, and Wahoo devices for on-device navigation. The route appears after the user's next device sync, so your app never touches each provider's native route format.

This skill covers the create-then-push workflow, the RouteTemplate and Waypoint data model, per-provider wire formats and feature gaps, cascade re-pushes, and route deletion. Facts are drawn from the Terra API Routes documentation.

## Installation

```bash
npx skills add tryterra/agent-skills --skill terra-routes
```

Or manually for Claude Code:

```bash
cp -r skills/terra-routes ~/.claude/skills/
```

## Contents

| File                             | What it covers                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `SKILL.md`                       | Two-phase workflow, endpoints, data model, provider matrix, and gotchas                            |
| `references/provider-details.md` | Per-provider behavior for Garmin, COROS, and Wahoo: re-sync, elevation, delete, sport mapping     |
| `references/examples.md`         | Copy-paste curl per sport, plus course points, speed target, minimal route, and cascade update     |

## Highlights

- Two phases: `POST /routes` creates a template (`route_id`), `POST /routes/{route_id}/push?user_id=X` pushes it to a device
- Only Garmin, COROS, and Wahoo are supported, with sharply different feature coverage
- Course points, speed targets, and descriptions are **Garmin only** and are silently ignored elsewhere
- `PUT /routes/{id}?cascade` re-pushes to all devices async, but partial failures are logged, not returned
- COROS has no delete or retrieve and collapses sports into two internal types

Full documentation: [docs.tryterra.co/routes-api-pre-release/overview](https://docs.tryterra.co/routes-api-pre-release/overview).
