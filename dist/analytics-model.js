'use strict';
(function(root){
 const cents=x=>Math.round(Number(x||0)*100),iso=d=>d.toISOString().slice(0,10),date=s=>new Date(s+'T12:00:00Z'),shift=(s,n)=>{const d=date(s);d.setUTCDate(d.getUTCDate()+n);return iso(d);},last=m=>iso(new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7)),0,12))),prev=m=>iso(new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7))-2,1,12))).slice(0,7);
 const normalized=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 function taxonomy(r){
  if(r.taxonomy_method==='manual')return {group:r.category||'Por classificar',detail:r.subcategory||'Sem detalhe',type:r.expense_type||'unclassified',need:r.necessity||'unclassified',suggested:false};
  const s=normalized(r.description),cat=normalized(r.category);let group=r.category||'Por classificar',detail='A rever',type='unclassified',need='unclassified';
  const tests=[
   [/FARMAC|VALLISPHARMA/,'Saúde','Farmácia','variable','essential'],[/CLINIC|HOSPITAL|TROFA SAUDE|CUF/,'Saúde','Consultas e exames','variable','essential'],
   [/CONTINENTE|CONTI |PINGO DOCE|MERCADONA|LIDL|AUCHAN|ELECLERC|SUPERCOR/,'Alimentação','Supermercado','variable','essential'],[/TALHO|FRUTA|COOPERATIVA/,'Alimentação','Frescos e mercearia','variable','essential'],
   [/RESTAUR|REST |PIZZA|BURGER|MCDONALD|CAFE|PASTEL|\bBK\d/,'Alimentação','Restaurantes e cafés','variable','adjustable'],
   [/SOLINCA|CROSSFIT/,'Bem-estar','Ginásio e desporto','fixed','adjustable'],[/SPOTIFY|NETFLIX|APPLE.COM|GOOGLE ONE/,'Subscrições','Serviços digitais','fixed','adjustable'],
   [/DOMESTIC AND G|DOMESTIC & G/,'Seguros','Garantias de equipamentos','fixed','adjustable'],[/KIABI|ZARA|MANGO|LEFTIES|OYSHO|ZIPPY|ZALANDO|PRIMOR/,'Compras','Vestuário e cuidados pessoais','variable','adjustable'],
   [/LEROY|BRICOLAGE/,'Casa','Manutenção e bricolage','variable','unclassified'],[/AMAZON/,'Compras','Compras online','variable','unclassified'],
   [/VIA VERDE|PORTAG|OPERACAO BAIXO VALOR/,'Transportes','Portagens','variable','essential'],[/GALP|REPSOL|COMBUST|EST SERVICO|A\.S\.|A S AGUAS/,'Transportes','Combustível','variable','essential'],
   [/AMORT|RENDA/,'Casa','Habitação','fixed','essential'],[/CONDOM|FRAC/,'Casa','Condomínio','fixed','essential'],
   [/GAS SU|PETROGAL|ENDESA|EDP /,'Casa','Energia','variable','essential'],[/AGUAS VALONGO/,'Casa','Água','variable','essential'],[/DIGI|MEO|MOCHE/,'Comunicações','Telecomunicações','fixed','essential'],
   [/GENERALI|TRANQUIL|VICTORIA|ALLIANZ/,'Seguros','Apólices','fixed','essential']];
  const match=tests.find(t=>t[0].test(s));if(match)[,group,detail,type,need]=match;
  else if(cat==='MERCADO'){detail='Compras de supermercado';type='variable';need='essential';}
  else if(cat==='COMBUSTIVEL'||cat==='PORTAGEM'){detail=r.category;type='variable';need='essential';}
  else if(cat==='SAUDE'){detail='Saúde geral';type='variable';need='essential';}
  else if(['RENDA','CONDOMINIO','SEGUROS','MENSALIDADES'].includes(cat)){detail=r.category;type='fixed';need=cat==='MENSALIDADES'?'unclassified':'essential';}
  else if(['AGUA','GAS','ELETRICIDADE'].includes(cat)){detail=r.category;type='variable';need='essential';}
  if(r.category_method==='manual'&&r.category)group=r.category;
  if(r.subcategory)detail=r.subcategory;if(r.expense_type&&r.expense_type!=='unclassified')type=r.expense_type;if(r.necessity&&r.necessity!=='unclassified')need=r.necessity;
  return {group,detail,type,need,suggested:true};
 }
 function coverage(sources,accounts,bank,accountId,start,end){const included=accounts.filter(a=>AccountReports.matches({account_id:a.id},accounts,bank,accountId));const missing=[];for(const a of included){const ss=sources.filter(s=>s.account_id===a.id).sort((x,y)=>x.first_on.localeCompare(y.first_on));let covered=start;for(const s of ss){if(s.first_on>covered)break;if(s.last_on>=covered)covered=shift(s.last_on,1);if(covered>end)break;}if(covered<=end)missing.push(a.label);}return {ok:included.length>0&&missing.length===0,missing};}
 function compute(input){
  const {rows,accounts,sources,bank,accountId,month,asOf,plan,lines=[],incomes=[]}=input;
  const scoped=rows.filter(r=>r.booked_on<=asOf&&AccountReports.matches(r,accounts,bank,accountId));const start=month+'-01',end=last(month),observed=scoped.filter(r=>r.booked_on>=start&&r.booked_on<=end),cutoff=observed.map(r=>r.booked_on).sort().at(-1)||null;
  const spendRows=rs=>rs.filter(r=>['expense','refund'].includes(r.flow_kind));const spend=rs=>-spendRows(rs).reduce((n,r)=>n+cents(r.amount),0);const net=spend(observed);const detailed={},groups={},macro={fixed:0,variable:0,unclassified:0},adjustable={};
  for(const r of spendRows(observed)){const t=taxonomy(r),v=-cents(r.amount),key=t.group+' / '+t.detail;detailed[key]=(detailed[key]||0)+v;groups[r.category||'Por classificar']=(groups[r.category||'Por classificar']||0)+v;macro[t.type]+=v;if(t.type==='variable'&&t.need==='adjustable')adjustable[key]=(adjustable[key]||0)+v;}
  const pm=prev(month),full=month<asOf.slice(0,7),elapsed=cutoff?Number(cutoff.slice(-2)):0,compareEnd=full?last(pm):pm+'-'+String(Math.min(elapsed||1,Number(last(pm).slice(-2)))).padStart(2,'0');
  const currentEnd=full?end:cutoff;const currentCoverage=currentEnd?coverage(sources,accounts,bank,accountId,start,currentEnd):{ok:false,missing:[]};const previousCoverage=coverage(sources,accounts,bank,accountId,pm+'-01',compareEnd);
  const previousRows=scoped.filter(r=>r.booked_on>=pm+'-01'&&r.booked_on<=compareEnd),previousSpending=spend(previousRows),comparable=!!cutoff&&(full||elapsed<=Number(last(pm).slice(-2)))&&currentCoverage.ok&&previousCoverage.ok;
  const difference=comparable?net-previousSpending:null,pct=comparable&&previousSpending>0?difference/previousSpending*100:null;
  const weekStart=cutoff?shift(cutoff,-6):null,priorStart=cutoff?shift(cutoff,-13):null,priorEnd=cutoff?shift(cutoff,-7):null;
  const weekRows=cutoff?scoped.filter(r=>r.booked_on>=weekStart&&r.booked_on<=cutoff):[],priorRows=cutoff?scoped.filter(r=>r.booked_on>=priorStart&&r.booked_on<=priorEnd):[];
  const weekComparable=!!cutoff&&coverage(sources,accounts,bank,accountId,priorStart,cutoff).ok;
  const expectedIncome=incomes.filter(i=>i.start_month<=start&&(!i.end_month||i.end_month>=start)&&AccountReports.matches({account_id:i.account_id},accounts,bank,accountId)).reduce((n,i)=>n+cents(i.net_monthly),0);
  const actualIncome=observed.filter(r=>r.flow_kind==='income').reduce((n,r)=>n+cents(r.amount),0),budget=plan?cents(plan.spending_limit):null,savingsTarget=plan?cents(plan.savings_target):null,remaining=budget===null?null:budget-net;
  const daysLeft=full?0:cutoff?Math.max(0,Number(end.slice(-2))-elapsed):null,weeklyAllowance=remaining!==null&&daysLeft>0?Math.round(Math.max(0,remaining)/daysLeft*Math.min(7,daysLeft)):null;
  const pacePct=budget!==null&&budget>0?net/budget*100:null,budgetLines=lines.filter(l=>l.active!==false).map(l=>{const actual=groups[l.category]||0;return {category:l.category,limit:cents(l.amount_limit),actual,remaining:cents(l.amount_limit)-actual};});
  const classificationIssues=observed.filter(r=>r.flow_kind==='expense'&&/INVEST|TRANSFER/.test(normalized(r.category))).length;
  return {classificationIssues,month,start,end,cutoff,elapsed,full,net,previousSpending,difference,pct,comparable,currentCoverage,previousCoverage,compareEnd,detailed,groups,macro,adjustable,expectedIncome,actualIncome,budget,remaining,daysLeft,weeklyAllowance,pacePct,savingsTarget,plannedMargin:budget!==null&&expectedIncome>0?expectedIncome-budget-(savingsTarget||0):null,plannedSavingsRate:budget!==null&&expectedIncome>0?(expectedIncome-budget)/expectedIncome*100:null,week:{start:weekStart,end:cutoff,spending:spend(weekRows),previous:spend(priorRows),comparable:weekComparable},budgetLines,unresolved:observed.filter(r=>r.review_status==='needs_review'||r.flow_kind==='review').length,count:observed.length};
 }
 function latestSnapshots(snapshots,asOf){const latest=new Map();for(const s of snapshots.filter(s=>s.as_of<=asOf).sort((a,b)=>a.as_of.localeCompare(b.as_of)))latest.set(s.asset_label,s);return [...latest.values()];}
 const api={cents,taxonomy,coverage,compute,latestSnapshots,last,prev,shift};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FamilyAnalytics=api;
})(typeof window!=='undefined'?window:globalThis);
