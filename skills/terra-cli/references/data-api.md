# Call the data API by hand

Read when reading a user's health data, backfilling history, trying a request
before writing the code that sends it, or reaching a data API endpoint that has
no generated command (all of them).

## Credential and environment

`terra data-api` targets one environment, resolved the same way every command
resolves it (`--env`, then `TERRA_ENV`, then the profile default), and
authenticates with **that environment's API key rather than your admin token**.
The CLI fetches the key for you, which needs the `keys:read` scope that the
default `terra login` leaves out. Two ways past that:

```sh
terra login --scope keys:read     # the user runs this
export TERRA_API_KEY=<key>        # supply the key directly, no lookup
```

The key is only ever sent, never printed.

## The gotcha that wastes the most time

**Reading data takes `-q to_webhook=false`.** Without it the API sends the
response to the configured destination and answers with an acknowledgement,
which reads like an empty result. The CLI recognizes the acknowledgement and
says so on stderr, but it does not add the parameter for you.

The default is right for a server and wrong for a terminal, so the same
omission is how you deliberately backfill: leave `to_webhook=false` off and the
range lands at the destination.

```sh
terra data-api /sleep -q user_id=<uuid> -q start_date=2026-08-01 -q to_webhook=false
# prints the sleep sessions here

terra data-api /sleep -q user_id=<uuid> -q start_date=2026-08-01 -q end_date=2026-09-01
# sends that month to the destination instead: a backfill
```

## Endpoints

```sh
terra api list --data-api                        # every endpoint
terra api list --data-api /sleep --format json   # what one takes and returns
```

That second call is the closest thing these commands have to help, and it is
the right move before building any request body. The surface, grouped:

| Group            | Paths                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Auth             | `/auth/generateWidgetSession`, `/auth/authenticateUser`, `/auth/deauthenticateUser`, `/auth/tokens`                    |
| Health data      | `/activity`, `/sleep`, `/daily`, `/body`, `/nutrition`, `/menstruation`, `/athlete`                                    |
| Users            | `/userInfo`, `/bulkUserInfo`, `/subscriptions`                                                                         |
| Providers        | `/integrations`, `/integrations/detailed`                                                                              |
| Planned workouts | `/workouts`, `/workouts/{id}`, `/workouts/{id}/plan`, `/plannedWorkouts`, `/plannedWorkouts/{id}`                      |
| Lab reports      | `/lab-reports`, `/lab-reports/{session_id}`, `/lab-reports/{session_id}/deliveries`, `/lab-reports/{session_id}/files` |

The health-data endpoints share a shape: `user_id` and `start_date` are
required, `end_date`, `to_webhook` and `with_samples` optional. Dates are
`YYYY-MM-DD` or a ten-digit unix timestamp.

## Building a request

```sh
-X POST                 # method: GET, POST, PUT, PATCH, DELETE. GET by default
-q key=value            # query parameter, repeatable
-d key=value            # body field, repeatable, builds a flat JSON object
--body '{"a":{"b":1}}'  # raw JSON, for anything nested
--body-file body.json   # from a file, or - for stdin
-H name:value           # extra header, repeatable
```

The three body forms are mutually exclusive. **A body flag does not change the
method**: `terra data-api /workouts -d name=x` is a usage error rather than an
inferred POST, so a command that reads like a query cannot turn out to be a
mutation.

**`-q` and `-d` are not interchangeable, and picking the wrong one can fail
silently.** Which a parameter takes is set by the endpoint, not by the method,
and a POST can read parameters from the query string:

| Endpoint                           | `user_id` / `reference_id` goes in                               |
| ---------------------------------- | ---------------------------------------------------------------- |
| `POST /auth/tokens`                | the query, `-q`                                                  |
| `POST /auth/generateWidgetSession` | the body, `-d`                                                   |
| `POST /workouts/{id}/plan`         | the query, `-q`, alongside a required `planned_date` in the body |
| `DELETE /auth/deauthenticateUser`  | the query, `-q`                                                  |

The CLI checks the path and the method before sending, and stops there:
parameters are sent as typed and the API decides. So a required query parameter
passed with `-d` is not rejected locally, and where the parameter is optional
the call succeeds with it silently ignored. On `POST /auth/tokens` that returns
a token with no `reference_id` binding, which is the guarantee that stops a
token attaching a device to a different user.

Read the endpoint rather than guessing, and copy the parameter locations from
it:

```sh
terra api list --data-api /auth/tokens --format json
```

The path and method are checked against the pinned API description before
anything is sent, so a typo fails locally naming what it probably meant. Values
are not checked; the API decides. `--no-verify` skips the check, which is what
an endpoint newer than the pin needs.

## Worked examples

```sh
# What providers can this environment offer?
terra data-api /integrations

# One user's connection, as the integration sees it
terra data-api /userInfo -q user_id=<uuid>

# Sleep with the detailed samples
terra data-api /sleep -q user_id=<uuid> -q start_date=2026-08-01 \
  -q to_webhook=false -q with_samples=true

# Push a structured workout to a device
terra data-api /workouts -X POST --body-file workout.json          # returns workout_id
terra data-api /workouts/<workout_id>/plan -X POST -q user_id=<uuid> -d planned_date=2026-09-08

# Where did a lab report go?
terra data-api /lab-reports/<session_id>
terra data-api /lab-reports/<session_id>/deliveries
```

## Reading the response

`--jq` filters it. There is no `--json` on the raw commands, because the
response fields are not known for every path. `-i` prints the status line and
response headers to stderr, so the body stays pipeable, and they print for a
failed request too.

```sh
terra data-api /userInfo -q user_id=<uuid> --jq '.user.provider'
terra data-api /integrations -i | jq '.providers | length'
```

`--paginate` walks a cursor-paginated list into NDJSON and needs `-X GET`;
`--max-pages` caps it at 10 by default, `0` for no limit.

A DELETE confirms before it is sent, and needs `--yes` where there is no
terminal.

## Admin endpoints with no command

`terra api <path>` is the same command pointed at the admin API. Reach for a
generated command first: it validates input, formats output, and knows which
operations are destructive.

```sh
terra api /me
terra api list --uncovered          # admin endpoints with no command
terra api /environments -X POST -d dev_id=dev-new -d name=Staging
terra api /environments/<dev-id>/unified-api/destinations/<id> -X DELETE -q dry_run=true
```

That last one is worth knowing: a few endpoints accept a server-side
`dry_run=true` that reports what _would_ change, which is more than the CLI's
own `--dry-run` (that prints the request and stops). `terra api` never
generates an idempotency key, because it cannot know whether the endpoint
deduplicates.
