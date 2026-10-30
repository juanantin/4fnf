import {NextResponse} from 'next/server';
export const runtime='nodejs';
const TOKEN='0x66ed09be14417e8a2f06e1cc5e324599109a7777';
const SAFU='0x420ef1f25563593aF5FE3f9b9d3bC56a8bd8c104';
const base='https://api.etherscan.io/v2/api';
const lower=(v)=>String(v||'').toLowerCase();
async function query(action,key,page){
 const url=new URL(base);
 for(const [k,v] of Object.entries({chainid:'56',module:'account',action,address:TOKEN,startblock:'0',endblock:'999999999',page:String(page),offset:'1000',sort:'asc',apikey:key}))url.searchParams.set(k,v);
 const res=await fetch(url,{signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!res.ok)throw Error('Etherscan HTTP '+res.status);
 const data=await res.json();
 if(data.status==='0'&&/no transactions found/i.test(data.message+' '+data.result))return [];
 if(!Array.isArray(data.result))throw Error(String(data.result||data.message||'Invalid explorer response').slice(0,220));
 return data.result;
}
export async function GET(){
 const key=process.env.ETHERSCAN_API_KEY;
 if(!key)return NextResponse.json({error:'Donation tracker needs ETHERSCAN_API_KEY configured in Vercel (BNB Chain requires an Etherscan plan).',configured:false},{status:503});
 try{
  const records=[];
  for(const action of ['txlistinternal','txlist']){
   let done=false;
   for(let page=1;page<=20;page++){
    const batch=await query(action,key,page);
    for(const tx of batch){
     if(lower(tx.from)!==lower(TOKEN)||lower(tx.to)!==lower(SAFU)||tx.isError==='1'||tx.txreceipt_status==='0')continue;
     const wei=BigInt(tx.value||'0');
     if(wei>0n)records.push({hash:tx.hash,wei,block:Number(tx.blockNumber),timestamp:Number(tx.timeStamp),traceId:tx.traceId||''});
    }
    if(batch.length<1000){done=true;break;}
   }
   if(!done)throw Error('Transfer history exceeds scan limit; refusing to show incomplete total');
  }
  const unique=new Map();
  for(const tx of records)unique.set(tx.hash+':'+tx.traceId+':'+tx.wei.toString(),tx);
  const all=[...unique.values()].sort((a,b)=>b.block-a.block);
  const total=all.reduce((s,t)=>s+t.wei,0n);
  const toBNB=(wei)=>Number(wei/1000000000n)/1e9;
  const last=all[0]?{amount:toBNB(all[0].wei),hash:all[0].hash,timestamp:all[0].timestamp}:null;
  return NextResponse.json({amount:toBNB(total),count:all.length,last,complete:true,unit:'BNB',source:TOKEN,recipient:SAFU,updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public,s-maxage=300,stale-while-revalidate=300'}});
 }catch(e){return NextResponse.json({error:'Donation history unavailable',details:String(e.message),configured:true},{status:503})}
}
