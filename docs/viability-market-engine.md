# Market, scoring and confidence V1 preview

Run all regression and form integration checks with `node --test tests/*.test.cjs`.

## Source contract

`GET /api/viability-market-data?country=MUS` requests public World Bank WDI data. Supported preview countries and local currencies: MUS/MUR, ZAF/ZAR, GBR/GBP, USA/USD, FRA/EUR. Only the country code is sent; business prices, costs and personal information are never sent upstream. The API has a timeout and returns an explicit 503 without fabricated values on failure. Responses may be cached for one day, with a seven-day stale response window. Source years and retrieval time remain in the snapshot.

Indicators:

- SP.POP.TOTL: national population.
- NY.GNP.PCAP.PP.CD: GNI per capita in current international dollars.
- PA.NUS.PPP: GDP PPP conversion factor, local currency units per international dollar.
- NY.GDP.PCAP.PP.CD: supporting GDP PPP context; not a household income measure.

The latest common GNI/PPP year is selected. Nulls, other countries and future observations are excluded. Annual spend in local currency is divided by the PPP factor, then by same-year GNI PPP. A price in another currency cannot be compared without an explicit affordability assumption. National income is a contextual proxy, not evidence about individual household budgets. Positioning and purchase importance remain context rather than extra undocumented multipliers.

Official source definitions and API contract:

- https://databank.worldbank.org/metadataglossary/world-development-indicators/series/NY.GNP.PCAP.PP.CD
- https://databank.worldbank.org/metadataglossary/world-development-indicators/series/PA.NUS.PPP
- https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures

## Geographic and unit safeguards

Country population fills missing population only when the user selects a national market. A local business needs an explicit local estimate; it never silently inherits national population. Target-profile share is entered by the user and must describe paying buyers. Household/parent markets must not blindly count every child as a buyer. Reachable share is applied within the selected area, without discounting geography twice.

Active monthly paying customers use one monthly sale/customer and twelve annual payments. Individual sales/orders use the selected annual purchase frequency divided by twelve. Once means once in the planning year; a few times means four/year, several/week means 156/year. Market buyer counts, monthly units, required market share and capacity are kept on consistent bases. These translations are disclosed before simulation.

## Versioned planning assumptions

The framework defines affordability bands, maturity ranges, score weights and qualitative thresholds but not every numerical score or execution multiplier. These remaining coefficients are implemented as provisional, disclosed calibration choices. No claim is made that they are empirically validated.

Affordability burden bands and factors follow the locked framework: <=0.1% → 95%; <=0.5% → 85%; <=1% → 70%; <=2.5% → 50%; <=5% → 30%; above → 15%.

Default reachable share: 80% (editable). No default local population or target-profile share. Missing critical data withholds the overall score. Manual affordability/share overrides are traceable and affect evidence confidence independently.

Competitor buckets: 1–2 = 2, 3–5 = 5, 6–10 = 8, >10 = 12, unknown = 5 (with confidence penalty). Baseline = 1/(direct competitors × (1 + substitution load) + 1). Substitution loads follow the framework: 0.15/0.30/0.50/0.75. Maturity uses range midpoints: new 0.275, early 0.45, established 0.675; incumbent 1 is supported internally, not inferred solely from age.

Execution factors: differentiation 0.85/1/1.15/0.9 unknown; access 0.7/0.9/1.05/1.15; dominant competitor 1/0.85/0.65/0.8 unknown; higher price without clear differentiation 0.8; lower price 1.05; otherwise 1. Combined execution is clamped to 0.35–1.4. Expected share is bounded to 0–100%. Conservative/Strong/Stress share ranges multiply Expected by 0.65/1.35/0.4; these are planning ranges, not statistical intervals.

## Scores and hard stops

Weights remain Market 25, Unit Economics 25, Break-Even 20, Capacity 15, Scenario Resilience 15.

Numerical score mappings (provisional):

- Market coverage of target: <0.7/1/1.5/2.5 and above → 20/40/60/80/95.
- Positive contribution margin: <10/20/35/50% and above → 25/45/65/80/95; nonpositive → 0. These are not industry margin benchmarks.
- Break-even coverage: <0.8/1/1.25/2 and above → 15/30/50/75/95; no break-even → 0; zero required primary sales → 100.
- Break-even capacity utilisation: <40/60/75/90% and above up to 100% → 95/85/70/50/30; impossible → 0.
- Profit resilience: very strong/strong/moderate/very fragile/requires adjustment → 95/80/60/25/0.

The weighted score is calculated first. Contribution <=0 or break-even above capacity caps the final score at 34; obtainable demand below break-even or Expected operating loss caps it at 49; funding gaps prevent Strong (cap79); repayment pressure caps at64. The score and reasons retain each applied constraint. Classification uses the capped score. Confidence is not included in the weighted score.

Market-constrained demand is passed into all cash scenarios. The core comparison excludes discretionary growth and new investment/setup spending while retaining debt and owner withdrawals. The user-entered sales target is preserved; headlines clearly distinguish target profit from demand-constrained scenarios.

## Confidence and incomplete assessments

High/Moderate/Low describes evidence quality only. Estimated rather than checked inputs add two uncertainty points; stale public data (>3years) adds three; unknown answers add up to five; manual affordability/share each adds two; undated local population and averaged seasonal timing each add one. >=6 is Low, >=2 Moderate, otherwise High. Incomplete or unsupported market models are Low with no overall score. The model never uses consumer GNI to score B2B or mixed audiences.

## Product boundary and remaining work

The market/scenario panels are preview-testing diagnostics, not the final free/paid entitlement boundary. Scores are marked provisional pending calibration and launch validation. The locked 36-month continuation is implemented with flat post-ramp assumptions. First-year operating detail is preserved exactly. Failure to recover and retain setup spending within 36 months is flagged; recovery only under Strong Execution also prevents a Strong classification. Projection cash shortfalls constrain the classification independently of twelve-month results. A complete 17-section report preview is available with browser print/PDF styles. Immutable server snapshots, accounts, verified payment, and server-generated PDF delivery remain separate work.
