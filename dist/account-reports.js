'use strict';
(function(root){
 const bankFor=a=>/ABANCA/i.test(a?.label||'')?'abanca':/ACTIVO/i.test(a?.label||'')?'activo':'other';
 const bankName=k=>({abanca:'ABANCA',activo:'ActivoBank',all:'Família · todos os bancos',other:'Other accounts'}[k]||k);
 function matches(row,accounts,bank,accountId){const a=accounts.find(a=>a.id===row.account_id);return (bank==='all'||bankFor(a)===bank)&&(accountId==='all'||row.account_id===accountId);}
 function report(rows,accounts,bank,accountId,asOf){const months={};for(const r of rows){if(r.booked_on>asOf||!matches(r,accounts,bank,accountId))continue;const key=r.booked_on.slice(0,7);const m=months[key]||(months[key]={month:key,received:0,paid:0,spending:0,investing:0,transferOut:0,count:0});const c=Math.round(Number(r.amount)*100);m.count++;if(c>0)m.received+=c;if(c<0)m.paid-=c;if(['expense','refund'].includes(r.flow_kind))m.spending-=c;if(r.flow_kind==='investment')m.investing-=c;if(r.flow_kind==='transfer'&&c<0)m.transferOut-=c;}return Object.values(months).sort((a,b)=>b.month.localeCompare(a.month));}
 function balances(rows,accounts,bank,accountId,asOf,links=[]){
  const byTransaction=new Map();for(const l of links){if(!byTransaction.has(l.transaction_id))byTransaction.set(l.transaction_id,[]);byTransaction.get(l.transaction_id).push(l);}
  const points=accounts.filter(a=>matches({account_id:a.id},accounts,bank,accountId)).map(a=>{
   const rs=rows.filter(r=>r.account_id===a.id&&r.booked_on<=asOf),dated=rs.filter(r=>r.statement_balance!==null&&r.statement_balance!==undefined&&Number.isFinite(Number(r.statement_balance))),date=dated.map(r=>r.booked_on).sort().at(-1),last=dated.filter(r=>r.booked_on===date),latestMovement=rs.map(r=>r.booked_on).sort().at(-1)||null;
   let candidates=last;
   if(last.length>1){const endings=new Map(),unlinked=[];for(const r of last){const ls=byTransaction.get(r.id)||[];if(!ls.length)unlinked.push(r);for(const l of ls){if(!Number.isFinite(Number(l.source_row))){unlinked.push(r);continue;}const key=l.source_id,old=endings.get(key);if(!old||Number(l.source_row)>old.order)endings.set(key,{row:r,order:Number(l.source_row)});else if(Number(l.source_row)===old.order&&Number(r.statement_balance)!==Number(old.row.statement_balance))unlinked.push(r);}}candidates=[...endings.values()].map(e=>e.row).concat(unlinked);}
   const values=[...new Set(candidates.map(r=>Math.round(Number(r.statement_balance)*100)))],value=values.length===1?values[0]:null;
   return {id:a.id,label:a.label,value,date:date||null,latestMovement,ambiguous:values.length>1,stale:!!date&&date<asOf,subsequent:!!date&&latestMovement>date};
  });
  const known=points.filter(p=>p.value!==null),dates=[...new Set(known.map(p=>p.date))];return {points,total:known.length?known.reduce((n,p)=>n+p.value,0):null,partial:known.length!==points.length,mixedDates:dates.length>1};
 }
 const api={bankFor,bankName,matches,report,balances};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AccountReports=api;
})(typeof window!=='undefined'?window:globalThis);
