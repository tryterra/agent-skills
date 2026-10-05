# Billing, usage, and entitlements

Read when asked what an account is being charged, why a bill moved, or whether
a product is even on the account.

Everything here needs `billing:read` or `entitlements:read`, both in the
default login grant. `billing:write` is dangerous, excluded by default, and
spends money: `terra billing subscriptions create` is a purchase, so never run
it to "check" anything, and confirm with the user before running it at all.

## Is the product even on the account

```sh
terra entitlements list --select capability,source
```

This is the check behind **exit code 5**, which means the product is not on the
account rather than the command being wrong. Run it before concluding that an
endpoint is broken. Note the admin API does not yet report the missing-product
case separately everywhere, so an unsubscribed product can still surface as
exit 1.

## What is the account being charged

```sh
terra billing subscriptions list --select id,status,collection_method,cancel_at_period_end
terra billing invoices previews
terra billing invoices list --select id,created_at,amount_due,currency,status
terra billing payment-method retrieve --select brand,last4,exp_month,exp_year,has_card
```

`invoices previews` previews every billable subscription without creating an
invoice or charging, which is the one people actually want when they ask what
they will be charged. Run `--select` with no value to see which fields each
response carries before narrowing it.

`payment-method retrieve` returns masked card details. `has_card`
false on an account with an upcoming invoice is worth flagging.

## Where the usage came from

```sh
terra billing usage retrieve
```

It takes no parameters: it returns the current live metered items, their
explicit measurement windows, daily usage in UTC, and exact price decimals.
Read the window from the response rather than assuming a calendar month.

To connect a number to the integration that produced it, read the environment's
own volume:

```sh
terra users stats --env <dev-id> --format json
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
the invoice document. `--select` narrows the response to the fields you name and
is refused before the request is sent if a field does not exist, so it is also
a way to check what a response contains: run it with no value to list the
available fields.

Say plainly when a question is outside what these commands answer. Contract
terms, custom pricing and disputes are a Terra API support conversation, not a
CLI one.
