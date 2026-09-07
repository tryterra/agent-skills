# Team and access

Read when adding or removing a person from the account, or auditing who holds
what.

Both halves need a dangerous scope the default login leaves out: `team:write`
to change membership and `tokens:admin` to see and revoke tokens. Ask for them
at login rather than working around them, and say which one is missing rather
than guessing:

```sh
terra login --scope team:write --scope tokens:admin
```

## Who is on the account

```sh
terra team members list --json user_id,name,email,role
terra team invitations list --json id,email,role,created_at,expires_at,claimed_at
```

An invitation with `claimed_at` null has not been accepted. Roles are `admin`
and `developer`; `superadmin` exists but is not assignable here, matching the
dashboard's own team editor.

## Adding someone

```sh
terra team invitations create --email person@example.com --role developer --reveal
```

Three things about the response:

- It carries a **one-use invitation token, and only its digest is stored**, so
  the value in that response is the only copy. A lost token has to be replaced
  with a new invitation, not recovered. That is why the command needs
  `--reveal`.
- The company comes from the calling token's principal and cannot be named in
  the body, so an invitation always joins your own account.
- The invitee redeems it while signing in to the dashboard **with that exact
  address**, which is where the company and role are applied.

Hand the token over the way you would any credential: give it to the user to
send, rather than posting it somewhere on their behalf.

## Removing someone

Deleting the member is the obvious half. Revoking what they created is the half
that gets forgotten, and it is the half that matters, because a token outlives
its author.

```sh
# 1. What did they create?
terra tokens list --json token_id,name,created_by,created_via,scopes,expires_at,last_used_at,revoked_at

# 2. Revoke each admin token of theirs
terra tokens delete <token_id> --yes

# 3. Data tokens are per environment, so check each one
terra data-tokens list --env <dev-id>
terra data-tokens delete <token_id> --env <dev-id> --yes

# 4. Then remove the member
terra team members delete <user_id> --yes
```

`created_by` on the token row is what ties a credential to a person. Do step 1
**before** step 4: once the member is gone, working out which tokens were
theirs is harder.

A `revoked_at` that is already set means the token is dead; leave it. A
`last_used_at` far in the past on a token nobody claims is worth raising even
when nobody is leaving.

`terra team members delete` returns 404 both when the user does not exist and
when they belong to a different company, deliberately, so a 404 is not proof
the id was wrong.

## Auditing without changing anything

```sh
terra tokens list --jq '[.[] | select(.revoked_at == null)] | length'
terra tokens list --jq '.[] | select(.expires_at != null) | {name, expires_at}'
terra whoami --format json
```

Admin tokens expire after 30 days and `terra tokens rotate` extends one until
the 90-day grant window closes, after which the holder logs in again. A token
list full of near-expiry rows is a rotation task, not an incident.

Every read here is safe to run unprompted. Every delete is destructive, needs
`--yes` where there is no terminal, and takes away a real person's access, so
confirm the list with the user before revoking anything.
