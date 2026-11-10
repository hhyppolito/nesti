# Arquitetura

A interface é estática: `dist/index.html`, folhas de estilo e JavaScript sem framework. A biblioteca Supabase está vendorizada e fixada numa versão.

O navegador autentica a pessoa no Supabase e lê apenas os registos permitidos pelas políticas RLS. O código nunca deve receber uma chave administrativa. As tabelas guardam a associação ao agregado; versões nos registos impedem que duas edições se sobreponham silenciosamente.

## Módulos

- `app.js`: sessão, navegação, notas e documentos enviados.
- `finances.js`: extratos, filtros, transações, relatórios por conta e confirmação de sugestões.
- `account-reports.js`: separação por banco/conta e agregações mensais.
- `analytics-model.js`: orçamento, comparação entre períodos cobertos e classificações macro.
- `classification-engine.js`: regras de estabelecimentos e sugestões baseadas em decisões manuais anteriores.
- `planning.js`: orçamentos, rendimentos previstos, avaliações e análises escritas.
- `evolution-model.js` e `evolution-ui.js`: receitas, despesas e ativos documentados ao longo dos meses.

Os cálculos agregados usam cêntimos inteiros. O valor previsto de salário é separado do recebido nos extratos. Transferências internas e aplicações são separadas do consumo. Um reembolso reduz a despesa; um saldo inicial não constitui rendimento.

## Documentos e importações

Os movimentos mantêm referência ao ficheiro e à linha de origem. O histórico de categorias ajuda a classificar, mas não acrescenta transações. Ficheiros enviados para o bucket privado aguardam revisão e não são automaticamente aceites no livro de movimentos.

Avaliações incluem data e origem documental. O modelo patrimonial distingue referências antigas de valores observados no mês. A identidade documentada entre uma avaliação de poupança e um saldo bancário deve ser preservada para evitar duplicações. O subtotal financeiro não corresponde automaticamente a património líquido: imóveis, outros bens e dívidas exigem registos próprios.

## Análises

O resumo automático usa cálculos e regras. Revisões escritas pelo assistente são guardadas separadamente em `finance_ai_reports`, com métricas e versões de referência. Uma mudança nos movimentos, planos ou avaliações pode torná-las desatualizadas. O botão de pedido cria uma tarefa pendente; não executa uma chamada autónoma a um fornecedor de IA.

## Repositório e produção

O repositório é um export sanitizado do código, sem o histórico privado do alojamento. A configuração de produção, os identificadores do projeto, os links documentais reais e os dados não são publicados. O envio para este repositório não configura um pipeline de publicação nem substitui um backup do Supabase, do Storage ou do Drive.
