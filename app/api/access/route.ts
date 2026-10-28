import {NextResponse} from 'next/server';
import {getAccess,sameOrigin,SESSION_COOKIE,cookieOptions,DAY} from '@/lib/billing';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){try{return NextResponse.json(await getAccess(),{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Unable to verify your subscription. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
  try{
    const body=await request.json();if(typeof body.sessionId!=='string'||body.sessionId.length>255)return NextResponse.json({error:'Invalid checkout.'},{status:400});
    const access=await getAccess(body.sessionId);const response=NextResponse.json(access,{headers:{'Cache-Control':'no-store'}});
    if(access.active)response.cookies.set(SESSION_COOKIE,body.sessionId,{...cookieOptions,maxAge:7*DAY});return response;
  }catch{return NextResponse.json({error:'Unable to verify your payment. Use Restore access to try again.'},{status:503});}
}
