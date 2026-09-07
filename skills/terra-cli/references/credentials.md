# Credentials

Read when minting, reading, or rotating anything the integration authenticates
with. There are three kinds and they are not interchangeable.

| Kind                | Authenticates                    | Mint with                             | Lifetime                                        |
| ------------------- | -------------------------------- | ------------------------------------- | ----------------------------------------------- |
| Admin token         | The admin API, so the CLI itself | `terra login`, or `TERRA_ADMIN_TOKEN` | 30 days, rotatable inside a 90-day grant window |
| Environment API key | The data API, as one environment | Exists per environment                | Until rotated                                   |
| Data token          | The data API, explicitly scoped  | `terra data-tokens create`            | 365 days by default, up to 1825, or never       |

Every command here returns plaintext credential material, so **every one of
them needs `--reveal`** or it refuses to print. The flag is an explicit opt-in
that stops a secret being printed by accident; it does nothing to protect one
you have chosen to print. Once `--reveal` is passed the value goes to stdout
like any other output, so in CI it lands in the job log. Redirect it into the
consumer rather than letting it print, and prefer `--json` to narrow the
response to the fields you actually need.

## Admin tokens

```sh
terra whoami --format json          # id, scopes, dev_ids, expiry
terra tokens list                   # every admin token on the account
terra tokens rotate --reveal --yes  # extend this one
terra tokens delete <token_id> --yes
```

Reading a scope you do not have fails naming the scope to request. The default
login grants every non-dangerous admin scope and excludes `keys:read`,
`keys:write`, `tokens:admin`, `tokens:write`, `billing:write` and `team:write`.
Ask for one at login rather than working around it:

```sh
terra login --scope keys:read --scope providers:write
terra login --env dev-prod          # restrict the token to one environment
```

`terra tokens list` and `terra tokens delete` need `tokens:admin`, which can
revoke every other credential the account holds. `terra logout` revokes the
stored token server-side and removes it locally; a token supplied through
`TERRA_ADMIN_TOKEN` is not stored, so unset the variable instead.

## The environment API key

```sh
terra environments api-key retrieve --env <dev-id> --reveal
terra environments api-key rotate --env <dev-id> --reveal --yes
```

`retrieve` prints the dev-id, the API key, and the webhook signing secret, and
needs `keys:read`. `rotate` mints a new secret and returns it once; it needs
both `account:write` and `keys:read`, and **the rotated-away secret stops
working immediately**, so anything still holding it breaks at once. Confirm
with the user before rotating a production key, and have the place that
consumes it ready to take the new value.

Prefer data tokens where you can. They coexist, so rotation is mint-new then
revoke-old with no atomic swap.

## Data tokens

```sh
terra data-tokens list --env <dev-id>
terra data-tokens create --env <dev-id> --name ci --scopes auth:write --reveal
terra data-tokens secret retrieve <token_id> --env <dev-id> --reveal
terra data-tokens delete <token_id> --env <dev-id> --yes
```

Long-lived, explicitly scoped, per-environment credentials for the data plane:
an SDK-authentication-only token is `--scopes auth:write` and nothing else.
Several coexist per dev-id and each is revocable and separately observable,
which is what makes them the right answer for unattended access.

`--scopes` takes data-plane names only; an admin-plane name is rejected with a 400. `--expires-in-days` defaults to 365 and caps at 1825, and
`--never-expires` is the non-expiring shape. The two are mutually exclusive.
The bearer comes back at mint and is retrievable later through
`data-tokens secret retrieve`, which is gated on `keys:read`.

## Migrating off the legacy API key

The CLI's own help recommends this: `terra environments api-key rotate` exists
for the dashboard's legacy settings page, and data tokens are the shape to move
to. The legacy key is a single shared secret, so rotating it is an atomic
cutover that breaks anything still holding the old value the instant it lands.
Data tokens coexist, so the migration is additive and reversible:

```sh
# 1. Mint a token with only the scopes the consumer actually uses
terra data-tokens create --env <dev-id> --name backend --scopes auth:write --reveal

# 2. Deploy that value, and confirm it is being used
terra data-tokens list --env <dev-id>

# 3. Only then retire the old credential
terra environments api-key rotate --env <dev-id> --reveal --yes
```

Do them in that order and nothing has a window where both credentials are
invalid. Mint one token per consumer rather than sharing one, because
`data-tokens list` then shows which consumer is which, and revoking one does
not touch the others.

## Provider OAuth credentials

The customer's own OAuth app for a provider, rather than Terra API's:

```sh
terra unified-api sources credentials retrieve GARMIN --env <dev-id> --reveal
```

The client secret is write-only and reads come back masked, so a retrieve
cannot recover a secret nobody kept. Setting them is a full replace: see
[environment-setup.md](environment-setup.md).

## Where the CLI's own token lives

In the OS keyring, keyed by profile. With no keyring available it falls back to
a file with mode 0600 in the config directory and says so; `TERRA_KEYRING=file`
forces that. `terra config --list` shows the token metadata and which backend
is in use, and the config file itself never holds a token, so it is safe to
print.

## Handling a credential you have printed

Once `--reveal` has printed a secret it is in the transcript. Do not echo it
again, do not put it in a commit, and do not paste it into a file the user did
not ask for. Where a value has to reach a config file, write it and say that
you did, rather than repeating it in the reply.
