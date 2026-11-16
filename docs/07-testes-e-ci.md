# Testes automatizados e integração contínua

## 1. Objetivo

Os testes existentes são testes automatizados de contrato/estrutura do código, executados pelo Node Test Runner. Eles verificam a presença de integrações, nomes de RPCs, regras de segurança e algumas características da configuração. Não são testes end-to-end completos, nem substituem teste real contra Supabase.

## 2. Comando

    npm test

O script executa:

    node --test tests/*.test.mjs

O arquivo de teste observado é tests/core.test.mjs.

## 3. Cobertura identificada

Os testes verificam, entre outros pontos:

- Supabase como dependência e build Vite;
- autenticação e logout;
- uso de RPCs seguras no frontend;
- ausência de service_role/secret key no módulo de API;
- criação de ocorrência e caso associado;
- estados UNREAD, IN_REVIEW e RESOLVED;
- associação de acesso administrativo às funções de ocorrência;
- autorização do payload de notificação legado;
- remoção de observações antigas em migração;
- acesso seguro ao histórico individual;
- fluxo de seleção de turma e rota de ocorrências;
- rewrite de SPA na configuração Vercel;
- ausência de determinados arquivos de servidor legado;
- regra de exclusão de ocorrência pelo professor;
- search_path vazio nas funções SECURITY DEFINER;
- negação de acesso a contas inativas ou sem perfil;
- exclusão de dependências geradas e arquivos de ambiente pelo .gitignore;
- ausência de sinks HTML/JavaScript perigosos e padrões específicos de segredo no código-fonte atual.

Os testes que leem SQL por expressão regular validam contratos textuais. Uma alteração legítima no nome de função ou no formato da migração pode exigir atualizar o teste, mas isso deve ocorrer após confirmar o comportamento equivalente.

## 4. Pipeline de CI

O workflow identificado está em .github/workflows/ci.yml. A configuração usa GitHub Actions, checkout e setup-node com Node 24 e cache npm.

A auditoria técnica do projeto registra que a execução mais recente observada na ocasião daquela auditoria passou por:
- npm ci;
- npm audit --audit-level=high;
- npm test;
- npm run build.

Esse registro é histórico; não significa que o pipeline foi executado novamente para cada commit futuro. Confirme o status no GitHub Actions para o commit atual.

## 5. Build de produção

    npm run build

O Vite compila os módulos e gera a pasta dist. Falhas podem vir de incompatibilidade do Node, dependências, imports, CSS ou código de compilação.

O projeto declara Node >=24 <25. Executar em versão diferente não comprova compatibilidade com o ambiente declarado.

## 6. Validação recomendada para mudanças

Antes de abrir PR:
1. Executar npm ci em ambiente Node 24.
2. Executar npm audit --audit-level=high.
3. Executar npm test.
4. Executar npm run build.
5. Revisar diff e arquivos gerados.
6. Verificar se nenhum .env, token, dado pessoal, exportação ou dump foi incluído.
7. Em mudanças de backend, aplicar migração em ambiente de teste e executar testes de integração.
8. Em mudanças de autorização, testar casos positivos e negativos para cada papel e escopo.
9. Em mudanças do painel público, testar com anon e inspecionar o JSON retornado.
10. Em mudanças de acessibilidade, testar teclado, foco, leitores de tela, contraste e dispositivos móveis.

## 7. Testes de integração que ainda são necessários

O conjunto de testes existente não demonstra, por si só, que todas as funções do banco estejam corretas. Recomenda-se manter uma suíte de integração em projeto Supabase isolado que cubra:

- usuário sem perfil;
- usuário inativo;
- perfil ADMIN, TEACHER, STAFF e VIEWER;
- usuário com acesso e sem acesso à turma;
- estudante ativo/inativo;
- ID de estudante pertencente a outra turma;
- tentativa de chamada direta sem permissão;
- duplicidade de falta na mesma data;
- operações em lote com lista vazia, duplicada e excessiva;
- transição inválida de ocorrência/feedback;
- concorrência ao abrir/resolver/excluir caso;
- acesso anon ao painel público;
- ausência de dados pessoais no payload público;
- rate limiting efetivamente configurado ou sua substituição;
- compatibilidade entre frontend e todas as migrações aplicadas.

## 8. Segurança da pipeline

- Não imprima env vars no terminal ou logs.
- Não use dados reais de estudantes em fixtures.
- Fixe actions por SHA quando essa for a política do repositório.
- Trate alertas de dependência antes de liberar release.
- Mantenha lockfile consistente.
- Não use permissões amplas em GITHUB_TOKEN sem necessidade.
- Habilite secret scanning e push protection quando disponíveis.

## 9. Resultado de teste e evidências

Ao documentar testes, informe commit, ambiente, comando, data, status e falhas. Não declare “build aprovado” ou “todos os testes passaram” sem executar e consultar o resultado do commit específico.
