# Contribuição e fluxo Git

O projeto adotará um GitFlow leve. A intenção é manter produção estável e trabalho em andamento visível, sem criar cerimônias desnecessárias para uma equipe inicialmente pequena.

## Branches permanentes

- `main`: estado publicado. Somente merges revisados; cada marco recebe uma tag semântica.
- `develop`: integração do próximo marco. Deve permanecer executável e passar pelos checks.

O GitHub Pages será publicado pelo build da `main` via GitHub Actions. Não haverá branch `gh-pages` mantida manualmente.

## Branches temporárias

- `feature/<tema>` nasce de `develop` e volta por pull request;
- `fix/<tema>` corrige defeitos ainda não publicados e nasce de `develop`;
- `release/<versao>` congela escopo e aceita apenas correções de lançamento;
- `hotfix/<tema>` nasce de `main` para defeito urgente publicado e volta para `main` e `develop`.

Para a `v0.1.0`, uma `release/*` só será criada quando a experiência estiver completa. Se o projeto ainda tiver uma única branch de feature curta, `develop` pode ser promovida diretamente por pull request para `main`.

O caminho operacional completo — incluindo staging, promoção, hotfix,
verificação de produção e a separação entre deploy e envio de newsletter — está
em [`docs/production-and-release-runbook.md`](docs/production-and-release-runbook.md).

## Ciclo de uma mudança

1. definir a pergunta pedagógica ou comportamento observável;
2. criar uma issue curta com critério de aceite;
3. abrir branch a partir de `develop`;
4. implementar em commits pequenos e intencionais;
5. abrir pull request e verificar preview/checks;
6. fazer squash merge quando os commits intermediários não tiverem valor histórico;
7. remover a branch temporária.

## Convenções

Commits seguem Conventional Commits:

- `feat:` novo comportamento ou conteúdo interativo;
- `fix:` correção observável;
- `docs:` documentação ou texto sem alteração de comportamento;
- `test:` cobertura;
- `refactor:` reorganização sem mudança observável;
- `chore:` ferramentas e manutenção.

## Checklist de pull request

- [ ] A mudança tem objetivo e critério de aceite claros.
- [ ] O núcleo continua independente da interface.
- [ ] Cálculos novos ou alterados têm testes.
- [ ] A visualização deriva do modelo/rastro real.
- [ ] Estados vazio, carregando, erro e reset foram considerados quando aplicável.
- [ ] Teclado, contraste, texto alternativo e redução de movimento foram considerados.
- [ ] Tipagem, lint, testes e build passam.
- [ ] A documentação e as limitações foram atualizadas.

## Versionamento

O site e os pacotes compartilham inicialmente a versão do marco:

- `0.1.x`: primeira lição de classificação;
- `0.2.x`: classificação aprofundada;
- `0.3.x`: regressão;
- versões seguintes acompanham os marcos do roadmap.

Antes de uma API pública, mudanças internas podem ser incompatíveis entre versões menores, desde que migrações sejam registradas. Depois da primeira API estável, o projeto seguirá Semantic Versioning estritamente.
