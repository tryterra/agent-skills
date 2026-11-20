# Debug a webhook that did not arrive

Read when a webhook never arrived, arrived with the wrong body, or has to be
resent. This is the delivery history the dashboard shows, and it is the fastest
answer to "did Terra API send it, or did my handler drop it?".

`terra events` needs `events:read`, and reading a payload needs the separate
`payloads:read` scope. Both are in the default login grant. Everything is
scoped to one environment.

## The window

**Events are kept 30 days, and their payloads about 14.** `events list` looks
back 7 days unless `--since` moves it, or 14 with `--event-id`. An empty result
outside the window is not proof nothing was sent. Say so rather than concluding
the integration is broken.

## 1. Find the event

```sh
terra events list --env <dev-id> --status failed
terra events list --env <dev-id> --user-id <uuid> --type unified_api.sleep.updated
terra events list --env <dev-id> --reference-id user-42
terra events list --env <dev-id> --provider GARMIN --since <rfc3339> --until <rfc3339>
```

Filters compose: `--status pending|delivered|failed|canceled`, `--type`
(an event type such as `unified_api.sleep.updated`, or a wildcard such as
`'unified_api.auth.*'`), `--provider`, `--user-id`, `--reference-id`,
`--destination`, `--since`, `--until`, and `--event-id` for an exact lookup.
`--type` and `--provider` repeat to match any of several. Each row is one
event: `event_id`, `type`, `payload_type`, `provider`, `user_id`,
`reference_id`, `status`, `destination_count`, `attempt_count`, `created_at`
and `completed_at`. The row's `status` covers every destination the event went
to; `pending` means retries are still running.

Add `--paginate` to walk the whole window, and `--max-pages 0` to lift the
10-page cap. Narrow with `--select` rather than reading whole rows:

```sh
terra events list --env <dev-id> --status failed --paginate \
  --select event_id,type,user_id,provider,attempt_count,created_at
```

## 2. Read the verdict

The HTTP detail is per destination, on the event itself:

```sh
terra events retrieve <event_id> --env <dev-id>
```

It returns one entry in `deliveries` per destination (`destination_id`,
`destination_url`, `status`, `last_status_code`, `no_status_reason`), each with
its `attempts` (`status_code`, `duration_ms`, `not_sent_reason`).

| What you see                                      | What it means                                                                                                                                                                                                                                                  | Next                                                                                                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No rows at all, inside the window                 | Either nothing was generated, or nothing was attempted. Check the destination before blaming generation: an inactive destination, or one narrowed with `event_types` that exclude this type, produces no rows for a user who is generating data perfectly well | `terra unified-api destinations list --env <dev-id> --select id,active,event_types`, then `terra unified-api sources list`, `terra users list --user-id <uuid>` |
| `status` `delivered`                              | Terra API sent it and the destination accepted it. The problem is in the handler or downstream of it                                                                                                                                                           | Compare `terra events retrieve-payload` against what the handler stored                                                                                         |
| `status` `pending`                                | At least one destination is still being retried                                                                                                                                                                                                                | Read the delivery's latest attempt; fix the handler and the retries may land on their own                                                                       |
| A delivery with a 4xx `last_status_code`          | The handler rejected it. A 401 or 403 usually means signature verification is failing                                                                                                                                                                          | Check the signing secret against `terra unified-api destinations list`                                                                                          |
| A 5xx `last_status_code`, or a long `duration_ms` | The handler was down or too slow when Terra API called                                                                                                                                                                                                         | Fix the handler, then resend                                                                                                                                    |
| No `last_status_code`, with a `no_status_reason`  | Nothing answered: a dead tunnel, a localhost URL, or a wrong host. The reason says which                                                                                                                                                                       | `terra unified-api destinations list --env <dev-id>`                                                                                                            |
| No destination configured at all                  | Nothing was ever attempted                                                                                                                                                                                                                                     | `terra unified-api destinations create`                                                                                                                         |

## 3. Read what was actually sent

```sh
terra events retrieve <event_id> --env <dev-id>
terra events retrieve-payload <event_id> --env <dev-id>
```

`events retrieve` is the delivery record from step 2. `events retrieve-payload` is the
body Terra API tried to deliver, content-addressed by event id and retained
separately. That body is the ground truth for "the payload was missing a
field": if the field is absent there, the cause is the environment's data
scopes rather than the handler.

## 4. Resend

```sh
terra events resend --env <dev-id> \
  --event-id <event_id> --destination-id <destination_id>
```

A resend goes to one destination: take `--destination-id` from the event's
`deliveries` in `events retrieve`. The destination must be active and accept
the event's type. Fix whatever made the first delivery fail before resending,
because a resend into a still-broken handler just adds another failed attempt.
The payload must still be retained, so an event older than about 14 days
cannot be resent.

The call answers 202: the event is queued rather than delivered, so the reply
says nothing about the outcome, and the destination may receive the event
twice under the same `event_id`. Check it afterwards:

```sh
terra events retrieve <event_id> --env <dev-id>
```

Preview it with `--dry-run` when the event or destination id came from a guess
rather than a listing.

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
