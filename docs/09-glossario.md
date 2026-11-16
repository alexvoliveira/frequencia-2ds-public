# Glossário

| Termo | Definição |
| --- | --- |
| ADMIN | Perfil funcional administrativo reconhecido pelo frontend e pelas RPCs. |
| Anon | Papel cliente do Postgres/Supabase usado por requisições sem sessão autenticada. Não é um perfil funcional de usuário. |
| Attendance record | Registro de frequência associado a estudante, turma e data. |
| Auth | Serviço de autenticação do Supabase, responsável por identidade, sessão e tokens. |
| Backend | Serviços Supabase, funções PostgreSQL, políticas e persistência usados pela aplicação. |
| Case / occurrence case | Registro de acompanhamento que agrupa uma ou mais ocorrências e possui status de revisão. |
| CSP | Content Security Policy; política de segurança que restringe origens e recursos que o navegador pode carregar/conectar. |
| CSV | Formato textual tabular usado para exportar relatórios. Deve ser protegido contra formula injection. |
| Dashboard | Tela de indicadores e gráficos para uma turma. |
| Estudante ativo | Estudante marcado como ativo no cadastro e considerado em determinadas consultas/cálculos. |
| Frequência estimada | Indicador calculado por aulas previstas estimadas menos faltas. Não equivale a presença efetivamente registrada. |
| Justificativa | Registro ligado a uma falta, com motivo, descrição opcional e referência opcional a anexo. |
| PostgREST | Camada HTTP usada pelo Supabase para expor operações autorizadas sobre o PostgreSQL. |
| Publishable key / anon key | Chave pública usada pelo cliente do navegador. Não substitui RLS, grants ou autorização. |
| RPC | Remote Procedure Call. No projeto, é uma função PostgreSQL chamada pelo cliente Supabase. |
| RLS | Row Level Security. Políticas do PostgreSQL que restringem quais linhas podem ser lidas/alteradas. |
| SECURITY DEFINER | Modo de execução de função PostgreSQL com privilégios do proprietário. Exige cuidado especial com autorização e search_path. |
| STAFF | Perfil funcional para equipe de apoio/funcionários. |
| Supabase | Plataforma que oferece Auth, PostgreSQL, PostgREST e serviços relacionados. |
| TEACHER | Perfil funcional de professor. |
| VIEWER | Perfil funcional destinado à consulta, conforme configuração das regras do sistema. |
| Vercel | Plataforma de hospedagem/deploy configurada no projeto para entregar o SPA. |
| Vite | Ferramenta de desenvolvimento e build frontend. |
| Workflow | Fluxo de estados e ações, como acompanhamento de ocorrência e feedback. |
| school-data-changed | Evento de navegador emitido após mutações para notificar componentes interessados. |
| UNREAD | Estado inicial de ocorrência ou feedback ainda não aberto para revisão. |
| IN_REVIEW | Estado de ocorrência ou feedback em análise. |
| RESOLVED | Estado final de ocorrência ou feedback após resposta/resolução. |
| Supabase Storage | Serviço de armazenamento de objetos. O frontend analisado não implementa diretamente upload/download de anexos. |
