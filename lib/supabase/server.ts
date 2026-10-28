import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export function authConfigured(){return !!process.env.NEXT_PUBLIC_SUPABASE_URL&&!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;}
export async function serverClient(){
 if(!authConfigured())throw new Error('Authentication is not configured.');
 const jar=await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  cookieOptions:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'},
  cookies:{getAll:()=>jar.getAll(),setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Proxy refreshes cookies before Server Components render. */}}}
 });
}
export async function currentUser(){if(!authConfigured())return null;const client=await serverClient();const {data,error}=await client.auth.getUser();if(error)return null;return data.user;}
