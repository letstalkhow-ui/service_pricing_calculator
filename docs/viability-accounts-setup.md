# Account and payment integration

This stage adds email-code sign-in, saved simulations, immutable report snapshots and entitlement-protected report access. Checkout is disabled by default. The migration has not been applied to a remote database. Local tests use provider stubs; they do not establish that PostgreSQL policies or merchant payment payloads work end to end.

## Preview setup

1. Identify the intended Supabase project and review its existing schema. Apply `supabase/migrations/20261023_viability_accounts.sql` through the migration tool. This migration creates new `bb_` tables and must run once.
2. Add encrypted Vercel preview variables for this feature branch: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, a cryptographically random `AUTH_RATE_LIMIT_SALT`, and `VIABILITY_APP_ORIGIN`. Never put the service role key in public assets or client code.
3. Set the Supabase email template to show `{{ .Token }}` for OTP sign-in. Configure custom SMTP before customer testing. The default Supabase sender is restricted. No real verification emails have been sent during implementation.
4. Redeploy the preview. Test email verification, session refresh, sign-out, save/resume, and cross-account access with test accounts. Verify RLS directly, report immutability and concurrent duplicate webhook transactions in PostgreSQL before enabling checkout.

## Payment activation remains pending

The report price has not been approved. Do not set a guessed price or enable live payments.

For sandbox testing only, configure `HANDYPAY_API_KEY` (`hp_test_...`), `HANDYPAY_WEBHOOK_SECRET`, an approved `VIABILITY_REPORT_AMOUNT_MINOR`, `VIABILITY_REPORT_CURRENCY`, and `VIABILITY_CHECKOUT_ENABLED=true`. Confirm that the approved currency and its minor-unit convention are supported by the merchant account.

Register `/api/viability-payment-webhook` with HandyPay. HMAC validation uses the exact raw request body and `X-HandyPay-Signature`. A browser return never grants access. The server re-fetches settled payment details and checks the stored session, amount, currency and mode before calling the atomic purchase function.

Confirm the merchant's actual event payload includes a canonical `payment_intent` reference and that refund/dispute events use the expected shape. HandyPay's published session schema does not promise that reference. Missing references fail closed and require reconciliation. Current policy revokes access on any `charge.refunded` (including partial refunds) or `charge.dispute.created`; confirm this commercial policy before activation. Test duplicate, reordered, delayed, invalid-signature and mismatched-amount events. A refund received before payment finalization returns a retryable error.

Live checkout additionally requires the production environment, a live key and explicit `VIABILITY_LIVE_PAYMENTS_ENABLED=true`. These flags alone do not replace the pending merchant and database tests. Production configuration has not been changed.

## Snapshot and data behavior

Saved simulation inputs are editable by their owner. Purchase inputs are revalidated on the server and public country data is fetched independently. Purchased reports are stored separately, have no authenticated update privilege, and have an update-blocking trigger. Refunds revoke the entitlement without rewriting the report. Clients query report data with the user's token; RLS requires both ownership and an active entitlement. The service role is reserved for rate limits, private orders and atomic payment transactions.

Operational follow-up: add scheduled expiry cleanup for old rate-limit buckets and abandoned checkout orders, payment reconciliation alerts, and retention/deletion procedures before public launch. If checkout creation fails after the pending order is stored, that order stays private and does not grant access.
