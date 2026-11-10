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
