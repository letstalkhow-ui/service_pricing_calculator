begin;
create table public.bb_simulations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 160), input_json jsonb not null, profile_json jsonb not null, form_json jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.bb_checkout_orders (
 id uuid primary key, owner_id uuid not null references auth.users(id), simulation_id uuid not null references public.bb_simulations(id),
 snapshot jsonb not null, amount integer not null check(amount>0), currency text not null check(currency ~ '^[a-z]{3}$'),
 mode text not null check(mode in ('test','live')), provider_session text unique, checkout_url text, payment_intent text unique,
 status text not null default 'pending' check(status in ('pending','paid','revoked')),
 created_at timestamptz not null default now()
);
create table public.bb_reports (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), order_id uuid not null unique references public.bb_checkout_orders(id),
 title text not null, snapshot jsonb not null, created_at timestamptz not null default now()
);
create table public.bb_entitlements (
 report_id uuid primary key references public.bb_reports(id) on delete cascade, owner_id uuid not null references auth.users(id),
 active boolean not null default true, granted_at timestamptz not null default now()
);
create table public.bb_payment_events (
 id text primary key, order_id uuid not null references public.bb_checkout_orders(id), payload_hash text not null,
 event_type text not null, created_at timestamptz not null default now()
);
create table public.bb_rate_limits (bucket text primary key, window_start timestamptz not null default now(), hits integer not null default 0);
alter table public.bb_simulations enable row level security;
alter table public.bb_checkout_orders enable row level security;
alter table public.bb_reports enable row level security;
alter table public.bb_entitlements enable row level security;
alter table public.bb_payment_events enable row level security;
alter table public.bb_rate_limits enable row level security;
revoke all on public.bb_simulations, public.bb_checkout_orders, public.bb_reports, public.bb_entitlements, public.bb_payment_events, public.bb_rate_limits from anon, authenticated;
grant select,insert,update on public.bb_simulations to authenticated;
grant select on public.bb_reports,public.bb_entitlements to authenticated;
grant all on public.bb_simulations, public.bb_checkout_orders, public.bb_reports, public.bb_entitlements, public.bb_payment_events, public.bb_rate_limits to service_role;
create policy simulations_read on public.bb_simulations for select to authenticated using(owner_id=auth.uid());
create policy simulations_insert on public.bb_simulations for insert to authenticated with check(owner_id=auth.uid());
create policy simulations_update on public.bb_simulations for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy entitlements_read on public.bb_entitlements for select to authenticated using(owner_id=auth.uid());
create policy reports_read on public.bb_reports for select to authenticated using(owner_id=auth.uid() and exists(select 1 from public.bb_entitlements e where e.report_id=bb_reports.id and e.owner_id=auth.uid() and e.active));
create function public.bb_immutable_report() returns trigger language plpgsql set search_path=public as $$
begin raise exception 'Purchased report snapshots cannot be updated'; end; $$;
create trigger immutable_report before update on public.bb_reports for each row execute function public.bb_immutable_report();
create function public.bb_rate_limit(p_bucket text,p_seconds integer,p_limit integer) returns boolean language plpgsql security definer set search_path=public as $$
declare r public.bb_rate_limits;
begin
 if p_seconds<1 or p_limit<1 then raise exception 'Invalid rate limit'; end if;
 insert into public.bb_rate_limits(bucket) values(p_bucket) on conflict do nothing;
 select * into r from public.bb_rate_limits where bucket=p_bucket for update;
 if r.window_start < now()-make_interval(secs=>p_seconds) then update public.bb_rate_limits set window_start=now(),hits=1 where bucket=p_bucket; return true; end if;
 if r.hits>=p_limit then return false; end if;
 update public.bb_rate_limits set hits=hits+1 where bucket=p_bucket;return true;
end; $$;
create function public.bb_finalize_purchase(p_order uuid,p_event text,p_hash text,p_session text,p_amount integer,p_currency text,p_mode text,p_intent text) returns uuid language plpgsql security definer set search_path=public as $$
declare o public.bb_checkout_orders; prior public.bb_payment_events; rid uuid;
begin
 select * into o from public.bb_checkout_orders where id=p_order for update;
 if not found then raise exception 'Order not found'; end if;
 if o.provider_session is distinct from p_session or o.amount<>p_amount or o.currency<>p_currency or o.mode<>p_mode then raise exception 'Payment mismatch'; end if;
 select * into prior from public.bb_payment_events where id=p_event;
 if found and (prior.order_id<>o.id or prior.payload_hash<>p_hash) then raise exception 'Event conflict'; end if;
 if o.status='revoked' then raise exception 'Order access was revoked'; end if;
 select id into rid from public.bb_reports where order_id=o.id;
 if rid is not null then return rid; end if;
 insert into public.bb_payment_events(id,order_id,payload_hash,event_type) values(p_event,o.id,p_hash,'paid');
 insert into public.bb_reports(owner_id,order_id,title,snapshot) values(o.owner_id,o.id,coalesce(o.snapshot->'profile'->>'businessName','Business Viability Report'),o.snapshot) returning id into rid;
 insert into public.bb_entitlements(report_id,owner_id) values(rid,o.owner_id);
 update public.bb_checkout_orders set status='paid',payment_intent=p_intent where id=o.id;
 return rid;
end; $$;
create function public.bb_revoke_purchase(p_event text,p_hash text,p_intent text,p_type text) returns boolean language plpgsql security definer set search_path=public as $$
declare o public.bb_checkout_orders; prior public.bb_payment_events;
begin
 select * into o from public.bb_checkout_orders where payment_intent=p_intent for update;
 if not found then return false; end if;
 select * into prior from public.bb_payment_events where id=p_event;
 if found then if prior.payload_hash<>p_hash or prior.order_id<>o.id then raise exception 'Event conflict'; end if; return true; end if;
 insert into public.bb_payment_events(id,order_id,payload_hash,event_type) values(p_event,o.id,p_hash,p_type);
 update public.bb_checkout_orders set status='revoked' where id=o.id;
 update public.bb_entitlements set active=false where report_id in(select id from public.bb_reports where order_id=o.id);
 return true;
end; $$;
revoke all on function public.bb_rate_limit(text,integer,integer),public.bb_finalize_purchase(uuid,text,text,text,integer,text,text,text),public.bb_revoke_purchase(text,text,text,text) from public,anon,authenticated;
grant execute on function public.bb_rate_limit(text,integer,integer),public.bb_finalize_purchase(uuid,text,text,text,integer,text,text,text),public.bb_revoke_purchase(text,text,text,text) to service_role;
commit;
