import {NextResponse} from 'next/server';
import {sameOrigin,getAccess} from '@/lib/billing';
import {parseWorkspace,emptyWorkspace,invoiceError} from '@/lib/invoices';
import {createInvoicePdf} from '@/lib/pdf';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Invalid request origin.'},{status:403});
  const raw=await request.text();if(raw.length>1024*1024)return NextResponse.json({error:'This invoice is too large.'},{status:413});
  let invoice;
  try{const parsed=JSON.parse(raw);invoice=parseWorkspace(JSON.stringify({...emptyWorkspace(),invoices:[parsed]})).invoices[0];const error=invoiceError(invoice);if(error)throw new Error(error);}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Check your invoice details.'},{status:400});}
  try{
    const access=await getAccess();const pdf=createInvoicePdf(invoice,access.active);
    return new Response(pdf.output('arraybuffer'),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${invoice.number.replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-GPF-Clean':String(access.active)}});
  }catch{return NextResponse.json({error:'We could not verify access or create your PDF. Please try again.'},{status:503});}
}
