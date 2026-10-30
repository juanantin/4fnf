import {NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const TOKEN='0x66ed09be14417e8a2f06e1cc5e324599109a7777';
const SAFU='0x420ef1f25563593aF5FE3f9b9d3bC56a8bd8c104';
const TAX_CONTRACT='0x53841c73217735f37bc1775538b03b23fefd8346';
const MULTICALL='0xca11bde05977b3631167028862be2a173976ca11';
const RPC='https://bsc-dataseed.bnbchain.org';
const word=n=>BigInt(n).toString(16).padStart(64,'0');
const addressWord=a=>a.toLowerCase().slice(2).padStart(64,'0');
const padBytes=s=>s.padEnd(Math.ceil(s.length/64)*64,'0');
// Flap's two tax contract reads, reproduced via the same Multicall3 aggregate3 selector.
function payload(){
 const calls=['269b96d8','6c06b371'].map(selector=>{
  const data=selector+addressWord(TOKEN);
  // tuple(address target,bool allowFailure,bytes callData)
  return addressWord(TAX_CONTRACT)+word(1)+word(96)+word(data.length/2)+padBytes(data);
 });
 const offsets=[];let position=calls.length*32;
 for(const call of calls){offsets.push(word(position));position+=call.length/2;}
 return '0x82ad56cb'+word(32)+word(calls.length)+offsets.join('')+calls.join('');
}
function parseTax(hex){
 if(typeof hex!=='string'||!/^0x[0-9a-fA-F]+$/.test(hex))throw Error('Invalid on-chain response');
 const h=hex.slice(2).toLowerCase(),recipient=addressWord(SAFU);
 const matches=[];
 // Tax contract's accounting struct places cumulative tax immediately before beneficiary.
 for(let i=64;i+64<=h.length;i+=64){
  if(h.slice(i,i+64)===recipient)matches.push(BigInt('0x'+h.slice(i-64,i)));
 }
 if(matches.length<2||matches[0]===0n)throw Error('Tax accounting fields did not match expected Flap response');
 // In the second returned struct the beneficiary is several fields after total tax.
 const candidate=matches[0];
 const firstIndex=h.indexOf(recipient);
 const secondIndex=h.indexOf(recipient,firstIndex+64);
 const preceding=h.slice(Math.max(0,secondIndex-15*64),secondIndex);
 if(!preceding.includes(word(candidate)))throw Error('Tax total not corroborated by second on-chain read');
 return Number(candidate)/1e18;
}
export async function GET(){
 try{
  const res=await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',params:[{to:MULTICALL,data:payload()},'latest']}),signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!res.ok)throw Error('BNB RPC HTTP '+res.status);
  const json=await res.json();
  if(json.error)throw Error(json.error.message||'BNB RPC error');
  const amount=parseTax(json.result);
  if(!Number.isFinite(amount)||amount<0)throw Error('Invalid tax total');
  return NextResponse.json({amount,unit:'BNB',source:'Flap on-chain tax contract',recipient:SAFU,token:TOKEN,kind:'totalTax',last:null,updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:'Live tax data unavailable',details:String(e.message)},{status:503,headers:{'Cache-Control':'no-store'}})}
}
