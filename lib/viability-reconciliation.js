const {uuid}=require('./viability-platform');
// Read-only provider comparison. Never finalizes orders or changes entitlements.
async function reconcileOrders(orders,{mode,getSession}){
 if(!['test','live'].includes(mode))throw new Error('Explicit payment mode required');
 const findings=[];
 for(const order of orders){
  if(order.mode!==mode)continue;
  if(!uuid(order.id)||!/^cs_[A-Za-z0-9_]+$/.test(order.provider_session||'')){
   findings.push({order_id:order.id,issue:'missing_or_invalid_session'});continue;
  }
  let session;try{session=await getSession(order.provider_session);}catch{
   findings.push({order_id:order.id,issue:'provider_unavailable'});continue;
  }
  if(session?.id!==order.provider_session||session.metadata?.order_id!==order.id||session.amount_total!==order.amount||String(session.currency).toLowerCase()!==order.currency){
   findings.push({order_id:order.id,issue:'provider_order_mismatch'});continue;
  }
  if(session.payment_status==='paid'&&session.status==='complete'&&order.status==='pending')findings.push({order_id:order.id,issue:'paid_at_provider_pending_locally'});
  if(order.status==='paid'&&session.payment_status!=='paid')findings.push({order_id:order.id,issue:'local_payment_needs_review'});
 }
 return findings;
}
module.exports={reconcileOrders};
