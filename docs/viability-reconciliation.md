# Payment reconciliation runbook

Run `tests/viability-reconciliation-check.sql` from the trusted database console before launch and during payment support investigations. It is read-only, returns counts by payment mode, and never grants or revokes access.

Investigate paid orders without an active report, revoked or fully refunded orders with active access, missing payment references, and pending orders older than 24 hours. An old pending order may be abandoned; do not mark it paid or failed based on age.

For each finding, inspect the private order and verified merchant payment session. Compare original amount, currency, mode, canonical payment reference and cumulative refunds. Check callback failures and event history. Correct access only after confirming the merchant evidence; preserve the original report snapshot and audit trail.

A zero-row result means these database checks found no candidates. It does not prove webhook delivery, detect refunds whose callbacks never arrived, or reconcile merchant settlements and bank payouts. Provider-side comparison and automated alert delivery remain required before public launch.

Verification: 26 October 2026, current sandbox database returned zero findings. Live payments remain disabled.

Browser verification: account reload hid the fully refunded report; sign-out cleared account content; reload stayed signed out. Automatic token renewal has server-test coverage but still needs a live browser check.
