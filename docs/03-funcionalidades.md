# Funcionalidades e fluxos de uso

Este documento explica o comportamento funcional identificado nas páginas e nos módulos do frontend. Regras de autorização finais devem ser confirmadas nas RPCs e no schema implantado.

## 1. Login e sessão

Rota: /login.

O usuário informa e-mail e senha. A página chama Supabase Auth por meio de api.login(). Após autenticar:

1. O frontend consulta a função segura de contexto do usuário.
2. Confere se o ID do contexto corresponde ao ID retornado pelo Auth.
3. Obtém nome, e-mail, perfil e tema.
4. Registra a ação de login na auditoria.
5. Navega para a seleção de turma.

A tela apresenta uma mensagem de que o acesso é destinado a usuários autorizados. O cadastro público de contas não faz parte do fluxo observado.

O logout tenta registrar a saída na auditoria, encerra a sessão no Supabase e limpa o usuário e a turma selecionada no frontend.

## 2. Seleção de turma

Rota: /selecionar-turma.

A página carrega as turmas liberadas para o usuário pela RPC de classes disponíveis. Ela organiza as opções conforme etapa de ensino e modalidade. Ao selecionar uma turma, o identificador é armazenado no estado do App e no sessionStorage.

A turma selecionada delimita as telas operacionais: dashboard, alunos, frequência, ocorrências e relatórios. A lista exibida não deve ser considerada controle de segurança: o backend deve verificar novamente o acesso à turma em toda operação pertinente.

## 3. Dashboard da turma

Rota: /dashboard/classes/:id.

Apresenta a visão consolidada de uma turma. O frontend usa a RPC segura de dashboard e componentes separados para indicadores, gráficos, ranking e registros recentes.

As informações visuais incluem:

- resumo da turma;
- capacidade/limite anual e indicadores de frequência;
- evolução ou distribuição por período;
- registros recentes;
- alunos em atenção;
- ranking de alunos por faltas ou ocorrências;
- filtros por período, incluindo períodos predefinidos e intervalo personalizado quando disponível.

O dashboard também permite iniciar a inclusão de registros e selecionar registros para exclusão em lote, conforme permissões e regras do backend.

## 4. Cadastro e lista de estudantes

Rota: /alunos.

A lista é contextualizada pela turma atual. Permite pesquisar estudantes e acessar o histórico individual. A página fornece acesso rápido a informações como faltas, ocorrências e histórico.

Os dados pessoais exibidos devem ser tratados como confidenciais. Não copiar a lista para arquivos públicos, exemplos, screenshots de documentação ou dados de teste versionados.

## 5. Detalhes do estudante

Rota: /alunos/:id.

A tela consulta os detalhes do estudante, carrega o conjunto de estudantes da turma para navegação e apresenta indicadores e histórico de frequência/ocorrências. O histórico pode ser filtrado e permite selecionar determinados registros para ações em lote quando o perfil e o estado do registro autorizam.

A tela também contém regras de exclusão de registros. Há restrição especial para professores: a UI considera responsável pela criação e estado do caso, e a RPC de banco valida novamente. A migração de segurança registra a regra de que um professor só pode excluir ocorrência própria e ainda não encaminhada para revisão, enquanto administradores mantêm a capacidade administrativa prevista.

A autorização real é sempre decidida no banco, inclusive quando alguém tenta chamar a RPC diretamente.

## 6. Inclusão de registros

O modal AddRecord é aberto pelo menu de ações rápidas do Layout e oferece três categorias principais:

- Registrar falta.
- Registrar ocorrência.
- Justificar falta.

A seleção é contextualizada pela turma e pelos estudantes ativos. O modal suporta seleção individual ou em lote. A interface mostra mensagens de validação e pode impedir que o mesmo estudante seja selecionado quando já existe um registro de falta naquela data.

### 6.1 Falta

A falta é associada a estudante, turma, data e quantidade de aulas. Pode ter observação. O frontend chama app_create_attendance ou app_create_attendance_bulk. Para edição e exclusão são usadas as RPCs correspondentes.

O método de leitura consulta attendance_records com paginação, filtrando por turma, estudante e período quando esses parâmetros são fornecidos. A leitura é ordenada por data e ID em ordem decrescente.

### 6.2 Justificativa

A justificativa associa estudante, registro de frequência, data e motivo; descrição e attachment_id são opcionais no contrato do frontend. A criação individual ou em lote passa pelas RPCs de justificativa.

O modelo possui a tabela attachments, mas o frontend analisado apenas transmite um identificador de anexo. Não há implementação direta de upload/download no Supabase Storage observada nessa camada. Não prometa anexos funcionais sem validar a integração e as permissões de Storage.

### 6.3 Ocorrência

A ocorrência é associada ao estudante, turma, data, tipo, gravidade e descrição. A gravidade enviada pelo frontend pode ser LOW, MEDIUM ou HIGH; o padrão é LOW.

O fluxo individual chama app_create_occurrence. O fluxo em lote chama app_create_occurrence_bulk e cria um caso associado às ocorrências geradas. A migração de criação em lote valida lista, IDs, duplicidade e a faixa de 1 a 100 estudantes.

## 7. Acompanhamento de ocorrências

Rota: /ocorrencias.

A página apresenta casos e os agrupa por status. Inclui contadores e busca/filtros. O usuário autorizado pode abrir um caso, o que o move para IN_REVIEW quando estava UNREAD. A administração pode registrar resposta e concluir o caso como RESOLVED.

Estados:

| Estado | Uso |
| --- | --- |
| UNREAD | Caso ainda não aberto para revisão |
| IN_REVIEW | Caso em análise |
| RESOLVED | Caso concluído com resposta |

A resposta de resolução é obrigatória na função de revisão. O banco valida papel, existência do caso, transição de status, autorização e escopo. O registro é tratado com lock de linha durante operações de abertura/revisão para evitar atualizações concorrentes incompatíveis.

O fluxo atualmente documentado é interno ao site. Migrações posteriores removeram colunas e objetos do fluxo legado de entrega de e-mail; não considere envio de e-mail parte do comportamento final sem confirmar uma implementação separada.

## 8. Feedback dos professores

Rota: /feedback.

O módulo permite que professores enviem uma mensagem para a direção, opcionalmente vinculada a uma turma. A direção acompanha a fila, abre um feedback para colocá-lo em revisão e registra uma resposta para concluir.

O banco valida:
- papel TEACHER para criação;
- assunto com 3 a 160 caracteres;
- mensagem com 3 a 8.000 caracteres;
- escopo de turma quando a mensagem está vinculada a uma turma;
- papel ADMIN para abrir e resolver;
- status e existência do registro.

O ciclo de status é UNREAD, IN_REVIEW e RESOLVED. O feedback não é o mesmo que ocorrência: é um canal de comunicação interna de professor para direção.

## 9. Relatórios e exportação

Rota: /relatorios.

A página apresenta filtros de período, estudante e tipo de ocorrência, e separa os dados de frequência e ocorrências. Os períodos visuais incluem hoje, semana e mês, além das opções de intervalo que a tela disponibiliza.

O frontend chama RPCs específicas para relatório de frequência e de ocorrências. A exportação CSV gera arquivo local no navegador.

A rotina de exportação escapa aspas e prefixa valores iniciados por =, +, - ou @ com apóstrofo. Essa proteção reduz o risco de CSV Formula Injection ao abrir o arquivo em planilhas. Não remova essa sanitização ao alterar a exportação.

## 10. Configurações

Rota: /configuracoes.

A tela lê e salva as configurações gerais por RPC. O contrato observado inclui:

- nome da escola;
- fuso horário;
- dias letivos por ano;
- aulas por dia;
- percentual mínimo de frequência;
- lista de tipos de ocorrência.

A tela também oferece fluxo de alteração de senha da conta autenticada. O frontend exige nova senha com pelo menos 12 caracteres e reautentica com a senha atual antes de solicitar a atualização ao Supabase Auth. A política final de senha também depende da configuração do Supabase.

## 11. Logs de auditoria

Rota: /logs.

A tela redireciona usuários que não tenham papel ADMIN. Para administradores, consulta até 200 eventos recentes e exibe data, ação, entidade, responsável, e-mail, IP e detalhes/metadados.

A UI fornece atualização manual e estados de carregamento, erro e lista vazia. Dados de auditoria são sensíveis: não devem ser expostos para usuários anônimos nem enviados para analytics de terceiros sem avaliação de privacidade.

## 12. Painel público de frequência

Rota: /painel/frequencia.

É uma tela separada que não exige login. A página chama app_public_attendance_dashboard e mostra somente indicadores agregados de escola/turmas/etapas:

- total de turmas ativas;
- total de estudantes ativos;
- faltas acumuladas;
- frequência e taxa de faltas estimadas;
- comparativo entre Fundamental e Médio;
- rankings agregados de turmas.

### Premissas do cálculo

A versão atual da função agrega faltas do ano até a data atual. Para estimar as aulas previstas, utiliza a quantidade de estudantes ativos, os dias letivos anuais configurados, as aulas por dia e uma proporção de dias úteis já decorridos no ano.

A fórmula conceitual por turma é:

    aulas_previstas_estimadas =
      estudantes_ativos
      × dias_letivos_por_ano
      × aulas_por_dia
      × dias_uteis_decorridos
      ÷ dias_uteis_totais_do_ano

    presencas_estimadas = max(aulas_previstas_estimadas - faltas, 0)

    taxa_de_faltas = faltas ÷ aulas_previstas_estimadas × 100

    frequencia_estimada = presencas_estimadas ÷ aulas_previstas_estimadas × 100

O resultado é uma estimativa, não uma contagem de presença real. A rotina usa dias de semana como aproximação e não desconta feriados, recessos, suspensões de aula ou calendário específico por turma. O texto de rodapé da própria tela informa essa limitação.

A função SQL foi atualizada por migração posterior para incluir resumo, turmas e indicadores por etapa. Não adicione campos individualmente identificáveis a essa resposta pública.

## 13. Tema e acessibilidade visual

O App aplica tema claro/escuro no documento. A preferência de tema é salva na tabela user_theme_preferences pelo método updateTheme. Se a gravação falhar, a tela restaura o tema anterior.

O controle de acessibilidade oferece:
- normal;
- soft (paleta suave);
- deuteranopia;
- protanopia;
- tritanopia.

Os filtros são aproximações visuais baseadas em matrizes de cor. Não substituem validação com usuários, contraste adequado, navegação por teclado e testes reais de acessibilidade. A preferência é armazenada no localStorage por usuário, não no banco.

## 14. Atualização entre componentes

Após mutações de frequência, justificativa, ocorrência ou configuração, api.js emite o evento browser school-data-changed com detalhes de tipo/ação. Telas que precisam acompanhar mudanças escutam esse evento e recarregam os dados.

Esse mecanismo é uma coordenação local no navegador. Ele não é um canal de atualização entre dispositivos ou usuários; para atualização em tempo real entre clientes seria necessário avaliar Supabase Realtime ou outra estratégia.
