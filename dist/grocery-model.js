'use strict';
(function(root){
 const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function group(category){const s=norm(category);if(/taras|deposito/.test(s))return 'Depósitos de embalagens';if(/petfood|animais/.test(s))return 'Animais';if(/higiene|limpeza|casa|cultura|servic|textil|bazar|brand marketing/.test(s))return 'Casa e outros artigos';if(/mercearia|bens essenciais|soft drinks|bebidas|laticinios|charcutaria|congelados|frutas e legumes|frutos secos|padaria|peixaria|pequeno almoco|rest\.|cafetaria|talho|vinho/.test(s))return 'Alimentação e bebidas';return s==='outros'?'Por categorizar':'Casa e outros artigos';}
 const sign=r=>r.document_kind==='credit'?-1:1;
 const prepaid=r=>r.items.filter(i=>i.purpose==='prepaid').reduce((n,i)=>n+i.net_cents,0);
 const basket=r=>r.total_cents===null?null:r.total_cents-prepaid(r);
 const eligible=(r,asOf)=>!!r.purchased_on&&r.purchased_on<=asOf;
 function summarize(receipts,options){const {month='all',retailer='all',asOf}=options;
  const history=receipts.filter(r=>eligible(r,asOf)&&(retailer==='all'||r.retailer===retailer));
  const scoped=history.filter(r=>month==='all'||r.purchased_on.startsWith(month));
  const accepted=scoped.filter(r=>r.quality!=='needs_review'&&r.total_cents!==null),detailed=accepted.filter(r=>r.quality==='reconciled');
  const lines=detailed.flatMap(r=>r.items.filter(i=>i.purpose!=='prepaid').map((i,index)=>({...i,receipt_id:r.id,line:index,date:r.purchased_on,retailer:r.retailer,store:r.store,document_kind:r.document_kind,group:group(i.category),value:sign(r)*i.net_cents})));
  const buckets={};for(const r of history.filter(r=>r.quality!=='needs_review'&&r.total_cents!==null)){const key=r.purchased_on.slice(0,7),b=buckets[key]||(buckets[key]={month:key,value:0,documents:0,first:r.purchased_on,last:r.purchased_on});b.value+=sign(r)*basket(r);b.documents++;if(r.purchased_on<b.first)b.first=r.purchased_on;if(r.purchased_on>b.last)b.last=r.purchased_on;}
  const categories={},stores={},groups={};for(const i of lines){categories[i.category]=(categories[i.category]||0)+i.value;groups[i.group]=(groups[i.group]||0)+i.value;}for(const r of accepted)stores[r.retailer]=(stores[r.retailer]||0)+sign(r)*basket(r);
  const purchases=accepted.filter(r=>r.document_kind!=='credit'&&basket(r)>0),total=accepted.reduce((n,r)=>n+sign(r)*basket(r),0),purchaseTotal=purchases.reduce((n,r)=>n+basket(r),0),refund=accepted.filter(r=>r.document_kind==='credit').reduce((n,r)=>n+r.total_cents,0);
  return {scoped,accepted,lines,history: Object.values(buckets).sort((a,b)=>a.month.localeCompare(b.month)),total:accepted.length?total:null,prepaid:accepted.reduce((n,r)=>n+sign(r)*prepaid(r),0),purchases:purchases.length,refund,average:purchases.length?purchaseTotal/purchases.length:null,discount:purchases.reduce((n,r)=>n+r.discount_cents,0),card:purchases.reduce((n,r)=>n+r.card_cents,0),detailed:detailed.length,withoutDetail:accepted.length-detailed.length,unresolved:scoped.filter(r=>r.quality==='needs_review').length,undated:receipts.filter(r=>!r.purchased_on).length,categories,stores,groups,detailTotal:lines.reduce((n,i)=>n+i.value,0)};
 }
 function prices(receipts,{asOf,retailer='all',month='all',product}){const end=month==='all'?asOf:month+'-31';return receipts.filter(r=>r.quality==='reconciled'&&r.document_kind!=='credit'&&eligible(r,asOf)&&r.purchased_on<=end&&(retailer==='all'||r.retailer===retailer)).flatMap(r=>r.items.filter(i=>i.name===product&&i.quantity>0&&i.unit_basis!=='linha'&&i.purpose!=='prepaid').map(i=>({date:r.purchased_on,retailer:r.retailer,store:r.store,value:i.net_cents/i.quantity,basis:i.unit_basis,quantity:i.quantity,receipt_id:r.id}))).sort((a,b)=>a.date.localeCompare(b.date));}
 const api={summarize,prices,group};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GroceryModel=api;
})(typeof window!=='undefined'?window:globalThis);
