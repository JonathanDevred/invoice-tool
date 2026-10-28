import type Stripe from 'stripe';
import {PLAN} from './plan';
export type Access={active:boolean;expiresAt:number|null;configured:boolean;testMode:boolean;cancelAtPeriodEnd?:boolean;status?:string;portalAvailable?:boolean};
export function verifySubscription(sub:Stripe.Subscription,userId:string,now=Date.now(),priceId=process.env.STRIPE_PRICE_ID):Access{
 const base:Access={active:false,expiresAt:null,configured:true,testMode:!sub.livemode,portalAvailable:false};
 if(!userId||sub.metadata?.user_id!==userId||sub.metadata?.product!==PLAN.product)return base;
 base.status=sub.status;base.cancelAtPeriodEnd=!!(sub.cancel_at_period_end||sub.cancel_at);base.portalAvailable=true;
 if(sub.status!=='active'||sub.pause_collection)return base;
 const items=sub.items.data;if(items.length!==1)return base;const item=items[0];const price=item.price;
 if(!priceId||price.id!==priceId||price.currency!==PLAN.currency||price.unit_amount!==PLAN.amount||price.recurring?.interval!==PLAN.interval||price.recurring.interval_count!==1||item.quantity!==1)return base;
 const invoice=sub.latest_invoice;if(!invoice||typeof invoice==='string'||invoice.status!=='paid')return base;
 const end=Math.min(item.current_period_end,sub.cancel_at||Infinity)*1000;
 return {...base,expiresAt:end,active:now<end};
}
export async function subscriptionSnapshot(stripe:Stripe,id:string,userId:string,priceId=process.env.STRIPE_PRICE_ID){
 const observedAt=Date.now();const subscription=await stripe.subscriptions.retrieve(id,{expand:['latest_invoice']});let access=verifySubscription(subscription,userId,observedAt,priceId);
 if(access.active){const invoice=subscription.latest_invoice as Stripe.Invoice;
  if(invoice.amount_paid>0){let paid=0;for await(const p of stripe.invoicePayments.list({invoice:invoice.id,status:'paid',limit:100,expand:['data.payment.payment_intent.latest_charge','data.payment.charge']})){
   const pi=p.payment.payment_intent;const charge=p.payment.charge||(pi&&typeof pi!=='string'?pi.latest_charge:null);
   if(charge&&typeof charge!=='string'&&charge.paid&&!charge.refunded&&!charge.disputed&&!charge.amount_refunded)paid+=p.amount_paid||0;
  }if(paid<invoice.amount_paid)access={...access,active:false};}
 }
 if(access.active&&access.expiresAt!==null&&Date.now()>=access.expiresAt)access={...access,active:false};
 return {subscription,access,observedAt};
}
function invoiceSubscription(invoice:Stripe.Invoice){return invoice.parent?.subscription_details?.subscription||(invoice as Stripe.Invoice&{subscription?:string|Stripe.Subscription|null}).subscription;}
export async function eventSubscriptions(stripe:Stripe,event:Stripe.Event):Promise<string[]>{
 const ids=new Set<string>();const add=(s:string|Stripe.Subscription|null|undefined)=>{if(s)ids.add(typeof s==='string'?s:s.id);};
 if(event.type.startsWith('customer.subscription.'))add(event.data.object as Stripe.Subscription);
 if(event.type==='checkout.session.completed')add((event.data.object as Stripe.Checkout.Session).subscription);
 if(event.type==='invoice.paid'||event.type==='invoice.payment_failed')add(invoiceSubscription(event.data.object as Stripe.Invoice));
 if(event.type==='charge.refunded'||event.type.startsWith('charge.dispute.')){
  const charge=event.type==='charge.refunded'?event.data.object as Stripe.Charge:await stripe.charges.retrieve(typeof (event.data.object as Stripe.Dispute).charge==='string'?(event.data.object as Stripe.Dispute).charge as string:((event.data.object as Stripe.Dispute).charge as Stripe.Charge).id);
  const pi=charge.payment_intent;if(pi){const paymentIntent=typeof pi==='string'?pi:pi.id;for await(const payment of stripe.invoicePayments.list({payment:{type:'payment_intent',payment_intent:paymentIntent},limit:100,expand:['data.invoice']})){const invoice=payment.invoice;if(invoice&&typeof invoice!=='string'&&!('deleted' in invoice))add(invoiceSubscription(invoice));}}
 }
 return [...ids];
}
