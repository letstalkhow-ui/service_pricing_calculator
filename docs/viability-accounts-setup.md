# Account and payment integration

This stage adds email-code sign-in, saved simulations, immutable report snapshots and entitlement-protected report access. Checkout is disabled by default. The migration was applied to the free `businessboosts-viability` Supabase project (`bfftokfwhhzeoxqtkycv`, Mumbai). Transactional database checks passed for owner access, cross-account isolation, duplicate purchase finalization, report immutability and entitlement revocation. All synthetic records were rolled back. Real email-code delivery, verification, authenticated account listing, saving a sample simulation and reopening its inputs were verified in the deployed preview on 23 October 2026. Merchant payment payloads remain unverified.

## Connection status

Preview-branch configuration now includes the API URL, legacy anon key, random rate-limit salt and application origin. The server-only service-role key is saved as a Vercel Secret scoped to the preview branch. Brevo custom SMTP is enabled using the verified info@businessboosts.io sender. Both confirmation and magic-link templates now send {{ .Token }} codes. Checkout remains disabled. Security advisers reported informational notices only: private service tables deliberately have no client RLS policies; new indexes have not yet seen production traffic.

## Preview setup

1. Identify the intended Supabase project and review its existing schema. Apply `supabase/migrations/20261023_viability_accounts.sql` through the migration tool. This migration creates new `bb_` tables and must run once.
2. Add encrypted Vercel preview variables for this feature branch: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, a cryptographically random `AUTH_RATE_LIMIT_SALT`, and `VIABILITY_APP_ORIGIN`. Never put the service role key in public assets or client code.
3. Set the Supabase email template to show `{{ .Token }}` for OTP sign-in. Configure custom SMTP before customer testing. The default Supabase sender is restricted. A real verification email was delivered and its code successfully exchanged for an authenticated session.
4. The preview was redeployed and email sign-in plus save/resume passed. Remaining checks include session refresh, sign-out revocation behavior and concurrent payment delivery under merchant sandbox traffic. RLS ownership, report immutability and sequential duplicate purchase finalization were verified directly in PostgreSQL. A clearly labelled QA sample: MoveWell Studio draft remains in the test account for review.

## Sandbox connection status

The dedicated HandyPay test key was saved as `HANDYPAY_API_KEY`, a Vercel Secret scoped only to `feature/viability-simulator-v1`. No live key was used. Checkout remains disabled and no merchant webhook has been registered.

Initial sandbox checks and subsequent resolution:

- Initial scratch-server check: a server GET to the documented HandyPay `/api/v1/webhook-endpoints` API, authenticated with the test key, returned HTTP 403 and `error code: 1010` instead of the documented JSON response. The credential was not validated by a successful API response. Do not treat this as proof of an invalid key. A subsequent documented request from the deployed Vercel backend returned HTTP 200 and success:true on 23 October 2026. The sandbox credential is now validated from the application backend. This does not establish which difference caused the earlier failure.
- An unauthenticated POST to the deployed preview payment webhook returned HTTP 401 with `Protected by Vercel Authentication`. Provider callbacks cannot pass that interactive login. A dedicated externally reachable callback, protected by the existing raw-body HMAC verification, must be configured before registration. Do not disable authentication for the whole application or place bypass credentials in webhook URLs.

The integration now explicitly requests application/json, sends Content-Type only with request bodies, and includes session_id={CHECKOUT_SESSION_ID} in its checkout success URL. A signed-in, rate-limited preview-only sandbox-api-check action verifies endpoint-list access without exposing provider payloads or keys. Preview commit 06d9aa7 passed all 109 existing tests and the deployed check returned HTTP 200 with a successful JSON envelope.

No successful checkout, webhook delivery, payment settlement or payment-triggered report unlock has been claimed. The next verification must use genuine sandbox provider responses and confirm payment intent references for refunds.

## Payment activation remains pending

Approved launch price: US$19 per full saved report, one-time purchase. BusinessBoosts absorbs processing and applicable conversion/banking charges. Preview configuration stores 1900 minor units and usd; checkout remains disabled pending sandbox verification. Check the first live payout for actual net MUR received and review pricing after 20–30 purchases. No automatic price change is authorized. Do not enable live payments before launch verification.

For sandbox testing only, configure `HANDYPAY_API_KEY` (`hp_test_...`), `HANDYPAY_WEBHOOK_SECRET`, an approved `VIABILITY_REPORT_AMOUNT_MINOR`, `VIABILITY_REPORT_CURRENCY`, and `VIABILITY_CHECKOUT_ENABLED=true`. Confirm that the approved currency and its minor-unit convention are supported by the merchant account.

Register `/api/viability-payment-webhook` with HandyPay. HMAC validation uses the exact raw request body and `X-HandyPay-Signature`. A browser return never grants access. The server re-fetches settled payment details and checks the stored session, amount, currency and mode before calling the atomic purchase function.

Confirm the merchant's actual event payload includes a canonical `payment_intent` reference and that refund/dispute events use the expected shape. HandyPay's published session schema does not promise that reference. Missing references fail closed and require reconciliation. Current policy revokes access on any `charge.refunded` (including partial refunds) or `charge.dispute.created`; confirm this commercial policy before activation. Test duplicate, reordered, delayed, invalid-signature and mismatched-amount events. A refund received before payment finalization returns a retryable error.

Live checkout additionally requires the production environment, a live key and explicit `VIABILITY_LIVE_PAYMENTS_ENABLED=true`. These flags alone do not replace the pending merchant and database tests. Production configuration has not been changed.

## Snapshot and data behavior

Saved simulation inputs are editable by their owner. Purchase inputs are revalidated on the server and public country data is fetched independently. Purchased reports are stored separately, have no authenticated update privilege, and have an update-blocking trigger. Refunds revoke the entitlement without rewriting the report. Clients query report data with the user's token; RLS requires both ownership and an active entitlement. The service role is reserved for rate limits, private orders and atomic payment transactions.

Operational follow-up: add scheduled expiry cleanup for old rate-limit buckets and abandoned checkout orders, payment reconciliation alerts, and retention/deletion procedures before public launch. If checkout creation fails after the pending order is stored, that order stays private and does not grant access.
