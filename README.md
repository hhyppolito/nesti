# nesti

My Personal Family Finance Tracker

**As finanças da família, num só lugar.**

O teu dinheiro. O futuro da tua família.

Aplicação de gestão financeira familiar em HTML, CSS e JavaScript, com autenticação, base de dados e ficheiros privados no Supabase. Reúne orçamento, rendimentos, despesas, poupança, investimentos e notas partilhadas.

## Funcionalidades

- Análise mensal, receitas versus despesas, categorias detalhadas e despesas fixas/variáveis.
- Vistas por banco e conta, relatórios mensais e revisão dos movimentos.
- Orçamentos globais e por categoria, metas de poupança e rendimentos previstos por período.
- Carteira com avaliações datadas, origem documental e evolução patrimonial sem duplicar saldos.
- Sugestões de classificação por estabelecimento e aprendizagem a partir de correções manuais confirmadas.
- Notas da família, envio privado de documentos e fila de revisão.
- Resumo por regras e revisões escritas pelo assistente, com aviso quando os dados mudam.

## Executar localmente

1. Clonar este repositório.
2. Copiar `dist/config.example.js` para `dist/config.js` e preencher a URL e a chave **publishable** do projeto Supabase autorizado. Nunca usar uma chave secret ou service-role no navegador.
3. Servir a pasta `dist` com um servidor HTTP, por exemplo:

```sh
python -m http.server 8000 --directory dist
```

4. Abrir `http://localhost:8000` e entrar com uma conta autorizada no agregado.

O frontend não necessita de compilação nem de instalar dependências. Os testes usam Node.js 22 ou superior:

```sh
npm test
```

Uma instalação sem a configuração local não acede à base de dados. Os registos e contas pessoais não estão neste repositório.

## Organização

```text
dist/                 HTML, CSS, scripts e biblioteca Supabase vendorizada
schema/               Baselines SQL, sem dados ou convites reais
tests/                Testes com dados sintéticos
docs/                 Arquitetura, operação e recuperação
```

O cliente Supabase está incluído em `dist/vendor/supabase.js` (versão 2.119.0); ver `THIRD_PARTY_LICENSES.txt`. A interface usa fontes do Google Fonts.

## Base de dados e acessos

Para uma base já em funcionamento, não voltar a executar os baselines. Para um **projeto Supabase novo**, rever e aplicar pela ordem indicada em [schema/README.md](schema/README.md). Depois configurar o Supabase Auth, criar o agregado e autorizar os emails pelo processo administrativo descrito em [docs/OPERACAO.md](docs/OPERACAO.md).

O acesso depende de RLS e de associação verificada ao agregado. Publicar o HTML num domínio não concede acesso aos dados. A restrição adicional do alojamento atual é configurada fora do código; uma mudança de alojamento deve manter o acesso privado e os endereços de confirmação de email corretos.

## Atualizações e alojamento

Este repositório guarda o código. O envio para o GitHub **não altera o site em funcionamento nem cria publicação automática**. A pasta publicável é `dist`; o ficheiro `config.js` deve ser criado de forma privada em cada ambiente. A configuração e o identificador do alojamento atual não estão incluídos.

Extratos e avaliações continuam nas suas fontes e no Supabase. Um backup do GitHub não substitui backups da base de dados, do Storage ou dos documentos do Drive. Ver [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Limites atuais

Novos documentos aguardam revisão antes de entrarem nos totais. Sincronização contínua do Drive, importação autónoma, renovação automática de lembretes e geração autónoma de análises por IA ainda não estão ligadas. A evolução patrimonial usa apenas os ativos financeiros documentados e não inclui automaticamente imóveis ou dívidas.

A identidade usa verde profundo `#173D35`, areia `#E9E4D8` e verde suave `#C5DF9B`.

## Fluxo de utilização

1. Entrar com uma conta autorizada no agregado.
2. Adicionar documentos ou movimentos e rever conta, período e origem.
3. Confirmar classificações e separar transferências de receitas, despesas e aplicações.
4. Consultar saldos, orçamentos e evolução, atendendo aos avisos de cobertura parcial ou avaliações antigas.
5. Preservar as correções manuais e os documentos de origem ao atualizar os dados.

## Desenvolvimento e verificação

Ler [AGENTS.md](AGENTS.md) antes de alterar o projeto. Os modelos financeiros mantêm valores em cêntimos e distinguem bancos/contas. Não acrescentar dados reais aos exemplos ou testes.

O comando `npm test`, definido em [package.json](package.json), executa três ficheiros: relatórios por conta, análise e evolução. A existência destes testes não substitui ensaios da interface, da autenticação ou das políticas de acesso. Para alterações, verificar também a sintaxe dos scripts e usar dados sintéticos.

## Resolução de problemas

- Sem ligação: confirmar que `dist/config.js` existe localmente e que a pasta é servida por HTTP.
- Sem acesso ao agregado: confirmar email verificado, convite e associação administrativa; não alterar permissões para contornar a ausência de associação.
- Valores diferentes da expectativa: rever período, conta, duplicações, cobertura e datas das avaliações antes de mudar fórmulas.
- Recuperação: seguir [docs/OPERACAO.md](docs/OPERACAO.md); GitHub não contém os dados necessários para reconstruir sozinho a instalação.

Este complemento documental foi conferido com os ficheiros do repositório em 11/11/2026. Não foram executados testes, migrações ou operações na base de dados nesta atualização.
