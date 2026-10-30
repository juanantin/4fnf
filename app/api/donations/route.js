import {NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const TOKEN='0x66ed09be14417e8a2f06e1cc5e324599109a7777';
const SAFU='0x420ef1f25563593aF5FE3f9b9d3bC56a8bd8c104';
export async function GET(){
 try{
  const url='https://api.shrine.trade/bnb/api/fees/'+SAFU+'?token='+TOKEN;
  const res=await fetch(url,{signal:AbortSignal.timeout(12000),cache:'no-store',headers:{accept:'application/json'}});
  if(!res.ok)throw Error('Creator revenue API HTTP '+res.status);
  const data=await res.json();
  const beneficiary=String(data.beneficiary||'').toLowerCase();
  const token=String(data.token||'').toLowerCase();
  if(beneficiary!==SAFU.toLowerCase()||(token&&token!==TOKEN.toLowerCase()))throw Error('Beneficiary/token mismatch');
  if(data.asset&&data.asset!=='BNB')throw Error('Unexpected payout asset');
  if(!/^\\d+$/.test(String(data.totalPaid??'')))throw Error('Missing totalPaid');
  const decimals=Number(data.decimals??18);
  if(decimals!==18)throw Error('Unexpected decimals');
  const amount=Number(data.totalPaid)/1e18;
  const pending=/^\\d+$/.test(String(data.pendingTax??''))?Number(data.pendingTax)/1e18:0;
  if(!Number.isFinite(amount)||!Number.isFinite(pending))throw Error('Invalid payout amount');
  return NextResponse.json({amount,pending,unit:'BNB',source:'shrine.trade creator-revenue API',recipient:SAFU,token:TOKEN,updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:'Live tax data unavailable',details:String(e.message)},{status:503,headers:{'Cache-Control':'no-store'}})}
}
