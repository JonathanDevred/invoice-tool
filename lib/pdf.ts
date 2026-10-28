import { jsPDF } from 'jspdf';
import { totals, prettyDate, received, balance, type Invoice } from './invoices';

// Keep the PDF renderer on the server: paid branding is decided by verified access.
export function createInvoicePdf(invoice: Invoice, clean: boolean) {
  const pdf=new jsPDF({unit:'mm',format:'a4'});
  const title=invoice.kind==='quote'?'QUOTE':'INVOICE';
  const accent=invoice.accent; const margin=19; let y=22;
  const safe=(s:string)=>s.replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/…/g,'...');
  const amount=(n:number)=>`${invoice.currency} ${n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const text=(s:string,x:number,yy:number,size=10,color='#30364b',bold=false,align:'left'|'right'='left')=>{
    pdf.setFont(invoice.template==='classic'?'times':'helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(color);pdf.text(safe(s),x,yy,{align});
  };
  const next=()=>{pdf.addPage();y=23;text(`${title} ${invoice.number} · CONTINUED`,margin,13,8,'#959aaf');};
  const room=(h:number)=>{if(y+h>274)next();};
  const paragraph=(value:string,width:number,x=margin,size=9)=>{
    pdf.setFont(invoice.template==='classic'?'times':'helvetica','normal');pdf.setFontSize(size);
    const lines=pdf.splitTextToSize(safe(value),width) as string[];
    for(const line of lines){room(5);text(line,x,y,size,'#7a829c');y+=4.8;}
  };
  if(invoice.template==='studio'){pdf.setFillColor(accent);pdf.rect(0,0,210,4,'F');}
  if(invoice.business.logo){const properties=pdf.getImageProperties(invoice.business.logo);const ratio=Math.min(42/properties.width,14/properties.height);pdf.addImage(invoice.business.logo,properties.fileType,margin,17,properties.width*ratio,properties.height*ratio);y=46;}
  const headingY=y;
  text(title,margin,y,30,accent,true);y+=9;
  text(invoice.number,margin,y,10,'#9094ab');
  text(invoice.kind==='quote'?'QUOTE TOTAL':invoice.status==='paid'?'PAID':'BALANCE DUE',191,headingY+1,8,'#9094ab',false,'right');
  text(amount(invoice.kind==='quote'?totals(invoice).total:balance(invoice)),191,headingY+11,16,accent,true,'right');
  y+=16;
  text(`Issued ${prettyDate(invoice.date)}   /   ${invoice.kind==='quote'?'Valid until':'Due'} ${prettyDate(invoice.due)}`,margin,y,9,'#9094ab');y+=12;
  text('FROM',margin,y,8,'#959aaf',true);y+=7;
  paragraph(invoice.business.name,172,margin,12);paragraph([invoice.business.email,invoice.business.address].filter(Boolean).join('\n'),172);y+=8;
  text('BILL TO',margin,y,8,'#959aaf',true);y+=7;
  paragraph(invoice.client.name,172,margin,12);paragraph([invoice.client.email,invoice.client.address].filter(Boolean).join('\n'),172);y+=10;
  const tableHeader=()=>{room(13);pdf.setFillColor('#f3f4fc');pdf.rect(margin,y-5,172,10,'F');text('DESCRIPTION',22,y+1,8,'#9299b2',true);text('QTY',132,y+1,8,'#9299b2',true,'right');text('RATE',159,y+1,8,'#9299b2',true,'right');text('AMOUNT',188,y+1,8,'#9299b2',true,'right');y+=13;};
  tableHeader();
  for(const item of invoice.items){
    pdf.setFontSize(9);const lines=pdf.splitTextToSize(safe(item.description),98) as string[];
    if(y+Math.min(lines.length*5+6,30)>270){next();tableHeader();}
    text(String(item.quantity),132,y,9,'#7a829c',false,'right');text(amount(item.rate),159,y,8,'#7a829c',false,'right');text(amount(Math.round(item.rate*item.quantity*100)/100),188,y,9,'#30364b',true,'right');
    for(const line of lines){if(y+5>270){next();tableHeader();}text(line,22,y,9);y+=5;}
    y+=5;pdf.setDrawColor('#e6e9f2');pdf.line(margin,y-3,191,y-3);
  }
  const t=totals(invoice);y+=7;room(52);
  const sum=(label:string,value:number,bold=false)=>{text(label,112,y,bold?11:9,'#9299b2',bold);text(amount(value),191,y,bold?12:9,bold?accent:'#30364b',bold,'right');y+=8;};
  sum('Subtotal',t.subtotal);if(invoice.discount)sum(`Discount (${invoice.discount}%)`,-t.discount);if(invoice.tax)sum(`Tax (${invoice.tax}%)`,t.tax);sum('Total',t.total,true);
  if(invoice.kind!=='quote'&&received(invoice)>0){sum('Payments received',-received(invoice));sum('Balance due',balance(invoice),true);}
  y+=9;
  if(invoice.payments?.length){room(18);text('PAYMENT RECORDS',margin,y,8,'#9094ab',true);y+=7;for(const p of invoice.payments){room(7);text(`${prettyDate(p.date)}  -  ${p.method}`,margin,y,9,'#747b95');text(amount(p.amount),191,y,9,accent,false,'right');y+=7;}y+=9;}
  for(const [label,value] of [['PAYMENT DETAILS',invoice.payment],['NOTES & TERMS',invoice.notes]]){
    if(!value)continue;room(18);text(label,margin,y,8,'#959aaf',true);y+=7;paragraph(value,172);y+=9;
  }
  const count=pdf.getNumberOfPages();
  for(let i=1;i<=count;i++){pdf.setPage(i);pdf.setDrawColor('#e6e9f2');pdf.line(margin,281,191,281);text(clean?invoice.business.name:'Created with GetPaidFast · getpaidfast.vercel.app',margin,287,8,'#959aaf');text(`${i} / ${count}`,191,287,8,'#959aaf',false,'right');}
  return pdf;
}
