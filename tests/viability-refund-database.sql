begin;
do $$
declare oid uuid='353dffc1-506f-49da-ab4b-f794096ca055'; intent text; snap jsonb; ok boolean;
begin
 select payment_intent,snapshot into intent,snap from bb_checkout_orders where id=oid and mode='test' for update;
 if intent is null then raise exception 'Test order missing'; end if;
 update bb_checkout_orders set status='paid',refunded_amount=0 where id=oid;
 update bb_entitlements set active=true where report_id in(select id from bb_reports where order_id=oid);
 ok=bb_record_refund('evt_qa_partial',repeat('a',64),intent,1900,'usd',500,'test');
 if not ok or not exists(select 1 from bb_checkout_orders where id=oid and status='paid' and refunded_amount=500) or not exists(select 1 from bb_entitlements e join bb_reports r on r.id=e.report_id where r.order_id=oid and e.active) then raise exception 'Partial refund failed'; end if;
 perform bb_record_refund('evt_qa_partial',repeat('a',64),intent,1900,'usd',500,'test');
 if (select count(*) from bb_payment_events where id='evt_qa_partial')<>1 then raise exception 'Duplicate event'; end if;
 begin
  perform bb_record_refund('evt_qa_partial',repeat('b',64),intent,1900,'usd',500,'test');
  raise exception 'Conflict was accepted';
 exception when others then if sqlerrm<>'Event conflict' then raise; end if; end;
 begin
  perform bb_record_refund('evt_qa_wrong',repeat('c',64),intent,1900,'eur',500,'test');
  raise exception 'Wrong currency accepted';
 exception when others then if sqlerrm<>'Refund mismatch' then raise; end if; end;
 begin
  perform bb_record_refund('evt_qa_wrong',repeat('c',64),intent,1900,'usd',500,'live');
  raise exception 'Wrong mode accepted';
 exception when others then if sqlerrm<>'Refund mismatch' then raise; end if; end;
 perform bb_record_refund('evt_qa_second',repeat('c',64),intent,1900,'usd',1000,'test');
 perform bb_record_refund('evt_qa_stale',repeat('d',64),intent,1900,'usd',500,'test');
 if not exists(select 1 from bb_checkout_orders where id=oid and status='paid' and refunded_amount=1000) then raise exception 'Cumulative/stale handling failed'; end if;
 perform bb_record_refund('evt_qa_full',repeat('e',64),intent,1900,'usd',1900,'test');
 perform bb_record_refund('evt_qa_late',repeat('f',64),intent,1900,'usd',500,'test');
 if not exists(select 1 from bb_checkout_orders where id=oid and status='revoked' and refunded_amount=1900) or exists(select 1 from bb_entitlements e join bb_reports r on r.id=e.report_id where r.order_id=oid and e.active) then raise exception 'Full refund revocation failed'; end if;
 if not exists(select 1 from bb_reports where order_id=oid and snapshot=snap) then raise exception 'Snapshot changed'; end if;
 update bb_checkout_orders set status='paid',refunded_amount=500 where id=oid;
 update bb_entitlements set active=true where report_id in(select id from bb_reports where order_id=oid);
 perform bb_revoke_purchase('evt_qa_dispute',repeat('1',64),intent,'charge.dispute.created');
 perform bb_record_refund('evt_qa_after_dispute',repeat('2',64),intent,1900,'usd',1000,'test');
 if exists(select 1 from bb_entitlements e join bb_reports r on r.id=e.report_id where r.order_id=oid and e.active) then raise exception 'Dispute access restored'; end if;
end; $$;
select 'PASS: partial, duplicate, conflict, currency/mode mismatch, cumulative, stale, full, dispute, immutable snapshot' as result;
rollback;
