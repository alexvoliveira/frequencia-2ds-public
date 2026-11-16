# Migrações de banco e manutenção

## 1. Como o banco evolui

A pasta supabase/migrations contém scripts SQL incrementais, organizados por timestamp e nome descritivo. Cada arquivo deve representar uma alteração controlada no schema, em funções, permissões, índices, constraints ou políticas.

O frontend depende dos nomes de tabelas, colunas, funções RPC e argumentos que existem no banco implantado. Portanto, atualizar somente o React sem atualizar o backend pode gerar erros PGRST202 (função ausente) ou PGRST204 (coluna ausente).

## 2. Migrações de domínio observadas

A sequência versionada inclui arquivos relacionados a:

| Arquivo/prefixo | Tema |
| --- | --- |
| 20261003170136_occurrence_direction_email_workflow | Primeira versão do modelo de caso de ocorrência e fluxo de acompanhamento |
| 20261003174746_occurrence_email_delivery_status | Estado de entrega do fluxo legado de notificação |
| 20261003174807_occurrence_direction_manager_email | Configuração legada de responsáveis |
| 20261003174926_occurrence_email_payload_hardening | Proteção de autorização do payload legado |
| 20261003175028_occurrence_remove_legacy_notes | Remoção de observações legadas |
| 20261003180822_occurrence_email_workflow_hardening | Endurecimento do fluxo legado |
| 20261003194416_occurrence_direction_site_only_workflow | Transição para fluxo de acompanhamento somente no site e remoção da estrutura de e-mail legado |
| 20261003195005_occurrence_delete_definer_hardening | Endurecimento da exclusão de ocorrência |
| 20261003200423_teacher_global_class_access | Ajuste do escopo de acesso de professores às turmas |
| 20261003201311_occurrence_cases_class_scope | Ajustes de autorização e escopo por turma para casos |
| 20261003235611_teacher_feedback_workflow | Criação do fluxo de feedback de professores |
| 20261004175102_harden_api_rate_limits_and_rpc_surface | Estrutura de rate limit e endurecimento de superfície RPC |
| 20261004232435_security_fix_profiles_select_policy | Ajuste de política de leitura de profiles |
| 20261004232847_security_fix_current_user_context_rpc | Ajuste de contexto seguro do usuário atual |
| 20261004235054_fix_check_api_request_executor | Ajuste de executor da verificação de requisições |
| 20261004235906_repair_login_auth_source_and_remove_global_pre_request | Correção de fluxo de login e remoção da dependência do hook global pre-request |
| 20261008205032_public_attendance_dashboard | Primeira versão do painel público agregado |
| 20261009184726_security_hardening_and_teacher_occurrence_delete | Endurecimento de SECURITY DEFINER, histórico de estudante e exclusão por professor |
| 20261009184900_fail_closed_inactive_profiles_and_class_access | Negação por padrão para perfil ausente/inativo e escopo de turma |
| 20261014230000_public_attendance_dashboard_metrics | Expansão das métricas públicas agregadas |

A sequência acima descreve os arquivos atualmente observados; o nome de um arquivo é um resumo, não substitui a leitura do SQL.

## 3. Evolução do fluxo de ocorrências

O modelo inicial introduziu occurrence_cases para agrupar uma ou várias ocorrências e acompanhar status, responsável e resposta. Migrações posteriores substituíram o modelo inicial de notificação por e-mail por acompanhamento dentro do próprio sistema.

Na versão final observada do fluxo:
- occurrence_cases guarda estado do caso e relação com a turma;
- occurrences.case_id liga ocorrências ao caso;
- abertura muda UNREAD para IN_REVIEW;
- resolução grava resposta, responsável e data;
- controle de acesso usa perfil e permissão sobre turma;
- a camada de banco aplica locks nas transições críticas.

Não trate colunas antigas de e-mail como parte do contrato final. A migração site-only removeu a tabela de responsáveis de e-mail, funções de payload e colunas de entrega.

## 4. Feedback dos professores

A migração teacher_feedback_workflow cria a tabela, índices, RLS e funções para criação, consulta, abertura e resolução. O modelo valida limites de assunto e mensagem, verifica papel TEACHER para criação e ADMIN para revisão/resolução.

## 5. Endurecimento de segurança

As migrações de segurança cobrem:
- grants específicos para RPC;
- negação de execução anônima em funções internas;
- políticas restritivas para tabelas de workflow;
- search_path vazio em funções SECURITY DEFINER;
- referências qualificadas por schema;
- bloqueio de usuários sem perfil ativo;
- validação de acesso à turma;
- autorização contextual em histórico de estudante e exclusão de ocorrência;
- rate limiting por usuário/bucket, embora a ativação do hook global tenha sido posteriormente removida.

## 6. Painel público

A primeira migração criou uma função pública com agregação por etapa/turma. A migração posterior ampliou o retorno com resumo de escola, turmas, alunos ativos agregados, aulas previstas estimadas, faltas, presenças estimadas e percentuais.

A função é explicitamente autorizada para anon. Toda mudança nessa função deve passar por revisão de privacidade, porque seu resultado é acessível sem sessão.

## 7. Migrações históricas ausentes

A auditoria técnica do projeto conectado identificou três migrações já aplicadas no banco, mas cujos arquivos não estavam presentes no repositório consultado:

- 20261003023537_security_hardening_phase1
- 20261003023625_performance_hardening_phase1
- 20261003031555_fix_profile_policy_helper_permissions

Os arquivos SQL originais devem ser recuperados de backup confiável, histórico de entrega ou fonte autorizada. Não crie migrations vazias, no-op ou com conteúdo presumido para preencher a lacuna.

Até recuperar esses arquivos, não afirme que a pasta versionada sozinha reproduz exatamente o banco de produção nem que ela permite provisionar outro ambiente do zero.

## 8. Processo seguro para alterar o banco

1. Consultar o schema real e a versão aplicada.
2. Confirmar se a alteração já existe no banco para evitar drift.
3. Criar migração nova, com timestamp único e objetivo claro.
4. Usar transação quando a operação permitir.
5. Manter constraints, índices, grants, RLS e funções alinhados.
6. Definir search_path vazio em SECURITY DEFINER e qualificar tabelas/funções.
7. Validar permissões por papel e por turma.
8. Testar migração em projeto isolado com dados sintéticos.
9. Verificar plano de rollback e impacto em dados existentes.
10. Aplicar em produção com backup e janela operacional apropriada.
11. Confirmar que o frontend e as funções permanecem compatíveis.
12. Registrar evidência de execução e atualizar esta documentação.

## 9. Compatibilidade entre versões

A ordem é importante. Não remova uma coluna ou função enquanto alguma versão implantada do frontend ainda a utiliza. Em alterações incompatíveis, use estratégia expand/contract:

1. Expandir o banco com campo/função compatível.
2. Implantar frontend que passe a usar o contrato novo.
3. Confirmar que versões antigas deixaram de executar.
4. Remover o contrato antigo em migração posterior.

O Supabase/PostgREST pode precisar recarregar o schema após DDL, conforme a alteração e a estratégia usada nas migrações.

## 10. Rotina operacional recomendada

- Revisar logs e alertas de Auth/API.
- Verificar espaço, performance e índices.
- Conferir políticas RLS e grants após mudanças.
- Revisar usuários e acessos a turmas periodicamente.
- Validar backups e testar restauração.
- Revisar alertas de dependências.
- Reavaliar retenção e necessidade de dados pessoais.
- Confirmar se rate limit está ativo na camada prevista.
- Rever a superfície do painel público após cada alteração de métrica.
- Atualizar documentação no mesmo PR que altera comportamento.
