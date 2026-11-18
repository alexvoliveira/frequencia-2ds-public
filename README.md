# Frequência Escolar

Aplicação web para organizar os registros de frequência e o acompanhamento da rotina escolar. O sistema reúne faltas, justificativas e ocorrências por turma, mantém o histórico dos estudantes e oferece indicadores para apoiar o trabalho de professores e equipe gestora.

A proposta é simples: diminuir a dependência de planilhas e registros dispersos, sem perder o contexto de cada lançamento nem o histórico do que foi tratado.

## O que é possível fazer

### Acompanhar a frequência das turmas
- Consultar um painel com indicadores da turma, evolução por período, registros recentes e estudantes que precisam de atenção.
- Filtrar a visualização por hoje, semana, mês ou intervalo personalizado.
- Consultar a lista de estudantes e abrir o histórico individual de faltas e ocorrências.

### Registrar faltas e justificativas
- Lançar faltas por estudante, informando data, quantidade de aulas e observações.
- Fazer lançamentos para vários estudantes na mesma operação.
- Relacionar uma justificativa a uma falta já registrada, com motivo e descrição.
- Consultar e editar registros conforme o perfil e as permissões da conta.

### Registrar e acompanhar ocorrências
- Registrar uma ocorrência vinculada ao estudante e à turma, com tipo, data, gravidade e descrição.
- Criar ocorrências individualmente ou em lote.
- Acompanhar os casos em três etapas: **não lida**, **em revisão** e **resolvida**.
- Registrar a resposta da equipe responsável e manter o histórico do atendimento.

### Manter a comunicação entre professores e direção
Professores podem enviar feedback à direção, com ou sem vínculo a uma turma. A equipe responsável acompanha as mensagens, inicia a análise e registra uma resposta ao concluir o atendimento.

### Consultar relatórios e indicadores
- Filtrar relatórios por turma, estudante, período e tipo de ocorrência.
- Consultar totais e registros de frequência e ocorrências.
- Exportar os resultados em CSV para análise ou arquivamento.
- Consultar indicadores gerais em um painel público separado da área autenticada.

O painel público apresenta somente informações agregadas. Os números de frequência e presença exibidos nele são estimativas calculadas a partir dos parâmetros escolares e dos dias úteis decorridos; não representam uma chamada real de presença aula a aula e não descontam automaticamente feriados ou suspensões de aula.

### Administrar o ambiente
- Consultar registros de auditoria das operações administrativas.
- Configurar dados gerais da escola, como fuso horário, dias letivos, aulas por dia e percentual mínimo de frequência.
- Gerenciar os tipos de ocorrência disponíveis.
- Usar tema claro ou escuro e preferências de visualização.

## Acesso e perfis

O acesso à área administrativa é feito por e-mail e senha. Não há fluxo de cadastro público: as contas precisam ser provisionadas no ambiente Supabase.

O frontend reconhece os seguintes perfis:

| Perfil | Uso no sistema |
| --- | --- |
| `ADMIN` | Administração e acompanhamento dos processos da escola |
| `TEACHER` | Rotinas do professor e envio de feedback à direção |
| `STAFF` | Acesso da equipe de apoio, conforme as permissões atribuídas |
| `VIEWER` | Consulta das informações liberadas para o perfil |

As permissões efetivas não dependem apenas das telas exibidas. O banco valida o perfil do usuário e o acesso à turma nas operações protegidas.

## Tecnologias

| Parte | Tecnologia |
| --- | --- |
| Interface | React 19 |
| Rotas | React Router 7 |
| Desenvolvimento e build | Vite 6 |
| Autenticação | Supabase Auth |
| Banco de dados | PostgreSQL (Supabase) |
| Integração com o backend | Supabase JS, PostgREST e funções RPC |
| Estilização | Tailwind CSS, PostCSS e CSS próprio |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Testes | Node.js Test Runner |
| Integração contínua | GitHub Actions |
| Publicação configurada | Vercel |

A aplicação é um frontend SPA executado no navegador. Não há uma API separada em Node/Express: autenticação, consultas e gravações são feitas pelo Supabase. As operações que concentram regras de negócio são encaminhadas a funções PostgreSQL (RPC), com as verificações de autorização correspondentes.

## Executar localmente

### Requisitos

- Node.js **24.x** (o projeto declara suporte a versões `>=24 <25`).
- npm.
- Um projeto Supabase configurado para esta aplicação.

### 1. Baixar o projeto

```bash
git clone https://github.com/alexvoliveira/frequencia-2ds-public.git
cd frequencia-2ds-public
```

### 2. Configurar as variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Depois, informe os dados do seu projeto Supabase em `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJECT-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key
```

Use a URL e a chave publicável do ambiente que você configurou. A chave `publishable` é destinada ao cliente; **não coloque uma chave `service_role` ou qualquer secret no frontend**.

### 3. Instalar dependências e iniciar

```bash
npm ci
npm run dev
```

O Vite informa no terminal o endereço local para abrir a aplicação.

### 4. Validar o build

```bash
npm test
npm run build
npm run preview
```

O comando `npm run preview` serve localmente o build gerado em `dist/`.

## Scripts disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm test` | Executa os testes automatizados do projeto |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Abre localmente a versão gerada pelo build |

O workflow de CI do GitHub Actions utiliza Node.js 24 e executa instalação reproduzível, auditoria de dependências (`npm audit`), testes e build.

## Organização do repositório

```text
.
├── public/               # Logos, favicon e arquivos estáticos
├── src/
│   ├── components/       # Layout, formulários, modais e componentes reutilizáveis
│   ├── lib/              # Cliente Supabase, API e funções de data
│   ├── pages/            # Telas e fluxos da aplicação
│   └── styles/           # Estilos globais
├── supabase/
│   └── migrations/       # Migrações SQL versionadas neste repositório
├── tests/                # Testes automatizados
├── docs/                 # Documentação funcional e técnica
├── .env.example          # Modelo das variáveis de ambiente
└── package.json
```

## Documentação

Os documentos abaixo detalham as regras e decisões que não cabem no README:

| Documento | Assunto |
| --- | --- |
| [Visão geral](docs/01-visao-geral.md) | Objetivo, perfis, conceitos e áreas do sistema |
| [Arquitetura](docs/02-arquitetura.md) | Componentes, rotas, fluxo de dados e organização do código |
| [Funcionalidades](docs/03-funcionalidades.md) | Telas e regras dos fluxos de frequência, ocorrências e feedback |
| [Banco e API](docs/04-banco-e-api.md) | Tabelas, funções RPC e contratos utilizados pelo frontend |
| [Segurança e privacidade](docs/05-seguranca-e-privacidade.md) | Autenticação, autorização, RLS e tratamento de dados |
| [Instalação e operação](docs/06-instalacao-e-operacao.md) | Configuração do ambiente, build e publicação |
| [Testes e CI](docs/07-testes-e-ci.md) | Testes automatizados e pipeline |
| [Migrações e manutenção](docs/08-migracoes-e-manutencao.md) | Histórico SQL e cuidados de manutenção |
| [Glossário](docs/09-glossario.md) | Termos usados no projeto |

## Antes de colocar o sistema em funcionamento

Este repositório contém o código do frontend e as migrações SQL que estão versionadas aqui. **Ele não é, sozinho, uma instalação completa do backend.** A aplicação depende de um projeto Supabase com tabelas, funções RPC, políticas de Row Level Security (RLS), permissões, configurações escolares e usuários compatíveis com o código.

As migrações disponíveis são incrementais e não representam todo o histórico de alterações aplicado ao banco de produção. Portanto, não é possível assumir que elas reconstruam integralmente o banco desde o início. Consulte a documentação de [instalação](docs/06-instalacao-e-operacao.md) e de [migrações](docs/08-migracoes-e-manutencao.md) antes de preparar um ambiente novo.

Como o sistema trabalha com informações de estudantes e profissionais da educação:

- Use um projeto Supabase separado para desenvolvimento e demonstração.
- Utilize dados fictícios ou devidamente anonimizados nesses ambientes.
- Não publique nomes, matrículas, justificativas, ocorrências, logs pessoais ou dados reais.
- Mantenha chaves privadas e credenciais fora do repositório.
- Revise RLS, permissões e funções RPC antes de disponibilizar uma instância.

## Licença

Este repositório não possui um arquivo de licença. Até que uma licença seja incluída pelo responsável, a publicação do código no GitHub não deve ser interpretada como autorização para reutilização, redistribuição ou uso comercial.
