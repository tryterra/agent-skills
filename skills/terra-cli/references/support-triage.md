# Triage a report about one user

Read when someone says a specific user's data is missing, late, or wrong. The
goal is to place the fault: the provider, Terra API, delivery, or the handler.

Work down the list. Each step rules out a layer, and stopping early is the
point.

## 1. Does the connection exist and is it live

```sh
terra users list --env <dev-id> --reference-id <your id for them>
terra users list --env <dev-id> --user-id <uuid>
```

Nothing means the user never finished auth. `active: false` means the provider
is no longer authorizing the connection, which is the answer to most "their
data just stopped" reports: it is a reauthentication problem, not a data one.
`most_recent_data_at` on the row says when anything last arrived.

If the connection is missing or inactive, read the auth event for the reason:

```sh
terra events list --env <dev-id> --reference-id <ref> --data-type auth
```

## 2. Can that provider even supply this data type

```sh
terra data-api /integrations/detailed
```

Each provider carries `enabled` and a `types` object of booleans (`activity`,
`sleep`, and so on). A provider that does not report sleep will never send
sleep, however healthy the connection is. Check this before digging further:
it is the cheapest way to close a report that is really a coverage question,
and it needs no user id.

Then check the environment is asking for the type at all:

```sh
terra unified-api data scopes list --env <dev-id>
```

## 3. What does Terra API hold

```sh
terra data-api /sleep -q user_id=<uuid> -q start_date=<date> -q to_webhook=false
```

`to_webhook=false` is required or the response goes to the destination and you
get an acknowledgement back instead of data. This is Terra API's own view,
independent of anything that was delivered. Empty here means the provider never
supplied it, so the report is upstream.

## 4. What was actually delivered

```sh
terra events list --env <dev-id> --user-id <uuid> --data-type sleep
terra events payload retrieve <event_id> --env <dev-id>
```

Now compare three things: what the provider gave (step 3), what was delivered
(the payload), and what the handler stored. The mismatch names the layer.

| Step 3 has it | Payload has it           | Verdict                                                                                                |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| No            | No                       | The provider never sent it. Coverage, reauthentication, or the user simply has no data for that window |
| Yes           | No                       | The environment's data scopes are dropping the field. `terra unified-api data scopes list`             |
| Yes           | Yes, handler does not    | The handler. Replay the event at it and watch: see [local-development.md](local-development.md)        |
| Yes           | Yes, and delivery failed | Delivery. See [webhook-debugging.md](webhook-debugging.md)                                             |

## The window

Delivery history and payloads are retained about **14 days**. A report about
something older cannot be answered from `events`, and an empty result is not
evidence that nothing was sent. Say that rather than concluding the integration
is broken. Step 3 still works, because it reads the provider data rather than
the delivery record.

## Handling the user's data

Anything printed here is a real person's health data. Report the shape and the
verdict, not the payload: say which fields are missing, not what the values
were, and do not paste a payload into a ticket, a commit, or a file the user
did not ask for.
