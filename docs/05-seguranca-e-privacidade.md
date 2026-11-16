# Segurança e privacidade

## 1. Classificação dos dados

O sistema trata dados pessoais e possivelmente dados sensíveis no contexto educacional. Exemplos:
- nome e matrícula de estudantes;
- turma e histórico individual de faltas;
- justificativas e observações;
- descrição de ocorrências e respostas;
- nome/e-mail de profissionais;
- logs com usuário, IP e metadados.

Esses dados não devem ser colocados em repositórios públicos, issues, exemplos, screenshots, fixtures reais ou logs de CI. Use dados sintéticos para desenvolvimento e demonstração.

## 2. Segredos e variáveis de ambiente

O frontend usa duas variáveis públicas de configuração:
- VITE_SUPABASE_URL;
- VITE_SUPABASE_PUBLISHABLE_KEY.

Variáveis prefixadas com VITE_ são incorporadas no bundle do navegador. A publishable/anon key é uma credencial pública de cliente, não um segredo de servidor. Sua segurança depende de RLS, grants, validação de funções e limites de exposição.

Nunca coloque no frontend:
- service_role key;
- chaves secret do Supabase;
- senha de banco;
- JWT de usuário;
- token de GitHub, Vercel ou outro provedor;
- chave privada PEM;
- senha SMTP ou chave de serviço externa.

O arquivo .env.example deve conter apenas placeholders. O .gitignore deve excluir .env e arquivos .env.* e liberar somente o exemplo. Se uma credencial real for publicada, revogue/rotacione imediatamente no provedor. Excluir o arquivo de um commit futuro não invalida a credencial nem apaga cópias do histórico.

## 3. Autenticação

O Supabase Auth valida e mantém a sessão. O frontend consulta o usuário autenticado e depois solicita o contexto de perfil pela RPC app_current_user_context_secure.

A migração de endurecimento de acesso documenta comportamento fail-closed para usuário sem perfil ativo ou sem e-mail/contexto válido. Isso significa negar acesso em caso de ausência ou inconsistência de identidade, em vez de inferir permissões.

A política de senhas também depende do Supabase Auth. A auditoria técnica identificou como pendência administrativa habilitar a proteção contra senhas vazadas no painel do Supabase, conforme disponibilidade do plano.

## 4. Autorização

Existem duas dimensões:
- papel funcional: ADMIN, TEACHER, STAFF ou VIEWER;
- escopo de dados: especialmente acesso do usuário às turmas.

A interface controla navegação e visibilidade de ações, mas a autorização obrigatória ocorre no banco. O backend não deve confiar em role, ID de turma ou ID de estudante enviados pelo navegador sem validar o contexto da sessão.

As funções críticas devem verificar:
- usuário autenticado e ativo;
- papel exigido;
- acesso à turma;
- relação entre estudante e turma;
- status atual do registro;
- validade e tamanho dos campos;
- transição de estado permitida.

A função app_can_access_class é usada como verificação de escopo. O acesso anônimo deve ficar restrito a operações públicas explicitamente projetadas para isso.

## 5. Row Level Security e privilégios

A auditoria do projeto de referência registrou RLS habilitada nas tabelas públicas inspecionadas e ausência de privilégio CREATE no schema public para os papéis clientes. Tabelas sensíveis de workflow são revogadas para anon/authenticated e acessadas por RPCs controladas.

RLS e grants precisam ser revisados sempre que:
- uma tabela nova for adicionada;
- uma coluna sensível for exposta;
- uma função for criada ou alterada;
- houver mudança no papel de execução;
- o painel público ganhar um campo novo.

Uma função SECURITY DEFINER executa com privilégios do proprietário da função. Portanto, requer verificação interna explícita, assinatura/grants restritos, referências qualificadas e search_path controlado.

A auditoria registra que as funções SECURITY DEFINER do schema public foram endurecidas para search_path vazio, com referências qualificadas. Preserve esse padrão em novas funções.

## 6. Operações sensíveis e concorrência

Ocorrências e feedbacks possuem estado de revisão. As funções de abrir/resolver usam lock de linha em operações relevantes, verificam o estado atual e registram o usuário responsável. Isso reduz risco de duas ações concorrentes aplicarem transições incompatíveis.

Exclusão de ocorrência também possui regra de autorização. A migração de segurança documenta que professores podem excluir somente ocorrência própria em caso ainda não encaminhado, enquanto o perfil administrativo possui a permissão estabelecida pela regra de negócio. A validação existe no banco; ocultar o botão não basta.

## 7. Rate limiting

Uma migração criou uma estrutura privada de contagem por usuário e bucket e uma função de verificação de requisições. Os limites declarados na migração incluem categorias distintas para leitura pesada, operações em lote, feedback e mutações comuns.

A auditoria técnica posterior registrou que o parâmetro PostgREST pre-request não estava configurado na instância consultada e que uma migração de reparo removeu a dependência de um hook global. Portanto, não presuma que o rate limiting da migração esteja ativo em produção. É necessário confirmar a configuração efetiva ou implementar limitação em uma camada suportada, com testes de login, refresh e RPC.

## 8. Painel público e minimização

A RPC app_public_attendance_dashboard é concedida a anon e authenticated intencionalmente. Ela deve devolver apenas métricas agregadas. Não inclua:
- nome ou matrícula de estudante;
- ID de estudante ou usuário;
- e-mail ou IP;
- justificativa ou observação;
- descrição de ocorrência;
- dados de auditoria;
- histórico individual.

Mesmo dados agregados podem permitir inferência quando uma turma possui poucos estudantes ou quando são cruzados com outras informações. Avalie limiares, granularidade e risco de reidentificação antes de publicar novos agrupamentos.

## 9. Auditoria e logs

A tela de logs é administrativa. Eventos podem incluir ator, e-mail, IP e metadados. Não registre senhas, tokens, conteúdo excessivo de justificativas ou qualquer segredo. Não envie logs com dados pessoais para ferramentas externas sem avaliação e base legal apropriadas.

Erros devem ser convertidos em mensagens úteis sem revelar SQL, estruturas internas, nomes de secrets ou detalhes de infraestrutura.

## 10. Segurança de exportação

A exportação CSV neutraliza valores que começam com =, +, - ou @ e escapa aspas. Preserve essa proteção para reduzir CSV Formula Injection. Dados exportados ainda são dados pessoais: controle quem pode exportar, proteger arquivos gerados e orientar o usuário a não compartilhá-los publicamente.

## 11. Deploy e Content Security Policy

A configuração Vercel inclui headers como Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy e Strict-Transport-Security.

A diretiva connect-src precisa incluir o domínio Supabase correto da instância publicada, incluindo WebSocket quando usado. Não copie o identificador de uma instância privada de produção para o repositório público. Para cada ambiente, configure o host adequado e revise a CSP efetiva no navegador.

A política original observada usa unsafe-inline em style-src. Não adicione unsafe-eval ou curingas amplos sem necessidade e avaliação. CSP deve ser testada com o fluxo real de autenticação, chamadas PostgREST e WebSocket.

## 12. Checklist antes de abrir/publicar

- [ ] Confirmar que não há arquivos .env reais ou arquivos de credencial.
- [ ] Confirmar que não há service_role/secret key/JWT/chaves privadas.
- [ ] Pesquisar e revisar e-mails pessoais e dados reais de estudantes/profissionais.
- [ ] Revisar imagens, logos, screenshots, exemplos e arquivos SQL.
- [ ] Revisar todo o histórico Git, não somente o último snapshot.
- [ ] Habilitar secret scanning e push protection quando disponíveis.
- [ ] Rotacionar toda credencial que já tenha sido exposta.
- [ ] Usar um projeto Supabase separado para demonstração.
- [ ] Usar usuários e dados sintéticos nesse ambiente.
- [ ] Conferir RLS, grants e funções SECURITY DEFINER.
- [ ] Testar a função pública com anon e conferir que só retorna agregados.
- [ ] Habilitar leaked-password protection no Supabase quando disponível.
- [ ] Validar CSP e headers na implantação.
- [ ] Confirmar backups, retenção, acesso e procedimento de incidente.

## 13. Limites da auditoria

A auditoria documentada é uma revisão focalizada de código/configuração, migrações versionadas e verificações feitas na instância conectada; não é pentest, auditoria jurídica ou garantia de ausência de vulnerabilidades. A varredura do estado atual não prova que todo o histórico Git esteja livre de segredos. Uma publicação deve ser acompanhada de secret scanning histórico e revisão operacional.
