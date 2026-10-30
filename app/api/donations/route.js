import {NextResponse} from 'next/server';
const TOKEN='0x66ed09be14417e8a2f06e1cc5e324599109a7777';
const SAFU='0x420ef1f25563593aF5FE3f9b9d3bC56a8bd8c104';
export async function GET(){
 try{
  let url=new URL('https://api.routescan.io/v2/network/mainnet/evm/56/internal-operations');
  url.searchParams.set('fromAddresses',TOKEN);
  url.searchParams.set('toAddresses',SAFU);
  url.searchParams.set('sort','desc');
  let total=0,count=0,last=null,complete=false;
  for(let page=0;page<15;page++){
   const response=await fetch(url,{next:{revalidate:120},signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('Routescan HTTP '+response.status);
   const data=await response.json();
   if(!Array.isArray(data.items))throw Error(data.message||'Unexpected Routescan response');
   for(const op of data.items){
    if(op.from?.toLowerCase()!==TOKEN.toLowerCase()||op.to?.toLowerCase()!==SAFU.toLowerCase()||op.status===false)continue;
    const qty=Number(op.value)/1e18;
    if(!Number.isFinite(qty)||qty<=0)continue;
    total+=qty;count++;
    if(!last)last={amount:qty,hash:op.txHash,timestamp:op.timestamp};
   }
   const next=data.link?.next;
   if(!next){complete=true;break;}
   url=new URL(next,'https://api.routescan.io');
   if(url.hostname!=='api.routescan.io')throw Error('Unexpected pagination host');
  }
  return NextResponse.json({amount:total,count,last,complete,unit:'BNB',source:TOKEN,recipient:SAFU,updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public,s-maxage=120,stale-while-revalidate=120'}});
 }catch(e){return NextResponse.json({error:'Internal BNB transfer indexer unavailable',details:String(e.message)},{status:503})}
}
