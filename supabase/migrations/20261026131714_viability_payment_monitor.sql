begin;
create extension if not exists pg_cron;
create table public.bb_payment_monitor_runs (
 id bigint generated always as identity primary key,
 checked_at timestamptz not null default now(),
 findings jsonb not null,
 alert_status text not null check(alert_status in ('not_needed','awaiting_email_configuration'))
);
alter table public.bb_payment_monitor_runs enable row level security;
revoke all on public.bb_payment_monitor_runs from public,anon,authenticated;
grant select,insert on public.bb_payment_monitor_runs to service_role;
grant usage,select on sequence public.bb_payment_monitor_runs_id_seq to service_role;
create function public.bb_run_payment_monitor() returns bigint
language plpgsql security invoker set search_path=public as $$
declare result jsonb; run_id bigint;
begin
 if not pg_try_advisory_xact_lock(731025,1) then return null; end if;
 select coalesce(jsonb_agg(q),'[]'::jsonb) into result from (
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
select mode,issue,count(*) as order_count from checks group by mode,issue order by mode,issue
 ) q;
 insert into public.bb_payment_monitor_runs(findings,alert_status)
 values(result,case when jsonb_array_length(result)>0 then 'awaiting_email_configuration' else 'not_needed' end)
 returning id into run_id;
 return run_id;
end; $$;
revoke all on function public.bb_run_payment_monitor() from public,anon,authenticated;
grant execute on function public.bb_run_payment_monitor() to service_role;
select cron.schedule('bb-payment-integrity-hourly','17 * * * *','select public.bb_run_payment_monitor();');
commit;