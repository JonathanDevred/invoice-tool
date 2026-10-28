import {NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {sameOrigin,siteUrl} from '@/lib/billing';
import {validEmail} from '@/lib/invoices';
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 try{
  const body=await request.json();const client=await serverClient();
  if(body.action==='google'){const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${siteUrl()}/auth/callback`,scopes:'openid email profile',queryParams:{prompt:'select_account'}}});if(error)throw error;return NextResponse.json({url:data.url});}
  if(body.action!=='signout'&&process.env.EMAIL_AUTH_ENABLED!=='true')return NextResponse.json({error:'Use Continue with Google to access your account.'},{status:400});
  if(body.action==='signout'){const {error}=await client.auth.signOut();if(error)throw error;return NextResponse.json({ok:true});}
  if(body.action==='update-password'){if(typeof body.password!=='string'||body.password.length<10||body.password.length>200)return NextResponse.json({error:'Use a password with at least 10 characters.'},{status:400});const {error}=await client.auth.updateUser({password:body.password});if(error)throw error;return NextResponse.json({ok:true});}
  if(typeof body.email!=='string'||body.email.length>200||!validEmail(body.email))return NextResponse.json({error:'Enter a valid email address.'},{status:400});
  if(body.action==='reset'){const {error}=await client.auth.resetPasswordForEmail(body.email,{redirectTo:`${siteUrl()}/auth/callback?next=/reset-password`});if(error)throw error;return NextResponse.json({message:'If an account exists, a reset link has been sent. Check your inbox.'});}
  if(body.action==='resend'){const {error}=await client.auth.resend({type:'signup',email:body.email,options:{emailRedirectTo:`${siteUrl()}/auth/callback`}});if(error)throw error;return NextResponse.json({message:'If confirmation is pending, a new link has been sent.'});}
  if(typeof body.password!=='string'||body.password.length<10||body.password.length>200)return NextResponse.json({error:'Use a password with at least 10 characters.'},{status:400});
  if(body.action==='signup'){const {data,error}=await client.auth.signUp({email:body.email,password:body.password,options:{emailRedirectTo:`${siteUrl()}/auth/callback`}});if(error)throw error;return NextResponse.json(data.session?{ok:true}:{message:'Check your email to confirm your account, then sign in.'});}
  if(body.action!=='login')return NextResponse.json({error:'Invalid authentication request.'},{status:400});
  const {error}=await client.auth.signInWithPassword({email:body.email,password:body.password});if(error)throw error;return NextResponse.json({ok:true});
 }catch(error){const code=(error as {code?:string}).code;const messages:Record<string,string>={invalid_credentials:'The email or password is incorrect.',email_not_confirmed:'Confirm your email before signing in.',over_email_send_rate_limit:'Too many email requests. Please wait before trying again.',over_request_rate_limit:'Too many attempts. Please try again shortly.',email_address_not_authorized:'Email delivery is not yet configured for this address. Please try again after email service setup.',weak_password:'Choose a stronger password with at least 10 characters.'};return NextResponse.json({error:messages[code||'']||'We could not complete this request. Please try again shortly.'},{status:400});}
}
