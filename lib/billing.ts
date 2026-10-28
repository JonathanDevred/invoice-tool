import Stripe from 'stripe';
import {cookies} from 'next/headers';
import {currentUser,serverClient} from './supabase/server';
import {PLAN} from './plan';
import {adminClient} from './supabase/admin';
export const SESSION_COOKIE='gpf_purchase_v3';
export const DAY=86400;
export const PRODUCT=PLAN.product;
export const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
export function stripeClient(){if(!process.env.STRIPE_SECRET_KEY)throw new Error('Billing unavailable');return new Stripe(process.env.STRIPE_SECRET_KEY,{maxNetworkRetries:1,timeout:10000});}
export function siteUrl(){return (process.env.APP_URL||(process.env.NODE_ENV==='production'?'https://getpaidfast.vercel.app':'http://localhost:3000')).replace(/\/$/,'');}
export function sameOrigin(request:Request){return request.headers.get('origin')===new URL(siteUrl()).origin||(process.env.NODE_ENV!=='production'&&['http://127.0.0.1:3000','http://localhost:3000'].includes(request.headers.get('origin')||''));}
export type Access={active:boolean;expiresAt:number|null;configured:boolean;testMode:boolean;cancelAtPeriodEnd?:boolean;status?:string;portalAvailable?:boolean};
export function verifySubscription(sub:Stripe.Subscription,userId:string,now=Date.now(),priceId=process.env.STRIPE_PRICE_ID):Access{
 const base:Access={active:false,expiresAt:null,configured:true,testMode:!sub.livemode,status:sub.status,cancelAtPeriodEnd:sub.cancel_at_period_end,portalAvailable:false};
 if(!userId||sub.metadata?.user_id!==userId||sub.metadata?.product!==PRODUCT||sub.status!=='active'||sub.pause_collection)return base;
 base.portalAvailable=true;const items=sub.items.data;if(items.length!==1)return base;const item=items[0];const price=item.price;
 if(!priceId||price.id!==priceId||price.currency!==PLAN.currency||price.unit_amount!==PLAN.amount||price.recurring?.interval!==PLAN.interval||price.recurring.interval_count!==1||item.quantity!==1)return base;
 const invoice=sub.latest_invoice;if(!invoice||typeof invoice==='string'||invoice.status!=='paid')return base;
 const end=Math.min(item.current_period_end,sub.cancel_at||Infinity)*1000;
 return {...base,expiresAt:end,active:now<end};
}
export async function verifyPaidSubscription(id:string,userId:string):Promise<Access>{
 const stripe=stripeClient();const sub=await stripe.subscriptions.retrieve(id,{expand:['latest_invoice']});const access=verifySubscription(sub,userId);
 if(!access.active)return access;
 const invoice=sub.latest_invoice as Stripe.Invoice;
 if(invoice.amount_paid>0){const payments=await stripe.invoicePayments.list({invoice:invoice.id,status:'paid',limit:10,expand:['data.payment.payment_intent.latest_charge','data.payment.charge']});
 let paid=0;for(const p of payments.data){const pi=p.payment.payment_intent;const charge=p.payment.charge||(pi&&typeof pi!=='string'?pi.latest_charge:null);if(!charge||typeof charge==='string'||!charge.paid||charge.refunded||charge.disputed||charge.amount_refunded>0)continue;paid+=p.amount_paid||0;}
 if(paid<invoice.amount_paid)return {...access,active:false};}
 // The verified checkout can return before Stripe's webhook. Record that paid
 // invoice once so database quotas and the UI become consistent immediately.
 if(process.env.SUPABASE_SECRET_KEY){const {error}=await adminClient().rpc('gpf_apply_subscription_event',{p_event_id:`verified_${sub.id}_${invoice.id}`,p_event_created:invoice.created,p_user_id:userId,p_subscription_id:sub.id,p_customer_id:typeof sub.customer==='string'?sub.customer:sub.customer.id,p_status:sub.status,p_period_end:new Date(access.expiresAt!).toISOString(),p_cancel:sub.cancel_at_period_end});if(error)throw new Error('Subscription synchronization unavailable');}
 return access;
}
export async function accountCheckoutSessions(){const user=await currentUser();if(!user)return {user:null,sessions:[] as string[]};const client=await serverClient();const {data,error}=await client.from('gpf_purchases').select('session_id').eq('user_id',user.id).order('created_at',{ascending:false}).limit(10);if(error)throw new Error('Purchases unavailable');return {user,sessions:(data||[]).map(p=>p.session_id as string)};}
export async function getAccess(sessionId?:string):Promise<Access>{
 const base:Access={active:false,expiresAt:null,configured:!!process.env.STRIPE_SECRET_KEY&&!!process.env.STRIPE_PRICE_ID,testMode:!!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')};if(!base.configured)return base;
 const {user,sessions}=await accountCheckoutSessions();if(!user)return base;
 const jar=await cookies();const ids=sessionId?[sessionId]:Array.from(new Set([jar.get(SESSION_COOKIE)?.value,...sessions].filter(Boolean) as string[]));
 const stripe=stripeClient();let best=base;
 const client=await serverClient();const {data:stored,error}=await client.from('gpf_subscriptions').select('subscription_id').eq('user_id',user.id).maybeSingle();if(error)throw new Error('Subscription records unavailable');
 if(stored){try{best=await verifyPaidSubscription(stored.subscription_id,user.id);}catch(error){if(!(error instanceof Stripe.errors.StripeInvalidRequestError))throw error;}}
 if(best.active&&!sessionId)return {...best,configured:base.configured};
 for(const id of ids){if(!/^cs_(test_|live_)?[a-zA-Z0-9]{10,240}$/.test(id))continue;try{
 const session=await stripe.checkout.sessions.retrieve(id);if(session.metadata?.user_id!==user.id||session.metadata.product!==PRODUCT||session.mode!=='subscription'||session.status!=='complete'||!session.subscription)continue;
 const access=await verifyPaidSubscription(typeof session.subscription==='string'?session.subscription:session.subscription.id,user.id);
 if(access.active||!best.portalAvailable)best=access;if(access.active)break;
 }catch(error){if(error instanceof Stripe.errors.StripeInvalidRequestError)continue;throw error;}}
 return {...best,configured:base.configured};
}
