# Baselines da base de dados

Estes ficheiros contêm apenas estrutura, funções, regras de acesso e configuração do bucket privado. Não incluem agregados, emails, convites, movimentos, avaliações ou notas reais.

Destinam-se a um projeto Supabase **novo e vazio**, com os schemas Auth e Storage fornecidos pelo Supabase. Não executar novamente numa instalação existente.

Ordem:

1. `001-household-and-notes.sql`: agregados, membros, notas e RLS.
2. `002-uploads-and-invitations.sql`: convites privados, inscrição por email verificado, documentos e bucket privado de 20 MB.
3. `003-statement-ledger.sql`: contas, fontes, movimentos e ligação à linha original.
4. `004-planning-and-analysis.sql`: classificações detalhadas, orçamentos, rendimentos, avaliações e análises.

O quarto baseline substitui a função de versionamento dos movimentos definida no terceiro; aplicar a sequência completa. As permissões limitam a edição aos gestores do agregado e restringem escrita de análises ao serviço autorizado. Não há permissões de leitura anónima dos registos familiares.

São referências de estrutura para recuperação, não um dump completo de um projeto Supabase. Configurações do Auth, SMTP, URLs de confirmação, backups e o conteúdo do Storage são administrados separadamente. Rever as migrações numa base de desenvolvimento antes de as utilizar numa recuperação real.
