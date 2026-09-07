# Audit a Terra API account

Read when the user asks to get started with Terra API, to check their setup, or
to say what their account is configured to do.

Every step is read-only, so run the whole thing without asking, then report and
offer the fix. Substitute the chosen dev-id for `<dev-id>` throughout.

## 1. Who is this

```sh
terra whoami --format json
```

`authenticated: true` continues. Note `scopes` and `dev_ids`: a token restricted
to one environment cannot see the others, and a token without `keys:read`
cannot reach the data API or read an API key.

## 2. Which environments exist

```sh
terra environments list --format json --json dev_id,name
```

Each row is a dev-id. One environment means use it for the rest. Several means
name them and ask which the user is working in rather than guessing, then
`terra environments use <dev-id>` to save passing `--env` every time.

## 3. What that environment is set up to do

```sh
terra unified-api sources list --env <dev-id> --format json
terra unified-api destinations list --env <dev-id> --format json
terra unified-api data scopes list --env <dev-id> --format json
terra users list --env <dev-id> --json user_id,provider,active,created_at
terra users stats retrieve --env <dev-id> --format json
```

In order: the wearable providers that are enabled, where webhooks are
delivered, which data types and fields are sent, the end users connected so
far, and the trailing-three-month graphs behind the dashboard's overview
(payload and byte volume, per-provider connection counts, device/auth/deauth
series).

Add `--paginate` to `users list` on an account with more than a page of
connections, and remember the 10-page default cap.

## 4. Report, then offer the fix

Say what you found in a few lines: the environment, the providers, the webhook
destination, how many users. Then name the gap that matters, and offer a
command rather than pointing at the dashboard.

| What you found                              | What it means                                          | Offer                                                                                            |
| ------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| No providers enabled                        | Nobody can connect a wearable yet                      | `terra unified-api sources enable GARMIN --env <dev-id>`                                         |
| No destination                              | Data has nowhere to go, and every webhook is dropped   | `terra unified-api destinations create --env <dev-id> --type webhook --url <https url> --reveal` |
| A destination on localhost or a dead tunnel | Deliveries are failing now                             | `terra events list --env <dev-id> --outcome failed`                                              |
| Providers and a destination, no users       | The account is ready and nobody has connected          | The next step is their auth flow, not the account                                                |
| Users but no recent events                  | Connections exist and nothing is flowing               | `terra events list --env <dev-id> --paginate` over the retained window                           |
| A provider enabled with no credentials      | Auth runs on Terra API's shared app rather than theirs | `terra unified-api sources credentials retrieve <PROVIDER> --env <dev-id> --reveal`              |

## Failures worth reading rather than retrying

Read the exit code first. `2` means the token was rejected, so authenticate
rather than retrying. `3` means the CLI refused the input and sent nothing, so
retrying unchanged cannot help. `5` means the product is not on the account.
`1` means the API answered with an error, and its remediation text usually
names the scope to request or the field to fix.
