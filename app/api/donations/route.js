import {NextResponse} from 'next/server';
const TOKEN='0x66ed09be14417e8a2f06e1cc5e324599109a7777';
const SAFU='0x420ef1f25563593aF5FE3f9b9d3bC56a8bd8c104';
const TOPIC='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const padded='0x'+SAFU.slice(2).toLowerCase().padStart(64,'0');
async function rpc(method,params){
 const response=await fetch('https://bsc-dataseed.binance.org/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(12000),cache:'no-store'});
 if(!response.ok)throw Error('RPC HTTP '+response.status);
 const data=await response.json();if(data.error)throw Error(data.error.message);return data.result;
}
export async function GET(){
 try{
  const latest=Number(BigInt(await rpc('eth_blockNumber',[])));
  const from=Math.max(0,latest-120000);
  let logs=[];
  for(let start=from;start<=latest;start+=4000){
   const end=Math.min(latest,start+3999);
   const batch=await rpc('eth_getLogs',[{address:TOKEN,topics:[TOPIC,null,padded],fromBlock:'0x'+start.toString(16),toBlock:'0x'+end.toString(16)}]);
   logs.push(...batch);
  }
  const decimalsHex=await rpc('eth_call',[{to:TOKEN,data:'0x313ce567'},'latest']);
  const decimals=Math.min(36,Number(BigInt(decimalsHex)));
  const amount=logs.reduce((sum,log)=>sum+Number(BigInt(log.data))/10**decimals,0);
  const recent=logs[logs.length-1];
  const last=recent?{amount:Number(BigInt(recent.data))/10**decimals,hash:recent.transactionHash,block:Number(BigInt(recent.blockNumber))}:null;
  return NextResponse.json({amount,count:logs.length,last,complete:false,scope:'Last 120,000 BSC blocks',recipient:SAFU,token:TOKEN,unit:'4FNF',updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public,s-maxage=120,stale-while-revalidate=120'}});
 }catch(e){return NextResponse.json({error:'Token transfer scan failed',details:String(e.message)},{status:503})}
}
