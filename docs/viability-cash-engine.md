# Cash flow and scenarios V1

Run `node --test tests/*.test.cjs`. No npm dependencies or build step.

`viability-cash-engine.js` shares the financial engine used by the form. `run(input, scenario, horizon)` supports 12 months (default) and 36 months; `simulate(input, horizon)` applies all four versioned scenario configurations. Expected preserves user values. Adjustments are planning assumptions pending calibration, not statistical forecasts. No market demand or overall viability score is inferred.

## Cash basis

Opening cash is the total at Month 1, including financing already received. Owner cash and external funding fields are informational and are never added again. Setup is spent in Month 1 and equipment/expansion spending is spread over the selected period. If already paid is selected, neither is deducted again. Future financing schedules are not supported in the UI.

Monthly sales/capacity are normal-month values. Weeks do not multiply monthly values a second time. Sales ramp in equal steps, reaching the target at the selected month. Existing sales can decline towards a lower target. Scenario sales are bounded by current capacity; current starting sales are not retrospectively changed.

Collections split invoices between adjacent months for fractional delays. A late-payment fraction is deferred an additional month. Uncollected sales reduce cash; they are excluded from deferred receivables. Operating profit is before tax, debt repayments, drawings and any write-off of unpaid revenue. Receivables remaining after Month 12 are returned explicitly.

Direct cash costs, fixed costs and drawings are paid in the month incurred. Imputed owner labour affects economic profit but is not also paid out in cash. Owner drawings are separate actual withdrawals. Loan repayments stop at the entered remaining term.

Additional income uses net contribution. Recurring streams repeat monthly. Seasonal streams can supply exact 12-month revenue and cost schedules; without dates, the monthly average is applied and disclosed. One-off revenue/cost occurs once, in the selected month (Month 1 in the current UI), and never supports recurring break-even.

## Outputs and limits

Funding gap is the absolute minimum negative month-end cash balance. Adding that amount at Month 1 removes modelled negative month-end balances. Buffer funding gap additionally meets the selected monthly reserve, including operating costs, debt and drawings. It is separate from the bare funding gap.

Simple payback divides setup/equipment investment by target-level operating profit, returning null for loss. Cash recovery uses cumulative actual operating cash after debt and drawings; recovery is measured within the selected 12- or 36-month horizon. Months 13–36 hold post-ramp price, costs, sales and market caps constant; recurring/seasonal patterns repeat annually, one-off receipts and setup spending do not, and debt follows the entered remaining term. First-year results remain exactly the same under either horizon. It includes collections of pre-forecast receivables only when explicitly supplied.

Core and growth target-profit resilience are calculated independently from cash resilience. The latter counts scenarios without negative cash; none of these replaces market viability or Model Confidence.

Taxes, stock purchasing cycles, supplier credit, intramonth cash timing and future financing receipts are not modelled. Seasonality is averaged unless monthly schedules are provided. No tax deductibility or statutory accounting claim is made.

## Preview

The expandable cash/scenario tables are temporary product-testing diagnostics. Checkout is disabled; this is not the final free/paid boundary or entitlement implementation. The browser computes the preview only; immutable paid snapshots and server-side payment verification remain future work.
