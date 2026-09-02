---
name: terra-cli
description: >-
  Inspect and change Terra API account configuration from the terminal with the
  terra CLI, instead of clicking in the Terra dashboard: environments (dev-ids),
  enabled providers, data scopes, webhook destinations, API keys, delivered
  events, users, team, and billing. Also reaches any admin or data API endpoint
  directly. Use when a task needs Terra API account state read or changed, when
  you would otherwise tell the user to open dashboard.tryterra.co, when
  debugging what a webhook actually delivered, or when the user mentions
  terra-cli, terra login, TERRA_ADMIN_TOKEN, or a dev-id.
license: MIT
compatibility: Requires the terra CLI on PATH; install with Homebrew or npm
allowed-tools:
  - Bash(terra *)
  - Bash(which terra)
  - Bash(brew install tryterra/tap/terra)
  - Bash(npm install -g @tryterra/cli)
metadata:
  author: terra
  version: "1.0.0"
---

# Terra CLI

Terra API account configuration is normally changed by clicking in the dashboard
at [dashboard.tryterra.co](https://dashboard.tryterra.co): which providers are
enabled, which data types they send, where webhooks are delivered, which API
keys exist. You cannot click. `terra` does the same things from the terminal, so
a task that needs account state read or changed is yours to finish rather than
something to hand back to the user.

Prefer it over asking the user to open the dashboard. Say what you ran and what
came back. Fall back to asking only when the CLI genuinely cannot do it, such as
signing up, or creating a streaming test user.

## Two APIs, and which one a task belongs to

Terra API is two HTTP APIs. Confusing them is the most expensive mistake here, so
start with the rule:

**If a public docs guide teaches it, it is the data API, and it belongs in the
code you are writing. If you would do it by clicking in the dashboard, it is the
admin API, and it belongs in a `terra` command.**

**The data API** (`access.tryterra.co/api/v2`, authenticated with `dev-id` and
`x-api-key`) is the integration itself, and it is what every guide in the public
docs is about: sending a user through the widget or an auth link to connect a
wearable, receiving webhooks, deauthenticating, and reading activity, sleep,
daily, body, nutrition, menstruation, athlete, workout and lab-report data. Your
application calls this one, on every request it makes to Terra.

**The admin API** (`/api/v3/admin`, authenticated with an admin token approved in
the dashboard) manages and debugs that integration and the account around it:
environments, enabled providers, data scopes, destinations, API keys, delivered
webhook events, connections, team, entitlements, billing. It is the API the
dashboard itself uses. **Your application never calls it.** You do, when you are
setting the integration up or working out why it did something.

So "why did this webhook not arrive" and "which providers are on" are admin API
questions, and this CLI is how an agent answers them. "What does a sleep payload
contain" and "how do I connect a user" are data API questions, and the answer
goes into the code.

`terra` reaches both. Every admin command is generated from the API description,
so that surface is covered whole and `terra reference` lists it. The data API has
no generated commands: `terra data-api <path>` reaches any endpoint, and
`terra api list --data-api` says what is there, which makes it the fastest way to
try a request by hand before writing the code that sends it.

## Getting started

When somebody asks to get started with Terra API, or to check their setup, work
through this and report what you find. It is read-only until the last step, so
run it without asking.

1. **Is the CLI there?** `which terra`. If not, install it: on macOS
   `brew install tryterra/tap/terra`, elsewhere and on Windows
   `npm install -g @tryterra/cli`.
2. **Is it authenticated?** `terra whoami --format json`. `authenticated: true`
   means you can continue. If false, stop and tell them how: setting
   `TERRA_ADMIN_TOKEN` needs no browser and is the right path for a script,
   while `terra login` opens one. Do not try to log in on their behalf.
3. **Which environments exist?** `terra environments list --format json`. Each
   is a dev-id. If there is exactly one, use it for the rest; if there are
   several, name them and ask which they are working in.
4. **What is that environment set up to do?** For the chosen dev-id:
   - `terra unified-api sources list --env <dev-id> --format json` for the
     wearable providers that are enabled.
   - `terra unified-api destinations list --env <dev-id> --format json` for
     where webhooks are delivered.
   - `terra users list --env <dev-id> --paginate` for the end users connected
     so far.
5. **Report, then suggest.** Say what you found in a few lines: the
   environment, the providers, the webhook destination, how many users. Then
   name the gap that matters, and offer to fix it with a command rather than
   pointing at the dashboard:
   - No providers enabled: nobody can connect a wearable yet.
     `terra unified-api sources enable GARMIN --env <dev-id>`
   - No destination: data has nowhere to go.
     `terra unified-api destinations create --env <dev-id> --url <https url>`
   - A destination pointing at localhost or a dead tunnel: webhooks are being
     dropped, and `terra events list --env <dev-id> --paginate` shows what was
     attempted.
   - Everything configured and no users: the integration is ready and nobody
     has connected, so the next step is their auth flow rather than the account.

If a command fails, read the exit code before retrying: 2 means the token was
rejected, 5 means the product is not on the account, and 3 means the input was
wrong rather than the account being wrong.

## Before you run anything

Check that the CLI is installed and authenticated, and say which one is missing
rather than guessing:

```sh
terra whoami --format json   # "authenticated": true, plus scopes and dev_ids
```

- Not installed. On macOS prefer Homebrew, which brings shell completions with
  it: `brew install tryterra/tap/terra`. Elsewhere, and on Windows,
  `npm install -g @tryterra/cli`. apt and scoop carry it too, and
  `terra version` reports which channel a binary came from.
- Not authenticated: `TERRA_ADMIN_TOKEN` is the headless path and needs no
  browser. `terra login` needs a human to approve in one; where you cannot hold
  a process open for that, `terra login --start` prints a device code and exits,
  and `terra login --complete <device-code>` finishes once approved.
- `whoami` answers with the same JSON shape either way, including
  `"authenticated": false`, so parse one shape rather than branching on
  presence.

A command that needs a scope the token lacks fails naming the scope to request.

## What it does instead of the dashboard

| To find out, or change             | Run                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| Which environments (dev-ids) exist | `terra environments list`                                                                      |
| Which providers are enabled        | `terra unified-api sources list --env <dev-id>`                                                |
| Enable or disable a provider       | `terra unified-api sources enable GARMIN --env <dev-id>`                                       |
| Which data types are sent          | `terra unified-api data scopes list --env <dev-id>`                                            |
| Where webhooks go                  | `terra unified-api destinations list --env <dev-id>`                                           |
| The environment's API key          | `terra environments api-key retrieve --reveal`                                                 |
| What a webhook actually delivered  | `terra events list --env <dev-id> --paginate`, then `terra events payload retrieve <event-id>` |
| Redeliver a webhook                | `terra events resend --event-id <id> --event-type <type> --user-id <uuid>`                     |
| How many users are connected       | `terra users list --env <dev-id> --paginate`                                                   |

`terra events payload retrieve` and `terra events resend` are the two worth
reaching for first when a webhook handler misbehaves: they show what was sent
and send it again, without touching a device.

## Discovering commands

Command names come from the API description, so do not guess them and do not
walk `--help` a level at a time. One call gives you everything:

```sh
terra reference --format json  # the whole tree, machine-readable
terra reference billing        # one subtree, as prose
terra help <command>           # every parameter, not just the common ones
```

Three things to know when reading that document:

- `global_flags` sits at the document root and applies to every node, so a flag
  missing from a leaf may still be accepted there.
- A flag with no `default` has the zero value for its type, not an unknown one.
- `long` carries the required scope and behavior the flag list does not show.

Commands read as `terra <group> <resource> <verb>`, with verbs derived from the
API: `list`, `retrieve`, `create`, `update`, `replace`, `delete`. A product's
resources sit under the product, so the command names it first (`terra
unified-api sources list`), and the platform layer (environments, users, events,
tokens, team, billing) is at the root.

## Environments

Most operations act on one environment, a dev-id. It resolves as `--env`, then
`TERRA_ENV`, then the profile default set by `terra environments use`. A command
that needs one and cannot find one fails before sending a request.

`--env` takes the environment's name as readily as its dev-id, matched without
regard to case; an exact dev-id always wins over a name. Prefer the dev-id from
`terra environments list` when you have it, since it needs no resolution and
cannot be ambiguous.

## Output

Output is JSON when piped and a table on a terminal; `--format
json|table|ndjson` overrides that. Lists fetch one page by default, and
`--paginate` walks them all and prints NDJSON regardless of `--format`, bounded
by `--max-pages`. Use `--jq` to select fields rather than piping large documents
around.

## Before you change anything

`--dry-run` prints the request that would be sent and touches nothing.
Operations that return plaintext credentials require `--reveal`. Destructive
operations confirm first, and with no terminal to ask on they **fail** rather
than hanging, so pass `--yes` when you mean it. Mutations carry an
`Idempotency-Key` automatically, reused across retries, so a retried request
cannot double-apply.

## Exit codes

| Code | Meaning                                             |
| ---- | --------------------------------------------------- |
| 0    | success                                             |
| 1    | the API returned an error                           |
| 2    | not authenticated, or the token was rejected        |
| 3    | input failed validation before the request was sent |
| 4    | usage error                                         |
| 5    | the product is not on the account                   |
| 6    | internal error                                      |
| 7    | canceled: the user declined a confirmation prompt   |

Branch on these rather than parsing messages. Errors print the API's own
remediation text, which usually names the fix.

## Calling the data API

`terra data-api` takes the same flags as everything else. A call is made against
one environment, resolved the same
way `--env` is everywhere else, and authenticated with that environment's own
API key rather than your admin token. The key is fetched for you and needs the
`keys:read` scope; `TERRA_API_KEY` supplies it directly instead.

```sh
terra api list --data-api                     # every data API endpoint
terra data-api /sleep -q user_id=<uuid> -q start_date=<date> -q to_webhook=false
terra data-api /auth/generateWidgetSession -X POST -d reference_id=user-42
```

Reading data takes `-q to_webhook=false`. Without it the API sends the response
to the configured webhook and answers with an acknowledgement, which reads like
an empty result. The CLI says so on stderr rather than adding the parameter
itself.

The path and method are checked against the pinned description before anything
is sent, so a typo fails locally naming what it meant; `--no-verify` skips that
for an endpoint newer than the pin. Parameters are not checked: the API decides.
Naming a path reads what one endpoint takes and returns, which is the closest
thing these commands have to help:

```sh
terra api list --data-api /sleep --format json
```

## Raw requests

For an admin endpoint with no generated command:

```sh
terra api /me
terra api /environments -X POST -d dev_id=dev-new -d name=Staging
terra api list --uncovered   # which endpoints have no command
```

There is no `--json` on either raw command; use `--jq`.

## Debugging

`--show-headers` traces the request and response to stderr with the token
redacted, so it is safe to paste into a bug report.

## Finding documentation

This skill carries how the CLI behaves, not what each endpoint returns. For
that, `terra reference` covers the commands and the docs cover the products.
Look a page up rather than guessing its URL:
[docs.tryterra.co/llms.txt](https://docs.tryterra.co/llms.txt) indexes every
page, and appending `.md` to any docs URL returns markdown. The same docs are
served as an MCP endpoint at `https://docs.tryterra.co/~gitbook/mcp`, which is
worth connecting when a task needs repeated lookups.

Use the CLI for account state and the docs for contracts. Neither replaces the
other: `terra reference` will not tell you what a sleep payload contains, and
the docs will not tell you which providers this account has enabled.

## Other Terra API skills

This skill is the CLI: reading and changing account state. Terra publishes
separate skills for the integration code you write, covering webhook handling
and data storage (`terra-unified-api`), the mobile and streaming SDKs, and each
product. Making a webhook handler or a data model correct is their job; finding
out what the account is actually configured to do is this one's.

`terra agent setup` installs every skill this repository publishes, and
`terra agent setup --status-only` lists what is available and what is already
installed. Do not assume the set named above is current: the catalog is what it
is at install time, not what this file remembers.
