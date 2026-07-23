# Contribuição e fluxo Git

O projeto usa um GitFlow leve, obrigatório e rastreável. Nenhuma mudança começa
diretamente em código: primeiro existe uma issue com objetivo e critérios de
aceite. Railway hospeda staging e produção; o GitHub coordena issues, branches,
pull requests, checks e aprovações.

## Branches permanentes

- `main`: estado publicado. Somente merges revisados; cada marco recebe uma tag semântica.
- `develop`: integração do próximo marco. Deve permanecer executável e passar pelos checks.

Railway acompanha `develop` em staging e `main` em produção. Deploy não cria nem
envia newsletter.

## Branches temporárias

- `feature/<tema>` nasce de `develop` e volta por pull request;
- `fix/<tema>` corrige defeitos ainda não publicados e nasce de `develop`;
- `docs/<tema>` documenta uma mudança sem alterar comportamento de produção;
- `chore/<tema>` mantém ferramentas, CI ou operação;
- `release/<versao>` congela escopo e aceita apenas correções de lançamento;
- `hotfix/<tema>` nasce de `main` para defeito urgente publicado e volta para `main` e `develop`.

Para a `v0.1.0`, uma `release/*` só será criada quando a experiência estiver completa. Se o projeto ainda tiver uma única branch de feature curta, `develop` pode ser promovida diretamente por pull request para `main`.

O caminho operacional completo — incluindo staging, promoção, hotfix,
verificação de produção e a separação entre deploy e envio de newsletter — está
em [`docs/production-and-release-runbook.md`](docs/production-and-release-runbook.md).

## Ciclo obrigatório de uma mudança

1. Criar uma issue com contexto, objetivo, escopo e critérios de aceite.
2. Atualizar `develop` localmente e criar a branch a partir de
   `origin/develop`.
3. Usar o número da issue no contexto da branch e nos commits quando útil.
4. Implementar em commits pequenos e intencionais.
5. Abrir PR para `develop` com `Closes #<issue>`.
6. Passar por política de PR, typecheck, testes, build e preview da newsletter.
7. Revisar a mudança implantada em staging.
8. Fazer merge em `develop` e remover a branch temporária.

Um PR normal não aponta diretamente para `main`.

## Promoção para produção

1. Abrir PR de `develop` para `main`, ou usar `release/*` quando houver uma fase
   de estabilização.
2. Confirmar checks e revisão em staging.
3. Registrar a aprovação explícita do proprietário adicionando o label
   `production-approved`.
4. Fazer merge em `main`.
5. Aguardar Railway produção e executar o smoke test público.

O label é uma evidência operacional de aprovação. No GitHub Free privado ele
não substitui branch protection; por isso push direto em `main` continua
proibido por procedimento.

Hotfix é a única exceção ao caminho por `develop`: nasce de `main`, referencia
uma issue urgente, entra em `main` por PR aprovado e volta imediatamente para
`develop`.

## Convenções

Commits seguem Conventional Commits:

- `feat:` novo comportamento ou conteúdo interativo;
- `fix:` correção observável;
- `docs:` documentação ou texto sem alteração de comportamento;
- `test:` cobertura;
- `refactor:` reorganização sem mudança observável;
- `chore:` ferramentas e manutenção.

## Checklist de pull request

- [ ] Existe uma issue e o PR contém `Closes #<issue>`.
- [ ] A branch nasceu do `develop` atual e o PR aponta para `develop`.
- [ ] A mudança tem objetivo e critério de aceite claros.
- [ ] O núcleo continua independente da interface.
- [ ] Cálculos novos ou alterados têm testes.
- [ ] A visualização deriva do modelo/rastro real.
- [ ] Estados vazio, carregando, erro e reset foram considerados quando aplicável.
- [ ] Teclado, contraste, texto alternativo e redução de movimento foram considerados.
- [ ] Tipagem, lint, testes e build passam.
- [ ] O resultado foi revisto em staging antes do merge.
- [ ] A documentação e as limitações foram atualizadas.

## Versionamento

O site e os pacotes compartilham inicialmente a versão do marco:

- `0.1.x`: primeira lição de classificação;
- `0.2.x`: classificação aprofundada;
- `0.3.x`: regressão;
- versões seguintes acompanham os marcos do roadmap.

Antes de uma API pública, mudanças internas podem ser incompatíveis entre versões menores, desde que migrações sejam registradas. Depois da primeira API estável, o projeto seguirá Semantic Versioning estritamente.
