# Going to production

Read before an integration goes live, or when asked whether an account is ready
to. Every check is read-only, so run the whole list, then report what is not
ready and offer the command that fixes it.

Substitute the environment being launched for `<dev-id>` throughout.

## The checklist

| Check                                         | Command                                                                                                                | Ready looks like                                                                                                                                                                                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The product is on the account                 | `terra entitlements list`                                                                                              | The capability you are launching is present. Its absence is what exit code 5 means.                                                                                                                                                                |
| Providers are enabled                         | `terra unified-api sources list --env <dev-id>`                                                                        | The providers the product promises, and no more                                                                                                                                                                                                    |
| Auth runs on the customer's own OAuth app     | `terra unified-api sources credentials retrieve <PROVIDER> --env <dev-id> --reveal --json has_credentials,terra_owned` | `has_credentials` true and `terra_owned` false, for every provider where the customer registered their own app                                                                                                                                     |
| A destination exists and is live              | `terra unified-api destinations list --env <dev-id> --json id,type,url,active,event_types`                             | `active` true, and a target that is reachable from outside this machine. For a webhook that means an https URL that is not a tunnel or a localhost address; other destination types are judged on their own target, not on being an https endpoint |
| Data scopes match what the product needs      | `terra unified-api data scopes list --env <dev-id>`                                                                    | The data types the handler reads, and no fields nobody consumes                                                                                                                                                                                    |
| Deliveries are succeeding now                 | `terra events list --env <dev-id> --outcome failed`                                                                    | Nothing recent, or a failure with a known cause                                                                                                                                                                                                    |
| The widget is branded                         | `terra unified-api widget retrieve --env <dev-id>`                                                                     | The customer's name and logo rather than the defaults                                                                                                                                                                                              |
| Real connections exist                        | `terra users list --env <dev-id> --json user_id,provider,active`                                                       | At least one active connection that completed the real flow                                                                                                                                                                                        |
| The token driving this is scoped, not maximal | `terra whoami --format json`                                                                                           | Scopes it needs; a CI token restricted with `terra login --env <dev-id>`                                                                                                                                                                           |

The credential read needs `--reveal` to run at all, because the operation is
gated as returning credential material. The stored client secret comes back
masked either way, and `--json has_credentials,terra_owned` narrows the output
to the two fields the check actually reads, which is what keeps a readiness run
from putting anything more than that into a CI log.

## The destination is the one that catches people

A destination pointing at a tunnel is the most common not-ready finding, and
`destinations list` shows it plainly. The URL cannot be edited in place:
`destinations update` takes only `--active` and `--event-types`, so moving to
the production URL is delete and recreate, and **the new destination has a new
signing secret** that the handler has to be given. Do that before launch, not
during. See [local-development.md](local-development.md).

## Credentials before launch

- **Rotate anything that has been in a screen share, a log, or a chat.**
  `terra environments api-key rotate --env <dev-id> --reveal --yes` mints a new
  secret and returns it once, and the old one **stops working immediately**, so
  have the consumer ready to take the new value first.
- **Prefer data tokens to the legacy key** for anything unattended. They
  coexist, so rotation is mint-new then revoke-old with no cutover. See
  [credentials.md](credentials.md).
- **Check who holds an admin token.** `terra tokens list --json
token_id,name,created_by,scopes,expires_at,last_used_at` shows every token on
  the account, when it expires, and whether it is still used. Revoke what is
  not. This needs `tokens:admin`.

## After launch

Watch the first real traffic rather than assuming:

```sh
terra events list --env <dev-id> --outcome failed --paginate
terra users stats retrieve --env <dev-id>
```

`users stats retrieve` gives the trailing window's payload and byte volume,
per-provider connection counts, and the auth and deauth series, which is the
fastest read on whether the launch is producing what was expected.
