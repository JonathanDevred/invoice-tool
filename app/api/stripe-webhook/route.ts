import {NextResponse} from 'next/server';
import Stripe from 'stripe';
import {stripeClient,PRODUCT} from '@/lib/billing';
import {adminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!process.env.STRIPE_WEBHOOK_SECRET)return NextResponse.json({error:'Webhook not configured.'},{status:503});
 const stripe=stripeClient();let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(await request.text(),request.headers.get('stripe-signature')||'',process.env.STRIPE_WEBHOOK_SECRET);}catch{return NextResponse.json({error:'Invalid signature.'},{status:400});}
 try{
 let subscriptionId:string|null=null;
 if(event.type.startsWith('customer.subscription.'))subscriptionId=(event.data.object as Stripe.Subscription).id;
 if(event.type==='checkout.session.completed'){const s=event.data.object as Stripe.Checkout.Session;subscriptionId=typeof s.subscription==='string'?s.subscription:s.subscription?.id||null;}
 if(event.type==='invoice.paid'||event.type==='invoice.payment_failed'){const invoice=event.data.object as Stripe.Invoice;const s=invoice.parent?.subscription_details?.subscription;subscriptionId=typeof s==='string'?s:s?.id||null;}
 if(!subscriptionId)return NextResponse.json({received:true});
 const sub=await stripe.subscriptions.retrieve(subscriptionId);const userId=sub.metadata?.user_id;
 if(sub.metadata?.product!==PRODUCT||!userId||!/^[a-f0-9-]{36}$/i.test(userId))return NextResponse.json({received:true});
 const {error}=await adminClient().rpc('gpf_apply_subscription_event',{p_event_id:event.id,p_event_created:event.created,p_user_id:userId,p_subscription_id:sub.id,p_customer_id:typeof sub.customer==='string'?sub.customer:sub.customer.id,p_status:sub.status,p_period_end:new Date(Math.min(...sub.items.data.map(i=>i.current_period_end))*1000).toISOString(),p_cancel:sub.cancel_at_period_end});
 if(error)throw error;return NextResponse.json({received:true});
 }catch{return NextResponse.json({error:'Subscription update could not be recorded. Retry this event.'},{status:500});}
}
