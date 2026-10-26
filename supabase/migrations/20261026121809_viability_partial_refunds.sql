begin;
alter table public.bb_checkout_orders add column refunded_amount integer not null default 0 check(refunded_amount>=0 and refunded_amount<=amount);
alter table public.bb_payment_events add column refunded_amount integer check(refunded_amount>=0);

-- A charge's amount_refunded is cumulative, not a new amount to add on each delivery.
-- Lock the order so duplicate/concurrent and out-of-order events cannot double count.
create function public.bb_record_refund(p_event text,p_hash text,p_intent text,p_amount integer,p_currency text,p_refunded integer,p_mode text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare o public.bb_checkout_orders; prior public.bb_payment_events; total integer;
begin
 if p_event is null or p_event !~ '^evt_[A-Za-z0-9_]+$' or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or p_refunded is null or p_refunded<=0 or p_amount is null or p_refunded>p_amount then raise exception 'Invalid refund'; end if;
 select * into o from public.bb_checkout_orders where payment_intent=p_intent for update;
 if not found then return false; end if;
 if o.amount is distinct from p_amount or o.currency is distinct from p_currency or o.mode is distinct from p_mode then raise exception 'Refund mismatch'; end if;
 if o.status='pending' or not exists(select 1 from public.bb_reports where order_id=o.id) then return false; end if;
 select * into prior from public.bb_payment_events where id=p_event;
 if found then
  if prior.order_id<>o.id or prior.payload_hash<>p_hash or prior.event_type<>'charge.refunded' or prior.refunded_amount is distinct from p_refunded then raise exception 'Event conflict'; end if;
  return true;
 end if;
 insert into public.bb_payment_events(id,order_id,payload_hash,event_type,refunded_amount) values(p_event,o.id,p_hash,'charge.refunded',p_refunded);
 total=greatest(o.refunded_amount,p_refunded);
 update public.bb_checkout_orders set refunded_amount=total,status=case when total=amount then 'revoked' else status end where id=o.id;
 -- Partial refunds never grant access: existing full refunds/disputes stay revoked.
 if total=o.amount then
  update public.bb_entitlements set active=false where report_id in(select id from public.bb_reports where order_id=o.id);
 end if;
 return true;
end; $$;
revoke all on function public.bb_record_refund(text,text,text,integer,text,integer,text) from public,anon,authenticated;
grant execute on function public.bb_record_refund(text,text,text,integer,text,integer,text) to service_role;
commit;
