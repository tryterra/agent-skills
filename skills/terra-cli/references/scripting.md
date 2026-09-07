# Scripting and CI

Read when writing a script or a CI step around the CLI, or parsing its output.

## Authentication without a browser

```sh
export TERRA_ADMIN_TOKEN=terra_at_...
terra environments list
```

Every command uses the variable, and nothing is written to the config file or
the keyring, so there is nothing to clean up. This is the right path for CI.

Where a browser exists but the process cannot wait on it:

```sh
terra login --start                       # prints pairing details as JSON, exits
terra login --complete <device-code>      # polls for approval, stores the token
```

`--start` stores nothing; there is no token until a human approves. For
unattended data-plane access, mint a data token rather than scripting a login:
see [credentials.md](credentials.md).

## Output formats

Output is JSON when piped and a table on a terminal. `--format
json|table|ndjson` overrides that. `json` and `ndjson` reproduce the document
the API sent, with field order and characters intact, and numbers keep the
precision the API sent in every format, so a string-encoded 64-bit id is never
turned into a float. `table` escapes tabs, newlines and escape sequences inside
values so they cannot shift columns or reach the terminal. Use `json` or
`ndjson` where a value has to arrive unchanged.

Zero results print `[]` in `json` and nothing in `ndjson` and `table`. A
response with no body, such as a delete's 204, prints nothing in every format.

## Narrowing a response

```sh
terra users list --json user_id,provider,active
terra users list --json                          # list the available fields
terra users list --jq '[.[] | select(.active)] | length'
terra api /me --jq '.scopes'
```

`--json <fields>` names fields in the order you want them and applies to every
format, so one flag picks both the keys of a JSON document and the columns of a
table. A field that does not exist is refused before the request is sent. It
exists only where the API description says what the response contains, so
`terra api` and `terra data-api` do not have it and `--jq` is the answer there.

`--jq` is built in, so it works on machines without jq installed, including
Windows. A string result prints bare, as `jq -r` would. An expression that
fails to parse is refused before the request is sent, and one that fails on the
data is a usage error, so a script can tell either apart from an API failure.

## Pagination

List commands fetch one page and say on stderr whether more is available.

```sh
terra users list --paginate | jq -r .user_id
terra users list --paginate --max-pages 0
```

`--paginate` walks the cursor to the end and prints NDJSON whatever `--format`
says, so a consumer can process each line as it arrives. **`--max-pages`
defaults to 10**; hitting the cap is announced rather than truncating silently,
which is easy to miss when stdout is piped. Pass `0` for no limit.

Requests are paced 100ms apart to stay under the rate limit. Filters go on the
first request only, because the cursor pins the server-side window, and the CLI
handles that. To drive the walk yourself, pass `--cursor`; the response carries
`next_cursor` and `has_more`.

## Exit codes

```sh
terra environments retrieve --env dev-prod >/dev/null 2>&1
case $? in
  0) ;;
  2) echo "log in first" ;;
  3) echo "bad input" ;;
  7) echo "canceled" ;;
  *) echo "something else went wrong" ;;
esac
```

0 success, 1 the API returned an error, 2 not authenticated, 3 input failed
validation before the request was sent, 4 usage error, 5 the product is not on
the account, 6 an internal error, 7 canceled.

**Branch on `$?` directly.** Inside `if ! cmd; then`, `$?` holds the status of
the negation, which is always 0, so a `case $?` there takes the success branch
however the command actually failed. This is the single most common scripting
mistake against this CLI. Run the command on its own line, then branch.

Exit 3 means the CLI sent nothing, so retrying unchanged cannot help. Exit 1
means the API rejected it, so the problem may be state rather than the command.
Exit 2 has one fix: authenticate again. Exit 5 is a missing entitlement, and
the admin API does not yet report that case separately, so an unsubscribed
product currently returns 1.

## Configuration and profiles

Every setting resolves as: a flag, then an environment variable, then the
config file, then the built-in default.

```sh
terra config --list
terra config --set default_environment dev-prod
terra --profile staging login
export TERRA_PROFILE=staging
```

A profile is a named set of settings with its own stored token, so several
accounts or deployments coexist on one machine. The settable config keys are
`base_url` and `default_environment`; everything else in the file is metadata
the CLI writes.

| Variable                                     | Purpose                                                 |
| -------------------------------------------- | ------------------------------------------------------- |
| `TERRA_ADMIN_TOKEN`                          | Use this token instead of the stored one                |
| `TERRA_ENV`                                  | Default environment                                     |
| `TERRA_PROFILE`                              | Select a profile; `--profile` overrides it              |
| `TERRA_API_KEY`                              | The data API key, instead of fetching the environment's |
| `TERRA_CONFIG_DIR`                           | Override the config directory                           |
| `TERRA_BASE_URL`                             | Point the admin API at a different deployment           |
| `TERRA_DATA_BASE_URL`                        | Point the data API somewhere other than the derived URL |
| `TERRA_KEYRING=file`                         | Store the token in a 0600 file instead of the keyring   |
| `TERRA_BROWSER=none`                         | Never open a browser                                    |
| `TERRA_CLI_TELEMETRY_OPTOUT`, `DO_NOT_TRACK` | Turn off usage reporting                                |
| `TERRA_NO_UPDATE_NOTIFIER`                   | Turn off the update notice                              |
| `NO_COLOR`, `CLICOLOR`, `CLICOLOR_FORCE`     | Color, per the CLICOLOR convention                      |

## Retries and timeouts

Requests are retried only where replaying them is safe: idempotent methods, or
any request carrying an idempotency key. `Retry-After` is honored. `--no-retry`
turns retries off and `--timeout` bounds a single request, defaulting to 30
seconds.

```sh
terra environments list --timeout 5s --no-retry
```

Supply `--idempotency-key` yourself to make a retry safe across separate
invocations. The flag appears only on commands whose endpoint honors the
header.

## Debugging a failing command

```sh
terra environments list --show-headers
```

`--show-headers` traces the request and response to stderr. Headers are
redacted and bodies show only their byte count, so the output is safe to paste
into an issue, and the response body still goes to stdout.

| Symptom                                          | Cause                                                      | Fix                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `no environment selected`                        | The command acts on one environment and none was given     | `--env`, `TERRA_ENV`, or `terra environments use`                           |
| `not logged in`                                  | No stored token and no `TERRA_ADMIN_TOKEN`                 | `terra login`, or set the variable                                          |
| A credential will not print                      | Secret gating, deliberately                                | Add `--reveal`, and log in with `--scope keys:read` if the scope is missing |
| A destructive command refuses to run             | No terminal to confirm against                             | Add `--yes`                                                                 |
| `More results are available`                     | The list has more pages                                    | Add `--paginate`                                                            |
| `unknown flag: --json`                           | The response is not described, so there are no fields      | Use `--jq`                                                                  |
| `the endpoint does not exist on this deployment` | A bare 404: wrong path, or the surface is not on that host | Check `terra config --list` for the base URL in use                         |
| The token was written to a file, not the keyring | No OS keyring was available; the file is mode 0600         | Nothing to fix                                                              |

`terra api <path>` reaches an endpoint without the generated command's
validation or formatting in the way, which separates "the CLI built the wrong
request" from "the API answered this".
