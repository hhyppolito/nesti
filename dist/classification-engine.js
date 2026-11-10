'use strict';
(function(root){
 const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 function merchant(s){const text=norm(s),aliases=[[/SPOTIFY/,'SPOTIFY'],[/APPLE COM/,'APPLE COM'],[/GOOGLE ONE/,'GOOGLE ONE'],[/ANTHROPIC/,'ANTHROPIC'],[/AMAZON/,'AMAZON'],[/MERCADONA/,'MERCADONA'],[/PINGO DOCE/,'PINGO DOCE'],[/CONTINENTE|CONTI /,'CONTINENTE'],[/\bLIDL\b/,'LIDL']];const alias=aliases.find(x=>x[0].test(text));return alias?alias[1]:text.replace(/^(?:COMPRA \d{4}|TPA|POS|DD)\s+/,'').replace(/\bCONTACTLESS\b.*$/,'').replace(/\b[A-Z]*\d+[A-Z0-9]*\b/g,'').replace(/\s+/g,' ').trim();}
 // Specific merchants outrank broad history keywords; no fuzzy name or amount-only matching.
 const rules=[
 [/DOMESTIC AND G|DOMESTIC G/,'Seguros','Garantias de equipamentos','fixed','adjustable'],
 [/SPOTIFY|APPLE COM|GOOGLE ONE|NETFLIX|ANTHROPIC|CLOUDFLARE|PAYPAL USE AI/,'Subscrições','Serviços digitais','fixed','adjustable'],
 [/CUSTO DE SERVICO|IMPOSTO DO SELO|COMISSAO|MANUTENCAO CONTA/,'Comissões e impostos','Encargos bancários','variable','essential'],
 [/\bSGF\b|\bDEGIRO\b/,'Investimentos','Aportes a instituições','unclassified','unclassified','investment'],
 [/ABONO FAMILIA/,'Prestações sociais','Abono de família','unclassified','unclassified','income'],
 [/METALOGALVA|VECONCEPT|\bORDENADO\b|\bVENCIMENTO\b/,'Salário','Remuneração','unclassified','unclassified','income'],
 [/FARMAC|VALLISPHARMA|\bFARMA\b/,'Saúde','Farmácia','variable','essential'],
 [/CLINICA|HOSPITAL|TROFA SAUDE|\bCUF\b|PEDIATRA/,'Saúde','Consultas e exames','variable','essential'],
 [/CONTINENTE|CONTI |PINGO DOCE|MERCADONA|LIDL|AUCHAN|ELECLERC|SUPERCOR|INTERARMAMAR SUPERME|COOP PROD AGRICOLA|\bTALHO\b/,'Mercado','Supermercado e frescos','variable','essential'],
 [/RESTAURANTE|\bSUSHI\b|MCDONALD|\bBK\d+\b|PIZZA|BURGER|VILA GRILL|BRASA RIO|TABERNA|CARLOTTA CAKE|NESCAFE|PASTELARIA|\bARCADIA\b/,'Restauração','Restaurantes e cafés','variable','adjustable'],
 [/PRIMARK|\bZARA\b|\bKIABI\b|\bSFERA\b|\bOYSHO\b|LEFTIES|ZIPPY|ADIDAS|DECATHLON/,'Vestuário e desporto','Roupa e artigos desportivos','variable','adjustable'],
 [/BCM BRICOLAGE|LEROY|BRICOLAGE/,'Casa','Manutenção e bricolage','variable','unclassified'],
 [/AMAZON/,'Compras','Compras online a detalhar','variable','unclassified'],
 [/UBER TRIP/,'Transportes','TVDE','variable','unclassified'],
 [/VIA VERDE|PORTAGEM/,'Portagem','Portagens','variable','essential'],
 [/GALP|REPSOL|\bBP\b|COMBUSTIVEL|LEONTINA ALVES/,'Combustível','Abastecimento','variable','essential'],
 [/CONDOMINIO|FRAC C/,'Condomínio','Habitação','fixed','essential'],
 [/ENDESA|\bEDP\b|GAS SU/,'Energia','Eletricidade e gás','variable','essential'],
 [/AGUAS VALONGO/,'Água','Abastecimento de água','variable','essential'],
 [/\bDIGI\b|\bMEO\b|\bMOCHE\b/,'Comunicações','Telecomunicações','fixed','essential'],
 [/SOLINCA|CROSSFIT/,'Mensalidades','Ginásio e desporto','fixed','adjustable'],
 [/UNIVERSIDADE DO PORTO|UNIVERSITY OF PORT|\bFACULDADE\b/,'Educação','Propinas e formação','variable','essential'],
 [/ALLIANZ|TRANQUILIDADE|VICTORIA.*SEGURO|GENERALI/,'Seguros','Apólices','fixed','essential'],
 [/ZOO SANTO INACIO|IGESPAR MOST/,'Lazer','Visitas e atividades','variable','adjustable'],
 [/BARBEARIA/,'Cuidados pessoais','Cabeleireiro e barbearia','variable','adjustable']
 ];
 function suggest(r,ledger=[]){
  if(r.category_method==='manual'||r.review_status==='reviewed')return null;
  const s=norm(r.description),amount=Number(r.amount);if(/SALDO INICIAL/.test(s)||['transfer','withdrawal','opening_balance'].includes(r.flow_kind))return null;
  const key=merchant(r.description);const learned=ledger.filter(x=>x.category_method==='manual'&&x.review_status==='reviewed'&&x.category&&merchant(x.description)===key&&key.length>=4&&['expense','income','refund','investment'].includes(x.flow_kind));
  let patch,reason;
  const signatures=new Set(learned.map(x=>JSON.stringify([x.category,x.subcategory,x.expense_type,x.necessity,x.flow_kind])));
  if(signatures.size===1&&learned.length){const x=learned[0];if(Math.sign(Number(x.amount))!==Math.sign(amount))return null;patch={category:x.category,subcategory:x.subcategory||null,expense_type:x.expense_type||'unclassified',necessity:x.necessity||'unclassified',flow_kind:x.flow_kind};reason='Correção manual anterior para o mesmo estabelecimento';}
  else {const hit=rules.find(x=>x[0].test(s));if(!hit)return null;let flow=hit[5]||null;
   if(flow==='income'&&amount<=0)return null;if(flow==='investment'&&amount>=0)return null;
   if(!flow){if(amount>=0||!['expense','review'].includes(r.flow_kind)||/^(TRF|TRANSF|MB TRANSF)/.test(s))return null;flow='expense';}
   patch={category:hit[1],subcategory:hit[2],expense_type:hit[3],necessity:hit[4],flow_kind:flow};reason='Regra específica de estabelecimento ou entidade';
  }
  patch.review_status='suggested';if(Object.keys(patch).every(k=>(r[k]??null)===(patch[k]??null)))return null;
  return {patch,reason,method:reason.startsWith('Correção manual')?'learned_manual':'merchant_rule_v2'};
 }
 const api={norm,merchant,suggest};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ClassificationEngine=api;
})(typeof window!=='undefined'?window:globalThis);
