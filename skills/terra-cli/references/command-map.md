# The command surface

Read when you need to know whether a command exists before reaching for
`terra api`, or to pick the right group for a task.

**`terra reference` is authoritative, not this page.** Commands are generated
from the API description, so the surface grows with a spec sync and this
snapshot ages. Confirm before running something you have not run this session:

```sh
terra reference --format json          # everything, machine-readable
terra reference unified-api            # one subtree as prose, far fewer tokens
terra help <command>                   # every parameter of one command
terra api list                         # every admin endpoint and its command
terra api list --uncovered             # endpoints with no command yet
```

Prefer `terra reference <group>` over the whole document: the full JSON is
large, and a group is usually all a task needs.

## How a name is built

`terra <group> <resource> <verb>`, with verbs derived from the API: `list`,
`retrieve`, `create`, `update`, `replace`, `delete`, plus a few domain verbs
(`enable`, `disable`, `resend`, `rotate`, `use`). A product names itself first
(`terra unified-api sources list`); the platform layer sits at the root
(`environments`, `users`, `events`, `tokens`, `team`, `billing`). `env` is an
alias for `environments`.

## Snapshot

### Session and configuration

`whoami`, `login`, `logout`, `config`, `version`, `reference`, `docs ask --question <question>`,
`agent setup`, `completion <shell>`

### Example apps

For a new app, run `terra examples list` and clone the closest fit with
`terra examples clone <example> [directory]`. No login or environment is
needed. Read the downloaded README and AGENTS.md, install its dependencies,
and build on the working app. Use examples as references for existing projects.

### Platform

| Group          | Commands                                                                            |
| -------------- | ----------------------------------------------------------------------------------- |
| `environments` | `list`, `retrieve`, `create`, `update`, `use`, `retrieve-api-key`, `rotate-api-key` |
| `users`        | `list`, `stats`                                                                     |
| `events`       | `list`, `retrieve`, `retrieve-payload`, `stats`, `resend`                           |
| `tokens`       | `list`, `rotate`, `delete`                                                          |
| `data-tokens`  | `list`, `create`, `delete`, `retrieve-secret`                                       |

### Unified API

| Resource       | Commands                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `sources`      | `list`, `enable`, `disable`, `credentials retrieve`, `credentials replace`, `scopes retrieve`, `scopes replace`                     |
| `destinations` | `list`, `create`, `update`, `delete`, `supabase start-oauth`, `supabase poll-oauth`, `supabase list-projects`, `supabase provision` |
| `data`         | `scopes list`, `scopes update`, `scopes replace`, `processing list`, `processing update`                                            |
| `widget`       | `retrieve`, `update`                                                                                                                |
| `scores`       | `list`, `retrieve`, `update`, `history list`, `analytics retrieve`                                                                  |

### Other products

| Group      | Commands                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `workouts` | `metadata list`, `metadata retrieve`, `metadata update`, `metadata replace`, `metadata delete` |
| `models`   | `catalog list`, `runs list`                                                                    |

### Account

| Group          | Commands                                                                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account`      | `retrieve`, `update`, `retrieve-metadata`, `update-metadata`                                                                                                                                                     |
| `company`      | `retrieve`, `update`, `retrieve-onboarding`, `update-onboarding`, `list-feature-flags`, `retrieve-terms`, `agree-terms`, `opt-in-points`, `retrieve-referral-code`, `ensure-referral-code`, `retrieve-referrals` |
| `team`         | `members list`, `members retrieve`, `members update`, `members delete`, `invitations list`, `invitations create`, `invitations delete`                                                                           |
| `billing`      | `subscriptions list`, `subscriptions create`, `subscriptions cancel-incomplete`, `invoices list`, `invoices upcoming`, `payment-method retrieve`, `usage retrieve`                                               |
| `entitlements` | `list`                                                                                                                                                                                                           |

### Raw

`api <path>`, `api list [<path>]`, `data-api <path>`

The data API has no generated commands at all. Its endpoints are listed in
[data-api.md](data-api.md).

## Reading `terra reference --format json`

- `global_flags` sits at the document root and applies to every node, so a flag
  missing from a leaf may still be accepted there.
- `api_default` is the schema default; `cli_default` is the local parser
  default. An absent API default does not imply zero or an empty value.
- `long` carries the required scope and the behavior the flag list does not
  show, including whether an operation is a full replace.
- `terra <command> --help` truncates a long parameter list and says so.
  `terra help <command>` prints all of it.

```sh
terra reference --format json | jq '.. | select(.path? == "terra users list") | .flags'
```
