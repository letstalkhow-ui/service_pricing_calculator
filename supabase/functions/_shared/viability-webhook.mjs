import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
const qs=values=>new URLSearchParams(values).toString();
class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
const platform={HttpError,uuid:value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),signature(raw,secret,header){
 if(typeof secret!=='string'||!secret||typeof header!=='string'||!/^sha256=[a-f0-9]{64}$/i.test(header))return false;
 const expected=crypto.createHmac('sha256',secret).update(raw).digest(),actual=Buffer.from(header.slice(7),'hex');
 return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);
}};
export async function processWebhook(raw,header,{config,env,db,handypay}){
  if(!config.checkout)throw new platform.HttpError(503,'Payment processing is not configured.');
  if(!platform.signature(raw,env.HANDYPAY_WEBHOOK_SECRET,header))throw new platform.HttpError(401,'Invalid payment signature.');
  let event;try{event=JSON.parse(raw.toString('utf8'));}catch{throw new platform.HttpError(400,'Invalid event.');}
  if(typeof event.id!=='string'||!/^evt_[A-Za-z0-9_]+$/.test(event.id))throw new platform.HttpError(400,'Invalid event reference.');
  if(typeof event.livemode==='boolean'&&event.livemode!==(config.mode==='live'))throw new platform.HttpError(400,'Payment mode mismatch.');
  const hash=crypto.createHash('sha256').update(raw).digest('hex'),data=event.data;
  if(['charge.refunded','charge.dispute.created'].includes(event.type)){
   const intent=data?.payment_intent;if(typeof intent!=='string'||!/^pi_[A-Za-z0-9_]+$/.test(intent))throw new platform.HttpError(422,'Payment reference needs reconciliation.');
   const revoked=await db.rpc('bb_revoke_purchase',{p_event:event.id,p_hash:hash,p_intent:intent,p_type:event.type});if(!revoked)throw new platform.HttpError(409,'Payment has not yet been reconciled.');return {received:true};
  }
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return {received:true,ignored:true};
  if(!/^cs_[A-Za-z0-9_]+$/.test(data?.id||''))throw new platform.HttpError(400,'Invalid checkout session.');
  const session=await handypay('/payment-sessions/'+encodeURIComponent(data.id));
  if(session.id!==data.id||session.payment_status!=='paid'||session.status!=='complete')throw new platform.HttpError(409,'Payment is not settled.');
  const orderId=session.metadata?.order_id;if(!platform.uuid(orderId))throw new platform.HttpError(422,'Payment does not match a report order.');
  const rows=await db.rest('bb_checkout_orders?'+qs({id:'eq.'+orderId,provider_session:'eq.'+session.id,select:'id,amount,currency,mode'}),{service:true});const order=rows?.[0];
  if(!order||session.amount_total!==order.amount||String(session.currency).toLowerCase()!==order.currency||order.mode!==config.mode)throw new platform.HttpError(409,'Payment amount, currency or order mismatch.');
  // Require a canonical intent reference for refund/dispute reconciliation. Verify merchant payload before activation.
  const intent=data.payment_intent||session.payment_intent;if(typeof intent!=='string'||!/^pi_[A-Za-z0-9_]+$/.test(intent))throw new platform.HttpError(422,'Payment intent reference needs reconciliation.');
  const reportId=await db.rpc('bb_finalize_purchase',{p_order:orderId,p_event:event.id,p_hash:hash,p_session:session.id,p_amount:order.amount,p_currency:order.currency,p_mode:order.mode,p_intent:intent});return {received:true,report_id:reportId};
 }
