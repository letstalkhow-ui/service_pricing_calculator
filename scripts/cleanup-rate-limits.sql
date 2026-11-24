-- Operational counters only; current application limits use 3600-second windows.
-- Exclusive NOWAIT prevents deleting a bucket between a request's insert and lock.
create function public.bb_cleanup_rate_limits() returns integer
language plpgsql security invoker set search_path=public as $$
declare removed integer;
begin
 begin
  lock table public.bb_rate_limits in exclusive mode nowait;
 exception when lock_not_available then return 0;
 end;
 with expired as (
  select bucket from public.bb_rate_limits
  where window_start < now()-interval '7 days'
  order by window_start limit 1000
 )
 delete from public.bb_rate_limits r using expired e where r.bucket=e.bucket;
 get diagnostics removed=row_count;
 return removed;
end; $$;
revoke all on function public.bb_cleanup_rate_limits() from public,anon,authenticated;
grant execute on function public.bb_cleanup_rate_limits() to service_role;
select cron.schedule('bb-rate-limit-cleanup-daily','43 0 * * *','select public.bb_cleanup_rate_limits();');
