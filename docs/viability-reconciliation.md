# Payment reconciliation runbook

Run `tests/viability-reconciliation-check.sql` from the trusted database console before launch and during payment support investigations. It is read-only, returns counts by payment mode, and never grants or revokes access.

Investigate paid orders without an active report, revoked or fully refunded orders with active access, missing payment references, and pending orders older than 24 hours. An old pending order may be abandoned; do not mark it paid or failed based on age.

For each finding, inspect the private order and verified merchant payment session. Compare original amount, currency, mode, canonical payment reference and cumulative refunds. Check callback failures and event history. Correct access only after confirming the merchant evidence; preserve the original report snapshot and audit trail.

A zero-row result means these database checks found no candidates. It does not prove webhook delivery, detect refunds whose callbacks never arrived, or reconcile merchant settlements and bank payouts. Provider-side comparison and automated alert delivery remain required before public launch.

Verification: 26 October 2026, current sandbox database returned zero findings. Live payments remain disabled.

Browser verification: account reload hid the fully refunded report; sign-out cleared account content; reload stayed signed out. Automatic token renewal has server-test coverage but still needs a live browser check.


Operator provider comparison: run `node scripts/check-viability-payments.cjs` in a trusted environment with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HANDYPAY_API_KEY and explicit BB_RECONCILIATION_MODE=test or live. Never place credentials in command arguments or client code. The key prefix must match the selected mode. The script pages through orders, performs read-only session lookups, compares original metadata/amount/currency/session identity, and emits order IDs and issue codes only. Exit code 0 means no checkout settlement findings, 2 means findings, 1 means incomplete execution. No entitlement writes occur. Run during a quiet period because offset pagination is not a consistent database snapshot.

This operator script has fixture coverage but has not yet run against the merchant account. All 144 local tests pass. No schedule, alert destination, refund/dispute provider comparison, or live activation is configured by this addition.
