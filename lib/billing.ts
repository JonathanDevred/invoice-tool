import Stripe from 'stripe';
import {cookies} from 'next/headers';
import {currentUser,serverClient} from './supabase/server';
import {PLAN} from './plan';
import {subscriptionSnapshot,type Access} from './subscriptions';
export {verifySubscription} from './subscriptions';
export type {Access} from './subscriptions';
import {adminClient} from './supabase/admin';
export const SESSION_COOKIE='gpf_purchase_v3';
export const DAY=86400;
export const PRODUCT=PLAN.product;
export const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
export function stripeClient(){if(!process.env.STRIPE_SECRET_KEY)throw new Error('Billing unavailable');return new Stripe(process.env.STRIPE_SECRET_KEY,{maxNetworkRetries:1,timeout:10000});}
export function siteUrl(){return (process.env.APP_URL||(process.env.NODE_ENV==='production'?'https://getpaidfast.vercel.app':'http://localhost:3000')).replace(/\/$/,'');}
export function sameOrigin(request:Request){return request.headers.get('origin')===new URL(siteUrl()).origin||(process.env.NODE_ENV!=='production'&&['http://127.0.0.1:3000','http://localhost:3000'].includes(request.headers.get('origin')||''));}
export async function recordSubscription(snapshot:Awaited<ReturnType<typeof subscriptionSnapshot>>,userId:string,eventId:string|null=null){
 const {subscription:sub,access,observedAt}=snapshot;
 if(sub.metadata?.user_id!==userId||sub.metadata?.product!==PRODUCT)return;
 const end=Math.min(...sub.items.data.map(i=>i.current_period_end),sub.cancel_at||Infinity);
 if(!Number.isFinite(end))throw new Error('Invalid subscription period');
 const {error}=await adminClient().rpc('gpf_record_subscription_snapshot',{p_event_id:eventId,p_observed_at:observedAt,p_user_id:userId,p_subscription_id:sub.id,p_customer_id:typeof sub.customer==='string'?sub.customer:sub.customer.id,p_status:sub.status,p_period_end:new Date(end*1000).toISOString(),p_cancel:!!access.cancelAtPeriodEnd,p_entitled:access.active});
 if(error)throw new Error('Subscription synchronization unavailable');
}
export async function verifyPaidSubscription(id:string,userId:string):Promise<Access>{
 const snapshot=await subscriptionSnapshot(stripeClient(),id,userId);
 if(process.env.SUPABASE_SECRET_KEY)await recordSubscription(snapshot,userId);
 return snapshot.access;
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
