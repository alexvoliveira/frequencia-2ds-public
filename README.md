# Frequência Escolar

Sistema web de acompanhamento da frequência escolar, registros de faltas, justificativas, ocorrências, indicadores e relatórios por turma.

Este repositório contém o código-fonte da aplicação, as migrações SQL versionadas e a documentação técnica e funcional. A implementação foi derivada do projeto de referência com remoção de associações pessoais e de identificadores fixos do ambiente Supabase original.

> **Importante:** este projeto lida com dados pessoais de estudantes e profissionais da educação. A documentação e o código não devem ser interpretados como autorização para publicar dados reais, credenciais, dumps ou informações identificáveis. A instância pública de demonstração deve usar um projeto Supabase separado e dados fictícios ou agregados.

## O que o sistema faz

- Autentica usuários autorizados por meio do Supabase Auth.
- Controla acesso por perfil e por turma.
- Mantém cadastros de turmas e estudantes.
- Registra faltas individualmente ou em lote.
- Permite registrar e acompanhar justificativas.
- Registra ocorrências individuais ou em lote e acompanha o fluxo de revisão.
- Permite que professores enviem feedback à direção.
- Exibe dashboards, rankings e relatórios, com exportação CSV.
- Mantém histórico de auditoria para operações administrativas.
- Oferece configurações escolares, tema claro/escuro e opções de acessibilidade visual.
- Expõe um painel público separado, concebido para mostrar somente indicadores agregados de frequência.

## Executar localmente

1. Instale Node.js 24.x.
2. Copie .env.example para .env.local.
3. Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY com um projeto Supabase próprio e isolado.
4. Execute npm ci.
5. Execute npm run dev.

O frontend necessita de um backend compatível, com schema, RPCs, políticas RLS e dados de configuração. Não conecte este clone a um banco de produção sem revisar autorização, privacidade e compatibilidade. Consulte Instalação e operação para os detalhes.

## Estrutura do código

- src/pages: telas e fluxos da aplicação.
- src/components: layout, formulários, modais, componentes de interface e gráficos.
- src/lib: cliente Supabase, fachada de API e utilitários de data.
- supabase/migrations: alterações SQL versionadas.
- tests: testes automatizados de contrato/estrutura.
- public: logos e recursos estáticos.
- docs: documentação funcional e técnica.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Visão geral](docs/01-visao-geral.md) | Objetivo, escopo, perfis e conceitos do domínio |
| [Arquitetura](docs/02-arquitetura.md) | Stack, organização do código, navegação, estado e integração |
| [Funcionalidades](docs/03-funcionalidades.md) | Fluxos de uso, telas, operações e regras funcionais |
| [Banco e API](docs/04-banco-e-api.md) | Modelo conceitual, tabelas observadas, RPCs e contratos |
| [Segurança e privacidade](docs/05-seguranca-e-privacidade.md) | Autenticação, autorização, RLS, segredos e dados pessoais |
| [Instalação e operação](docs/06-instalacao-e-operacao.md) | Requisitos, ambiente, comandos, build e publicação |
| [Testes e CI](docs/07-testes-e-ci.md) | Testes automatizados, pipeline e critérios de validação |
| [Migrações e manutenção](docs/08-migracoes-e-manutencao.md) | Evolução do schema, ordem, recuperação e rotina de manutenção |
| [Glossário](docs/09-glossario.md) | Termos funcionais e técnicos usados no projeto |

## Stack identificada

- React 19
- React Router 7
- Vite 6
- Supabase JS 2 (Auth, PostgREST e RPCs PostgreSQL)
- PostgreSQL no Supabase
- Tailwind CSS/PostCSS e CSS próprio
- Recharts para gráficos
- Lucide React para ícones
- GitHub Actions para CI
- Vercel como alvo de publicação identificado na configuração

As versões exatas e os comandos ficam em package.json e package-lock.json. O projeto declara Node.js >=24 <25.

## Estado da documentação e limites

A documentação foi construída a partir da estrutura e do código da branch principal do projeto de referência consultados em 15 de novembro de 2026. Ela documenta o comportamento encontrado no frontend e nas migrações versionadas; não substitui a inspeção do banco em execução.

A árvore de migrações contém alterações incrementais, mas não inclui todas as migrações históricas que já foram aplicadas ao banco de produção. Portanto, não é correto afirmar que o conjunto atual permite reconstruir, sozinho e do zero, todo o banco de produção. Consulte Migrações e manutenção.

A aplicação depende de um backend Supabase corretamente provisionado, de políticas RLS, funções RPC, permissões, dados de configuração e usuários. Sem essas dependências, a interface pode compilar, mas as operações de negócio não funcionarão.

## Navegação rápida

- Instalação local: docs/06-instalacao-e-operacao.md
- Configuração do Supabase: docs/06-instalacao-e-operacao.md
- Fluxos funcionais: docs/03-funcionalidades.md
- Contrato de API/RPC: docs/04-banco-e-api.md
- Modelo de segurança: docs/05-seguranca-e-privacidade.md
- Executar testes: docs/07-testes-e-ci.md

## Licença e uso

Nenhuma licença de código foi identificada na árvore de origem consultada. Até que uma licença seja adicionada pelo titular, não presuma que o código está licenciado para reutilização, redistribuição ou uso comercial.