'use strict';
(function(root){
 const A=()=>FamilyAnalytics,match=(r,i)=>AccountReports.matches(r,i.accounts,i.bank,i.accountId),c=x=>A().cents(x);
 function months(start,end){const out=[];for(let m=start;m&&m<=end;){out.push(m);const d=new Date(m+'-15T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);m=d.toISOString().slice(0,7);}return out;}
 function flow(i){const scoped=i.rows.filter(r=>match(r,i)&&r.booked_on<=i.asOf),first=scoped.map(r=>r.booked_on.slice(0,7)).sort()[0],through=i.throughMonth==='all'?i.asOf.slice(0,7):i.throughMonth;return months(first,through<i.asOf.slice(0,7)?through:i.asOf.slice(0,7)).map(month=>{const start=month+'-01',end=A().last(month)<i.asOf?A().last(month):i.asOf,rs=scoped.filter(r=>r.booked_on>=start&&r.booked_on<=end),cover=A().coverage(i.sources,i.accounts,i.bank,i.accountId,start,end),observed=rs.length>0||cover.ok,income=rs.filter(r=>r.flow_kind==='income').reduce((n,r)=>n+c(r.amount),0),spending=-rs.filter(r=>['expense','refund'].includes(r.flow_kind)).reduce((n,r)=>n+c(r.amount),0),unknownIn=rs.filter(r=>r.flow_kind==='review'&&Number(r.amount)>0).reduce((n,r)=>n+c(r.amount),0),unknownOut=-rs.filter(r=>r.flow_kind==='review'&&Number(r.amount)<0).reduce((n,r)=>n+c(r.amount),0);return {month,end,count:rs.length,coverage:cover.ok,missing:cover.missing,observed,income:observed?income:null,spending:observed?spending:null,result:observed?income-spending:null,consumption:observed&&income>0?spending/income*100:null,unknownIn,unknownOut,review:rs.filter(r=>r.review_status==='needs_review'||r.flow_kind==='review'||(['expense','income'].includes(r.flow_kind)&&!r.category)).length,partial:month===i.asOf.slice(0,7)};});}
 function wealth(i){
  const scoped=i.rows.filter(r=>match(r,i)&&r.booked_on<=i.asOf),accounts=i.accounts.filter(a=>match({account_id:a.id},i));
  const ss=i.snapshots.filter(s=>s.account_id?match(s,i):i.bank==='all'&&i.accountId==='all');
  const linked=ss.filter(s=>s.account_id&&s.notes?.includes('Valor da mesma conta de poupança dos extratos Activo'));
  const overlap=new Set(linked.map(s=>s.asset_label)),independent=ss.filter(s=>!overlap.has(s.asset_label)),assetNames=[...new Set(independent.map(s=>s.asset_label))];
  const starts=[...scoped.map(r=>r.booked_on),...ss.map(s=>s.as_of)].sort();if(!starts.length)return [];
  const orders=new Map();for(const l of i.links||[])orders.set(l.transaction_id,Math.max(orders.get(l.transaction_id)||0,l.source_row));
  const through=i.throughMonth==='all'?i.asOf.slice(0,7):i.throughMonth;
  return months(starts[0].slice(0,7),through<i.asOf.slice(0,7)?through:i.asOf.slice(0,7)).map(month=>{
   const end=A().last(month)<i.asOf?A().last(month):i.asOf,components=[];
   for(const a of accounts){const rs=scoped.filter(r=>r.account_id===a.id&&r.booked_on<=end&&r.statement_balance!==null&&r.statement_balance!==undefined).sort((x,y)=>x.booked_on.localeCompare(y.booked_on)||(orders.get(x.id)||0)-(orders.get(y.id)||0));const r=rs.at(-1),snap=linked.filter(s=>s.account_id===a.id&&s.as_of<=end).sort((x,y)=>x.as_of.localeCompare(y.as_of)).at(-1);const tied=r?rs.filter(x=>x.booked_on===r.booked_on):[],ambiguous=tied.length>1&&tied.some(x=>!orders.has(x.id));let point=null;
    if(snap&&(!r||snap.as_of>r.booked_on||ambiguous))point={label:a.label,value:c(snap.market_value),date:snap.as_of,carried:snap.as_of.slice(0,7)!==month,kind:'savings'};
    else if(r&&!ambiguous)point={label:a.label,value:c(r.statement_balance),date:r.booked_on,carried:!A().coverage(i.sources,i.accounts,i.bank,a.id,r.booked_on,end).ok,kind:linked.some(s=>s.account_id===a.id)?'savings':'cash'};
    components.push(point||{label:a.label,value:null,date:null,carried:false,kind:linked.some(s=>s.account_id===a.id)?'savings':'cash'});
   }
   for(const label of assetNames){const s=independent.filter(s=>s.asset_label===label&&s.as_of<=end).sort((x,y)=>x.as_of.localeCompare(y.as_of)).at(-1);components.push(s?{label,value:c(s.market_value),date:s.as_of,carried:s.as_of.slice(0,7)!==month,kind:'investment'}:{label,value:null,date:null,carried:false,kind:'investment'});}
   const known=components.filter(x=>x.value!==null),cash=known.filter(x=>x.kind==='cash').reduce((n,x)=>n+x.value,0),invested=known.filter(x=>x.kind!=='cash').reduce((n,x)=>n+x.value,0),missing=components.filter(x=>x.value===null).map(x=>x.label),carried=known.filter(x=>x.carried).map(x=>x.label);
   return {month,end,components,total:known.length?cash+invested:null,cash:known.some(x=>x.kind==='cash')?cash:null,invested:known.some(x=>x.kind!=='cash')?invested:null,missing,carried,complete:missing.length===0&&carried.length===0,known:known.length,expected:components.length};
  });
 }
 const api={flow,wealth,months};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FinanceEvolutionModel=api;
})(typeof window!=='undefined'?window:globalThis);
