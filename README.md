# Tree-Based ML Lab

Plataforma aberta, visual e gratuita para aprender algoritmos baseados em árvores a partir de implementações próprias.

O projeto tem dois objetivos inseparáveis:

1. ensinar como algoritmos baseados em árvores realmente funcionam;
2. formar uma base técnica reutilizável para experimentos, estudos de caso e conteúdo público.

`Tree-Based ML Lab` é um nome de trabalho. O primeiro lançamento será uma experiência interativa sobre **como uma árvore de decisão para classificação aprende**, publicada como site estático no GitHub Pages.

## Princípios

- **Uma fonte de verdade:** a visualização usa a árvore e os rastros produzidos pelo algoritmo real.
- **Do zero onde importa:** o núcleo de machine learning não depende de bibliotecas de ML.
- **Visual antes de ornamental:** cada animação deve explicar uma decisão do algoritmo.
- **Progressão pedagógica:** conceitos simples se tornam blocos dos ensembles posteriores.
- **Static-first:** todo o MVP funciona localmente no navegador e pode ser hospedado gratuitamente.
- **Evolução aberta:** arquitetura, decisões e roadmap ficam documentados no repositório.

## Planejamento

- [Escopo do produto](docs/product-scope.md)
- [Arquitetura](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Fluxo de contribuição](CONTRIBUTING.md)
- [ADR 0001 — aplicação estática com motor no navegador](docs/adr/0001-static-first-browser-engine.md)

## Primeiro marco

O marco `v0.1.0` deverá entregar:

- uma página pública e responsiva;
- uma explicação curta de árvore de classificação;
- um laboratório 2D com datasets pequenos predefinidos;
- comparação entre índice de Gini e entropia;
- reprodução passo a passo das divisões escolhidas;
- árvore, regiões de decisão e métricas derivadas da mesma execução;
- testes do núcleo e deploy automático para GitHub Pages.

## Licenciamento proposto

- código: MIT;
- textos e ilustrações autorais: CC BY 4.0.

A escolha será formalizada antes da primeira publicação.
