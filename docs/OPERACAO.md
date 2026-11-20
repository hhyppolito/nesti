# Operação

## Configurar uma instalação

Usar um projeto Supabase novo para testar a recuperação. Rever os quatro baselines pela ordem indicada em `schema/README.md`. Manter a confirmação de email ativa e configurar a entrega de emails, o Site URL e os URLs de redirecionamento para o domínio escolhido e para o ambiente local de desenvolvimento.

Criar o agregado e os convites pelo lado administrativo. Exemplo conceptual, a adaptar no editor SQL do projeto de desenvolvimento:

```sql
-- Executar apenas depois de substituir o nome e o email de exemplo.
-- Guardar o UUID devolvido; nunca o publicar com dados da família.
insert into public.finance_households(name)
values ('Família de exemplo') returning id;

-- Substituir o UUID abaixo pelo do agregado criado.
insert into finance_private.member_invitations(household_id,email,role)
values ('00000000-0000-4000-8000-000000000000', 'member@example.invalid', 'manager');
```

Depois, a pessoa cria a conta na aplicação e confirma o email. O trigger associa ao agregado apenas o email verificado que corresponda a um convite. Para utilizadores já confirmados antes da criação do convite, um administrador deve verificar a identidade e tratar a associação pelo servidor; o cliente não pode inscrever-se sozinho num agregado.

Copiar `dist/config.example.js` para `dist/config.js`, configurar o projeto e servir `dist` por HTTP. A chave publishable identifica o projeto; a proteção dos dados depende das políticas RLS e dos membros autorizados.

## Atualizar os dados

1. Guardar os documentos originais no arquivo privado ou usar Adicionar dados.
2. Rever conta, período, duplicações, saldos e categorias antes de importar.
3. Preservar a origem de cada movimento e as correções manuais.
4. Registar avaliações com data e confirmar sobreposições entre saldos e investimentos.
5. Atualizar a página e rever cobertura, valores pendentes e pedidos de análise.

Não inferir rendimentos apenas de nomes de pessoas ou transferências. Confirmar a finalidade quando não é clara.

## Publicar alterações

Executar `npm test` e verificar a sintaxe dos scripts alterados. Testar a interface quando existir navegador disponível. Publicar a pasta `dist` no alojamento escolhido, acrescentando a configuração local de forma privada. Preservar os acessos do site e os endereços do Supabase Auth.

Uma mudança no GitHub não publica por si só uma nova versão. Não configurar publicação pública de dados ou migrações automáticas para produção como parte de um simples backup do código.

## Recuperar e manter

Guardar backups independentes da base de dados, dos ficheiros no Storage e dos originais do Drive. Este repositório não contém esses dados nem as credenciais para os recuperar. Validar a restauração num ambiente separado antes de alterar o domínio ou a instalação em uso.


## Revisão dos envios e Mercado

Os ficheiros enviados pela aplicação são suficientes para uma revisão: não é necessário duplicá-los no Drive. Os originais ficam no bucket privado; os envios só entram nos números após validação. A revisão deve verificar hash, identidade da conta, duplicados, datas e saldos, preservando as correções existentes.

A tabela `finance_upload_reviews` é exclusiva do serviço: não possui permissões de cliente. Caso o conector não permita ler o Storage diretamente, uma operação temporária pode preparar os uploads explicitamente autorizados. Exigir JWT, uma capacidade aleatória temporária, prazo curto e lista fechada de agregado e uploads. A resposta HTTP só pode conter contagens; os ficheiros permanecem em preparação privada. Encerrar o serviço e limpar os payloads após a revisão. Nunca publicar capacidades ou código temporário com identificadores reais. Não existe importação automática ao enviar um ficheiro.

Em Mercado, cada documento é identificado pela referência de origem e as cópias são unidas. As notas de crédito reduzem o consumo. Os preços exibidos já incluem os descontos informativos: não os subtrair novamente. O subtotal do talão é distinto do pagamento após usar saldo do cartão. Recargas de saldo pré-pago não são consumo. Talões incompletos não entram nos totais; talões com apenas total verificável entram no total, mas não no detalhe. Quantidades e unidades ausentes não devem ser inventadas para comparar preços. Atribuir uma conta bancária exige evidência própria.
