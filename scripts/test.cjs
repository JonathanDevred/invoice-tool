/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner transpiles project TypeScript in memory. */
const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');const assert=require('node:assert/strict');
require.extensions['.ts']=(module,filename)=>{const source=fs.readFileSync(filename,'utf8');const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}});module._compile(output.outputText,filename);};
const {totals,balance,received,newInvoice,emptyWorkspace,demoWorkspace,parseWorkspace,invoiceError,statusOf,nextNumber,numberingFor}=require('../lib/invoices.ts');
const {verifySubscription,PRODUCT}=require('../lib/billing.ts');
const {createInvoicePdf}=require('../lib/pdf.ts');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
const workspace=demoWorkspace();const base={...workspace.invoices[0],status:'sent',items:[{id:'a',description:'Service',quantity:3,rate:19.99}],discount:10,tax:20,payments:[]};
test('Line amounts round in cents; discount precedes tax',()=>assert.deepEqual(totals(base),{subtotal:59.97,discount:6,tax:10.79,total:64.76}));
test('Decimal quantity is supported',()=>assert.equal(totals({...base,items:[{id:'1',description:'Hours',quantity:1.5,rate:125}],tax:0,discount:0}).total,187.5));
test('Full discount yields zero total and zero tax',()=>assert.equal(totals({...base,discount:100}).total,0));
test('Partial payments reduce balance',()=>{const i={...base,payments:[{id:'p',date:'2026-01-01',amount:20,method:'Bank'}]};assert.equal(received(i),20);assert.equal(balance(i),44.76);assert.equal(statusOf(i,'2000-01-01'),'partial');});
test('Overdue status excludes paid invoices',()=>assert.equal(statusOf({...base,status:'paid'},'2099-01-01'),'paid'));
test('Draft does not become overdue',()=>assert.equal(statusOf({...base,status:'draft'},'2099-01-01'),'draft'));
test('Quote acceptance is tracked',()=>assert.equal(statusOf({...base,kind:'quote',quoteStatus:'accepted'}),'accepted'));
test('Invoice numbering follows the highest existing number',()=>assert.equal(nextNumber(workspace),'INV-0129'));
test('Quote numbering has a separate sequence',()=>assert.equal(nextNumber(workspace,'quote'),'QUO-0001'));
test('Removing the last document does not reuse its number',()=>{const retained={...workspace,numbering:numberingFor(workspace),invoices:[]};assert.equal(nextNumber(retained),'INV-0129');});
test('Invalid backup numbering is rejected',()=>assert.throws(()=>parseWorkspace(JSON.stringify({...workspace,numbering:{invoice:-1,quote:1}}))));
test('Invoice requires client and business details',()=>assert.ok(invoiceError(newInvoice(emptyWorkspace()))));
test('Duplicate invoice number is rejected',()=>assert.match(invoiceError({...base,id:'different'},[base]),/already exists/));
test('Negative rate is rejected',()=>assert.ok(invoiceError({...base,items:[{...base.items[0],rate:-1}]})));
test('Overpayments are rejected',()=>assert.ok(invoiceError({...base,payments:[{id:'p',date:'2026-01-01',amount:100,method:'Bank'}]})));
test('Quotes cannot receive payments',()=>assert.ok(invoiceError({...base,kind:'quote',payments:[{id:'p',date:'2026-01-01',amount:5,method:'Bank'}]})));
test('Valid workspace backup round-trips',()=>assert.deepEqual(parseWorkspace(JSON.stringify(workspace)),workspace));
test('Oversized backups count UTF-8 bytes, including multibyte text',()=>assert.throws(()=>parseWorkspace(JSON.stringify({padding:'é'.repeat(1600000)})),/3 MB/));
test('Invalid currency backup is rejected',()=>assert.throws(()=>parseWorkspace(JSON.stringify({...workspace,business:{...workspace.business,currency:'XXX'}}))));
test('Duplicate document IDs are rejected',()=>assert.throws(()=>parseWorkspace(JSON.stringify({...workspace,invoices:[base,base]}))));
test('Malformed logo URL is rejected',()=>assert.throws(()=>parseWorkspace(JSON.stringify({...workspace,business:{...workspace.business,logo:'https://evil.example/pixel'}}))));
const now=Date.now();const end=Math.floor(now/1000)+86400;const user='11111111-1111-4111-8111-111111111111';const sub={id:'sub_example',livemode:true,status:'active',pause_collection:null,cancel_at_period_end:false,metadata:{product:PRODUCT,user_id:user},items:{data:[{quantity:1,current_period_end:end,price:{id:'price_monthly',currency:'usd',unit_amount:500,recurring:{interval:'month',interval_count:1}}}]},latest_invoice:{id:'in_example',status:'paid',amount_paid:500}};
const access=(value,owner=user,time=now)=>verifySubscription(value,owner,time,'price_monthly');
test('Paid $5 monthly subscription grants access',()=>assert.equal(access(sub).active,true));
test('Subscription belongs to its signed-in owner',()=>assert.equal(access(sub,'22222222-2222-4222-8222-222222222222').active,false));
test('Canceled renewal retains access until paid period ends',()=>assert.equal(access({...sub,cancel_at_period_end:true}).active,true));
test('Stripe portal scheduled cancellation shows the end date even without its legacy flag',()=>{const value=access({...sub,cancel_at_period_end:false,cancel_at:end});assert.equal(value.active,true);assert.equal(value.cancelAtPeriodEnd,true);assert.equal(value.expiresAt,end*1000);});
test('Access ends exactly at billing period end',()=>assert.equal(access(sub,user,end*1000).active,false));
test('Immediate cancellation ends access',()=>assert.equal(access({...sub,status:'canceled'}).active,false));
test('Unpaid renewal cannot grant access',()=>assert.equal(access({...sub,status:'past_due'}).active,false));
test('Unpaid latest invoice cannot grant access',()=>assert.equal(access({...sub,latest_invoice:{...sub.latest_invoice,status:'open'}}).active,false));
test('Unexpanded invoice cannot grant access',()=>assert.equal(access({...sub,latest_invoice:'in_example'}).active,false));
test('Paused collection cannot grant access',()=>assert.equal(access({...sub,pause_collection:{behavior:'void'}}).active,false));
test('Unrelated product cannot grant access',()=>assert.equal(access({...sub,metadata:{...sub.metadata,product:'other'}}).active,false));
test('Wrong Stripe price is rejected',()=>assert.equal(access({...sub,items:{data:[{...sub.items.data[0],price:{...sub.items.data[0].price,id:'price_other'}}]}}).active,false));
test('Annual price cannot masquerade as monthly',()=>assert.equal(access({...sub,items:{data:[{...sub.items.data[0],price:{...sub.items.data[0].price,recurring:{interval:'year',interval_count:1}}}]}}).active,false));
test('Unexpected quantity is rejected',()=>assert.equal(access({...sub,items:{data:[{...sub.items.data[0],quantity:2}]}}).active,false));
test('Additional subscription line items are rejected',()=>assert.equal(access({...sub,items:{data:[...sub.items.data,...sub.items.data]}}).active,false));
test('Scheduled immediate cancellation caps paid access',()=>assert.equal(access({...sub,cancel_at:Math.floor(now/1000)-1}).active,false));
const qa=path.join(__dirname,'../.qa');fs.mkdirSync(qa,{recursive:true});
test('Long PDF paginates and retains final notes',()=>{const long={...base,items:Array.from({length:80},(_,i)=>({id:String(i),description:`Service ${i+1} - Detailed project work with a multiline description. `.repeat(3),quantity:1,rate:99.95})),notes:'FINAL-NOTE-VERIFIED'};const pdf=createInvoicePdf(long,false);assert.ok(pdf.getNumberOfPages()>2);assert.ok(pdf.output().includes('FINAL-NOTE-VERIFIED'));assert.ok(pdf.output().includes('Created with GetPaidFast'));fs.writeFileSync(path.join(qa,'long-invoice.pdf'),Buffer.from(pdf.output('arraybuffer')));});
test('Verified clean PDF removes only the footer branding',()=>{const pdf=createInvoicePdf(base,true);assert.ok(!pdf.output().includes('Created with GetPaidFast'));fs.writeFileSync(path.join(qa,'clean-invoice.pdf'),Buffer.from(pdf.output('arraybuffer')));});
test('Quote PDF carries quote title',()=>assert.ok(createInvoicePdf({...base,kind:'quote'},false).output().includes('(QUOTE)')));
const {subscriptionSnapshot,eventSubscriptions}=require('../lib/subscriptions.ts');
async function asyncTest(name,fn){await fn();passed++;console.log('PASS '+name);}
function billingFixture(change={}){
 const current={...structuredClone(sub),customer:'cus_fixture',...change};
 const paid={amount_paid:500,invoice:{id:'in_example',parent:{subscription_details:{subscription:'sub_example'}}},payment:{type:'payment_intent',payment_intent:{latest_charge:{id:'ch_fixture',paid:true,refunded:false,disputed:false,amount_refunded:0}}}};
 const fixtures={current,payments:[paid],charge:{id:'ch_fixture',payment_intent:'pi_fixture'}};
 fixtures.client={subscriptions:{retrieve:async()=>fixtures.current},charges:{retrieve:async()=>fixtures.charge},invoicePayments:{list:()=>({async *[Symbol.asyncIterator](){for(const payment of fixtures.payments)yield payment;}})}};
 return fixtures;
}
(async()=>{
 await asyncTest('Verified paid Stripe invoice grants Pro',async()=>{const f=billingFixture();assert.equal((await subscriptionSnapshot(f.client,'sub_example',user,'price_monthly')).access.active,true);});
 for(const [name,change] of [['Refunded invoice revokes Pro',{refunded:true}],['Partial refund revokes Pro',{amount_refunded:100}],['Disputed charge revokes Pro',{disputed:true}],['Unpaid charge cannot grant Pro',{paid:false}]]){
  await asyncTest(name,async()=>{const f=billingFixture();Object.assign(f.payments[0].payment.payment_intent.latest_charge,change);assert.equal((await subscriptionSnapshot(f.client,'sub_example',user,'price_monthly')).access.active,false);});
 }
 await asyncTest('Missing payment confirmation cannot grant Pro',async()=>{const f=billingFixture();f.payments=[];assert.equal((await subscriptionSnapshot(f.client,'sub_example',user,'price_monthly')).access.active,false);});
 await asyncTest('Invoice payments aggregate across all pages',async()=>{const f=billingFixture();f.payments=Array.from({length:15},()=>({...structuredClone(f.payments[0]),amount_paid:40}));assert.equal((await subscriptionSnapshot(f.client,'sub_example',user,'price_monthly')).access.active,true);});
 test('Past-due subscribers retain billing management access',()=>assert.equal(access({...sub,status:'past_due'}).portalAvailable,true));
 test('Canceled subscribers retain billing management access',()=>assert.equal(access({...sub,status:'canceled'}).portalAvailable,true));
 test('Foreign account cannot manage another subscription',()=>assert.equal(access(sub,'other-user').portalAvailable,false));
 await asyncTest('Refund event resolves its subscription through invoice payments',async()=>{const f=billingFixture();assert.deepEqual(await eventSubscriptions(f.client,{type:'charge.refunded',data:{object:f.charge}}),['sub_example']);});
 await asyncTest('Dispute event resolves its associated subscription',async()=>{const f=billingFixture();assert.deepEqual(await eventSubscriptions(f.client,{type:'charge.dispute.created',data:{object:{charge:'ch_fixture'}}}),['sub_example']);});
 await asyncTest('Unrelated webhook cannot change subscription rights',async()=>{const f=billingFixture();assert.deepEqual(await eventSubscriptions(f.client,{type:'payment_method.attached',data:{object:{}}}),[]);});
 console.log(`\n${passed} checks passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
