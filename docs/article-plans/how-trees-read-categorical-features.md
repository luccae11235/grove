# How Trees Read Categorical Features — editorial preparation

- Título provisório: **How Trees Read Categorical Features**
- Trilha: Tree path, Chapter 3
- Proposed article ID: `categorical-features` (not registered as MDX)
- Preparation status: first English draft for editorial review; approved structure: 2026-10-10
- Ideia de origem: [How to handle categorical features](https://app.notion.com/p/3a2284b2a48e80b1b486e08e42e172cf), atualmente em Building
- Idiomas: planejamento em português; títulos e futuro artigo em inglês

## 1 Tópico

A pergunta central será: **que informação uma representação categórica entrega à árvore, e que perguntas a árvore consegue fazer com ela?**

A proposta organiza o tema em três famílias: códigos e estatísticas independentes do target; representações baseadas no target; embeddings aprendidos. O fio condutor conecta a informação disponível, as partições possíveis e o risco de usar respostas que ainda não poderiam ser conhecidas. CatBoost será o principal estudo de mecanismo, com atenção às ordered target statistics.

As famílias são uma organização didática. As duas primeiras distinguem a origem da informação; a terceira destaca uma forma de representação e seu aprendizado. Um embedding supervisionado pode aprender com o target. A sequência não representa uma hierarquia de qualidade.

O tratamento nativo de categorias, presente na ideia inicial, permanece na abertura como uma capacidade da árvore que atravessa essa discussão. Ele prepara a distinção entre transformar os dados e mudar o tipo de split disponível.

## 2 Pesquisa e learning scope

### Leitor e objetivo

Leitor que já entende uma árvore de decisão, um split numérico e a separação entre treino e teste, mas costuma tratar encoding como uma etapa mecânica. Redes neurais e boosting não serão pré-requisitos.

Ao terminar, deverá conseguir:

- Ler uma matriz codificada e explicar o que preserva, acrescenta ou mistura.
- Prever como uma troca de representação altera os agrupamentos possíveis em um split.
- Identificar a dependência indevida do target da própria observação.
- Distinguir suavização, cross-fitting e estatísticas ordenadas.
- Calcular uma ordered target statistic simples e separar treino de inferência.
- Explicar de onde um embedding aprende suas coordenadas e propor uma comparação sem vazamento.

### Escopo e limites

Entram códigos inteiros, one-hot, códigos binários, contagem/frequência, médias do target, suavização, cross-fitting, ordered target statistics e embeddings de categorias. Categorias raras e desconhecidas aparecerão junto aos mecanismos que tornam esses casos relevantes. A menção a embeddings textuais e LLMs será curta e integrada à terceira família.

Ficam fora hashing, contrast encodings, expansão multiclasse, provas de splits categóricos ótimos, tutorial de APIs, arquitetura completa de CatBoost, derivação de ordered boosting e benchmark entre bibliotecas. Restrições temporais e de grupos receberão uma orientação prática, sem um tutorial de validação.

### Exemplo e linguagem visual

Usar seis visitas sintéticas a lojas identificadas apenas por A, B, C e D. O target é compra, com valores 0 ou 1. A tabela abaixo também define a primeira permutação da demonstração ordenada:

| Linha | Loja | Compra |
| --- | --- | --- |
| 1 | A | 1 |
| 2 | B | 0 |
| 3 | A | 0 |
| 4 | C | 1 |
| 5 | B | 1 |
| 6 | D | 0 |

Manter IDs de linha, letras e outcomes estáveis. A visualização deverá alinhar três regiões: observações de origem, representação disponível e decisão/valor resultante. Letras identificam categorias; 0/1 identifica o target; contornos e rótulos identificam dados permitidos ou bloqueados. Cores apenas reforçam essas distinções.

É um exemplo aritmético, sem medir desempenho. O prior será fixado antecipadamente em p = 0,5, com força a = 1. Ele não será estimado usando todos os targets do exemplo.

## 3 Estrutura de aprendizagem proposta

### 1 What a Tree Can Ask About a Category

[Começar com uma loja como identidade, sem ordem natural entre A, B, C e D. Retomar a pergunta de uma árvore numérica: o valor de uma coluna fica abaixo de determinado limiar? Mostrar que a representação define quais agrupamentos essa pergunta pode produzir.]

[Introduzir brevemente um split categórico nativo por pertencimento a um conjunto, como loja em {A, C}. Explicar que uma biblioteca pode receber códigos inteiros e tratá-los explicitamente como categorias. Isso é diferente de usar os mesmos códigos como uma variável numérica comum. Não derivar o algoritmo de busca de subconjuntos.]

[Apresentar as três famílias como respostas à pergunta “de onde vêm os números?”. Avisar desde aqui que representações aprendidas podem usar supervisão do target e que um sistema pode combinar mecanismos.]

[IMAGEM: Colocar as seis observações à esquerda e dois nós à direita: limiar numérico e pertencimento a categorias. Pergunta do leitor: que condição está realmente sendo avaliada? Manter os dados; mudar a condição e destacar as lojas enviadas a cada ramo. Observar a relação entre representação e split.]

### 2 Codes and Counts Without the Target

[Comparar códigos inteiros arbitrários, one-hot, binário e contagem/frequência no mesmo conjunto. Reservar “ordinal” com significado semântico para categorias que possuem ordem real. Nos IDs de lojas, o inteiro serve apenas como código.]

[Definir a convenção local A=0, B=1, C=2, D=3. One-hot ocupa quatro colunas; a escrita binária desses quatro códigos ocupa dois bits. Explicar que essa contagem vale para a demonstração: bibliotecas podem reservar códigos adicionais para desconhecidos ou ausentes.]

[Mostrar que um limiar nos inteiros seleciona um bloco contíguo da ordem atribuída. Trocar a atribuição dos códigos muda os agrupamentos disponíveis. A árvore não está supondo que a distância numérica entre lojas mede uma distância real. Um split one-hot isola uma categoria; um split em um bit reúne categorias segundo aquele código, sem aprender similaridade.]

[Introduzir contagem e frequência: A e B aparecem duas vezes; C e D, uma. As frequências são 1/3 e 1/6. C e D ficam indistinguíveis nessa coluna apesar de targets diferentes. Contagem acrescenta informação de ocorrência e pode perder identidade. Definir a contagem apenas com o treino permitido.]

[PLAYGROUND: Alternar inteiro, one-hot, binário e frequência, trocar os códigos e selecionar uma coluna/limiar. Manter observações, targets e árvore de profundidade um. Exibir matriz e ramos sincronizados. Pergunta: quais lojas este único split consegue separar? Não apresentar ganhos de acurácia; destacar alterações de partição e colisões de representação.]

[Fechar com os custos relevantes: largura, cardinalidade, categorias raras, desconhecidos e compatibilidade com o estimador. Não concluir que one-hot sempre piora com alta cardinalidade nem que menos colunas implica melhor aprendizado.]

### 3 When the Target Enters the Representation

[Motivar a média do target como um resumo de resultados históricos por categoria. Calcular as médias completas: A=0,5; B=0,5; C=1; D=0. Comparar com frequência para mostrar que os dois resumos carregam informações diferentes.]

[Selecionar C e D, que aparecem uma única vez. Se cada linha de treino recebe a média calculada incluindo sua própria resposta, essas categorias reproduzem o próprio target. Explicar o vazamento como dependência de uma resposta indisponível na situação que se pretende simular.]

[Introduzir a média suavizada: (soma dos targets + a × p)/(contagem + a). Com p=0,5 e a=1, C passa a 0,75 e D a 0,25. A suavização aproxima estimativas pouco sustentadas do prior; o target da própria linha ainda influencia o resultado.]

[ANIMAÇÃO: Selecionar a linha C e alternar média completa e média suavizada. Manter os dados; mudar somente a regra e, depois, a força do prior. Traçar a contribuição do target selecionado até o número entregue à árvore. Pergunta: suavizar removeu essa contribuição? A resposta deve ficar visível no cálculo, sem depender de uma legenda abstrata.]

### 4 Encode Training Rows Without Peeking

[Introduzir cross-fitting: dividir o treino em folds e codificar cada fold com estatísticas ajustadas nos demais. Separar esse procedimento interno da avaliação externa do modelo. Ao codificar um fold que contém a única linha C, a categoria não foi vista nos dados permitidos e recebe o prior da demonstração.]

[Mostrar as duas tarefas de um encoder: produzir representações de treino com a separação necessária e guardar um mapeamento ajustado no treino completo para futuras observações. O target da nova observação não participa. Distinguir esse procedimento de calcular um único mapeamento com todas as linhas e reaplicá-lo às próprias linhas.]

[Usar o TargetEncoder do scikit-learn como referência concreta: fit_transform aplica cross-fitting; fit seguido de transform no mesmo treino não é equivalente. Evitar transformar a seção em tutorial de código. Ressaltar que suavização e cross-fitting têm funções diferentes e que leave-one-out isoladamente não garante ausência de vazamento.]

[IMAGEM: Dois fluxos alinhados: treino com folds separados e inferência com mapeamento do treino completo. Manter a identidade das linhas; mudar apenas quais linhas podem alimentar a estatística consultada. Pergunta: quais targets estão autorizados a influenciar este valor? Marcar treino, validação e consulta com rótulos explícitos.]

[Encerrar com um limite curto: o pipeline inteiro deve ser ajustado dentro de cada divisão externa. Grupos e tempo exigem divisões compatíveis; em previsões temporais, um outcome só pode entrar quando já seria conhecido.]

### 5 CatBoost Reads the Prefix

[Usar o problema anterior para introduzir a alternativa ordenada. Em uma permutação das linhas de treino, codificar uma linha somente com targets de ocorrências anteriores da mesma categoria. Primeiro mostrar a leitura das linhas; depois apresentar a fórmula.]

[Definir a estatística simplificada: (soma dos targets anteriores da categoria + 0,5)/(número de ocorrências anteriores da categoria + 1). Percorrer a ordem já apresentada. Os valores são, respectivamente, 0,5; 0,5; 0,75; 0,5; 0,25; 0,5. Na segunda ocorrência de A, calcular (1+0,5)/2=0,75; na segunda de B, (0+0,5)/2=0,25.]

[Contrapor as primeiras ocorrências de C e D: ambas recebem 0,5, embora seus targets sejam diferentes. Comparar com 1 e 0 das médias ingênuas, e 0,75 e 0,25 das médias completas suavizadas. O ponto central é quais observações contribuíram, não uma promessa de desempenho.]

[PLAYGROUND: Principal interação do artigo. Avançar e voltar uma linha, escolher a categoria e trocar a permutação. Manter os seis pares loja/target, p e a. Iluminar apenas linhas anteriores da mesma categoria; bloquear a linha atual e as posteriores. Atualizar soma, contagem e resultado juntos. Pergunta: que evidência já existia quando esta linha foi codificada? Oferecer pausa, reinício e passos discretos.]

[Adicionar modo de inferência à mesma interação. Para uma nova consulta, usar o histórico completo de treino: A=0,5; B=0,5; C=0,75; D=0,25; E desconhecida=0,5. Esclarecer por que o target histórico de C pode ajudar a prever uma nova visita a C, enquanto o target da nova visita continua ausente.]

[Identificar tudo como uma ordered target statistic simplificada. CatBoost possui diferentes estatísticas categóricas, combinações de features, múltiplas permutações e uso de one-hot em certas condições. Não apresentar o brinquedo como reprodução de todos os CTRs.]

[Separar, em um parágrafo, ordered target statistics de ordered boosting: o primeiro constrói atributos categóricos; o segundo trata o aprendizado do boosting. O artigo aprofunda apenas o primeiro. Não afirmar que toda execução de CatBoost usa o modo Ordered nem que uma permutação aleatória resolve restrições temporais.]

### 6 Learning a Representation for Each Category

[Introduzir um embedding como um vetor consultado por categoria, com coordenadas aprendidas. Contrastar com os bits definidos manualmente e com a média do target: a representação pode ter várias dimensões cujo significado surge do objetivo e dos dados de treinamento.]

[Explicar entity embeddings supervisionados: um modelo preditivo aprende uma tabela de vetores junto com a tarefa. Esses vetores podem depois ser usados por outro modelo, inclusive árvores. A representação continua usando informação do target e seu aprendizado deve respeitar a separação de avaliação. Não atribuir significado intrínseco a cada eixo nem presumir vantagem universal.]

[IMAGEM: Manter os IDs A–D e mostrar categoria → consulta à tabela de vetores → coordenadas → árvore. Em paralelo, indicar de onde vêm as atualizações da tabela durante o treinamento. Pergunta: quem escolheu estas coordenadas e com qual objetivo? Os valores serão explicitamente ilustrativos, sem simular um experimento treinado nem sugerir que seis linhas bastam para aprender uma geometria útil.]

[Acrescentar um parágrafo sobre embeddings textuais pré-treinados, inclusive modelos baseados em LLMs. Uma descrição significativa de uma categoria pode fornecer informação externa. Um ID opaco como “loja_173” não fornece, sozinho, essa descrição. Similaridade textual pode ser útil, mas sua relevância para o target precisa ser avaliada; embeddings pré-treinados e embeddings ajustados à tarefa têm origens de informação diferentes.]

### 7 Choose the Information You Can Legitimately Use

[Retomar a pergunta inicial e organizar a síntese por decisões: preciso preservar identidade, resumir ocorrência, aproveitar resultados históricos ou aprender uma representação? Considerar também o tratamento categórico nativo disponível no estimador.]

[Propor uma comparação sob a mesma divisão de avaliação, incluindo todo aprendizado de representação dentro do treino permitido. Registrar tratamento de raros/desconhecidos, custo e qualidade preditiva. Nenhum resultado será antecipado.]

[Fechar com três verificações de compreensão: prever o efeito de trocar códigos inteiros; explicar por que suavizar C não remove sua influência sobre o próprio encoding; calcular a segunda ocorrência de B e explicar por que a inferência usa outro conjunto de evidências. A conclusão deve devolver ao leitor um critério de escolha, sem declarar uma família vencedora.]

**Editor decision:** The seven-chapter structure and its visual ideas were approved on 2026-10-10. The prose and specifications below remain a first draft.

## 4. Visual and interaction specification

These are production contracts for the six approved placeholders, not implemented assets. Throughout, the six source rows keep their IDs, categories, and outcomes. A label and outline distinguish available evidence from blocked evidence; color only reinforces that distinction. A compact table is the static and screen-reader equivalent of every state. No visual depends on hover or dragging. Controls must work by keyboard and touch, remain usable at narrow widths, and respect reduced-motion settings.

### Opening image — numeric threshold and categorical membership

- **Learner question:** What condition does the node actually test? Show the six rows at left and two alternative one-split nodes at right. The node labels are `code < 2` under A=0, B=1, C=2, D=3 and `store ∈ {A, C}`. Keep rows, targets, and labels fixed; change only the condition. Directly connect each store to the appropriate branch.
- **Observation:** A numeric threshold groups A with B in this example, while a categorical membership test can group A with C. It is the meaning of the split, not the mere presence of integer IDs in an input table, that differs.
- **Evidence and verification:** Branch membership follows the displayed conditions. Include a short text description naming the two resulting store groups. At mobile width, stack the nodes beneath the same row list rather than duplicating the data.

### Codes and counts playground — one split, four encodings

- **Learner question:** Which stores can this single split separate? Keep the same six rows, their targets, and a depth-one tree. Offer integer, one-hot, two-bit binary, and frequency views; let the learner change the arbitrary code assignment and select one encoded column and threshold. Update the encoding matrix and branch membership together.
- **Observation:** An integer threshold selects a contiguous block in the chosen code order; a one-hot column isolates one store; a bit groups stores by that assigned bit; frequency collides for A/B and C/D. Do not show accuracy, rank the encodings, or imply the bit pattern learned similarity.
- **Evidence and verification:** The default codes are A=0, B=1, C=2, D=3; binary is 00, 01, 10, 11; counts are 2, 2, 1, 1 and frequencies 1/3, 1/3, 1/6, 1/6. Derive frequencies from the six allowed training rows. Each state has a readable matrix and branch list. Use buttons/selects with visible focus, not a drag-only threshold; on small screens show matrix then branches in reading order.

### Smoothing animation — the selected row's target still contributes

- **Learner question:** Does smoothing remove C's own target from its training encoding? Keep row 4, C, target 1, and all other rows fixed. First switch from the unsmoothed category mean 1 to `(1 + a × 0.5)/(1 + a)` with default `a=1`, which is 0.75. Then vary `a` while retaining the displayed contribution from row 4.
- **Observation:** The prior pulls a one-row estimate toward 0.5, but the row's target remains in the numerator. Trace only that contribution, rather than animating unrelated rows.
- **Evidence and verification:** `a=0` gives 1, `a=1` gives 0.75, and increasing positive `a` approaches 0.5. Provide a step button, a pause control, and a static sequence for reduced motion. The text alternative states the formula and explicitly names the contributing row. On small screens keep the row, formula, and resulting value in one vertical sequence.

### Cross-fitting image — training and inference evidence boundaries

- **Learner question:** Whose targets may influence this encoded value? Show an outer training set split into internal folds; for a selected training row, outline only the other folds as sources of its statistic. Beside it, show a later validation or new row using a mapping fitted on the full outer training set. Preserve row identities across both flows and label the selected row, internal training folds, outer validation, and new query distinctly.
- **Observation:** A training row does not use the target in its held-out internal fold, while a future row may use all permitted training targets and never its own unknown outcome. A category unseen in the allowed source folds receives the demonstration prior 0.5.
- **Evidence and verification:** The illustrated fold assignment must make the only C row held out. A text table lists the permitted target rows for each selected value. At narrow width, render the two flows consecutively with identical labels and one evidence key. No arrows may use color alone to communicate permission.

### Ordered-statistics playground — read the prefix

- **Learner question:** What evidence existed when this row was encoded? Offer previous, next, reset, play/pause, store filter, permutation selector, and training/inference mode. Keep the six store/outcome pairs and fixed prior `p=0.5`, strength `a=1`. In training mode, highlight only earlier rows of the current category and block the current and later rows. Update numerator, count, and encoded value as one atomic state. Changing permutation changes row order, not pairings.
- **Observation:** In the default order A1, B0, A0, C1, B1, D0, the six values are 0.5, 0.5, 0.75, 0.5, 0.25, 0.5. First C and D both receive 0.5. In inference mode the full training history gives A=0.5, B=0.5, C=0.75, D=0.25, unknown E=0.5. The mode switch should make the evidence boundary, not a purported performance gain, visible.
- **Evidence and verification:** Compute the statistic from the visible prefix, never a prewritten value detached from state; test each default step, a changed permutation, reset, and each inference category. Announce value and contributing-row changes in text. Use discrete buttons and a nonanimated mode for reduced motion. On mobile, place the row list before the calculation and keep the controls visible without horizontal scrolling.

### Embedding image — category lookup and learning source

- **Learner question:** Who chose these coordinates, and for what task? Show A–D feeding a vector lookup table and then numeric coordinates feeding a tree. A separate, clearly labelled training arrow runs from prediction loss to updates of the lookup table. Keep category IDs stable; example coordinates are explicitly illustrative and never presented as learned from the six rows.
- **Observation:** Bits are assigned by a coding rule, while a supervised embedding's coordinates are adjusted by a predictive objective. Its target dependence must be acknowledged even though the final representation is a vector.
- **Evidence and verification:** The text alternative describes both the lookup path and update path. No geometric distance or apparent cluster should imply measured similarity. At small widths, keep lookup and learning paths in distinct stacked lines; direct labels convey direction without relying on animation.

## 5. First draft (English)

# How Trees Read Categorical Features

A store name can be useful to a prediction even though it is not a quantity. If a visitor walks into store C, a tree may want to use that identity to estimate whether they will buy. But what question can the tree ask about C? The answer depends partly on how we represent the store and partly on what kinds of splits the tree supports.

We will follow six visits through several representations. Their outcomes are deliberately small enough to calculate by hand, and no model performance is measured here.

| Row | Store | Purchase |
| --- | --- | --- |
| 1 | A | 1 |
| 2 | B | 0 |
| 3 | A | 0 |
| 4 | C | 1 |
| 5 | B | 1 |
| 6 | D | 0 |

### 1. What a Tree Can Ask About a Category

A familiar tree split asks whether a number is below a threshold: `value < 2`, for example. Store A is not inherently less than store B, so a numeric question only becomes possible after we assign numbers to those names. If we call A=0, B=1, C=2, and D=3, `code < 2` sends A and B to one branch and C and D to the other. Another arbitrary assignment would change that grouping without changing a single visit.

Some tree implementations instead accept a column as categorical. Such a tree can ask whether `store ∈ {A, C}` and route A and C together. It may still receive categories through integer IDs internally; what matters is that it treats them as identities and searches categorical membership conditions, rather than treating their codes as measured magnitudes. [XGBoost's categorical-data documentation](https://xgboost.readthedocs.io/en/stable/tutorials/categorical.html) makes this distinction between threshold and category-set splits explicit. The algorithm's choice of candidate sets is a separate question from how we encode the input.

[IMAGE: Show the six fixed visits at left and two one-split nodes at right, `code < 2` and `store ∈ {A, C}`. Keep rows and outcomes unchanged; highlight branch membership for each condition. Learner question: what condition is the tree actually testing?]

When a tree needs numbers, we have choices about where those numbers come from. We will examine codes and occurrence counts that require no purchases, summaries calculated from past purchases, and vectors whose coordinates are learned. These are teaching families, not competing tiers: a learned vector can itself be supervised by purchases, and a system can combine representations. Native categorical splits are another capability that can sit alongside any such comparison.

### 2. Codes and Counts Without the Target

Suppose we keep the assignment A=0, B=1, C=2, D=3 and pass it to a tree as an ordinary numeric feature. A split at 1.5 separates {A, B} from {C, D}; a split at 0.5 isolates A. In general, one numeric threshold cuts the assigned code order into contiguous blocks. Reassigning the codes changes those blocks. The tree is not measuring a real distance between shops, but the arbitrary ordering constrains its one-split questions. If the categories genuinely have an order, an ordinal code may convey useful information; these store IDs do not.

One-hot encoding gives A, B, C, and D separate indicator columns. For an A row, the four entries are `1, 0, 0, 0`. A split on the A indicator can isolate A regardless of where we happened to place it in an integer sequence. The cost is four columns in this small demonstration, potentially many more when there are many categories. Those columns may be sparse, and whether the width is troublesome depends on the model and data.

Binary coding compresses our four chosen integer codes into two bits: A=00, B=01, C=10, D=11. A split on the first bit separates {A, B} from {C, D}; the second separates {A, C} from {B, D}. The grouping comes from the assigned bit pattern, not a similarity the method discovered. Four one-hot columns and two binary columns are the counts for this particular four-category convention; an implementation may reserve extra values or columns for missing or unseen categories. [Category Encoders documents its binary encoder](https://contrib.scikit-learn.org/category_encoders/binary.html) as one practical implementation.

Another approach replaces a name with how often it appeared in the allowed training data. A and B each occur twice, while C and D occur once. Their frequencies among six visits are therefore 1/3, 1/3, 1/6, and 1/6. Frequency tells a tree something about occurrence, but it erases identity where counts collide. C and D have different purchase outcomes here and exactly the same frequency value. These statistics must be fitted from the training portion available at the time of prediction; using validation or test rows to compute them would change the evidence boundary. [Category Encoders' count encoder](https://contrib.scikit-learn.org/category_encoders/count.html) is an example of this representation.

[PLAYGROUND: Alternate integer, one-hot, binary, and frequency representations of the same six visits. Permit code reassignment and one column/threshold selection for a depth-one tree; synchronize the matrix and branch membership. Learner question: which stores can this one split separate? Show representation collisions, not accuracy claims.]

The right representation depends on cardinality, rare categories, unseen stores, column cost, and what the estimator can read. An unseen store needs an explicit policy, such as an unknown indicator or a reserved code. Fewer columns do not by themselves imply easier learning, and one-hot width does not by itself imply poor predictions. So far, none of these encodings has used a purchase outcome to define a store's value. That changes the next family—and changes which rows are allowed to help create that value.

### 3. When the Target Enters the Representation

If past visitors to a store bought often, perhaps that history can inform a later prediction. The simplest target encoding is the mean purchase outcome for each store. Across all six training rows, A has one purchase in two visits and B has one in two, so each has mean 0.5. C has one purchase in its only visit, giving 1; D has none in its only visit, giving 0. Frequency could not distinguish C from D, but this summary can.

Now imagine giving each of these six rows its store's full-data mean as a feature while training a model. Row 4, the only C visit, receives 1 because row 4's own outcome was 1. Row 6, the only D visit, receives 0 because its own outcome was 0. Their encoded values reproduce their answers. For a new visit, that new outcome would be unknown. The training feature has therefore used information unavailable in the prediction situation it is meant to imitate. This is target leakage at the row level, and it can make a model trust a pattern that will not be available in use.

We can temper estimates based on little history by adding a prior. For this example, fix the prior *before* looking at these outcomes at `p = 0.5`, with weight `a = 1`:

`smoothed mean = (sum of store purchases + a × p) / (store visits + a)`.

For C the calculation is `(1 + 0.5) / (1 + 1) = 0.75`; for D it is `(0 + 0.5) / 2 = 0.25`. A and B remain 0.5. Smoothing pulls estimates from rare stores toward the prior, but C's own `1` remains in C's numerator when we encode row 4 from all six rows. The number is less extreme; the evidence boundary has not changed. The fixed prior here is a teaching choice, not an estimate from all six outcomes and not an assertion that every library uses this exact smoothing formula.

[ANIMATION: Select row 4 (C). Change only its encoding rule from full mean 1 to `(1 + a × 0.5)/(1 + a)`, first at `a=1` and then at other prior weights. Trace row 4's target into the numerator throughout. Learner question: did smoothing remove the selected target's contribution? Provide discrete steps and a reduced-motion static version.]

To stop a training row from seeing its own answer, we must change which outcomes may contribute to its encoding. That is a different job from shrinking a noisy estimate.

### 4. Encode Training Rows Without Peeking

One way to build honest training features is cross-fitting. Divide the training data into internal folds. To encode the rows in one fold, calculate each store's statistics from the other folds only; repeat until every training row has an encoding. If the fold being encoded contains the only C visit, the permitted rows contain no C. Under our fixed-prior demonstration, C receives 0.5 rather than a value derived from its own purchase.

The encoder also needs a way to represent future observations. After producing the cross-fitted training column, it can fit a mapping on the complete allowed training set. That mapping gives a later C visit 0.75 in our example, since row 4's purchase is now historical training evidence. The later visit's own purchase is still unknown and plays no part. Training rows and later rows therefore need different procedures even when they use the same categories. Fitting one full-data mapping and applying it back to the same training rows is not cross-fitting.

[scikit-learn's `TargetEncoder`](https://scikit-learn.org/stable/modules/preprocessing.html#target-encoder) makes this distinction concrete: its `fit_transform` creates cross-fitted values for training rows, whereas `fit` followed by `transform` on those same rows does not produce the same training representation. Its implementation also stores a full-training mapping for subsequent transforms. The exact smoothing and unknown-category policy of a library need not match our fixed-prior toy formula. Smoothing controls how strongly limited evidence moves an estimate; cross-fitting controls which rows are allowed to supply that evidence. Simply leaving out the current row is not a complete leakage policy: correlated rows, group structure, and time can still make supposedly available targets inappropriate.

[IMAGE: Align two flows using the same row IDs: internal training folds encode a held-out training fold, while a later validation or inference row uses a mapping from the permitted full training set. Outline which targets can contribute and label blocked rows. Learner question: whose targets are authorized to influence this value? Include a text table and a narrow-screen stacked layout.]

There is also an outer boundary. When evaluating a model, every encoder, prior estimated from data, and downstream model must be fitted afresh inside each outer training split. Validation outcomes cannot inform the encoding used to predict those same validation rows. If visits are grouped by person or store, or if predictions are about the future, the split must respect that structure. A past row's outcome can contribute only once it would actually have been known at the time of prediction. Cross-fitting alone cannot repair an unrealistic evaluation split.

### 5. CatBoost Reads the Prefix

Cross-fitting with folds is one way to keep a row's target out of its own feature. CatBoost's ordered target statistics use a different separation: put training rows in a permutation, and for each row, consult only earlier occurrences of the same category. The order is an evidence rule for constructing training features. In a usual shuffled permutation it is not necessarily the real passage of time.

Start with the order already shown in our table: A1, B0, A0, C1, B1, D0, where the letter is the store and the digit is the purchase outcome. Before row 1, there is no earlier A. Before row 2, there is no earlier B. At row 3, one A with outcome 1 is available. At row 4, there is no earlier C. At row 5, one B with outcome 0 is available. At row 6, there is no earlier D. Notice that the outcome printed beside the current row is visible to *us* in the teaching table, but cannot contribute to that row's encoding.

Using our fixed prior and weight, the simplified statistic is:

`ordered value = (sum of earlier same-store purchases + 0.5) / (number of earlier same-store visits + 1)`.

| Row | Earlier same-store outcomes | Ordered value |
| --- | --- | --- |
| 1, A1 | none | 0.5 |
| 2, B0 | none | 0.5 |
| 3, A0 | 1 | 0.75 |
| 4, C1 | none | 0.5 |
| 5, B1 | 0 | 0.25 |
| 6, D0 | none | 0.5 |

At row 3, A's previous `1` gives `(1 + 0.5) / 2 = 0.75`; row 3's own `0` is blocked. At row 5, B's previous `0` gives `(0 + 0.5) / 2 = 0.25`; row 5's own `1` is blocked. Most revealingly, the first C and D visits both get 0.5 even though their current targets differ. If we had encoded those same rows with their full-data means, C would get 1 and D 0. Even full-data smoothing would give 0.75 and 0.25. The difference is which observations were allowed to contribute, rather than a measured improvement in prediction quality.

[PLAYGROUND: Step forward or back through the six fixed store/outcome pairs, choose a store, and change the permutation. Keep `p=0.5` and `a=1`. Highlight only earlier rows of the current store; block current and later rows; update sum, count, and result together. Offer pause, reset, discrete controls, a text equivalent, and a training/inference switch. Learner question: what evidence existed when this row was encoded?]

The same playground needs an inference mode because a genuinely new visit is different from a row used to train the model. Its target has not been observed, but all six *training* outcomes are now historical evidence. With the same smoothed rule, a new A gets `(1 + 0.5)/(2 + 1) = 0.5`, and so does B. A new C gets 0.75, D gets 0.25, and an unseen store E gets the preselected prior 0.5. Using C's old purchase to predict a new C is legitimate if it belongs to the allowed training history; using the new visitor's own purchase would not be. In an evaluation fold, “all training outcomes” means only the outer training portion, never the held-out fold.

This is a hand-calculable **ordered target statistic**, not a full reproduction of CatBoost. CatBoost supports multiple categorical statistics and feature combinations, can use more than one permutation, and sometimes uses one-hot treatment. Its [categorical-feature documentation](https://catboost.ai/docs/en/features/categorical-features) and [transformation description](https://catboost.ai/docs/en/concepts/algorithm-main-stages_cat-to-numberic) describe that wider set of choices. The [CatBoost paper](https://papers.neurips.cc/paper_files/paper/2018/file/14491b756b3a51daac41c24863285549-Paper.pdf) develops ordered target statistics as a way to avoid the current row's target entering its own categorical statistic.

The paper also describes **ordered boosting**, a separate technique addressing how boosting learns from training examples. Ordered target statistics construct categorical features; ordered boosting changes the boosting procedure. CatBoost has [`Ordered` and `Plain` boosting modes](https://catboost.ai/docs/en/references/training-parameters/common#boosting_type), so it would be wrong to assume every run uses ordered boosting just because it handles categories with ordered statistics. Neither mechanism is a blanket guarantee against every form of leakage. If the dataset is split in a way that exposes future or related-group outcomes, an arbitrary permutation does not make those outcomes legitimate history.

### 6. Learning a Representation for Each Category

We have assigned bits by hand and calculated one number per store from outcomes. A learned embedding offers another form: keep a table with one vector per category, look up the vector for A or B, and pass its numeric coordinates to a model. A tree can then split on those coordinates. Unlike the two-bit code above, the coordinates are adjusted during learning rather than fixed by our chosen alphabetic IDs.

Where do the adjustments come from? In a supervised entity-embedding setup, a predictive model uses the lookup vectors while learning to predict the target; its training objective changes the vectors along with the rest of the model. The vectors can later become features for another model, including a tree, as described in [Guo and Berkhahn's entity-embedding work](https://arxiv.org/abs/1604.06737). That makes a supervised embedding dependent on target information too. Our three families overlap: “learned vector” describes the form and learning process, while “target-derived” describes a source of supervision.

[IMAGE: Show A–D flowing through a category-to-vector lookup and then into numeric tree inputs; show a separate training-loss arrow updating the lookup table. Keep the IDs fixed and label all coordinates illustrative, not learned from these six rows. Learner question: who chose these coordinates, and for which objective?]

The axes of such a vector do not come with intrinsic meanings like “store size” or “customer taste.” Nor do six toy rows establish a useful geometry or any advantage over other encodings. If we train an embedding for comparison, its lookup table and supervising model must be learned inside the permitted training split; validation targets cannot shape the vectors used to predict validation rows. We also need a policy for rare stores that receive little training signal and stores absent from the learned table.

Sometimes a category has meaningful text, such as a product description. A pretrained text encoder, including an LLM adapted to produce [text embeddings](https://arxiv.org/abs/2404.05961), can bring information learned outside this dataset. The opaque ID `store_173` alone does not supply that description. Textual similarity might help with the task, but it needs evaluation; a pretrained text vector and a task-supervised entity embedding draw on different information sources.

### 7. Choose the Information You Can Legitimately Use

Return to the first question: what can the tree ask about a store? If identity matters and the tree accepts categorical membership splits, consider that capability directly. If a numeric encoding is required, decide whether to preserve identity with indicators or codes, summarize occurrence with counts, use historical outcomes through a carefully separated target statistic, or learn coordinates from an allowed training objective. Each choice changes the questions a downstream split can ask. None forms a universal ladder from primitive to advanced.

A fair comparison would hold the external evaluation split fixed and fit every representation inside its training portion. For supervised representations, that includes the target statistics or embedding objective; for even a simple count, it includes the rows used to calculate the counts. Record how each method handles rare and unknown stores, its width and computation cost, and its predictive quality on untouched validation data. For grouped or temporal problems, make the split reflect when and for whom predictions will be made. We have not run such an experiment here, so the six-row arithmetic supports an explanation of information flow, not a performance ranking.

Three quick checks reveal whether the distinction has landed. First, if we swap the arbitrary integer codes for B and C, which groups can a single numeric threshold now form? The set of contiguous code blocks changes, even though the visits do not. Second, why does smoothing C's full-data mean to 0.75 fail to remove leakage for row 4? Its own purchase still appears in the numerator. Third, what is the second B visit's ordered value? It is `(0 + 0.5)/2 = 0.25` because the earlier B outcome is 0. A *new* B visit instead uses both allowed training B outcomes, giving `(0 + 1 + 0.5)/3 = 0.5`.

The practical rule is to name the evidence behind every encoded value. Ask what information the representation retains, what a tree can split on, and whether each contributing outcome would have been known for the prediction the row is supposed to represent. That lets the representation serve the question without quietly borrowing its answer.

## 6. Editorial review

- **Scope and structure fidelity:** The draft follows the seven approved chapters in order, with the six approved visual ideas retained as labelled placeholders at their planned points. The native categorical split is introduced as a cross-cutting tree capability. No MDX article, asset, experiment, or publication is implied.
- **Correctness and source checks:** Verified the four store counts (2, 2, 1, 1), frequencies (1/3, 1/3, 1/6, 1/6), full target means (0.5, 0.5, 1, 0), smoothed values (0.5, 0.5, 0.75, 0.25), ordered sequence (0.5, 0.5, 0.75, 0.5, 0.25, 0.5), and full-history inference values. Checked the cited primary documentation and CatBoost paper for categorical splits, cross-fitting, ordered statistics, mode distinction, and embeddings. The fixed prior is an explicit assumption, not estimated from the six outcomes.
- **Claims awaiting evidence:** No claim of predictive superiority or experimental outcome appears. Any eventual performance or usability claim requires a separately designed evaluation. The illustrative embedding coordinates must remain labelled as such when artwork is produced.
- **Prose flow and example continuity:** Row IDs, categories, targets, and the prior stay constant through all seven chapters. The transition from smoothing to evidence separation and then to CatBoost's prefix mechanism is the central argument.
- **Visual specification consistency:** Every planned visual has one learner question, stable and changing elements, a direct observation, a text equivalent, keyboard and small-screen behavior, and a numerical or branch-membership check. Detailed implementation and rendered review remain future work.
- **Editor decisions and remaining questions:** Structure approved on 2026-10-10. The proposed article ID `categorical-features` still needs confirmation if the work advances to the content collection. This draft needs editorial review before any MDX implementation or staging decision.
