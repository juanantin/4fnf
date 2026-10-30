import {NextResponse} from 'next/server';
const SAFU='0x420ef1f25563593aF5FE3f9b9d3bC56a8bd8c104';
export async function GET(){
 try{
  const key=process.env.BINPLORER_API_KEY||'freekey';
  const url=new URL('https://api.binplorer.com/getAddressTransactions/'+SAFU);
  url.searchParams.set('apiKey',key);url.searchParams.set('limit','100');
  const response=await fetch(url,{next:{revalidate:300},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Indexer HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data))throw Error(data.error?.message||'Unexpected indexer response');
  const incoming=data.filter(tx=>tx.to?.toLowerCase()===SAFU.toLowerCase()&&tx.success!==false&&Number(tx.value)>0);
  const amount=incoming.reduce((sum,tx)=>sum+Number(tx.value),0);
  const tx=incoming[0];
  const last=tx?{amount:Number(tx.value),hash:tx.hash,timestamp:tx.timestamp,from:tx.from}:null;
  return NextResponse.json({amount,count:incoming.length,last,complete:false,scope:'Recent indexed transactions (up to 100; free tier limited to 30 days)',recipient:SAFU,unit:'BNB',updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public,s-maxage=300,stale-while-revalidate=300'}});
 }catch(e){return NextResponse.json({error:'Transfer indexer unavailable',details:String(e.message)},{status:503})}
}
