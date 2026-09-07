# Billing, usage, and entitlements

Read when asked what an account is being charged, why a bill moved, or whether
a product is even on the account.

Everything here needs `billing:read` or `entitlements:read`, both in the
default login grant. `billing:write` is dangerous, excluded by default, and
spends money: `terra billing subscriptions create` is a purchase, so never run
it to "check" anything, and confirm with the user before running it at all.

## Is the product even on the account

```sh
terra entitlements list --json capability,source
```

This is the check behind **exit code 5**, which means the product is not on the
account rather than the command being wrong. Run it before concluding that an
endpoint is broken. Note the admin API does not yet report the missing-product
case separately everywhere, so an unsubscribed product can still surface as
exit 1.

## What is the account being charged

```sh
terra billing subscriptions list --json id,status,collection_method,cancel_at_period_end
terra billing invoices upcoming retrieve --json amount_due,currency,status
terra billing invoices list --json id,created_at,amount_due,currency,status
terra billing payment-method retrieve --json brand,last4,exp_month,exp_year,has_card
```

`invoices upcoming retrieve` is the preview of the next bill, which is the one
people actually want when they ask what they will be charged. Both invoice
commands also return `hosted_invoice_url` and `invoice_pdf` for the human
copies.

`payment-method retrieve` is masked, so it needs no `--reveal`. `has_card`
false on an account with an upcoming invoice is worth flagging.

## Where the usage came from

```sh
terra billing usage retrieve --meter-id <meter_id> --start <int> --end <int>
```

All three parameters are required, and **no command lists meters**: `meter_id`
appears in this endpoint's own response and nowhere else on the admin surface,
so the id has to come from the billing record or from your Terra API contact.
Without one, report that rather than guessing an id.

`start` and `end` are integers the description does not further define. The
response echoes both back alongside `total_usage` and a `summaries` breakdown,
so read the echoed window to confirm the range the CLI actually sent. Use
`--dry-run` to check the request before a wide query; it prints what would be
sent and never reaches the API, so it tells you nothing about the response.

To connect a number to the integration that produced it, read the environment's
own volume:

```sh
terra users stats retrieve --env <dev-id> --format json
```

That gives cumulative payload and byte volume, per-provider connection counts,
and the device, auth and deauth series over a trailing three months by default,
with `--since` and `--until` to narrow it. A bill that moved usually has a
matching step in one of those series: a provider enabled, a backfill run, or a
cohort of users connecting.

A backfill is worth calling out, because it is easy to do by accident.
Requesting a date range through `terra data-api` **without**
`-q to_webhook=false` sends the whole range to the destination, and that is
metered traffic. See [data-api.md](data-api.md).

## Reporting it

Give the number, the window it covers, and what moved, rather than a dump of
the invoice document. `--json` narrows the response to the fields you name and
is refused before the request is sent if a field does not exist, so it is also
a way to check what a response contains: run it with no value to list the
available fields.

Say plainly when a question is outside what these commands answer. Contract
terms, custom pricing and disputes are a Terra API support conversation, not a
CLI one.
