# Debug a webhook that did not arrive

Read when a webhook never arrived, arrived with the wrong body, or has to be
resent. This is the delivery history the dashboard shows, and it is the fastest
answer to "did Terra API send it, or did my handler drop it?".

`terra events` needs `events:read`, and reading a payload needs the separate
`payloads:read` scope. Both are in the default login grant. Everything is
scoped to one environment.

## The window

**Delivery history and payloads are retained about 14 days.** An event older
than that is gone, and an empty result is not proof nothing was sent. Say so
rather than concluding the integration is broken.

## 1. Find the delivery

```sh
terra events list --env <dev-id> --outcome failed
terra events list --env <dev-id> --user-id <uuid> --data-type sleep
terra events list --env <dev-id> --reference-id user-42
terra events list --env <dev-id> --provider GARMIN --since <rfc3339> --until <rfc3339>
```

Filters compose: `--outcome delivered|failed`, `--data-type`, `--provider`,
`--user-id`, `--reference-id`, `--since`, `--until`, and `--event-id` for an
exact lookup, which defaults the window to the 14-day actionable range. Each
row carries `event_id`, `data_type`, `provider`, `http_status`, `sent_at`,
`destination_type`, `bytes` and `response_time_ms`. Note that the outcome is a
request filter, not a response field: read `http_status` on the row.

Add `--paginate` to walk the whole window, and `--max-pages 0` to lift the
10-page cap. Narrow with `--json` rather than reading whole rows:

```sh
terra events list --env <dev-id> --outcome failed --paginate \
  --json event_id,data_type,provider,http_status,sent_at
```

## 2. Read the verdict

| What you see                                                       | What it means                                                                                                                                                                                                                                                  | Next                                                                                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No rows at all, inside the window                                  | Either nothing was generated, or nothing was attempted. Check the destination before blaming generation: an inactive destination, or one narrowed with `event_types` that exclude this type, produces no rows for a user who is generating data perfectly well | `terra unified-api destinations list --env <dev-id> --json id,active,event_types`, then `terra unified-api sources list`, `terra users list --user-id <uuid>` |
| Rows under `--outcome delivered`                                   | Terra API sent it and the destination accepted it. The problem is in the handler or downstream of it                                                                                                                                                           | Compare `terra events payload retrieve` against what the handler stored                                                                                       |
| Failed rows with a 4xx `http_status`                               | The handler rejected it. A 401 or 403 usually means signature verification is failing                                                                                                                                                                          | Check the signing secret against `terra unified-api destinations list`                                                                                        |
| Failed rows with a 5xx `http_status`, or a long `response_time_ms` | The handler was down or too slow when Terra API called                                                                                                                                                                                                         | Fix the handler, then resend                                                                                                                                  |
| Failed rows with no `http_status` at all                           | Nothing answered: a dead tunnel, a localhost URL, or a wrong host                                                                                                                                                                                              | `terra unified-api destinations list --env <dev-id>`                                                                                                          |
| No destination configured at all                                   | Nothing was ever attempted                                                                                                                                                                                                                                     | `terra unified-api destinations create`                                                                                                                       |

## 3. Read what was actually sent

```sh
terra events retrieve <event_id> --env <dev-id>
terra events payload retrieve <event_id> --env <dev-id>
```

`events retrieve` is the delivery metadata. `events payload retrieve` is the
body Terra API tried to deliver, content-addressed by event id and retained
separately. That body is the ground truth for "the payload was missing a
field": if the field is absent there, the cause is the environment's data
scopes rather than the handler.

## 4. Resend

```sh
terra events resend --env <dev-id> \
  --event-id <event_id> --event-type sleep --user-id <uuid>
```

All three parameters are required: the event id alone does not identify the
resend. Take `--event-type` and `--user-id` from the `events list` row. Fix
whatever made the first delivery fail before resending, because a resend into a
still-broken handler just adds a second failed row.

The call answers 202: the event is queued rather than delivered, so the reply
says nothing about the outcome. Check it afterwards:

```sh
terra events retrieve <event_id> --env <dev-id>
```

Preview it with `--dry-run` when the event type or the user id came from a
guess rather than a listing.

## Related checks

- **Is the destination the one you think?**
  `terra unified-api destinations list --env <dev-id>`. A destination can be
  inactive, or narrowed with `--event-types` so it never receives this type.
- **Is the data type in scope?**
  `terra unified-api data scopes list --env <dev-id>`.
- **Is the user still connected?**
  `terra users list --env <dev-id> --user-id <uuid>`. A deauthenticated
  connection stops producing events.
- **Did the request reach Terra API at all?** `--show-headers` traces the
  request and response to stderr with credentials redacted, so the output is
  safe to paste into an issue.
