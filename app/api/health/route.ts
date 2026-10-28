import {createClient} from '@supabase/supabase-js';
import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;const received=request.headers.get('authorization')||'';
 const expected=`Bearer ${secret}`;
 if(!secret||Buffer.byteLength(received)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(received),Buffer.from(expected)))return NextResponse.json({error:'Unauthorized.'},{status:401});
 try{const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await client.from('gpf_health').select('status').eq('id',1).single();if(error||data.status!=='ready')throw new Error('Database check failed');return NextResponse.json({ok:true,checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({ok:false},{status:503,headers:{'Cache-Control':'no-store'}});}
}
