# Set up an environment

Read when turning providers on, pointing webhooks somewhere, choosing which
data types are sent, or configuring the auth widget.

Everything here is scoped to one environment. Pass `--env <dev-id>` or set the
default once with `terra environments use <dev-id>`.

## Providers

```sh
terra unified-api sources list --env <dev-id>              # what is enabled
terra unified-api sources enable GARMIN --env <dev-id>     # idempotent
terra unified-api sources disable GARMIN --env <dev-id> --yes
```

Enabling a provider makes it appear in the auth widget and start syncing to the
environment's destinations. `disable` is destructive, so it confirms, and with
no terminal it needs `--yes`.

### Bring your own OAuth app

By default auth runs against Terra API's own OAuth app for the provider. To run
it against the customer's:

```sh
terra unified-api sources credentials retrieve GARMIN --env <dev-id> --reveal
terra unified-api sources credentials replace GARMIN --env <dev-id> \
  --client-id <id> --client-secret <secret> --yes
# full replace: this clears redirect-url, sandbox and verification-secret
```

`credentials replace` is a **full replace**: a field you do not supply is
cleared, including `redirect-url`, `sandbox` and `verification-secret`.
Retrieve first, then send the whole document. The secret is write-only and
reads come back masked, so a retrieve cannot recover a secret you did not keep.

### Custom OAuth scopes

```sh
terra unified-api sources scopes retrieve GARMIN --env <dev-id>
terra unified-api sources scopes replace GARMIN --env <dev-id> \
  --scopes <scope> --scopes <scope> --yes
```

Also a full replace; passing no `--scopes` clears the provider's custom scopes
back to the default.

## Destinations

```sh
terra unified-api destinations list --env <dev-id>
terra unified-api destinations create --env <dev-id> \
  --type webhook --url https://example.com/hook --reveal
terra unified-api destinations update <destination_id> --env <dev-id> --active false
terra unified-api destinations delete <destination_id> --env <dev-id> --yes
```

`create` returns the destination's signing secret, so it needs `--reveal` or it
refuses to run. Capture the secret at creation: it is what the webhook handler
verifies signatures with. `--event-types` is repeatable and narrows what a
destination receives; leaving it off sends everything.

A Supabase destination is provisioned through its own OAuth flow rather than a
URL: `terra unified-api destinations supabase oauth start`, then
`... oauth projects list`, then `... supabase provision`.

## Which data is sent

```sh
terra unified-api data scopes list --env <dev-id>
terra unified-api data scopes update --env <dev-id> --data-type sleep --fields <field> --fields <field>
terra unified-api data processing list --env <dev-id>
terra unified-api data processing update --env <dev-id> --type json      # json | fit | fhir
```

`data scopes` is per-data-type field selection: which fields of a sleep or
activity payload the destination receives. `data scopes replace` sets the whole
selection at once and clears what it does not name. `data processing` switches
the normalization output format for the environment, and the endpoint supports
a server-side preview through `terra api ... -q dry_run=true`.

## The auth widget

```sh
terra unified-api widget retrieve --env <dev-id>
terra unified-api widget update --env <dev-id> --widget-name Acme --app-logo <url> --yes
```

**`widget update` is a full replace despite the verb**: any field you do not
supply is cleared. Retrieve the current document, edit it, and send it whole.
`--widget-config` carries the configuration document inline on
environments-release deployments; `--widget-config-url` is the legacy field it
replaced.

## Health scores

```sh
terra unified-api scores list --env <dev-id>
terra unified-api scores update readiness --env <dev-id> --active true
terra unified-api scores history list --env <dev-id> --score readiness --user-id <uuid>
terra unified-api scores analytics retrieve --env <dev-id>
```

Activating a score makes it appear in payloads for users with eligible data.
`scores history list` reads the computed scores, filterable by score type,
`--user-id`, `--provider-user-id`, and a `--since`/`--until` window, with cursor
pagination.

## Preview before mutating

Every command here takes `--dry-run`, which prints the request and sends
nothing. On a mutation against an environment resolved from configuration
rather than a flag, it is the cheapest way to confirm you are about to change
the environment you meant.

```sh
terra unified-api sources enable GARMIN --dry-run
```
