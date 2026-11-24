-- Applied through Supabase migration API; private operational metadata only.
alter table public.bb_payment_monitor_runs drop constraint bb_payment_monitor_runs_alert_status_check;
alter table public.bb_payment_monitor_runs add constraint bb_payment_monitor_runs_alert_status_check check(alert_status in ('not_needed','awaiting_email_configuration','sending','accepted','failed','unknown','suppressed'));
alter table public.bb_payment_monitor_runs add column alert_attempted_at timestamptz, add column alert_finished_at timestamptz, add column alert_test boolean not null default false;
grant update(alert_status,alert_attempted_at,alert_finished_at,alert_test) on public.bb_payment_monitor_runs to service_role;
create function public.bb_claim_payment_alert(p_run_id bigint,p_test boolean default false) returns boolean
language plpgsql security invoker set search_path=public as $$
declare r public.bb_payment_monitor_runs;
begin
 perform pg_advisory_xact_lock(731025,2);
 select * into strict r from public.bb_payment_monitor_runs where id=p_run_id for update;
 if r.alert_attempted_at is not null then return false; end if;
 if not p_test and r.findings='[]'::jsonb then return false; end if;
 if not p_test and exists(select 1 from public.bb_payment_monitor_runs x where not x.alert_test and x.findings=r.findings and ((x.alert_status='accepted' and x.alert_finished_at>now()-interval '24 hours') or (x.alert_status in ('sending','unknown') and x.alert_attempted_at>now()-interval '1 hour'))) then
 update public.bb_payment_monitor_runs set alert_status='suppressed' where id=p_run_id; return false;
 end if;
 update public.bb_payment_monitor_runs set alert_status='sending',alert_attempted_at=now(),alert_test=p_test where id=p_run_id;
 return true;
end; $$;
revoke all on function public.bb_claim_payment_alert(bigint,boolean) from public,anon,authenticated;
grant execute on function public.bb_claim_payment_alert(bigint,boolean) to service_role;
