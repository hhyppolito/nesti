'use strict';
(function(root){
 const bankFor=a=>/ABANCA/i.test(a?.label||'')?'abanca':/ACTIVO/i.test(a?.label||'')?'activo':'other';
 const bankName=k=>({abanca:'ABANCA',activo:'ActivoBank',all:'Família · todos os bancos',other:'Other accounts'}[k]||k);
 function matches(row,accounts,bank,accountId){const a=accounts.find(a=>a.id===row.account_id);return (bank==='all'||bankFor(a)===bank)&&(accountId==='all'||row.account_id===accountId);}
 function report(rows,accounts,bank,accountId,asOf){const months={};for(const r of rows){if(r.booked_on>asOf||!matches(r,accounts,bank,accountId))continue;const key=r.booked_on.slice(0,7);const m=months[key]||(months[key]={month:key,received:0,paid:0,spending:0,investing:0,transferOut:0,count:0});const c=Math.round(Number(r.amount)*100);m.count++;if(c>0)m.received+=c;if(c<0)m.paid-=c;if(['expense','refund'].includes(r.flow_kind))m.spending-=c;if(r.flow_kind==='investment')m.investing-=c;if(r.flow_kind==='transfer'&&c<0)m.transferOut-=c;}return Object.values(months).sort((a,b)=>b.month.localeCompare(a.month));}
 const api={bankFor,bankName,matches,report};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AccountReports=api;
})(typeof window!=='undefined'?window:globalThis);
