# Compare two environments

Read when something works in one environment and not another, or when a new
environment has to be brought up to match an existing one.

There is no `diff` command. Every comparison below is two `--format json` reads
and a jq expression, which is why this is a job worth handing to an agent
rather than clicking twice in the dashboard.

## What actually differs

Four things account for almost every "works in prod, not staging":

| Check                                          | Command                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Which providers are enabled                    | `terra unified-api sources list --env <dev-id>`                                       |
| Which data types and fields are sent           | `terra unified-api data scopes list --env <dev-id>`                                   |
| Where webhooks go, and whether they are active | `terra unified-api destinations list --env <dev-id> --json id,url,active,event_types` |
| Which scores are on                            | `terra unified-api scores list --env <dev-id>`                                        |

Two more that bite less often: `terra unified-api sources credentials retrieve
<PROVIDER>` (one environment on the customer's OAuth app and the other on
Terra API's behaves differently at auth time) and `terra unified-api data
processing list` (a `fhir` environment and a `json` one produce different
payloads from the same data).

## Diffing a pair

Write each side to a file, then compare. Sorting matters: the API does not
promise an order, so an unsorted diff reports noise.

```sh
for env in dev-prod dev-staging; do
  terra unified-api sources list --env "$env" --format json \
    | jq -S 'map(.provider) | sort' > "/tmp/sources.$env.json"
done
diff /tmp/sources.dev-prod.json /tmp/sources.dev-staging.json
```

The same shape works for the other three. For a quick answer without files:

```sh
terra unified-api sources list --env dev-prod    --jq '[.[].provider] | sort | join(",")'
terra unified-api sources list --env dev-staging --jq '[.[].provider] | sort | join(",")'
```

Field names vary by resource, so read one row first rather than guessing:
`terra unified-api sources list --env dev-prod --format json | head`, or
`--json` with no value to list the selectable fields.

## Bringing one environment up to another

Enabling a provider is idempotent, so the sync is a loop and re-running it is
safe:

```sh
terra unified-api sources list --env dev-prod --jq '.[].provider' \
  | while read -r p; do
      terra unified-api sources enable "$p" --env dev-staging
    done
```

Preview the whole loop first by appending `--dry-run` to the inner command.

## What not to copy

- **Destinations.** Copying a production URL into staging sends staging traffic
  at the production handler. Create the staging destination against the staging
  URL instead, and remember it gets its own signing secret.
- **Provider OAuth credentials.** `sources credentials replace` is a full
  replace and the client secret is write-only, so a `retrieve` on the source
  environment returns a masked value that cannot be copied. Set the target
  environment's credentials from the customer's own record.
- **API keys.** Each environment has its own, and they are not
  interchangeable.

## Before mutating the wrong one

Every mutation here takes `--env`, and a missing `--env` falls back to
`TERRA_ENV` and then the profile default. Pass `--env` explicitly on both sides
of a comparison rather than relying on the default for one of them, and prefer
the dev-id over the name: a dev-id needs no resolution and cannot be ambiguous.
