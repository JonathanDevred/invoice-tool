import {NextResponse} from 'next/server';
import Stripe from 'stripe';
import {stripeClient,PRODUCT,recordSubscription} from '@/lib/billing';
import {eventSubscriptions,subscriptionSnapshot} from '@/lib/subscriptions';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!process.env.STRIPE_WEBHOOK_SECRET)return NextResponse.json({error:'Webhook not configured.'},{status:503});
 const stripe=stripeClient();let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(await request.text(),request.headers.get('stripe-signature')||'',process.env.STRIPE_WEBHOOK_SECRET);}catch{return NextResponse.json({error:'Invalid signature.'},{status:400});}
 try{for(const id of await eventSubscriptions(stripe,event)){
  const sub=await stripe.subscriptions.retrieve(id);const userId=sub.metadata?.user_id;
  if(sub.metadata?.product!==PRODUCT||!userId||!/^[a-f0-9-]{36}$/i.test(userId))continue;
  const snapshot=await subscriptionSnapshot(stripe,id,userId);await recordSubscription(snapshot,userId,`${event.id}:${id}`);
 }return NextResponse.json({received:true});
 }catch{return NextResponse.json({error:'Subscription update could not be recorded. Retry this event.'},{status:500});}
}
