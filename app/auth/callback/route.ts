import {NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {siteUrl} from '@/lib/billing';
export async function GET(request:Request){
 const url=new URL(request.url);const code=url.searchParams.get('code');const next=url.searchParams.get('next')==='/reset-password'?'/reset-password':'/app';
 if(code){const client=await serverClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(next,siteUrl()));}
 return NextResponse.redirect(new URL('/login?error=confirmation',siteUrl()));
}
