# Production configuration and recovery checklist
Prepared 24 November 2026. Planning only; no production configuration or live activation performed.

## Hosting decision first
Vercel Hobby is restricted to personal/non-commercial use. Technical deployment success does not establish eligibility for BusinessBoosts commercial hosting.
Official sources: https://vercel.com/docs/limits/fair-use-guidelines and https://vercel.com/docs/plans/hobby.
The user's constraint remains no additional hosting spend. Evaluate a commercially permitted free hosting alternative and migration effort before proposing an upgrade. No paid plan is authorized.

## Configuration inventory, validated against lib/viability-platform.js
| Setting | Required production value or handling |
| --- | --- |
| SUPABASE_URL, SUPABASE_ANON_KEY | Intended project; verify account and report ownership policies |
| SUPABASE_SERVICE_ROLE_KEY | Server-only secret; never browser code or logs |
| AUTH_RATE_LIMIT_SALT | Server-only random secret |
| VIABILITY_APP_ORIGIN | Exact approved HTTPS application origin |
| HANDYPAY_API_KEY | Live key only during separately approved live setup |
| HANDYPAY_WEBHOOK_SECRET | Signing secret for the specific live callback |
| VIABILITY_REPORT_AMOUNT_MINOR | 1900 |
| VIABILITY_REPORT_CURRENCY | usd |
| VIABILITY_CHECKOUT_ENABLED | false until activation approval |
| VIABILITY_LIVE_PAYMENTS_ENABLED | false until activation approval |
| VERCEL_ENV | Current code requires production for live payments; adapt explicitly if hosting changes |
| VIABILITY_SANDBOX_CALLBACK_URL | Not a production callback; current Supabase receiver deliberately rejects live events |
| BREVO_API_KEY, BREVO_SENDER_EMAIL | Verify production scope independently; preview key success does not validate production |
| BB_MONITOR_SECRET | Server-only; current monitor is preview-only and requires a reviewed production implementation |

Keep credentials out of this document. Do not copy preview configuration wholesale. Current session cookies require HTTPS and are host-specific.

## Production verification before approval
- Resolve hosting eligibility and stable domain.
- Review existing database migrations, RLS, immutable report snapshots and backup/recovery procedure.
- Verify email sign-in, live browser token renewal, logout and cross-account isolation.
- Register the correct production callback separately; prove reachability and signed-event rejection/acceptance. Do not remove application protection globally.
- Verify $19 USD, checkout return origin, payment-to-order identity, webhook idempotency and report unlock.
- Close provider replay/dispute verification and missed-refund reconciliation gaps.
- Prepare production monitoring; the current hourly endpoint is pinned to a verified preview and does not run the on-demand dispute review.
- Address Brevo's observed 90-day inactivity expiry; no keepalive email is scheduled.
- Obtain explicit live-activation approval, then agree a limited real-payment validation and check eventual net MUR payout.

## Recovery procedures
| Symptom | Evidence and next action |
| --- | --- |
| Scheduler reports succeeded | Inspect pg_net HTTP response and monitor row too; cron success means request submission only |
| Alert failed | Inspect sanitized provider status; verify key scope/expiry and sender configuration before retry |
| Alert sending/unknown | Delivery is uncertain; review provider delivery logs before resending. A retry can duplicate an accepted email |
| Paid customer has no report | Verify owner, order, canonical payment reference, amount, currency, mode and merchant evidence; inspect callback history. Never grant access from a browser success URL |
| Refund/dispute differs from local access | Compare merchant evidence and audit records; preserve purchased snapshot. Use reviewed idempotent repair only after mismatch is established |
| Provider unavailable | Report incomplete reconciliation; do not label the account clean or change access |
| Checkout incident | Disable new checkout through approved deployment; keep verified callbacks/report access operational for existing purchases |
| Credential exposure | Rotate the affected credential in its owning service, update scoped server secrets and redeploy; verify without logging values |
| Session renewal fails | Capture sanitized status and cookie behaviour; never ask for tokens/passwords in chat |

## Current boundaries
163 automated tests passed. Sandbox partial and full refunds verified. On-demand dispute review returned HTTP 200 with zero disputes; genuine dispute matching remains fixture-tested only. No refund-history read endpoint was found in the inspected HandyPay OpenAPI contract.
Daily rate-limit cleanup is active at 04:43 Mauritius, retaining seven days, max 1000 counters per run, skipping a busy table. Financial records are not cleanup targets.
