# Viability simulator release status — 24 November 2026

This current checklist supersedes historical pending statements in viability-accounts-setup.md and viability-reconciliation.md. Live payments remain disabled. Price remains US$19; no paid infrastructure was added.

## Verified
- 157 local automated tests passed on 24 November: financial engines, form validation, report snapshots, account isolation, payment/webhook validation, reconciliation and alert outcomes.
- Genuine sandbox checkout and owner report unlock passed on 26 October.
- Genuine partial refunds retain access; cumulative full refunds revoke access. The $5 + $1 + $13 sequence was verified against a $19 sandbox purchase.
- Account reload hid the fully refunded report; sign-out and reload stayed signed out. Automatic token renewal has server test coverage, but a live browser renewal remains unverified.
- Read-only database integrity query returned no findings on 24 November. This is not evidence of merchant payout or missed-refund reconciliation.
- User confirmed receipt of the Brevo test email on 24 November.
- Updated deployed alert handler returned HTTP 200 and persisted accepted status for a test at 11:39 UTC on 24 November.
- Private monitor records track sending, accepted, failed, unknown and suppressed. Accepted means provider acceptance, not inbox delivery.
- Identical aggregate findings are suppressed for 24 hours after acceptance. Changed aggregates can alert immediately. Concurrent/uncertain attempts suppress matching findings for one hour; confirmed rejection permits retry on a later run. Test emails do not suppress real alerts.
- 11 alert endpoint tests and rollback-only database claim tests passed. Anonymous/authenticated users cannot execute the claim RPC or read monitor records.
- Hourly database checks are active at :17. Hourly alert job is active at :19 and pinned to the verified 24hynauqd preview deployment.

## Remaining release gates
1. Observe a scheduled HTTP response from the updated deployment. At 11:41 UTC on 24 November, the next run is 12:19 UTC / 16:19 Mauritius. Cron success alone proves request submission, not HTTP/email success.
2. Verify live browser session renewal; provider logout fixtures and earlier browser sign-out are distinct checks.
3. Resolve merchant replay/dispute verification. Database/local idempotency tests passed; they do not prove provider redelivery. Do not create extra purchases just to imitate replay.
4. Establish an operational comparison for missed provider refunds/disputes. Current automated monitor checks local database integrity only.
5. Add bounded cleanup of expired rate-limit records and define retention/deletion procedures. Do not delete financial audit records or infer failed payments from old pending orders.
6. Address Brevo key expiry after 90 days of inactivity. Clean monitor runs do not contact Brevo; no recurring test email has been configured.
7. Prepare production-specific credentials, callback and monitoring. Current alert handler is preview-only; current Supabase callback rejects live events. Preview success does not activate or validate production.
8. Require explicit approval before live activation and a limited real-payment/payout validation.

## Operational limits
Duplicate prevention compares aggregate mode/issue/count findings, not individual order identities. A different affected order with the same aggregate may wait until the daily reminder. This is alert-noise reduction, not an exactly-once delivery guarantee: a network timeout or a failure to persist provider acceptance can leave delivery uncertain. Review sending records older than one hour and unknown records.

Brevo API IP filtering was disabled by the user after dynamic egress blocked requests. This is account-wide. Restricted API-key permissions remain in effect.

Security advisors reported the existing leaked-password-protection warning and informational no-policy notices for intentionally private service tables; no new public access was added.
