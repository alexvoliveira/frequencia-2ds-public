# Instalação, configuração e operação

## 1. Pré-requisitos

- Node.js na versão 24.x, conforme engines de package.json (>=24 <25).
- npm compatível com a versão de Node.
- Projeto Supabase provisionado.
- Schema, funções RPC, políticas RLS e permissões compatíveis com o frontend.
- Usuários e perfis cadastrados no Supabase Auth/banco.
- Acesso ao repositório e às configurações de deploy.

O projeto é um frontend estático; não é necessário iniciar um servidor de API Node independente.

## 2. Obter o código

Clone o repositório público quando o código-fonte estiver presente nele. Para a documentação, a branch principal contém os arquivos Markdown em docs/.

    git clone https://github.com/alexvoliveira/frequencia-2ds-public.git
    cd frequencia-2ds-public

Se estiver trabalhando no repositório de origem privado, use o remote autorizado correspondente. Não inclua token no endereço remoto nem em scripts.

## 3. Instalar dependências

    npm ci

Use npm ci para instalação reproduzível a partir do package-lock.json. Não use npm install para atualizar dependências incidentalmente quando o objetivo é apenas configurar o ambiente.

## 4. Configuração do Supabase

Crie um arquivo local .env.local (ou .env) não versionado, com valores do projeto Supabase do ambiente correto:

    VITE_SUPABASE_URL=https://SEU-PROJECT-REF.supabase.co
    VITE_SUPABASE_PUBLISHABLE_KEY=SUA_PUBLISHABLE_KEY

As duas variáveis são lidas por import.meta.env em src/lib/supabase.js. Sem elas, supabaseConfigured será falso e as operações que dependem de backend não poderão ser executadas.

A publishable/anon key é uma chave pública de cliente; ela não deve ser confundida com service_role/secret key. A chave privada nunca deve ser fornecida ao frontend.

Não use automaticamente a instância de produção. Para uma versão pública, crie um projeto Supabase independente, com dados fictícios, usuários de teste, permissões próprias e políticas revisadas.

## 5. Configuração de Content Security Policy

A configuração de Vercel aplica uma CSP com connect-src. Essa diretiva deve permitir o domínio Supabase do ambiente de implantação, por exemplo:

    connect-src 'self' https://SEU-PROJECT-REF.supabase.co wss://SEU-PROJECT-REF.supabase.co;

Substitua pelo host efetivo do projeto e revise todas as outras diretivas. Não deixe um identificador privado do ambiente original fixado no arquivo público. Evite permitir domínios genéricos mais amplos do que o necessário.

## 6. Execução local

    npm run dev

O Vite inicia o servidor de desenvolvimento e informa a URL local no terminal. A aplicação carrega, mas as operações de dados dependem do Supabase configurado e das migrações/objetos correspondentes.

Para testar a versão de produção localmente:

    npm run build
    npm run preview

O build gera os arquivos estáticos na pasta dist. A pasta é artefato de build e não deve ser versionada.

## 7. Publicação na Vercel

A configuração verificada contém vercel.json com rewrite de SPA para index.html e headers de segurança. A publicação pode ser conectada ao repositório Git por meio da Vercel.

Passos de operação:
1. Criar/selecionar o projeto Vercel.
2. Conectar o repositório e selecionar a branch de produção.
3. Definir as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente correto.
4. Confirmar versão de Node compatível (24.x).
5. Confirmar comandos detectados pelo Vite ou definir build/install commands de acordo com package.json.
6. Atualizar CSP para o Supabase do ambiente.
7. Executar deploy preview e validar login, rotas, consultas, gravações e painel público.
8. Promover para produção somente após aprovação dos testes.

Como variáveis VITE_* são embutidas no bundle, alterações nelas exigem novo build/deploy.

## 8. Ambientes

Mantenha ambientes separados, por exemplo:

| Ambiente | Finalidade | Dados |
| --- | --- | --- |
| Desenvolvimento | Trabalho local | Sintéticos |
| Homologação | Testes integrados | Sintéticos ou anonimizados |
| Produção | Operação real | Dados reais protegidos |

Não conecte a versão pública de código automaticamente ao Supabase de produção. O repositório pode ser público mesmo quando o backend real deve permanecer privado.

## 9. Usuários e permissões

O login não cria automaticamente um perfil funcional. O ambiente precisa ter usuários autorizados no Supabase Auth, perfis correspondentes e associações de acesso a turmas. Configure esses elementos por procedimento administrativo seguro, não por SQL com dados pessoais versionados.

Perfis reconhecidos pelo frontend: ADMIN, TEACHER, STAFF e VIEWER. O banco determina as permissões efetivas.

## 10. Configurações de operação

Antes de disponibilizar o sistema, confira:
- nome da escola e fuso horário;
- dias letivos por ano e aulas por dia;
- percentual mínimo de frequência;
- tipos de ocorrência e seus estados;
- turmas, etapa de ensino e modalidade;
- estudantes ativos;
- associação de usuários às turmas;
- políticas RLS, grants e funções;
- política de senha do Supabase;
- backup e restauração;
- retenção de logs e dados.

## 11. Diagnóstico rápido

| Sintoma | Causa provável | Verificação |
| --- | --- | --- |
| Erro de configuração de serviço | Variáveis ausentes | Conferir env e rebuild |
| Falha de rede/CSP | Domínio Supabase ausente em connect-src | DevTools > Console/Network e CSP |
| Login funciona, telas negam acesso | Perfil inativo, ausente ou sem turma | Auth, profiles e class_user_access |
| RPC não encontrada (PGRST202) | Migração não aplicada ou schema cache | Conferir versão SQL e recarregar schema |
| Coluna não encontrada (PGRST204) | Frontend e banco incompatíveis | Comparar código e migrations |
| 42501 | Permissão/RLS/escopo | Revisar função, grants, RLS e turma |
| 429 | Rate limit ativo | Conferir Retry-After e configuração do backend |
| Painel público vazio/indisponível | RPC, grants ou dados de configuração | Testar a função como anon e revisar saída agregada |

Não resolva erro de autorização concedendo acesso amplo a anon ou authenticated. Identifique a regra correta.

## 12. Rollback e recuperação

Para rollback de frontend, a Vercel pode promover uma implantação anterior conforme o procedimento configurado. Para rollback de banco, não aplique automaticamente uma migração inversa improvisada. Analise efeitos colaterais, dados já gravados, dependências e compatibilidade de versões.

Mantenha backups testados e um plano de recuperação. Restauração de banco deve ser exercitada em ambiente separado antes de ser necessária em produção.
