// Read-only review: never grants/revokes access or submits dispute evidence.
async function reconcileDisputes(page,{getOrders,hasActiveAccess}){
 if(!Array.isArray(page?.data)||typeof page.has_more!=='boolean')throw Error('Invalid dispute list');
 const findings=[],seen=new Set();let checked=0;
 for(const d of page.data.slice(0,20)){
  if(!/^dp_[A-Za-z0-9]+$/.test(d?.id||'')||seen.has(d.id)){findings.push({issue:'invalid_or_duplicate_dispute'});continue;}seen.add(d.id);
  if(!/^pi_[A-Za-z0-9]+$/.test(d.payment_intent||'')){findings.push({issue:'missing_payment_reference'});continue;}
  const orders=await getOrders(d.payment_intent);
  if(!Array.isArray(orders))throw Error('Invalid order response');
  if(orders.length!==1){findings.push({issue:orders.length?'ambiguous_order':'unmatched_dispute'});continue;}
  const o=orders[0];
  if(o.mode!=='test'||o.payment_intent!==d.payment_intent||!Number.isSafeInteger(d.amount_cents)||d.amount_cents<=0||d.amount_cents>o.amount||String(d.currency).toLowerCase()!==o.currency){findings.push({issue:'dispute_order_mismatch'});continue;}
  checked++;
  if(await hasActiveAccess(o.id))findings.push({issue:'dispute_with_active_access'});
 }
 return {checked,complete:!page.has_more&&page.data.length<=20,findings,scope:'Sandbox dispute review only; no access changes; refunds excluded'};
}
module.exports={reconcileDisputes};
