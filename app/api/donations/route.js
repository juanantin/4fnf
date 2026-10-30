import {NextResponse} from 'next/server';
const TOKEN='0x66ed09be14417e8a2f06e1cc5e324599109a7777';
const RECIPIENT='0xa122C3eF0Ced83BE89922D99E8DdE8f4E272EACA';
export async function GET(){
 try{
  const base='https://blockscout.routescan.io/56/api/v2/addresses/'+RECIPIENT+'/token-transfers';
  let cursor=null,amount=0,count=0,last=null,complete=false;
  for(let page=0;page<30;page++){
   const url=new URL(base);url.searchParams.set('type','ERC-20');url.searchParams.set('filter','to');url.searchParams.set('token',TOKEN);
   if(cursor)url.searchParams.set('cursor',cursor);
   const response=await fetch(url,{next:{revalidate:120},signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('Explorer unavailable: '+response.status);
   const data=await response.json();if(!Array.isArray(data.items))throw Error('Invalid explorer response');
   for(const item of data.items){
    if(item.to?.hash?.toLowerCase()!==RECIPIENT.toLowerCase()||item.token?.address_hash?.toLowerCase()!==TOKEN.toLowerCase())continue;
    const raw=item.total?.value??item.value??'0';
    const decimals=Number(item.total?.decimals??item.token?.decimals??18);
    const qty=Number(raw)/Math.pow(10,decimals);
    if(!Number.isFinite(qty))continue;
    amount+=qty;count++;
    if(!last)last={amount:qty,hash:item.transaction_hash,timestamp:item.timestamp,from:item.from?.hash};
   }
   cursor=data.next_page_params?.cursor??null;
   if(!cursor){complete=true;break;}
  }
  return NextResponse.json({amount,count,last,complete,recipient:RECIPIENT,token:TOKEN,updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public,s-maxage=120,stale-while-revalidate=120'}});
 }catch(e){return NextResponse.json({error:'Donation explorer temporarily unavailable',details:String(e.message)},{status:503})}
}
