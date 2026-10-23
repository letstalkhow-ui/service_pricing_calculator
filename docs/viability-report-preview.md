# Business Viability Report preview

The simulator generates a browser-local snapshot when the user chooses **Open full report preview**. The dedicated `/viability/report-preview` route renders the stored snapshot. No business numbers, market inputs or identifiers are sent in the URL. This is a product-testing surface, not the final free/paid entitlement boundary.

The snapshot includes original inputs, business profile, data-source snapshots, model/report versions, generation time, complete assessment, four 12-month scenarios and four 36-month continuations. The pure report module deep-clones and freezes results at creation. Rendering a saved preview does not run the engine again. This client-side freeze is not a security boundary, signed receipt, persistent account record or replacement for server-owned immutable paid reports.

The report has 17 sections matching the technical specification. Major findings use **What we found / What this means / Why it matters / What to do next**. Plain-English input wording remains in the simulator; the report uses business terms with immediate explanation. Human-readable risk labels replace internal codes. Target profit is distinguished from demand-constrained profit. Model Confidence remains separate from viability.

## Recovery definitions

- Operating recovery: first month cumulative operating profit covers equipment and setup spending.
- Free-cash recovery of setup spending: first month cumulative collected cash after operating payouts, debt and drawings covers equipment/setup spending. Later deterioration is captured separately by recovery retained at Month 36.
- Owner cash recovery: the same post-debt/post-drawings cash surplus compared with owner cash invested as entered. No owner amount is inferred from external finance.
- Total planned capital allocation: equipment/setup spending plus the opening operating reserve. For opening cash before spending, reserve is `max(0, opening cash - equipment - setup)`; for already-paid setup, reserve is the entered opening cash. Funds already received are not added again.
- Capital after external finance: planned allocation less external funding, floored at zero. This is not a claim that all of it is already owner equity.

A 36-month continuation repeats the Year 1 seasonal pattern while holding post-ramp prices, costs and market-constrained demand constant. One-off receipts, opening receivables and setup spending do not repeat; debt stops at its remaining term. First-year monthly rows match the 12-month engine exactly. The projection never injects rescue funding when cash turns negative.

## Print and access

Print CSS targets A4 with repeating table headers and restrained page breaks. **Print / save as PDF** opens the browser print flow; no server-generated PDF is promised. Keep the preview tab open or print it: session storage is tab-local and does not provide permanent access.

The route serves only a generic shell; report figures stay in browser session storage. The shell has `noindex` and `no-store`. Malformed or unsupported snapshots show a fresh-generation prompt rather than raw HTML or broken figures.

## Verification and remaining launch work

Run `node --test tests/*.test.cjs`. Tests cover cash and forecast continuity, loan expiry, one-off receipts, income delays, recovery only under Strong Execution, snapshot freezing/round-trip, injection escaping, incomplete market assessments, route packaging and form-to-report storage.

Print-layout QA can be rendered from a synthetic sample; that is distinct from live browser verification behind Vercel authentication. Existing score mappings and competition coefficients still require calibration. Accounts, verified HandyPay entitlement, persistent paid snapshots and server-generated PDF/email delivery remain pending. Do not publish this report preview as an unlocked production paid product.
