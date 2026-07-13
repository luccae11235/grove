# Roadmap

O roadmap separa uma entrega demonstrável nesta semana da construção gradual da plataforma. Datas posteriores são orientativas; a ordem depende do aprendizado obtido em cada conteúdo.

## Sprint de lançamento — 13 a 17 de julho de 2026

### Segunda, 13/07 — fundação

- fechar escopo, arquitetura e critérios de pronto;
- criar workspace, aplicação Astro e pacotes iniciais;
- configurar tipagem, lint, testes e integração contínua;
- formalizar contratos de dataset, árvore e rastro;
- publicar uma página mínima de preview local.

### Terça, 14/07 — núcleo correto

- implementar Gini, entropia e ganho;
- implementar busca de splits numéricos;
- implementar `DecisionTreeClassifier.fit()` e `predict()`;
- definir desempates determinísticos;
- cobrir cálculos, invariantes e casos extremos com testes;
- gerar primeira árvore e primeiro rastro JSON inspecionáveis.

### Quarta, 15/07 — explicação visual

- criar plano 2D, pontos, linha de split, nós e arestas;
- ligar rastro a um controlador de etapas;
- desenhar árvore e regiões de decisão a partir do modelo treinado;
- implementar avançar, voltar, reproduzir, pausar e reset;
- adicionar troca entre Gini e entropia.

### Quinta, 16/07 — narrativa e acabamento

- escrever a lição completa e a home;
- incluir limitações e links para trechos relevantes do código;
- revisar responsividade, teclado, contraste e redução de movimento;
- criar metadados SEO e imagem Open Graph;
- executar testes de navegador e revisar o build de produção.

### Sexta, 17/07 — publicação

- corrigir apenas bloqueadores encontrados na revisão;
- fazer merge da release na `main` e criar tag `v0.1.0`;
- ativar GitHub Pages por GitHub Actions;
- validar a URL pública em desktop e celular;
- publicar no LinkedIn com uma gravação curta ou carrossel e links para demo/código;
- registrar perguntas recebidas como candidatas ao próximo conteúdo.

### Corte de segurança

Se houver atraso, preservar nesta ordem:

1. algoritmo correto e testado;
2. visualização da árvore ligada ao algoritmo;
3. uma narrativa completa;
4. deploy público;
5. controles extras e animações.

Upload, novos algoritmos e polimento cinematográfico não entram para “salvar” a primeira publicação.

## v0.2 — árvore de classificação com profundidade

- multiclasse;
- critérios de parada e regularização visual;
- overfitting e efeito de `maxDepth`/`minSamplesLeaf`;
- datasets adicionais reproduzíveis;
- melhor inspeção de candidatos e empates;
- primeiras primitivas visuais promovidas para API estável.

## v0.3 — árvore de regressão

- variância/MSE e previsão média;
- cena de função em degraus;
- comparação classificação vs. regressão;
- reutilização explícita da infraestrutura de split e árvore.

## v0.4 — bagging e Random Forest

- bootstrap e amostragem de features;
- composição e agregação de árvores;
- miniaturas reutilizáveis;
- incerteza e diversidade do ensemble;
- estudo de caso com out-of-bag error.

## v0.5 — Gradient Boosting

- regressão por resíduos;
- contribuição incremental de cada árvore;
- learning rate e número de estimadores;
- visualização sincronizada: predição atual, resíduos e miniárvores;
- comparação controlada com Random Forest.

## Trilhas posteriores

### Sistemas de árvores modernos

- histogramas e quantis;
- XGBoost, LightGBM e CatBoost como famílias conceituais;
- valores ausentes e features categóricas;
- SHAP para árvores, com limites de interpretação claramente declarados.

### Aprendizado por reforço

- árvore como aproximador de valor;
- fitted Q-iteration;
- model-based RL com modelos de transição baseados em árvores;
- políticas interpretáveis;
- estudos de falha que comparem instabilidade, extrapolação e distribuição dos dados.

Cada estudo de RL deve primeiro indicar qual pergunta uma árvore ajuda a responder. A trilha não será apenas uma aplicação superficial do mesmo playground.

## Cadência editorial sugerida

Uma unidade de engenharia pode gerar mais de um conteúdo sem fragmentar o projeto:

- **Post 1:** intuição ou resultado visual;
- **Post 2:** decisão de implementação ou investigação de falha;
- **Plataforma:** explicação permanente, demo e código reproduzível.

Cadência sustentável: uma entrega principal por semana e, quando houver material, um segundo post derivado. A plataforma acumula conhecimento; o LinkedIn distribui recortes dele.

## Backlog de produto

O backlog deve usar quatro campos para evitar features desconectadas:

1. pergunta pedagógica;
2. comportamento do algoritmo necessário;
3. evidência visual necessária;
4. critério observável de entendimento/correção.

Uma ideia sem pergunta pedagógica clara não entra na sprint, mesmo que seja visualmente atraente.
