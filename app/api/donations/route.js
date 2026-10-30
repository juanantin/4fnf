import {NextResponse} from 'next/server';
const SAFU='0x420ef1f25563593aF5FE3f9b9d3bC56a8bd8c104';
export async function GET(){
 try{
  const base='https://blockscout.routescan.io/56/api/v2/addresses/'+SAFU+'/transactions';
  let next=null,amount=0,count=0,last=null,complete=false;
  for(let page=0;page<20;page++){
   const url=new URL(base);url.searchParams.set('filter','to');
   if(next)for(const [k,v] of Object.entries(next))url.searchParams.set(k,String(v));
   const response=await fetch(url,{next:{revalidate:120},signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('Explorer unavailable: '+response.status);
   const data=await response.json();if(!Array.isArray(data.items))throw Error('Invalid explorer response');
   for(const tx of data.items){
    if(tx.to?.hash?.toLowerCase()!==SAFU.toLowerCase()||tx.status==='error')continue;
    const qty=Number(tx.value??'0')/1e18;
    if(!Number.isFinite(qty)||qty<=0)continue;
    amount+=qty;count++;
    if(!last)last={amount:qty,hash:tx.hash,timestamp:tx.timestamp,from:tx.from?.hash};
   }
   next=data.next_page_params;
   if(!next){complete=true;break;}
  }
  return NextResponse.json({amount,count,last,complete,recipient:SAFU,unit:'BNB',updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public,s-maxage=120,stale-while-revalidate=120'}});
 }catch(e){return NextResponse.json({error:'Explorer temporarily unavailable',details:String(e.message)},{status:503})}
}
