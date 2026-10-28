import {NextResponse} from 'next/server';
import {currentUser,serverClient} from '@/lib/supabase/server';
import {cookies} from 'next/headers';
import {stripeClient,siteUrl,sameOrigin,getAccess,accountCheckoutSessions,SESSION_COOKIE,PRODUCT,DAY,cookieOptions} from '@/lib/billing';
import {PLAN} from '@/lib/plan';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Please start checkout from GetPaidFast.'},{status:403});
 if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_PRICE_ID)return NextResponse.json({error:'Checkout is temporarily unavailable. Please try again later.'},{status:503});
 try{
  const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in to subscribe to Pro.'},{status:401});
  const access=await getAccess();if(access.active)return NextResponse.json({active:true});
  const stripe=stripeClient();const jar=await cookies();const {sessions}=await accountCheckoutSessions();const candidateIds=Array.from(new Set([jar.get(SESSION_COOKIE)?.value,...sessions].filter(Boolean) as string[]));
  for(const oldId of candidateIds){if(!/^cs_[a-zA-Z0-9_]{10,240}$/.test(oldId))continue;const old=await stripe.checkout.sessions.retrieve(oldId).catch(()=>null);if(old?.status==='open'&&old.metadata?.user_id===user.id&&old.metadata?.product===PRODUCT&&old.url)return NextResponse.json({url:old.url});}
  if(access.status&&!['canceled','incomplete_expired'].includes(access.status))return NextResponse.json({manageBilling:true});
  const price=await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);if(price.unit_amount!==PLAN.amount||price.currency!==PLAN.currency||price.recurring?.interval!==PLAN.interval||price.recurring.interval_count!==1)throw new Error('Invalid plan configuration');
  const session=await stripe.checkout.sessions.create({mode:'subscription',payment_method_types:['card'],line_items:[{price:price.id,quantity:1}],client_reference_id:user.id,customer_email:user.email,metadata:{product:PRODUCT,user_id:user.id},subscription_data:{metadata:{product:PRODUCT,user_id:user.id}},custom_text:{submit:{message:'$5 USD per month, automatically renewed until canceled. Cancel at any time from your account. Access continues until the end of the paid billing period.'}},success_url:`${siteUrl()}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${siteUrl()}/app?checkout=cancelled`},{idempotencyKey:`gpf-monthly-${user.id}-${Math.floor(Date.now()/1800000)}`});
  const client=await serverClient();const {error}=await client.from('gpf_purchases').insert({session_id:session.id,user_id:user.id});if(error&&error.code!=='23505'){await stripe.checkout.sessions.expire(session.id);throw error;}
  const response=NextResponse.json({url:session.url});response.cookies.set(SESSION_COOKIE,session.id,{...cookieOptions,maxAge:365*DAY});return response;
 }catch{return NextResponse.json({error:'Secure checkout could not be opened. Please retry before making a payment.'},{status:503});}
}
