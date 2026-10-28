import {NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {parseWorkspace,emptyWorkspace,MAX_WORKSPACE_BYTES} from '@/lib/invoices';
import {sameOrigin,getAccess} from '@/lib/billing';
export const dynamic='force-dynamic';
export async function GET(){
 try{const client=await serverClient();const {data:{user}}=await client.auth.getUser();if(!user)return NextResponse.json({error:'Please sign in again.'},{status:401});
 const {data,error}=await client.from('gpf_workspaces').select('payload,revision').eq('user_id',user.id).maybeSingle();if(error)throw error;
 return NextResponse.json({workspace:data?parseWorkspace(JSON.stringify(data.payload)):emptyWorkspace(),revision:data?.revision||0},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Your workspace could not be loaded. Please retry.'},{status:503});}
}
export async function PUT(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
 try{const client=await serverClient();const {data:{user}}=await client.auth.getUser();if(!user)return NextResponse.json({error:'Please sign in again. Your changes remain in this browser.'},{status:401});
 const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>MAX_WORKSPACE_BYTES+4096)return NextResponse.json({error:'Workspace exceeds the 3 MB limit. Export a backup and reduce embedded logo sizes.'},{status:413});
 const body=JSON.parse(raw);if(!Number.isSafeInteger(body.revision)||body.revision<0)return NextResponse.json({error:'Invalid workspace revision.'},{status:400});
 if(new TextEncoder().encode(JSON.stringify(body.workspace)).byteLength>MAX_WORKSPACE_BYTES)return NextResponse.json({error:'Workspace exceeds the 3 MB limit. Export a backup and reduce embedded logos.'},{status:413});
 const payload=parseWorkspace(JSON.stringify(body.workspace));payload.demo=false;
 if(payload.invoices.length>10){const {data:current,error}=await client.from('gpf_workspaces').select('payload').eq('user_id',user.id).maybeSingle();if(error)throw error;const previousCount=current?.payload?.invoices?.length||0;if(payload.invoices.length>previousCount&&!(await getAccess()).active)return NextResponse.json({error:'The free plan includes 10 saved documents. Subscribe to Pro to add more documents.'},{status:402});}
 const query=body.revision===0?client.from('gpf_workspaces').insert({user_id:user.id,payload,revision:1}):client.from('gpf_workspaces').update({payload,revision:body.revision+1,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('revision',body.revision);
 const {data,error}=await query.select('revision').maybeSingle();
 if(error?.code==='23505'||!error&&!data)return NextResponse.json({error:'This workspace changed on another device. Download your local backup, then reload to review the latest version.',conflict:true},{status:409});
 if(error)throw error;return NextResponse.json({revision:data!.revision},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Cloud save failed. Your local recovery copy has been kept.'},{status:503});}
}
