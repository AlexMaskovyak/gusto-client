import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareReimbursementSubmission, buildCreateReimbursementRequest, createReimbursementSubmissionGuard, prepareReceiptUpload, buildReceiptUploadRequest, createReceiptUploadGuard, createReceiptStorageGuard, uploadReimbursementReceipt, submitReimbursement, GustoClient, buildReimbursementOptionsRequest, isReadOnlyReimbursementRequest } from '../src/index.js';

const input = { amount:'23.81', categoryUuid:'example-category', companyMemberId:'example-member', currency:'USD', description:'Example expense', purchaseDate:'2026-03-10', expenseVendor:{name:'Example merchant'} };
const receipt = {filename:'receipt.pdf',contentType:'application/pdf',bytes:Buffer.from('%PDF-1.7\nsynthetic receipt')};
const node = () => ({id:'new-expense',member:{id:input.companyMemberId},amount:input.amount,currency:null,purchaseDate:input.purchaseDate,categoryUuid:input.categoryUuid,description:input.description,status:'NEEDS_REVIEW',createdAt:'2026-03-11T12:00:00Z',vendor:{id:'vendor',name:'Example merchant'},receipt:{id:'receipt-id',name:'receipt.pdf',contentType:'application/pdf',url:'https://storage.example.test/private?token=secret'}});
const normalized = () => ({...node(), memberId:input.companyMemberId,receipt:{id:'receipt-id',filename:'receipt.pdf',contentType:'application/pdf'}});
const inventory = (records=[]) => ({complete:true,memberId:input.companyMemberId,records});
const success = () => Response.json({data:{payload:{errors:[],oneTimeReimbursement:node()}}});
const metadata = () => { const p=prepareReceiptUpload(receipt); return {signed_id:'private-signed-id',filename:p.filename,content_type:p.contentType,byte_size:p.byteSize,checksum:p.checksum,direct_upload:{url:'https://storage.example.test/upload?signature=private',headers:{'content-type':p.contentType}}}; };

test('prepares exact gross amounts without modifying credits, and validates fields before requests', () => {
  assert.equal(prepareReimbursementSubmission(input).amount, '23.81');
  for (const change of [{amount:23.81},{amount:'23.8'},{amount:'0.00'},{amount:'999999999.00'},{purchaseDate:'2026-02-30'},{currency:'usd'},{description:'x'.repeat(256)},{unknown:'secret'},{expenseVendor:{id:'x',name:'y'}},{categoryRateUuid:'rate'}]) assert.throws(()=>prepareReimbursementSubmission({...input,...change}));
  assert.equal(prepareReimbursementSubmission({...input,categoryRateUuid:'rate',rateAmount:'5.5'}).rateAmount,'5.5');
});
test('create transport guard permits only the approved mutation and exact input', () => {
  const request=buildCreateReimbursementRequest(input);
  const guard=createReimbursementSubmissionGuard(input);
  assert.equal(guard(request),true);
  assert.equal(guard({...request,body:buildCreateReimbursementRequest({...input,amount:'50.00'}).body}),false);
  assert.equal(guard({...request,url:'https://evil.test'}),false);
  assert.equal(guard({...request,method:'DELETE'}),false);
  assert.doesNotMatch(request.body,/DeleteExpenses|UpdateMemberExpense/);
});
test('receipt preparation copies bytes and validates type, signature, filename and size', () => {
  const source=Buffer.from(receipt.bytes);
  const p=prepareReceiptUpload({...receipt,bytes:source}); source[0]=0;
  assert.equal(p.bytes[0],37);
  for (const change of [{filename:'../receipt.pdf'},{filename:'receipt.png'},{bytes:Buffer.from('<html>')},{bytes:new Uint8Array()},{bytes:new Uint8Array(15000001)}]) assert.throws(()=>prepareReceiptUpload({...receipt,...change}));
  const request=buildReceiptUploadRequest(receipt);
  const blob=JSON.parse(request.body).blob;
  assert.equal(blob.byte_size,receipt.bytes.length);
  assert.equal(createReceiptUploadGuard(receipt)(request),true);
  assert.equal(createReceiptUploadGuard(receipt)({...request,body:'{}'}),false);
});
test('uploads the exact receipt to approved storage without app credentials', async () => {
  const calls=[];
  const result=await uploadReimbursementReceipt(receipt,{receiptFetch:async(url,init)=>{calls.push('metadata');assert.equal(init.method,'POST');return Response.json(metadata());},storageOrigins:['https://storage.example.test'],createStorageFetch:({origin,authorizeWrite})=>async(url,init)=>{calls.push('storage');assert.equal(origin,'https://storage.example.test');assert.equal(init.credentials,'omit');assert.equal(authorizeWrite({url,...init}),true);assert.equal(authorizeWrite({url,...init,body:new Uint8Array([0])}),false);return new Response();}});
  assert.deepEqual(calls,['metadata','storage']);
  assert.equal(result.fileId,'private-signed-id');
  assert.ok(!JSON.stringify(result).includes('signature='));
});
test('denies unexpected storage origins, metadata drift and credential headers before storage writes', async () => {
  for (const alter of [p=>({...p,byte_size:99}),p=>({...p,direct_upload:{...p.direct_upload,url:'https://evil.test/upload'}}),p=>({...p,direct_upload:{...p.direct_upload,headers:{cookie:'private'}}})]) {
    await assert.rejects(uploadReimbursementReceipt(receipt,{receiptFetch:async()=>Response.json(alter(metadata())),storageOrigins:['https://storage.example.test'],createStorageFetch:()=>assert.fail('Storage was used')}),{phase:'receipt-metadata',outcome:'unknown'});
  }
});
test('a submitted record needs a new stable ID and a fresh complete read-back', async () => {
  let reads=0,writes=0;
  const result=await submitReimbursement(input,{expenseFetch:async()=>{writes++;return success();},readReimbursements:async()=>inventory(reads++ ? [normalized()] : [])});
  assert.equal(result.submissionVerified,true);
  assert.equal(result.paymentVerified,false);
  assert.deepEqual(result.unverifiedFields,['currency']);
  assert.equal(result.expense.currency,null);
  assert.equal(reads,2); assert.equal(writes,1);
  assert.ok(!JSON.stringify(result).includes('private?token'));
});
test('possible duplicates and incomplete or wrong-employee inventories prevent all writes', async () => {
  for (const before of [inventory([normalized()]),{...inventory(),complete:false},{...inventory(),memberId:'other'}]) {
    await assert.rejects(submitReimbursement(input,{expenseFetch:()=>assert.fail('sent'),readReimbursements:async()=>before}));
  }
});
test('unknown create outcomes are never retried and never expose response bodies', async () => {
  for (const fetch of [async()=>{throw Error('private-token');},async()=>new Response('private-token',{status:500}),async()=>Response.json({errors:[{message:'private-token'}]}),async()=>Response.json({data:{payload:{errors:[]}}})]) {
    let calls=0;
    await assert.rejects(submitReimbursement(input,{expenseFetch:async(...args)=>{calls++;return fetch(...args);},readReimbursements:async()=>inventory()}),error=>error.phase==='expense-create' && error.outcome==='unknown' && !error.message.includes('private-token'));
    assert.equal(calls,1);
  }
});
test('service validation errors are rejection, and failed verification retains the created ID', async () => {
  await assert.rejects(submitReimbursement(input,{expenseFetch:async()=>Response.json({data:{payload:{errors:[{message:'private-value'}]}}}),readReimbursements:async()=>inventory()}),{phase:'expense-create',outcome:'rejected'});
  await assert.rejects(submitReimbursement(input,{expenseFetch:success,readReimbursements:async()=>inventory()}),{phase:'verification',outcome:'created-unverified',expenseId:'new-expense'});
});
test('uploads before creating and scopes the final create guard to the signed receipt ID', async () => {
  let reads=0;
  const result=await submitReimbursement(input,{receipt,readReimbursements:async()=>inventory(reads++ ? [normalized()] : []),receiptFetch:async()=>Response.json(metadata()),storageOrigins:['https://storage.example.test'],createStorageFetch:()=>async()=>new Response(),createExpenseFetch:({authorizeWrite})=>async(url,init)=>{assert.equal(authorizeWrite({url,...init}),true);assert.equal(JSON.parse(init.body).variables.input.fileId,'private-signed-id');return success();}});
  assert.equal(result.receipt.sha256,prepareReceiptUpload(receipt).sha256);
  assert.ok(!JSON.stringify(result).includes('private-signed-id'));
});
test('existing read clients cannot silently gain submission permissions', async () => {
  const client=new GustoClient({fetch:()=>assert.fail('Read transport used for a mutation')});
  await assert.rejects(client.submitReimbursement(input),/Explicit expense write/);
});
test('discovers the current member and category IDs through a separately guarded read', async () => {
  assert.equal(isReadOnlyReimbursementRequest(buildReimbursementOptionsRequest()),true);
  const client=new GustoClient({fetch:async(url,init)=>{assert.equal(isReadOnlyReimbursementRequest({url,body:init.body}),true);return Response.json({data:{member:{id:'member',expenses:{categories:[{id:'category',name:'Travel',isDisabled:false,rates:{nodes:[]}}]}}}});}});
  assert.deepEqual(await client.listReimbursementOptions(),{memberId:'member',categories:[{id:'category',name:'Travel',isDisabled:false,rates:[]}]});
});
test('transport factories and preflight readers cannot disclose credentials in thrown errors', async () => {
  await assert.rejects(submitReimbursement(input,{expenseFetch:success,readReimbursements:async()=>{throw Error('private-token');}}),{phase:'preflight',outcome:'not-sent'});
  await assert.rejects(submitReimbursement(input,{createExpenseFetch:()=>{throw Error('private-token');},readReimbursements:async()=>inventory()}),{phase:'expense-create',outcome:'not-sent'});
});
