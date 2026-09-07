# The local development loop

Read when working against a tunnel, testing a webhook handler, or wiring the
CLI into CI.

## Repointing webhooks at a tunnel

A local handler sits behind an ngrok or cloudflared URL that changes every
restart, and Terra API has to be told each time. **`destinations update`
cannot change the URL.** It takes only `--active` and `--event-types`, so
repointing is delete and recreate:

```sh
terra unified-api destinations list --env <dev-id> --json id,type,url,active,event_types
terra unified-api destinations delete <destination_id> --env <dev-id> --yes
terra unified-api destinations create --env <dev-id> \
  --type webhook --url https://<new-tunnel>/hook --reveal
```

**Read `event_types` and `type` off the old row before deleting it.** A
destination narrowed to some event types loses that narrowing when it is
recreated, because `create` with no `--event-types` takes the default and
subscribes to everything. Carry the old values across:

```sh
terra unified-api destinations create --env <dev-id> --type webhook \
  --url https://<new-tunnel>/hook \
  --event-types sleep --event-types activity --reveal
```

**The new destination has a new signing secret.** `create` returns it, which is
why `--reveal` is needed, and the handler has to be given the new value or
every delivery fails signature verification. That is the usual cause of a
handler that worked yesterday and 401s today.

Where a handler is being restarted often, prefer a stable tunnel domain (both
ngrok and cloudflared offer one) so the destination survives, rather than
recreating it and rotating the secret every session.

To stop deliveries without losing the destination or its secret:

```sh
terra unified-api destinations update <destination_id> --env <dev-id> --active false
```

## Testing a handler against real payloads

`terra events resend` is a debugging tool, and it is also the cheapest way to
drive a handler under development with real traffic. No device, no waiting for
a provider to sync:

```sh
terra events list --env <dev-id> --data-type sleep --json event_id,event_type,user_id
terra events resend --env <dev-id> \
  --event-id <event_id> --event-type sleep --user-id <uuid>
```

Point the destination at the tunnel first, then resend a stored event of the
shape you want to handle. Repeat as the handler changes: a resend is not
consumed, so the same event drives as many attempts as you need, inside the
roughly 14-day retention window.

Read the payload first to know what the handler is about to receive:

```sh
terra events payload retrieve <event_id> --env <dev-id>
```

## Checking a command before it changes anything

```sh
terra unified-api destinations create --env staging --url https://x/y --dry-run
```

`--dry-run` prints the request and sends nothing, needs no credential, and
works on every command including `terra api` and `terra data-api`. Its most
useful job locally is confirming **which environment resolved**, because an
environment coming from `TERRA_ENV` or the profile default is invisible in the
command you typed. Filter the preview with `--jq`; `--json` is refused
alongside it.

## CI and preview deployments

Authenticate with the variable rather than a login. Nothing is written to the
config file or the keyring, so there is nothing to clean up:

```sh
export TERRA_ADMIN_TOKEN=terra_at_...
export TERRA_ENV=dev-staging
terra unified-api destinations create --type webhook --url "$DEPLOY_URL/hook" --reveal
```

Two constraints to design around:

- **The CLI cannot mint a dev-id.** `terra environments create` creates the
  profile for a dev-id that already exists, and it is get-or-create rather than
  an error if one is there. So a genuine environment-per-PR scheme needs the
  dev-ids provisioned ahead of time; what CI can do on its own is repoint an
  existing preview environment's destination at the deploy under test.
- **Destructive commands fail rather than hanging** where there is no terminal,
  so pass `--yes` on every delete in a pipeline, and `--reveal` on anything
  returning a credential.

Branch on the exit code rather than on message text, and remember that `if !
cmd` clobbers `$?`. See [scripting.md](scripting.md).
