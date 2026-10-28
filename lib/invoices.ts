export const MAX_WORKSPACE_BYTES = 3 * 1024 * 1024;
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'MXN', 'AUD'] as const;
export type Currency = typeof CURRENCIES[number];
export type Item = { id: string; description: string; quantity: number; rate: number };
export type Contact = { id: string; name: string; email: string; address: string };
export type Payment = { id:string; date:string; amount:number; method:string };
export type Service = { id:string; name:string; rate:number; currency:Currency };
export type Business = { logo?:string; name: string; email: string; address: string; payment: string; currency: Currency; accent: string };
export type Invoice = {
  kind?: 'invoice'|'quote'; quoteStatus?: 'pending'|'accepted'|'declined'; payments?:Payment[]; archived?:boolean;
  id: string; number: string; client: Contact; business: Business; date: string; due: string;
  currency: Currency; status: 'draft' | 'sent' | 'paid'; items: Item[]; tax: number; discount: number;
  notes: string; payment: string; template: 'studio' | 'minimal' | 'classic'; accent: string;
};
export type Workspace = { numbering?:{invoice:number;quote:number}; version: 1; demo: boolean; business: Business; clients: Contact[]; services?:Service[]; invoices: Invoice[] };
export const ACCENTS = ['#5359e8', '#7c4dce', '#2563b5', '#28344c'];
export const STORAGE_KEY = 'getpaidfast.workspace.v1';
export const uid = () => crypto.randomUUID();
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const datePlus = (days: number) => { const d = new Date(); d.setDate(d.getDate()+days); return localDate(d); };
export const money = (amount: number, currency: Currency) => new Intl.NumberFormat('en-US', {style:'currency', currency, currencyDisplay:'narrowSymbol'}).format(amount);
export const prettyDate = (date: string) => date ? new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
export function totals(invoice: Pick<Invoice,'items'|'tax'|'discount'>) {
  const subtotal = invoice.items.reduce((sum,item) => sum + Math.round(item.quantity*item.rate*100),0);
  const discount = Math.round(subtotal*invoice.discount/100);
  const tax = Math.round((subtotal-discount)*invoice.tax/100);
  return { subtotal: subtotal/100, discount: discount/100, tax: tax/100, total:(subtotal-discount+tax)/100 };
}
export function received(invoice:Invoice){return invoice.status==='paid'?totals(invoice).total:Math.round((invoice.payments||[]).reduce((s,p)=>s+p.amount,0)*100)/100;}
export function balance(invoice:Invoice){return Math.max(0,Math.round((totals(invoice).total-received(invoice))*100)/100);}
export function statusOf(invoice: Invoice, today=localDate()) {
  if(invoice.kind==='quote')return invoice.quoteStatus&&invoice.quoteStatus!=='pending'?invoice.quoteStatus:invoice.status;
  return invoice.status === 'sent' && invoice.due < today ? 'overdue' : invoice.status==='sent'&&received(invoice)>0?'partial':invoice.status;
}
export function nextNumber(source:Invoice[]|Workspace,kind:'invoice'|'quote'='invoice') {
  const invoices=Array.isArray(source)?source:source.invoices;const prefix=kind==='quote'?'QUO':'INV';
  let next=Array.isArray(source)?1:source.numbering?.[kind]||1;
  for(const invoice of invoices){const match=invoice.number.trim().match(new RegExp(`^${prefix}-(\\d+)$`,'i'));if(match){const n=Number(match[1]);if(Number.isSafeInteger(n)&&n<Number.MAX_SAFE_INTEGER)next=Math.max(next,n+1);}}
  return `${prefix}-${String(next).padStart(4,'0')}`;
}
export function numberingFor(workspace:Workspace){return {invoice:Number(nextNumber(workspace).slice(4)),quote:Number(nextNumber(workspace,'quote').slice(4))};}
export function emptyWorkspace(): Workspace {
  return {version:1,demo:false,business:{name:'',email:'',address:'',payment:'',currency:'USD',accent:ACCENTS[0]},clients:[],services:[],invoices:[]};
}
export function newInvoice(workspace: Workspace): Invoice {
  return {kind:'invoice',payments:[],id:uid(),number:nextNumber(workspace),client:{id:'',name:'',email:'',address:''},business:{...workspace.business},date:localDate(),due:datePlus(14),currency:workspace.business.currency,status:'draft',items:[{id:uid(),description:'',quantity:1,rate:0}],tax:0,discount:0,notes:'Thank you for your business.',payment:workspace.business.payment,template:'studio',accent:workspace.business.accent};
}
export function demoWorkspace(): Workspace {
  const workspace=emptyWorkspace(); workspace.demo=true;
  workspace.business={name:'Alex Morgan Studio',email:'hello@example.com',address:'Independent design & creative direction',payment:'Bank transfer · Please use the invoice number as your reference.',currency:'USD',accent:ACCENTS[0]};
  workspace.clients=[{id:uid(),name:'Forma Studio',email:'accounts@forma.example',address:'Brooklyn, New York'},{id:uid(),name:'Olive & Earth',email:'hello@olive.example',address:'Austin, Texas'},{id:uid(),name:'Northstar Co.',email:'finance@northstar.example',address:'Portland, Oregon'},{id:uid(),name:'The Good Company',email:'team@good.example',address:'Los Angeles, California'}];
  workspace.invoices=Array.from({length:8},(_,index)=>({...newInvoice(workspace),number:`INV-${String(128-index).padStart(4,'0')}`,client:workspace.clients[index%4],date:datePlus(-index*8-2),due:datePlus(index===2?-3:14-index*3),status:(['sent','paid','sent','draft','paid','paid','sent','paid'] as const)[index],items:[{id:uid(),description:['Brand identity & creative direction','Website design — final milestone','Creative strategy workshop','Monthly design retainer'][index%4],quantity:1,rate:[2400,1850,950,3200,1200,2800,1650,2100][index]}]}));
  workspace.services=[{id:uid(),name:'Brand identity & creative direction',rate:2400,currency:'USD'},{id:uid(),name:'Website design',rate:1850,currency:'USD'},{id:uid(),name:'Consulting — hourly',rate:150,currency:'USD'}];
  return workspace;
}
export function invoiceError(invoice: Invoice, invoices: Invoice[] = []): string | null {
  if (!invoice.number.trim()) return 'Add an invoice number.';
  if (invoices.some(i=>i.id!==invoice.id && i.number.toLowerCase()===invoice.number.trim().toLowerCase())) return 'This invoice number already exists. Choose a unique number.';
  if (!invoice.business.name.trim()) return 'Add your business name in the From section.';
  if (!invoice.client.name.trim()) return 'Add a client name.';
  if (!validDate(invoice.date) || !validDate(invoice.due)) return 'Choose valid invoice and due dates.';
  if (invoice.due < invoice.date) return 'The due date must be on or after the invoice date.';
  if (invoice.items.length===0 || invoice.items.some(i=>!i.description.trim() || !Number.isFinite(i.quantity) || i.quantity<=0 || i.quantity>100000 || !Number.isFinite(i.rate) || i.rate<0 || i.rate>100000000)) return 'Each item needs a description, a positive quantity, and a valid rate.';
  if (![invoice.tax,invoice.discount].every(n=>Number.isFinite(n)&&n>=0&&n<=100)) return 'Tax and discount must be between 0 and 100%.';
  if (invoice.business.email && !validEmail(invoice.business.email) || invoice.client.email && !validEmail(invoice.client.email)) return 'Check the email address format.';
  if(totals(invoice).total>10000000000)return 'The invoice total exceeds the supported limit.';
  if(invoice.kind==='quote'&&invoice.status==='paid')return 'Quotes cannot be marked paid. Convert the quote to an invoice first.';
  const payments=invoice.payments||[];
  if(payments.some(p=>!validDate(p.date)||!Number.isFinite(p.amount)||p.amount<=0)||Math.round(payments.reduce((s,p)=>s+p.amount,0)*100)>Math.round(totals(invoice).total*100))return 'Recorded payments must be valid and cannot exceed the invoice total.';
  if(invoice.status==='draft'&&payments.length)return 'An invoice with recorded payments cannot be a draft.';
  if(invoice.kind==='quote'&&payments.length)return 'Payments can only be recorded on invoices.';
  return null;
}
export const validEmail = (s:string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const validDate = (s:string) => /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&localDate(new Date(s+'T12:00:00'))===s;
const obj = (v:unknown):v is Record<string,unknown> => typeof v==='object'&&v!==null&&!Array.isArray(v);
const str = (v:unknown, max=5000):v is string => typeof v==='string'&&v.length<=max;
const num = (v:unknown,max:number):v is number => typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
const contact = (v:unknown):v is Contact => obj(v)&&str(v.id,100)&&str(v.name,200)&&str(v.email,200)&&str(v.address);
const currency = (v:unknown):v is Currency => CURRENCIES.includes(v as Currency);
const logo=(v:unknown)=>{
  if(v===undefined)return true;
  if(typeof v!=='string'||v.length>600000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v))return false;
  try{const header=atob(v.split(',')[1].slice(0,44));if(header.slice(0,8)!=='\x89PNG\r\n\x1a\n')return false;const size=(offset:number)=>[0,1,2,3].reduce((n,j)=>n*256+header.charCodeAt(offset+j),0);return size(16)>0&&size(16)<=800&&size(20)>0&&size(20)<=400;}catch{return false;}
};
const business = (v:unknown):v is Business => obj(v)&&logo(v.logo)&&str(v.name,200)&&str(v.email,200)&&str(v.address)&&str(v.payment)&&currency(v.currency)&&ACCENTS.includes(String(v.accent));
export function parseWorkspace(raw:string): Workspace {
  if(new TextEncoder().encode(raw).byteLength>MAX_WORKSPACE_BYTES)throw new Error('Workspace exceeds the 3 MB limit. Export a backup and reduce embedded logos or remove older documents.');
  const data:unknown=JSON.parse(raw);
  const oldColors=['#335c48','#3f5295','#9b5b46','#262626'];
  if(obj(data)){const normalize=(v:unknown)=>{if(obj(v)&&oldColors.includes(String(v.accent)))v.accent=ACCENTS[oldColors.indexOf(String(v.accent))];};normalize(data.business);if(Array.isArray(data.invoices))for(const i of data.invoices)if(obj(i)){normalize(i);normalize(i.business);}}
  if (!obj(data)||data.version!==1||typeof data.demo!=='boolean'||!business(data.business)||!Array.isArray(data.clients)||data.clients.length>2000||!data.clients.every(contact)||!Array.isArray(data.invoices)||data.invoices.length>2000) throw new Error('This is not a valid GetPaidFast backup.');
  if(data.numbering!==undefined&&(!obj(data.numbering)||!Number.isSafeInteger(data.numbering.invoice)||!num(data.numbering.invoice,Number.MAX_SAFE_INTEGER)||data.numbering.invoice<1||!Number.isSafeInteger(data.numbering.quote)||!num(data.numbering.quote,Number.MAX_SAFE_INTEGER)||data.numbering.quote<1))throw new Error('The backup contains invalid document numbering.');
  if(data.services!==undefined&&(!Array.isArray(data.services)||data.services.length>2000||!data.services.every(v=>obj(v)&&str(v.id,100)&&str(v.name,200)&&num(v.rate,100000000)&&currency(v.currency))))throw new Error('The backup contains an invalid service.');
  for (const i of data.invoices) {
    if (!obj(i)||!str(i.id,100)||!str(i.number,100)||!contact(i.client)||!business(i.business)||!currency(i.currency)||!str(i.date,10)||!validDate(i.date)||!str(i.due,10)||!validDate(i.due)||!['draft','sent','paid'].includes(String(i.status))||!['studio','minimal','classic'].includes(String(i.template))||!ACCENTS.includes(String(i.accent))||!num(i.tax,100)||!num(i.discount,100)||!str(i.notes)||!str(i.payment)||!Array.isArray(i.items)||!i.items.length||i.items.length>200||!i.items.every(it=>obj(it)&&str(it.id,100)&&str(it.description,5000)&&num(it.quantity,100000)&&it.quantity>0&&num(it.rate,100000000))) throw new Error('The backup contains an invalid invoice.');
    if(i.kind!==undefined&&!['invoice','quote'].includes(String(i.kind))||i.quoteStatus!==undefined&&!['pending','accepted','declined'].includes(String(i.quoteStatus))||i.archived!==undefined&&typeof i.archived!=='boolean'||i.payments!==undefined&&(!Array.isArray(i.payments)||i.payments.length>200||!i.payments.every(p=>obj(p)&&str(p.id,100)&&str(p.date,10)&&validDate(p.date)&&num(p.amount,100000000000000)&&p.amount>0&&str(p.method,200))))throw new Error('The backup contains invalid document details.');
    if (new Set(i.items.map(it=>it.id)).size!==i.items.length) throw new Error('The backup contains duplicate item IDs.');
  }
  if (new Set(data.invoices.map(i=>i.id)).size!==data.invoices.length||new Set(data.clients.map(c=>c.id)).size!==data.clients.length||new Set(data.invoices.map(i=>i.number.toLowerCase())).size!==data.invoices.length) throw new Error('The backup contains duplicate records.');
  return data as unknown as Workspace;
}
export function downloadFile(content:Blob,filename:string) {
  const url=URL.createObjectURL(content);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
