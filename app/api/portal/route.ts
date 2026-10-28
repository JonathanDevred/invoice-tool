import {NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {accountCheckoutSessions,stripeClient,PRODUCT,sameOrigin,siteUrl} from '@/lib/billing';
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 try{const {user,sessions}=await accountCheckoutSessions();if(!user)return NextResponse.json({error:'Please sign in.'},{status:401});const stripe=stripeClient();
 const client=await serverClient();const {data:stored,error}=await client.from('gpf_subscriptions').select('subscription_id').eq('user_id',user.id).maybeSingle();if(error)throw error;
 if(stored){const sub=await stripe.subscriptions.retrieve(stored.subscription_id);if(sub.metadata?.user_id===user.id&&sub.metadata?.product===PRODUCT){const portal=await stripe.billingPortal.sessions.create({customer:typeof sub.customer==='string'?sub.customer:sub.customer.id,configuration:process.env.STRIPE_PORTAL_CONFIGURATION_ID,return_url:`${siteUrl()}/app`});return NextResponse.json({url:portal.url});}}
 for(const id of sessions){const checkout=await stripe.checkout.sessions.retrieve(id);if(checkout.metadata?.user_id!==user.id||checkout.metadata?.product!==PRODUCT||checkout.status!=='complete'||checkout.mode!=='subscription'||!checkout.customer)continue;
 const portal=await stripe.billingPortal.sessions.create({customer:typeof checkout.customer==='string'?checkout.customer:checkout.customer.id,configuration:process.env.STRIPE_PORTAL_CONFIGURATION_ID,return_url:`${siteUrl()}/app`});return NextResponse.json({url:portal.url});}
 return NextResponse.json({error:'No subscription billing account was found.'},{status:404});
 }catch{return NextResponse.json({error:'Billing management is temporarily unavailable. Please retry.'},{status:503});}
}
