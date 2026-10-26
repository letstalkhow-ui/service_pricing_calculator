-- Read-only operator check. Run through the trusted database console/service role.
-- Pending orders are review candidates, never proof of a failed or successful payment.
with checks as (
 select o.id as order_id,o.mode,'paid_without_active_report' as issue
 from public.bb_checkout_orders o
 where o.status='paid' and not exists(
  select 1 from public.bb_reports r join public.bb_entitlements e on e.report_id=r.id
  where r.order_id=o.id and e.active and e.owner_id=o.owner_id and r.owner_id=o.owner_id)
 union all
 select o.id,o.mode,'revoked_with_active_access'
 from public.bb_checkout_orders o join public.bb_reports r on r.order_id=o.id
 join public.bb_entitlements e on e.report_id=r.id where o.status='revoked' and e.active
 union all
 select o.id,o.mode,'fully_refunded_with_access'
 from public.bb_checkout_orders o join public.bb_reports r on r.order_id=o.id
 join public.bb_entitlements e on e.report_id=r.id where o.refunded_amount=o.amount and e.active
 union all
 select o.id,o.mode,'settled_without_payment_reference'
 from public.bb_checkout_orders o where o.status in ('paid','revoked') and o.payment_intent is null
 union all
 select o.id,o.mode,'pending_over_24h_review_provider'
 from public.bb_checkout_orders o where o.status='pending' and o.created_at<now()-interval '24 hours'
)
select mode,issue,count(*) as order_count from checks group by mode,issue order by mode,issue;