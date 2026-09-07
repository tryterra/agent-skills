# Connect a user, and check the connection worked

Read when sending a user through Terra API auth, verifying that a connection
came back active, or deauthenticating one.

The auth flow lives on the data API, so it runs through `terra data-api`, which
authenticates with the environment's API key. That lookup needs `keys:read`, or
`TERRA_API_KEY` set directly. See [data-api.md](data-api.md).

## 1. Send the user through auth

```sh
terra data-api /auth/generateWidgetSession -X POST -d reference_id=user-42
```

Returns a widget URL to open for the user. `reference_id` is your own
identifier for them, and it is what makes the connection findable later without
knowing the Terra API user id.

`/auth/authenticateUser` is the non-widget path, for sending a user straight to
one provider, and `/auth/generateAuthToken` mints the token a mobile SDK uses.
Read what each takes with `terra api list --data-api /auth/authenticateUser
--format json`.

## 2. Check the connection came back

```sh
terra users list --env <dev-id> --reference-id user-42
```

One row per connection: user id, provider, active, created at. Nothing means
the user never finished the flow. A row with `active: false` means the
connection exists but the provider is no longer authorizing it.

Filters: `--provider`, `--active true|false`, `--user-id`, `--reference-id`,
and a `--created-since`/`--created-until` window. **That window is on creation
time and the flags are `--created-since`/`--created-until`**, not
`--since`/`--until`; the raw ones are rejected with a 400.

```sh
terra users list --env <dev-id> --provider GARMIN --active true --paginate
```

## 3. If it did not work, read the auth event

```sh
terra events list --env <dev-id> --reference-id user-42 --data-type auth
```

The auth event carries the failure message. A common cause is a provider that
is not enabled in this environment, which
`terra unified-api sources list --env <dev-id>` confirms in one call.

## Inspect one user

```sh
terra data-api /userInfo -q user_id=<uuid>
terra data-api /userInfo -q reference_id=user-42
terra data-api /bulkUserInfo -X POST --body '["<uuid>","<uuid>"]'
```

`/userInfo` takes either identifier: `user_id` returns one connection, and
`reference_id` returns every user registered under it. `/bulkUserInfo` is a
POST whose body is a bare JSON array of user ids, so it needs `--body` rather
than `-q`, and it does not accept a reference id.

`/userInfo` is the data API's own view of a connection, including the provider
and its scopes. `terra users list` is the admin view of the same connection.
Where they disagree, the data API is the one the integration sees.

## Deauthenticate

```sh
terra data-api /auth/deauthenticateUser -X DELETE -q user_id=<uuid>
```

It is a `DELETE` with `user_id` in the query, not a POST with a body. The CLI
checks the path and method against the pinned description before sending, so a
POST here fails locally rather than reaching the API.

This **deletes every record Terra API holds for the user**, including cached
data, and revokes Terra API's access to their provider data. It is a real
change to a real user's account, so confirm with the user before running it
against anything but a test connection.

That makes it the call an account-deletion or erasure request needs, and it
also makes it unrecoverable: there is no undo, and the user reconnects from
scratch. Deauthenticate first, then delete your own records, so nothing
arrives after the deletion. Confirm the user id against
`terra users list --reference-id <ref>` before running it, because the call
takes a Terra API user id and a wrong one silently disconnects somebody else.

## Backfill after connecting

A newly connected user has no history at your destination until you ask for it.
Requesting a range **without** `to_webhook=false` sends the data to the
configured destination, which is exactly what a backfill wants:

```sh
terra data-api /sleep -q user_id=<uuid> -q start_date=2026-08-01 -q end_date=2026-09-01
```

Adding `-q to_webhook=false` prints the data in the terminal instead, which is
what inspecting a payload shape wants. See [data-api.md](data-api.md).
