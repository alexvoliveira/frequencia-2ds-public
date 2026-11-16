# Visão geral do sistema

## 1. O que é

O Frequência Escolar é uma aplicação web para registrar, consultar e acompanhar informações de frequência escolar por turma. O domínio do sistema reúne frequência diária, faltas, justificativas, ocorrências disciplinares/pedagógicas, comunicação entre professores e direção, indicadores e auditoria.

O objetivo operacional é concentrar em uma interface única as rotinas que normalmente ficam espalhadas em planilhas, formulários e anotações. O sistema relaciona registros a estudantes e turmas, oferece históricos individuais e consolida informações para acompanhamento administrativo.

A implementação observada é uma aplicação cliente React conectada diretamente ao Supabase. Não há uma API Node/Express separada no frontend analisado. A autenticação é feita pelo Supabase Auth; leituras simples usam PostgREST quando apropriado; operações de negócio e consultas protegidas são encaminhadas a funções PostgreSQL (RPCs).

## 2. Problemas que o sistema atende

- Registrar quantidade de aulas não frequentadas por estudante e data.
- Consultar o histórico de frequência de um estudante.
- Registrar uma justificativa associada a uma falta.
- Registrar uma ocorrência para um ou mais estudantes e acompanhar sua revisão.
- Permitir que professores enviem feedback interno à direção.
- Apresentar resumos por turma, etapa de ensino e período.
- Produzir relatórios e arquivos CSV.
- Manter rastreabilidade das operações relevantes.
- Publicar indicadores gerais em um painel separado, sem apresentar histórico individual de estudantes.

## 3. Quem utiliza

O código reconhece os seguintes códigos de perfil:

| Código | Significado funcional |
| --- | --- |
| ADMIN | Administração do sistema e funções administrativas |
| TEACHER | Professor |
| STAFF | Equipe de apoio/funcionários |
| VIEWER | Perfil de consulta |

Os nomes apresentados na interface são rótulos; a autorização efetiva deve ser feita no banco, a partir do usuário autenticado, do perfil ativo e do escopo da turma. Nem toda operação está disponível a todos os perfis. As regras específicas são implementadas nas RPCs e nas políticas do Supabase.

A documentação não presume que a simples presença de um botão ou rota conceda permissão. A interface pode esconder ações, mas o banco deve rejeitar chamadas não autorizadas.

## 4. Conceitos do domínio

### Escola e configurações

A configuração escolar define parâmetros usados em telas e indicadores, como nome da escola, fuso horário, dias letivos por ano, aulas por dia e percentual mínimo de frequência. O frontend usa America/Sao_Paulo como referência em funções de data e como valor padrão de fuso ao salvar configurações.

### Turma

Uma turma possui identificador, nome/código, etapa de ensino, modalidade e estado de atividade. O sistema seleciona uma turma antes de abrir o dashboard e as telas de operação. O acesso do usuário a turmas é uma regra de autorização, não apenas um filtro visual.

### Estudante

Um estudante pertence a uma turma, possui nome, número de matrícula e estado ativo. O sistema mostra uma lista por turma e uma página de detalhes com indicadores e histórico. Nome e matrícula são dados pessoais e devem permanecer protegidos.

### Registro de frequência

O registro de frequência associa estudante, turma e data. Armazena status, quantidade de aulas, observações e metadados de criação. O fluxo de inclusão permite selecionar um estudante ou vários estudantes. A tabela observada no frontend é attendance_records.

### Justificativa

Uma justificativa referencia uma falta e um estudante, com data, motivo, descrição e identificador opcional de anexo. O modelo também prevê a tabela attachments, mas o frontend analisado não implementa diretamente upload/download pelo Supabase Storage.

### Ocorrência e caso de acompanhamento

Uma ocorrência descreve um evento relacionado a um estudante, turma, tipo, data, gravidade e descrição. Uma ou várias ocorrências podem pertencer ao mesmo caso de acompanhamento. O caso tem status, responsável pela revisão, resposta e datas de tratamento.

Os estados usados pelo fluxo são:

1. UNREAD — ainda não lida.
2. IN_REVIEW — em revisão.
3. RESOLVED — resolvida.

O vínculo de caso permite tratar em conjunto ocorrências criadas em uma mesma ação, inclusive registros em lote.

### Feedback do professor

O feedback é uma mensagem enviada pelo professor à direção, opcionalmente relacionada a uma turma. Possui assunto, conteúdo, status, resposta, responsável pelo tratamento e timestamps. Usa o mesmo ciclo UNREAD, IN_REVIEW e RESOLVED.

### Auditoria

A auditoria registra ação, entidade, identificador, usuário, responsável, e-mail/IP quando disponível, metadados e data. A tela administrativa consome esse histórico para explicar quem realizou operações.

## 5. Visão das áreas funcionais

| Área | Responsabilidade |
| --- | --- |
| Login | Autenticar e recuperar a sessão |
| Seleção de turma | Exibir turmas que o usuário pode acessar |
| Dashboard da turma | Apresentar indicadores, gráficos, ranking e registros recentes |
| Alunos | Pesquisar e abrir o histórico individual |
| Detalhes do aluno | Consultar histórico, evolução e gerenciar registros permitidos |
| Registros | Criar/editar faltas, justificativas e ocorrências |
| Ocorrências | Acompanhar os casos e registrar a resposta administrativa |
| Feedback | Comunicar professores e direção |
| Relatórios | Filtrar dados e exportar CSV |
| Configurações | Definir parâmetros gerais e tipos de ocorrência |
| Logs | Consultar auditoria administrativa |
| Painel público | Exibir indicadores agregados sem autenticação |

## 6. Limites funcionais importantes

- O painel público é uma visão agregada. Ele não deve ser ampliado para expor nomes, matrículas, e-mails, histórico ou identificadores de estudantes.
- O painel público calcula estimativas de frequência com parâmetros escolares e dias úteis; não é um apontamento de presença efetiva aula a aula.
- O sistema depende de um schema Supabase coerente com as RPCs esperadas pelo frontend.
- A documentação descreve o código e as migrações versionadas consultadas. Ela não é uma especificação completa do banco de produção nem substitui testes de integração.
- O conjunto atual de migrações não contém três arquivos históricos informados como aplicados ao banco conectado. A reconstrução integral do banco não pode ser afirmada sem recuperar esses arquivos.

## 7. Princípios para evolução

1. Manter a autorização no banco, inclusive para operações feitas por RPC.
2. Restringir cada usuário às turmas e aos registros autorizados.
3. Não expor dados pessoais no painel público nem em logs de build.
4. Preferir funções RPC para operações que exigem validação, transação ou regra de negócio.
5. Manter operações em lote limitadas e validadas no servidor.
6. Preservar trilha de auditoria para alterações relevantes.
7. Tratar estimativas como estimativas e documentar suas premissas.
8. Nunca versionar variáveis de ambiente reais, chaves privadas, tokens ou dados de produção.
