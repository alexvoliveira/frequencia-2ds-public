# Arquitetura e organização do código

## 1. Visão técnica

A aplicação é um SPA (Single Page Application) executado no navegador. O React monta a interface, o React Router gerencia as rotas e o Supabase fornece autenticação e persistência. O Vite é responsável pelo servidor local e pelo build estático.

Stack observada:

| Camada | Tecnologia |
| --- | --- |
| Interface | React 19 |
| Roteamento | React Router 7 |
| Desenvolvimento/build | Vite 6 |
| Backend gerenciado | Supabase |
| Autenticação | Supabase Auth |
| Banco | PostgreSQL |
| Acesso a dados | Supabase JS 2 / PostgREST / RPC |
| Estilização | Tailwind CSS, PostCSS e CSS próprio |
| Gráficos | Recharts |
| Ícones | Lucide React |
| CI | GitHub Actions |
| Hospedagem prevista | Vercel |

As versões exatas devem ser consultadas no package.json e no package-lock.json. O projeto declara Node.js >=24 e <25.

## 2. Diagrama de componentes

    Navegador
      |
      +-- React / React Router
      |     |
      |     +-- Páginas e componentes
      |     |
      |     +-- src/lib/api.js
      |             |
      |             +-- Supabase Auth
      |             +-- PostgREST (consultas/upsert permitidos)
      |             +-- RPCs PostgreSQL
      |
      +-- Armazenamento local do navegador
            +-- sessionStorage: turma selecionada
            +-- localStorage: preferência de acessibilidade

    Supabase
      |
      +-- Auth / usuários e sessões
      +-- PostgreSQL
            +-- tabelas
            +-- RLS e grants
            +-- funções de negócio / SECURITY DEFINER
            +-- auditoria e rate-limit interno (conforme migrações)

    Vercel
      +-- entrega dos arquivos estáticos
      +-- headers de segurança
      +-- rewrite de rotas para index.html

Não existe, no fluxo analisado, um servidor de aplicação próprio que receba cada requisição do navegador. As regras mais importantes são executadas no PostgreSQL por RPCs.

## 3. Entrada da aplicação e ciclo de sessão

O ponto de entrada é src/main.jsx, que monta o componente App. O App:

1. Inicializa tema, estado de acessibilidade e turma previamente selecionada.
2. Consulta api.me() para recuperar o usuário autenticado e validar seu contexto no banco.
3. Registra um listener de eventos do Supabase Auth.
4. Mantém a aplicação em estado de carregamento até concluir a verificação inicial.
5. Renderiza o roteamento e protege as áreas internas.

Ao receber SIGNED_OUT, o estado local de usuário é limpo. Ao receber SIGNED_IN, TOKEN_REFRESHED ou USER_UPDATED, o contexto do usuário é atualizado.

O helper Protected impede a renderização das telas internas quando não há usuário. Essa proteção de rota melhora a navegação, mas não substitui autorização no banco.

## 4. Roteamento observado

| Rota | Tela/Comportamento |
| --- | --- |
| /login | Login |
| /selecionar-turma | Seleção de turma autenticada |
| / | Redirecionamento conforme sessão |
| /dashboard | Redirecionamento para o fluxo de seleção |
| /dashboard/classes/:id | Dashboard de uma turma |
| /alunos | Lista de estudantes |
| /alunos/:id | Detalhes do estudante |
| /relatorios | Relatórios |
| /ocorrencias | Acompanhamento de casos |
| /feedback | Feedback entre professores e direção |
| /configuracoes | Configurações |
| /logs | Logs administrativos |
| /painel/frequencia | Painel público, sem Protected |
| /students e /students/:id | Redirecionamento para /alunos |
| /settings | Redirecionamento para /configuracoes |

A rota pública do painel é intencionalmente separada do shell autenticado. O banco concede execução anônima apenas à função agregadora correspondente, e essa função deve continuar sem retornar dados individuais.

## 5. Organização de diretórios

    src/
      App.jsx
      main.jsx
      components/
        dashboard/
          Charts.jsx
          KpiCard.jsx
          Ranking.jsx
        layout/
          Layout.jsx
        modals/
          AddRecord.jsx
          EditRecord.jsx
        ui/
          Illustration.jsx
          SchoolLogo.jsx
          StudentSelect.jsx
          UI.jsx
      lib/
        api.js
        date.js
        supabase.js
      pages/
        AuditLogs.jsx
        ClassSelection.jsx
        Dashboard.jsx
        Login.jsx
        OccurrenceCases.jsx
        PublicAttendanceDashboard.jsx
        Reports.jsx
        Settings.jsx
        StudentDetails.jsx
        Students.jsx
        TeacherFeedback.jsx
      styles/
        index.css

    public/
      logos e favicons

    supabase/
      migrations/

    tests/
      core.test.mjs

A estrutura acima representa os arquivos de aplicação observados no projeto de referência.

## 6. Responsabilidade dos módulos

### App.jsx

É o coordenador da aplicação: sessão, rotas, tema, acessibilidade e turma atual. Não deve concentrar consultas de negócio complexas; esse papel pertence ao módulo de API e às páginas.

### components/layout/Layout.jsx

Implementa o shell das telas internas: navegação lateral, menu de ações rápidas, troca de turma, sair, tema e preferências visuais. Também abre o modal de criação de registros.

### components/modals/AddRecord.jsx

Centraliza o fluxo de criação de falta, justificativa e ocorrência. Compartilha controles de seleção de alunos e suporta ações individuais ou em lote conforme o tipo de registro.

### components/modals/EditRecord.jsx

Formulário de edição de registros existentes, com os campos pertinentes ao tipo selecionado.

### components/ui/UI.jsx

Agrupa elementos reutilizáveis: mensagens globais, cartões, badges, botões, skeletons, loading, modal, campos, alertas, estado vazio e página de erro.

### components/dashboard

Agrupa gráficos, cartões de indicadores e ranking, mantendo a visualização separada da consulta de dados.

### pages

Cada página coordena o estado e o fluxo de uma área funcional. A maior parte da regra de dados fica em api.js ou no banco.

### lib/api.js

É a fachada de dados do frontend. Normaliza erros do Supabase, valida IDs positivos, chama RPCs, transforma nomes recebidos e emite o evento school-data-changed após mutações para coordenar atualização de telas.

### lib/supabase.js

Cria o cliente Supabase a partir de variáveis VITE_*. Se a configuração estiver ausente, o cliente é null e as operações que dependem dele falham com mensagem controlada.

### lib/date.js

Concentra conversão e validação de datas, formatação brasileira e obtenção do dia atual no fuso de São Paulo.

## 7. Comunicação e fluxo de dados

O fluxo típico de leitura é:

1. A página recebe o ID da turma ou estudante selecionado.
2. A página chama um método de api.js.
3. api.js valida parâmetros locais simples e chama a RPC ou consulta autorizada.
4. A função/tabela do Supabase verifica contexto, papel e escopo.
5. O resultado é normalizado e retornado para a página.
6. A página atualiza o estado React.

O fluxo típico de escrita é:

1. A interface valida campos necessários para experiência do usuário.
2. api.js constrói argumentos com nomes de parâmetros explícitos.
3. A RPC PostgreSQL valida novamente tipo, tamanho, associação entre entidades, permissões e regras de negócio.
4. A transação grava as alterações.
5. api.js emite school-data-changed.
6. Componentes ouvintes atualizam os dados apresentados.

A validação no navegador nunca deve ser a única proteção: chamadas podem ser feitas diretamente fora da interface.

## 8. Estado e armazenamento no navegador

- Estado React: usuário, tema atual, carregamento, mensagens, filtros, formulários e dados exibidos.
- sessionStorage: identificador da turma selecionada, sob a chave selected-class-id. É removido ao sair da turma/logout.
- localStorage: modo de acessibilidade, com chave associada ao ID de usuário para evitar compartilhar a preferência entre usuários do mesmo navegador.
- Sessão Supabase: persistida e renovada pelo cliente Supabase, conforme configuração em src/lib/supabase.js.

A preferência de tema é persistida no backend em user_theme_preferences. A preferência de acessibilidade é local ao navegador.

## 9. Tratamento de erros

api.js converte códigos comuns do Postgres/PostgREST em mensagens funcionais. Exemplos:

- 42501, 401 ou 403: usuário sem permissão.
- 429: limite de requisições atingido.
- 23505: conflito/duplicidade.
- 23503 ou 23514: integridade ou regra de dados.
- 22007 ou 22023: entrada inválida.
- PGRST202/PGRST204: função ou coluna não encontrada; provável incompatibilidade entre frontend e migrações aplicadas.
- Falhas de rede: mensagem para verificar conexão.

Mensagens para o usuário não devem revelar SQL, stack trace, chaves, JWT, nomes internos de infraestrutura ou dados de outros usuários.

## 10. Decisões arquiteturais e implicações

- RPCs são usadas quando a regra precisa ser transacional ou centralizada.
- O frontend é relativamente fino em regras de autorização; o banco deve ser a autoridade.
- O evento de janela school-data-changed evita a introdução de uma store global somente para sincronizar telas.
- O SPA depende de rewrite para index.html na hospedagem, de modo que rotas profundas sejam resolvidas pelo React Router.
- CSP e connect-src precisam permitir o domínio Supabase específico da instância implantada. Não reutilize silenciosamente o domínio de produção em uma instância pública.
