# Account and payment integration

This stage adds email-code sign-in, saved simulations, immutable report snapshots and entitlement-protected report access. Checkout is disabled by default. The migration was applied to the free `businessboosts-viability` Supabase project (`bfftokfwhhzeoxqtkycv`, Mumbai). Transactional database checks passed for owner access, cross-account isolation, duplicate purchase finalization, report immutability and entitlement revocation. All synthetic records were rolled back. Real email-code delivery, verification, authenticated account listing, saving a sample simulation and reopening its inputs were verified in the deployed preview on 23 October 2026. Genuine sandbox checkout completion and owner report access passed on 26 October 2026; merchant duplicate delivery remains unverified; genuine refund delivery and access revocation passed.

## Connection status

Preview-branch configuration now includes the API URL, legacy anon key, random rate-limit salt and application origin. The server-only service-role key is saved as a Vercel Secret scoped to the preview branch. Brevo custom SMTP is enabled using the verified info@businessboosts.io sender. Both confirmation and magic-link templates now send {{ .Token }} codes. Checkout is enabled only on the feature preview branch in test mode; live checkout remains disabled. Security advisers reported informational notices only: private service tables deliberately have no client RLS policies; new indexes have not yet seen production traffic.

## Preview setup

1. Identify the intended Supabase project and review its existing schema. Apply `supabase/migrations/20261023_viability_accounts.sql` through the migration tool. This migration creates new `bb_` tables and must run once.
2. Add encrypted Vercel preview variables for this feature branch: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, a cryptographically random `AUTH_RATE_LIMIT_SALT`, and `VIABILITY_APP_ORIGIN`. Never put the service role key in public assets or client code.
3. Set the Supabase email template to show `{{ .Token }}` for OTP sign-in. Configure custom SMTP before customer testing. The default Supabase sender is restricted. A real verification email was delivered and its code successfully exchanged for an authenticated session.
4. The preview was redeployed and email sign-in plus save/resume passed. Remaining checks include session refresh, sign-out revocation behavior and concurrent payment delivery under merchant sandbox traffic. RLS ownership, report immutability and sequential duplicate purchase finalization were verified directly in PostgreSQL. A clearly labelled QA sample: MoveWell Studio draft remains in the test account for review.

## Sandbox connection status

The dedicated HandyPay test key was saved as `HANDYPAY_API_KEY`, a Vercel Secret scoped only to `feature/viability-simulator-v1`. No live key was used. Checkout is enabled only on the feature preview branch in test mode; live checkout remains disabled. A dedicated Supabase sandbox webhook has now been registered as described below.

Initial sandbox checks and subsequent resolution:

- Initial scratch-server check: a server GET to the documented HandyPay `/api/v1/webhook-endpoints` API, authenticated with the test key, returned HTTP 403 and `error code: 1010` instead of the documented JSON response. The credential was not validated by a successful API response. Do not treat this as proof of an invalid key. A subsequent documented request from the deployed Vercel backend returned HTTP 200 and success:true on 23 October 2026. The sandbox credential is now validated from the application backend. This does not establish which difference caused the earlier failure.
- An unauthenticated POST to the deployed preview payment webhook returned HTTP 401 with `Protected by Vercel Authentication`. Provider callbacks cannot pass that interactive login. A dedicated externally reachable callback, protected by the existing raw-body HMAC verification, must be configured before registration. Do not disable authentication for the whole application or place bypass credentials in webhook URLs.

The integration now explicitly requests application/json, sends Content-Type only with request bodies, and includes session_id={CHECKOUT_SESSION_ID} in its checkout success URL. A signed-in, rate-limited preview-only sandbox-api-check action verifies endpoint-list access without exposing provider payloads or keys. Preview commit 06d9aa7 passed all 109 existing tests and the deployed check returned HTTP 200 with a successful JSON envelope.

The initial API check did not prove payment completion. The genuine sandbox payment and report unlock were subsequently verified on 26 October 2026, as recorded below.

## Dedicated sandbox callback

A sandbox-only Supabase Edge Function, `viability-payment-webhook`, is deployed in project `bfftokfwhhzeoxqtkycv`. Its callback URL is `https://bfftokfwhhzeoxqtkycv.supabase.co/functions/v1/viability-payment-webhook`. This avoids the Vercel preview login gate without changing application protection. An unauthenticated POST reached the handler and returned its own HTTP 401 `Invalid payment signature.` response, with an Edge execution ID. The Vercel authentication barrier is therefore resolved for this dedicated receiver; genuine sandbox merchant delivery subsequently passed on 26 October 2026.

The function uses the same shared payment verifier as the Vercel handler. It re-fetches settled sessions, matches order/session/amount/currency/mode, requires canonical payment intent references, and delegates idempotency and immutable report creation to the existing database RPC. The sandbox receiver rejects live keys/events and checks test-order ownership before refund/dispute revocation. All 116 local tests passed, including unsigned/wrong-signature, oversized-body, live-mode rejection, verified purchase, and live-order refund isolation cases.

Activation requires Supabase Edge Function secrets `BB_HANDYPAY_TEST_KEY` (a dedicated hp_test_ key), `BB_HANDYPAY_WEBHOOK_SECRET` (the secret returned when this callback is registered with HandyPay), and `BB_SANDBOX_WEBHOOK_ENABLED=true`. Supabase supplies SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the function. All three secrets are now configured. Sandbox checkout is now enabled only in the feature preview; live checkout remains disabled.

The existing Vercel test key remains a non-readable Sensitive variable. A dedicated HandyPay test key named BusinessBoosts Supabase Sandbox Callback was created by the user and stored only in Supabase secrets. HandyPay registered callback ID `f85e2827-cee3-46ca-ae4f-58a5be92d2f3` for checkout completion, asynchronous success, refund and dispute-created events. Its one-time signing secret was saved in Supabase without printing it or committing it to source.

On 23 October 2026, a harmless locally signed `bb.signature_probe` event reached the deployed callback and returned HTTP 200 with `received:true, ignored:true`. Changing the body while retaining that signature returned HTTP 401 `Invalid payment signature.` An unsigned POST also returned HTTP 401. These prove signature configuration and rejection behavior, not a genuine HandyPay delivery, settled payment or report unlock.

The temporary registration helper `viability-webhook-setup` retained platform JWT verification throughout. The eventual administrator check also proved service-only database RPC access before registration. After registration, its setup flag was set false and the deployed function was replaced with an unconditional disabled response while retaining verify_jwt=true. Automatic review rejected a proposed verify_jwt=false change to this helper; that proposal was not used. No platform authentication bypass or Vercel protection change was required. Temporary credential variables and the key display were cleared/closed.

No production key, real payment or paid plan was used. Genuine sandbox completion and report access are now verified. Merchant duplicate delivery remains unverified; genuine refund delivery and access revocation passed.

## Preview checkout verified

On 26 October 2026, checkout was enabled only for the feature preview branch with the pinned external sandbox callback URL. The configuration requires a test key and VERCEL_ENV=preview to use this callback arrangement; production/live activation requirements remain unchanged. The checkout return URL uses the request origin only after it passes the existing trusted-origin check, keeping customers on the preview that created their order. All 117 tests passed.

The signed-in QA sample created sandbox order `ea5bd54e-7a81-4b3d-a9d4-5efa344e45d6`, amount 1900 USD minor units. Its provider checkout session was stored successfully, and the hosted checkout visibly showed Sandbox and $19.00. Stripe's order-summary tool confirmed livemode=false and totalAmount=1900. Only Stripe's published 4242 test card and fictitious billing details were entered; saving payment information was deselected.

The user performed the final Pay action on 26 October 2026 after automatic browser review required user submission. No alternate agent submission route was attempted. The genuine provider callback finalized the order as paid in test mode, recorded its payment intent reference, and created one report with an active entitlement. Database inspection found one processed payment event for this order. Report `201a560b-81b2-46a8-8cc4-edb91ffc3875` was created at 06:16:46 UTC. The account displayed “Payment verified. Your report is listed below.” Opening the report rendered the purchased report and its fixed purchase snapshot successfully.

This verifies checkout creation, user sandbox payment, genuine callback processing, order finalization, entitlement creation and owner report access. The purchase test alone does not establish duplicate-delivery, refund/dispute or live payout behavior; the subsequent refund result is recorded below. No real money was charged; production/live payments remain disabled.

## Duplicate and revocation checks

On 26 October 2026, a rollback-only database transaction tested the completed sandbox order. Repeating its original finalization returned the same report without duplication. Refund revocation disabled its entitlement; repeating that refund succeeded safely. An authenticated owner query could no longer see the refunded report. The stored report snapshot stayed unchanged, and a late success notification was rejected rather than restoring access. The transaction was rolled back and the order was rechecked as paid with one active entitlement and one original event. All 22 focused account/webhook tests passed.

These are database and local handler checks, not genuine provider redelivery/refund tests. After user sign-in and user submission of the full $19 sandbox refund, a genuine charge.refunded notification arrived at 06:33:38 UTC on 26 October 2026. The order changed to revoked, its entitlement became inactive, and reopening the report showed Report unavailable. The merchant transaction detail still displayed Completed after refresh, so its displayed status alone is not a reliable refund check. Provider redelivery remains unverified. A stale loading notice on denied report access was corrected in source.

## Payment activation remains pending

Approved launch price: US$19 per full saved report, one-time purchase. BusinessBoosts absorbs processing and applicable conversion/banking charges. Preview configuration stores 1900 minor units and usd; sandbox checkout is enabled only on the feature preview branch for sandbox verification. Check the first live payout for actual net MUR received and review pricing after 20–30 purchases. No automatic price change is authorized. Do not enable live payments before launch verification.

For sandbox testing only, configure `HANDYPAY_API_KEY` (`hp_test_...`), `HANDYPAY_WEBHOOK_SECRET`, an approved `VIABILITY_REPORT_AMOUNT_MINOR`, `VIABILITY_REPORT_CURRENCY`, and `VIABILITY_CHECKOUT_ENABLED=true`. Confirm that the approved currency and its minor-unit convention are supported by the merchant account.

Register `/api/viability-payment-webhook` with HandyPay. HMAC validation uses the exact raw request body and `X-HandyPay-Signature`. A browser return never grants access. The server re-fetches settled payment details and checks the stored session, amount, currency and mode before calling the atomic purchase function.

The successful sandbox purchase recorded its canonical `payment_intent` reference. The genuine refund event shape passed; dispute delivery remains unverified. HandyPay's published session schema does not promise that reference. Missing references fail closed and require reconciliation. Approved policy (26 October 2026): partial refunds retain report access; full refunds remove access. Multiple partial refunds totalling the full payment must remove access. Dispute handling remains unchanged. The sandbox callback now uses `bb_record_refund` to retain access on partial refunds and revoke it when cumulative refunds equal the original amount. Missing/inconsistent amounts fail for reconciliation. A real callback against this new handler and cumulative provider behavior still need verification before live activation. Test duplicate, reordered, delayed, invalid-signature and mismatched-amount events. A refund received before payment finalization returns a retryable error.

Live checkout additionally requires the production environment, a live key and explicit `VIABILITY_LIVE_PAYMENTS_ENABLED=true`. These flags alone do not replace the pending merchant and database tests. Production configuration has not been changed.

## Snapshot and data behavior

Saved simulation inputs are editable by their owner. Purchase inputs are revalidated on the server and public country data is fetched independently. Purchased reports are stored separately, have no authenticated update privilege, and have an update-blocking trigger. Refunds revoke the entitlement without rewriting the report. Clients query report data with the user's token; RLS requires both ownership and an active entitlement. The service role is reserved for rate limits, private orders and atomic payment transactions.

Operational follow-up: add scheduled expiry cleanup for old rate-limit buckets and abandoned checkout orders, payment reconciliation alerts, and retention/deletion procedures before public launch. If checkout creation fails after the pending order is stored, that order stays private and does not grant access.

## Pre-launch review, 26 October 2026

The inspected HandyPay developer menu and public API reference expose no provider replay control or replay endpoint. Provider redelivery remains an explicit verification gap, not a completed test. Do not create another payment or refund merely to imitate redelivery.

All 123 local tests passed. Additional handler tests cover refund/dispute delivery before reconciliation, stable event identity and raw-body hashes across repeated requests, retryable database failures without internal-detail leakage, and rejection of refunds without canonical payment references. Database idempotency was verified separately in rollback-only transactions; mocked handler tests do not replace merchant-delivery verification.

Remaining release gates:
- Resolve provider replay/dispute verification and complete signed-in session refresh/sign-out checks.
- Complete genuine callback verification against the updated partial-refund handler, including a second partial refund and cumulative full refund. The first observed payload matches the Stripe charge schema, but cumulative behavior across multiple HandyPay refunds remains a provider verification gate.
- Complete payment reconciliation monitoring, rate-limit expiry cleanup, and retention/deletion procedures.
- Configure and verify the production callback and live credentials separately. The deployed Supabase callback deliberately rejects live payments; it cannot be reused unchanged for launch.
- Perform a limited live validation only after explicit activation approval, then target the first 10 paid reports at US$19 each. This is US$190 gross before processing, conversion and bank charges; no revenue is guaranteed.

## Partial refund implementation, 26 October 2026

A new $19 sandbox purchase completed at 12:05:37 UTC, order `353dffc1-506f-49da-ab4b-f794096ca055`, report `3e7ba192-0862-4f80-894c-78fcf782928b`. Its genuine $5 refund callback at 12:15:32 UTC supplied `amount:1900`, `amount_refunded:500`, `refunded:false`, `currency:usd`, `status:succeeded`, event `evt_3UUmedHfTENfmdQ00qcle6ml`. These allowlisted fields were logged only after valid HMAC and a match to that designated sandbox order; no customer payload or credentials were logged. The legacy rule revoked access. After deployment, a guarded one-off correction restored access and recorded the observed 500 minor units on this order/event only. This correction is not claimed as a real callback test of the new handler.

Migration `20261026121809_viability_partial_refunds.sql` adds cumulative totals and a service-only atomic RPC. Order locking, event/hash conflict checks and greatest-observed-total prevent double counting or regression. Partial events never reactivate revoked access. Payload validation checks integer amounts, currency, charge status and consistency of the full-refund flag; the database matches amount/currency/mode against the original order. Disputes still revoke. Edge Function version 8 is active, sandbox only, with unchanged HMAC authentication.

All 138 local tests pass. `tests/viability-refund-database.sql` passed against the sandbox order inside a rolled-back transaction: partial retention, duplicate delivery, hash conflict, currency/mode mismatch, cumulative and stale events, full refund, later partial after full refund, dispute, and immutable snapshot. Function permissions checked: anon/authenticated cannot execute; service_role can. Security advisors show no new findings: service-only tables intentionally have RLS and no user policies; leaked-password protection remains the previously documented free-plan limitation.

The amount interpretation matches the official charge reference: https://docs.stripe.com/api/charges/object . HandyPay's own published webhook contract still lacks these fields. A further $1 sandbox refund is being prepared to verify the real cumulative total becomes 600 and access stays active. Full cumulative provider verification remains pending. Live payments remain disabled. Remove the temporary designated-order diagnostic after provider verification.
