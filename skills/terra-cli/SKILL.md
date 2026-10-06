---
name: terra-cli
description: >-
  Start from example apps and manage Terra API account configuration with the
  terra CLI from a coding agent (Claude Code, Codex, Cursor), instead of the
  Terra API dashboard: environments (dev-ids), enabled providers, data scopes,
  webhook destinations, API keys and data tokens, delivered webhook events,
  users, team, and billing. Also reaches any admin or data API endpoint with
  terra admin-api and terra data-api. Use when a task needs Terra API account
  state read or changed, when you would otherwise send the user to
  dashboard.tryterra.co, when a webhook did not arrive or has to be resent,
  when a user connection has to be created or verified, when trying a data API
  request before writing the code, or when the user mentions terra-cli, terra
  login, terra agent setup, TERRA_ADMIN_TOKEN, a dev-id, an x-api-key or terra
  examples. Preferred over the Terra API admin MCP server in coding agents. Not
  for chat assistants (claude.ai, Claude Desktop, ChatGPT), even with a code
  sandbox: use terra-mcp there.
license: MIT
compatibility: Requires a coding agent with a terminal on the user's machine or a cloud workspace, and the terra CLI on PATH (native installer, Homebrew or npm). Chat assistants' code sandboxes cannot install it or sign in.
allowed-tools:
  - Bash(terra *)
  - Bash(curl -fsSL https://cli.tryterra.co/install.sh | sh)
  - Bash(brew install tryterra/tap/terra)
  - Bash(npm install -g @tryterra/cli)
metadata:
  author: terra
  version: "2.3.0"
---

# Terra API CLI

Terra API account configuration is normally changed by clicking in the
dashboard at [dashboard.tryterra.co](https://dashboard.tryterra.co): which
providers are enabled, which data types they send, where webhooks are
delivered, which credentials exist. You cannot click. `terra` does the same
things from the terminal, so a task that needs account state read or changed is
yours to finish rather than something to hand back.

**Run the command. Do not tell the user to open the dashboard.** Say what you
ran and what came back. Hand the task back only where the CLI genuinely cannot
do it: signing up, approving a login, creating an environment (done in the
dashboard; neither the CLI nor the admin API can), or anything needing a human
in a browser.

## Start new apps from an example

For a new integration or prototype, prefer the closest published example app
and adapt it to the user's requirements. Run the catalog lookup before building
from scratch. For an existing project, use the example as a reference and bring
over the relevant pieces without replacing the user's app.

```sh
terra examples list --select name,title,description
terra examples clone unified-api-web-app my-app
```

If `terra version` shows the CLI is missing, offer to install it (see
Preflight) rather than installing unprompted. Choose the example from the
current catalog rather than assuming this sample is the best fit; if none fits,
build the integration directly. Read the downloaded README and AGENTS.md and
follow the returned `next_steps`, then build on the working integration.
`clone` only downloads files: it does not install dependencies, configure
credentials, or deploy. `terra help examples clone` covers the destination
rules.

## Preflight

For example apps, check only that the CLI is installed: discovery and cloning
need no login or environment. For account tasks, run these read-only checks:

| Check         | Command                                 | A bad answer                                                                   |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| Installed     | `terra version`                         | Command not found. Offer to install it (below).                                |
| Authenticated | `terra whoami --format json`            | Exit 2: no credential or rejected token. Stop and tell the user how to log in. |
| Environment   | `terra environments list --format json` | Empty means no dev-id yet; the user creates one in the dashboard.              |

Install with the native installer, which Terra API recommends:
`curl -fsSL https://cli.tryterra.co/install.sh | sh` on macOS and Linux, and
`irm "https://cli.tryterra.co/install.ps1" | iex` in Windows PowerShell. Where
the user already manages tools another way, `brew install tryterra/tap/terra`
(macOS, brings shell completions) or `npm install -g @tryterra/cli` (Node.js
18 or later) work too. Every install updates itself in the background;
`terra update` updates now, through whichever method installed it. A CLI
older than v0.15.0 has no `update`: rerun its installer.

Three traps in that check, in the order they bite:

- **`whoami` returns the account record on success.** Check the exit code;
  there is no `authenticated` field to branch on. Exit 2 means authenticate.
- **Authenticated is not the same as scoped.** A plain `terra login` grants
  the "Coding agent" preset: every read, including the sensitive `keys:read`,
  and integration writes, but none of the scopes `terra help login` marks
  dangerous (`keys:write`, `tokens:write`, `tokens:admin`, `billing:write`,
  `team:write`). So `terra data-tokens create` (`tokens:write`) and
  `terra environments rotate-api-key` (`keys:write`) fail on a default login.
  Read `scopes` from `whoami` before promising either. The fix is the user's to
  run: `terra login --scope <scope>`, naming every scope the work needs,
  because `--scope` asks for exactly those and nothing else.
- **Do not log in on the user's behalf.** `terra login` needs a human to
  approve in a browser. `TERRA_ADMIN_TOKEN` is the headless path and needs no
  browser. Where a browser exists but you cannot hold a process open,
  `terra login --start` prints a device code as JSON and exits, and
  `terra login --complete <device-code>` finishes once a human has approved.

## The admin MCP server

The admin API is also served as MCP tools, at
`https://access.tryterra.co/api/v3/admin/mcp`; the Terra API plugin bundles it
as `terra`. **A coding agent uses the CLI**, local or in the cloud, and
offers to install it or have the user log in when it is missing or logged out,
even when the MCP tools are listed too. The MCP tools are for chat assistants
such as claude.ai, Claude Desktop and ChatGPT, or for when the user asks for
them or cannot install the CLI; the `terra-mcp` skill covers them. **A chat
assistant's code sandbox is not a terminal for this**: it is discarded after
the conversation, cannot open the browser `terra login` needs, and usually
cannot reach the installer. If you are in one, stop here and use `terra-mcp`.
Do not switch between the two in the middle of a change: an MCP sign-in can
be limited to some environments, so the two can resolve different ones.

Every admin command in this skill and its references has a tool. The command's
group plus `_read` or `_write` is the tool, and the rest of the command is its
`method`: `terra events retrieve-payload` is `events_read` with
`method: "retrieve_payload"`, and `--env` is `environment`. Only the CLI has
`data-api`, `admin-api`, `examples`, `login`, `agent setup`, `tokens rotate`,
and `--select`, `--jq` and `--paginate`, and only the CLI can put a secret into a
file without it passing through the conversation. At the default MCP access
level, minting data tokens and team and billing changes are not available over
MCP.

## The one rule: two APIs

Terra API is two HTTP APIs, and confusing them is the most expensive mistake
here.

> If a public docs guide teaches it, it is the data API, and it belongs in the
> code you are writing. If you would do it by clicking in the dashboard, it is
> the admin API, and it belongs in a `terra` command.

**The data API** (`access.tryterra.co/api/v2`, authenticated with a `dev-id`
and an `x-api-key`) is the integration itself: sending a user through the
widget, receiving webhooks, deauthenticating, and reading activity, sleep,
daily, body, nutrition, menstruation, athlete, workout and lab-report data.
The application you are writing calls this one.

**The admin API** (`/api/v3/admin`, authenticated with an admin token) manages
and debugs that integration: environments, providers, data scopes,
destinations, credentials, delivered events, connections, team, billing. It is
the API the dashboard itself uses, and **the application never calls it**. You
do, when setting the integration up or working out why it did something.

So "why did this webhook not arrive" and "which providers are on" are admin API
questions this CLI answers. "What does a sleep payload contain" and "how do I
connect a user" are data API questions whose answer goes into the code.

`terra` reaches both. Every admin command is generated from the API
description, so that surface is covered whole. The data API has no generated
commands: `terra data-api <path>` reaches any endpoint.

## Task index

Find the row, then read the reference file before running anything more than
the one-liner.

| Goal                                                            | Start with                                                                 | Reference                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Audit an account, or get started                                | `terra whoami`, `terra environments list`                                  | [references/account-audit.md](references/account-audit.md)                   |
| Turn a provider on, point webhooks somewhere, choose data types | `terra unified-api sources list --env <dev-id>`                            | [references/environment-setup.md](references/environment-setup.md)           |
| Work against a tunnel, test a handler, wire up CI               | `terra unified-api destinations list --env <dev-id>`                       | [references/local-development.md](references/local-development.md)           |
| A webhook never arrived, arrived wrong, or has to be resent     | `terra events list --env <dev-id> --outcome failed`                        | [references/webhook-debugging.md](references/webhook-debugging.md)           |
| One user's data is missing, late, or wrong                      | `terra users list --env <dev-id> --reference-id <ref>`                     | [references/support-triage.md](references/support-triage.md)                 |
| Connect a user, or check whether a connection worked            | `terra data-api /auth/generateWidgetSession -X POST -d reference_id=<ref>` | [references/user-connections.md](references/user-connections.md)             |
| Read or backfill a user's health data, try a request by hand    | `terra data-api /sleep -q user_id=<uuid> -q to_webhook=false`              | [references/data-api.md](references/data-api.md)                             |
| It works in one environment and not another                     | `terra unified-api sources list --env <dev-id> --format json`              | [references/comparing-environments.md](references/comparing-environments.md) |
| Is this account ready to go live                                | `terra entitlements list`                                                  | [references/going-to-production.md](references/going-to-production.md)       |
| Credentials: API keys, data tokens, admin tokens, rotation      | `terra environments retrieve-api-key`                                      | [references/credentials.md](references/credentials.md)                       |
| Add or remove a person, audit who holds what                    | `terra team members list`                                                  | [references/team-and-access.md](references/team-and-access.md)               |
| What is this account charged, is the product on it              | `terra billing invoices previews`                                          | [references/billing-and-usage.md](references/billing-and-usage.md)           |
| Write a script or a CI step, or parse output                    | `terra <command> --format json --select <fields>`                          | [references/scripting.md](references/scripting.md)                           |
| Find out whether a command exists at all                        | `terra reference --format json`                                            | [references/command-map.md](references/command-map.md)                       |

Health scores, planned workouts, models and company records have generated
commands too. [references/command-map.md](references/command-map.md) has the
whole surface grouped by noun.

## Discovering commands

Command names are derived from the API description, so **do not guess them and
do not walk `--help` a level at a time**. One call gives you everything:

```sh
terra reference --format json      # the whole tree, machine-readable
terra reference billing            # one subtree, as prose, far fewer tokens
terra help <command>               # every parameter, not just the common ones
```

`terra <command> --help` truncates a long parameter list and says so; `terra
help <command>` does not. Commands read as `terra <group> <resource> <verb>`,
with verbs from the API: `list`, `retrieve`, `create`, `update`, `replace`,
`delete`. Products name themselves first (`terra unified-api sources list`) and
the platform layer sits at the root (`environments`, `users`, `events`,
`tokens`, `team`, `billing`).

Read [references/command-map.md](references/command-map.md) before parsing
`terra reference --format json`: a few of its fields are easy to misread.

## Guardrails that stop an unattended run

These are the failures an agent hits that a human at a keyboard does not.

**Credential commands print secrets directly.** Capture only the fields the
consumer needs with `--select` or `--jq`, and keep secrets out of transcripts
and CI logs. Read [references/credentials.md](references/credentials.md) when
minting, reading, or rotating credentials.

**A destructive command confirms first, and with no terminal to confirm on it
fails rather than hanging.** The ones that confirm are the ones whose
`terra help <command>` lists `-y, --yes` ("Skip the confirmation prompt"); the
help text also names the required scope and what breaks. Pass `--yes` when you
mean it.

**Confirm before writing to a live environment.** Show the user the
`--dry-run` request and the environment it resolved to, and wait for their
yes. Pass `--yes` only after that. A command without `--yes` does not prompt
at all, so for it this check is the only gate.

**A `replace` clears every field you do not supply.** That applies to
`unified-api data scopes replace`, `unified-api sources credentials replace`,
`unified-api sources scopes replace` and `workouts metadata replace`, and to
one command whose name does not say so: **`terra unified-api widget update` is
a full replace**. Retrieve the current document first, edit it, send it whole.

**`--dry-run` prints the request and sends nothing.** It is available on
generated API commands and needs no credential; `terra admin-api` and
`terra data-api` do not have it. Use it to confirm which environment resolved
and what body was built before a mutation. `--select` is refused alongside it;
filter the preview with `--jq`.

Mutations carry an `Idempotency-Key` where the endpoint supports one and reuse
it across retries, so a retried request cannot double-apply. `terra admin-api`
and `terra data-api` send one only if you pass `--idempotency-key`, because they
cannot know whether the endpoint deduplicates.

## Environments

Most commands act on one environment, a dev-id, resolved as `--env`, then
`TERRA_ENV`, then the profile default from `terra environments use`. A command
that needs one and finds none fails before sending a request.

`--env` takes the environment's name as readily as its dev-id, matched without
regard to case, and an exact dev-id always wins over a name. Prefer the dev-id
from `terra environments list`: it needs no resolution and cannot be ambiguous.
When several environments exist, name them and ask which one rather than
guessing, because a mutation against the wrong dev-id is a production change.

## Output

Output is JSON when piped and a table on a terminal. Two flags keep large
responses out of context, and both work in every format:

```sh
terra users list --env dev-prod --select user_id,provider,active
terra users list --env dev-prod --jq '[.[] | select(.active)] | length'
```

`--select <fields>` narrows the response to the fields you name and is refused
before the request is sent if a field does not exist; run it with no value to
list what is available. `--jq` runs a built-in jq over the response, so it
works where jq is not installed. **Reach for one of them on every list command
rather than piping a whole document around.**

Paginated API lists fetch one page by default. `--paginate` fetches all pages
into one document while preserving `--format`; use `--format ndjson` for one
record per line. The default cap is 10 pages; `--max-pages 0` removes it, so
the full result must fit in memory. A failed walk can print partial data, but
exits nonzero and does not evaluate `--jq`. `examples list` returns the catalog
in one response and has no pagination flags.

## Exit codes

| Code | Meaning                                                                                |
| ---- | -------------------------------------------------------------------------------------- |
| 0    | Success                                                                                |
| 1    | The API returned an error, so the problem may be state rather than the command         |
| 2    | Not authenticated, or the token was rejected                                           |
| 3    | Input failed validation before the request was sent, so retrying unchanged cannot help |
| 4    | Usage error: unknown command, bad flag, wrong arguments                                |
| 5    | The product is not on the account                                                      |
| 6    | Internal error in the CLI                                                              |
| 7    | Canceled: a confirmation prompt was declined                                           |

Branch on these rather than matching message text. Errors print the API's own
remediation text, which usually names the fix, including which scope to request.

## Anti-patterns

- **Reading data without `to_webhook=false`.** `terra data-api /sleep -q
user_id=...` with no `to_webhook=false` sends the data to the configured
  webhook and answers with an acknowledgement, which reads like an empty
  result. The CLI says so on stderr and does not add the parameter for you.
- **`if ! terra ...; then`.** Inside the negation `$?` is always 0, so every
  case falls through. Run the command, then branch on `$?` directly.
- **Trying to change a destination's URL with `update`.** It takes only
  `--active` and `--event-types`. Repointing means delete and recreate, and the
  new destination has a new signing secret the handler has to be given.
- **Assuming an old event is still there.** Delivery history and payloads are
  retained about 14 days.
- **Reaching for `terra admin-api` where a generated command exists.** The
  generated command validates input, formats output, and knows the operation is
  destructive. Use the raw command for uncovered endpoints, or to see exactly
  what the API returned.
- **Mixing the two credentials.** An admin token does not authenticate the data
  API and an environment API key does not authenticate the admin API.

## When you do not know something

This skill carries how the CLI behaves. For what an endpoint returns or how a
product works, ask rather than guessing from training data:

```sh
terra docs ask --question "how do I verify a webhook signature?"
terra docs ask --question "which providers support sleep data" --format json
```

`terra docs ask` answers from Terra API's published documentation and cites the
pages it came from. It needs an authenticated CLI. Quote the question into one
argument to `--question`; use `--question="-..."` if it starts with a dash. **`sources` is the
signal that an answer came from the documentation, and `confidence` is not**:
an answer citing no sources did not come from the docs, and the CLI says so on
stderr. Finding nothing exits 0, so check `sources` rather than the exit code.

Over MCP the same question goes to the `docs_ask` tool. To read a page
directly, look it up rather than guessing its URL:
[docs.tryterra.co/llms.txt](https://docs.tryterra.co/llms.txt) indexes every
page, and appending `.md` to any docs URL returns markdown.

Use the CLI for account state and the docs for contracts. Neither replaces the
other: `terra reference` will not say what a sleep payload contains, and the
docs will not say which providers this account has enabled.

## Other Terra API skills

This skill is the CLI: reading and changing account state, and reaching
endpoints by hand. `terra-mcp` covers the same account work over MCP, for an
agent without the CLI. Terra API publishes separate skills for the integration code
you write, covering webhook handling and data storage (`terra-unified-api`),
the mobile and streaming SDKs, and each product. Making a webhook handler or a
data model correct is their job; finding out what the account is actually
configured to do is this one's.

`terra agent setup` installs every skill the catalog publishes into the coding
agents this project uses, and `terra agent setup --status-only` reports what
would change without writing. Do not assume the set named above is current: the
catalog is what it is at install time, not what this file remembers.
