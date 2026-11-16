# Banco de dados, acesso a dados e RPCs

## 1. Backend

O backend identificado é Supabase, com:
- Supabase Auth para identidade e sessão;
- PostgreSQL para persistência;
- PostgREST para acesso às tabelas autorizadas;
- funções PostgreSQL expostas como RPC;
- Row Level Security (RLS), grants e funções de segurança.

O cliente é instanciado em src/lib/supabase.js com as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. Nenhuma chave de serviço deve existir no bundle do navegador.

## 2. Estratégia de acesso

O arquivo src/lib/api.js concentra o contrato de dados. A página não deve criar consultas ad hoc quando existe método de API correspondente.

Há dois tipos principais de acesso:

1. Consulta direta/upsert permitido: usado para alguns recursos simples, como listar tipos de ocorrência, consultar registros paginados e persistir tema.
2. RPC: usado para regras de negócio, operações de escrita, relatórios, dashboards e consultas que exigem autorização ou composição de dados.

O uso de RPC não torna uma operação segura automaticamente. Cada função precisa validar o usuário, papel, escopo, dados de entrada e permissões; a função deve ser concedida somente às roles necessárias.

## 3. Entidades e tabelas observadas

A lista abaixo reúne nomes encontrados no frontend, nas migrações e na auditoria técnica. Nem todas têm DDL completo versionado neste repositório de referência.

| Tabela/objeto | Finalidade observada |
| --- | --- |
| profiles | Perfil e estado de usuários da aplicação |
| roles | Catálogo de códigos de perfil |
| classes | Turmas, etapa de ensino, modalidade e estado ativo |
| students | Estudantes, matrícula, turma e estado ativo |
| class_user_access | Relação entre usuário e turmas às quais possui acesso |
| attendance_records | Registros de frequência/faltas |
| justifications | Justificativas associadas a registros de frequência |
| attachments | Metadados/referência a anexos |
| occurrence_types | Tipos de ocorrência configuráveis |
| occurrences | Ocorrências ligadas a estudante, turma e tipo |
| occurrence_cases | Caso de acompanhamento que pode agrupar ocorrências |
| teacher_feedback | Mensagem enviada pelo professor à direção |
| school_settings | Parâmetros gerais da escola |
| user_theme_preferences | Preferência de tema por usuário |
| audit_logs | Histórico de ações e contexto de auditoria |
| private.api_rate_limits | Controle de contagem de requisições por usuário/bucket, conforme migração |

Relacionamentos conceituais identificados:
- students.class_id referencia uma turma;
- attendance_records.student_id e class_id relacionam frequência a estudante e turma;
- occurrences.student_id, class_id e occurrence_type_id relacionam ocorrência a estudante/turma/tipo;
- occurrences.case_id relaciona uma ocorrência ao caso de acompanhamento;
- justifications referencia estudante, frequência e, opcionalmente, anexo;
- class_user_access relaciona usuário e turma;
- profiles.role_code referencia o código do perfil;
- teacher_feedback.teacher_id identifica o professor autor e class_id é opcional.

Os relacionamentos acima são observados por uso no código, migrações e auditoria; não substituem inspeção de constraints no banco ativo.

## 4. RPC e operações

Os nomes abaixo foram encontrados no contrato do frontend (api.js) e nas migrações versionadas. O significado dos argumentos pode ser confirmado nas chamadas de api.js e na definição SQL correspondente.

### Identidade e acesso

| RPC | Responsabilidade |
| --- | --- |
| app_current_user_context_secure | Retorna contexto autenticado e perfil |
| app_available_classes_secure | Lista turmas acessíveis ao usuário |
| app_record_audit | Registra evento de auditoria |

### Turmas e estudantes

| RPC | Responsabilidade |
| --- | --- |
| app_create_class_v2 | Criar turma |
| app_update_class | Atualizar turma |
| app_delete_class | Desativar/remover turma conforme regra do banco |
| app_students_list_secure | Listar estudantes com paginação e busca |
| app_create_student | Criar estudante |
| app_update_student | Atualizar estudante |
| app_delete_student | Desativar/remover estudante conforme regra do banco |
| app_student_detail_secure | Consultar detalhes e histórico do estudante |

### Dashboard e indicadores

| RPC | Responsabilidade |
| --- | --- |
| app_dashboard_secure | Resumo do dashboard de turma |
| app_ranking_json_secure | Ranking por métrica/período |
| app_public_attendance_dashboard | Métricas agregadas para o painel público |

### Frequência

| RPC | Responsabilidade |
| --- | --- |
| app_create_attendance | Criar registro individual |
| app_create_attendance_bulk | Criar registros em lote |
| app_update_attendance | Atualizar registro |
| app_delete_attendance | Excluir registro |

A consulta paginada de frequência usa diretamente attendance_records com filtros por turma, estudante e datas, ordenação decrescente e limite de página controlado.

### Justificativas

| RPC | Responsabilidade |
| --- | --- |
| app_create_justification | Criar justificativa |
| app_create_justification_bulk | Criar justificativas em lote |
| app_update_justification | Atualizar justificativa |
| app_delete_justification | Excluir justificativa |

### Ocorrências

| RPC | Responsabilidade |
| --- | --- |
| app_create_occurrence | Criar ocorrência e caso |
| app_create_occurrence_bulk | Criar ocorrências em lote associadas ao mesmo caso |
| app_update_occurrence | Atualizar ocorrência |
| app_delete_occurrence | Excluir ocorrência sob autorização |
| app_occurrence_cases_secure | Consultar casos autorizados |
| app_open_occurrence_case | Abrir caso e iniciar revisão |
| app_review_occurrence_case | Registrar resposta e concluir caso |

### Feedback

| RPC | Responsabilidade |
| --- | --- |
| app_create_teacher_feedback | Criar feedback do professor |
| app_teacher_feedback_secure | Consultar feedbacks autorizados |
| app_open_teacher_feedback | Abrir feedback para revisão |
| app_resolve_teacher_feedback | Registrar resposta e concluir feedback |

### Relatórios, configurações e operações em lote

| RPC | Responsabilidade |
| --- | --- |
| app_report_attendance_secure | Relatório de frequência |
| app_report_occurrences_secure | Relatório de ocorrências |
| app_settings_json | Ler configurações escolares |
| app_save_settings | Salvar configurações escolares |
| app_delete_records_bulk | Excluir vários registros dentro das regras do banco |

## 5. Acesso direto a tabelas no frontend

O código consulta diretamente:
- occurrence_types para listar tipos e estado ativo;
- attendance_records para leitura paginada de frequência;
- audit_logs para a tela de auditoria;
- user_theme_preferences para salvar o tema.

Essas consultas só são aceitáveis quando a política de banco e os grants restringem corretamente os registros e operações. A existência de uma tabela no frontend não autoriza acesso irrestrito.

## 6. Padrão dos métodos de api.js

api.js executa algumas responsabilidades comuns:

- ensureConfigured() impede operações quando a conexão não está configurada.
- positiveId() transforma e valida IDs como inteiros seguros maiores que zero.
- rpc() centraliza chamadas RPC, trata erros e aplica formatação de campos de pessoas.
- appError() converte códigos técnicos em mensagens controladas.
- emitRecordsChanged() emite evento após mutações.
- Métodos públicos expõem funções de domínio para páginas e componentes.

Ao adicionar uma operação, mantenha o contrato explícito: parâmetros tipados e nomes alinhados ao SQL, validação no frontend para feedback e validação obrigatória no banco para segurança.

## 7. Domínios e papéis

Os códigos reconhecidos pelo frontend são ADMIN, TEACHER, STAFF e VIEWER. A autorização pode depender de papel e também de turma. A tabela class_user_access e a função app_can_access_class são citadas na auditoria e usadas pelas migrações como mecanismo de escopo.

Os papéis de cliente do Postgres (anon e authenticated) não são os mesmos que os perfis funcionais da aplicação. anon representa acesso sem sessão; authenticated representa cliente com sessão válida. Dentro da RPC, o sistema ainda verifica o perfil da aplicação e o escopo de negócio.

## 8. Painel público e contrato de saída

app_public_attendance_dashboard é deliberadamente concedida a anon e authenticated. A função retorna totais e agrupamentos por etapa/turma, não deve incluir identificadores pessoais. A migração mais recente de métricas define summary, levels e classes, além do período.

Como a saída é pública, trate qualquer novo campo como publicação de dado. Antes de adicioná-lo:
1. classifique o dado;
2. confirme que é agregado e necessário;
3. avalie risco de reidentificação em turmas pequenas;
4. valide a função usando o papel anon;
5. verifique que nenhum JOIN reintroduziu nomes ou identificadores de estudantes.

## 9. Limites do modelo documentado

O código-fonte e as migrações analisadas não incluem todo o DDL inicial do sistema. A auditoria técnica registra tabelas e relacionamentos, mas parte das constraints e chaves estrangeiras foi inferida pelo uso. Para alterar o modelo real, consulte a definição do banco implantado e a cadeia completa de migrações antes de escrever SQL.
