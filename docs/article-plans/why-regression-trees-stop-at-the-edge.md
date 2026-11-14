# Why a regression tree stops at the edge

Issue: [#209](https://github.com/luccae11235/grove/issues/209)
Article ID: `why-regression-trees-do-not-extrapolate`
Status: editorial and interactive draft; no publication date

**Revisão editorial (30 set. 2026):** `Foundational`/`Fundamental` e `Quick read`/`Leitura rápida` são metadados distintos; só este artigo recebe o marcador de formato curto. O controle é um slider no eixo x. A tabela de quatro pares e a linha de continuação hipotética saíram. Dez observações fixas com pequenas oscilações sustentam a mesma pergunta.

## 1. Tópico

- **Título provisório:** Why a regression tree stops at the edge.
- **Pergunta central:** por que a previsão de uma árvore de regressão convencional permanece plana além das entradas observadas, mesmo quando os pontos de treino sobem em geral?
- **Por que merece artigo:** o limite é simples, frequente e visual. Distinguir a previsão do modelo de uma afirmação sobre a continuação real ajuda o leitor a interpretar aplicações fora do treino.

## 2. Learning Scope

- **Tema central:** extrapolação de uma árvore CART unidimensional com folhas de média constante.
- **Objetivo principal:** explorar a previsão dentro e fora do intervalo de treino e explicar a cauda plana a partir da última folha.
- **Persona e pré-requisito:** quem compreendeu o artigo de árvores de regressão, limiares e média de folha; sem necessidade de cálculo, regressão linear ou ensembles.
- **Conceitos de apoio:** intervalo observado de x, resultado observado, folhas constantes e previsão em degraus.
- **Limites:** uma árvore fixa, uma variável e uma interação. Sem ajustar profundidade, ensinar CART em detalhe, comparar desempenho, avaliar incerteza ou afirmar como o fenômeno continua. Folhas lineares aparecem apenas como exceção de escopo.
- **Exemplo reproduzível:** dez pares fixos `(1,2), (1.8,2.7), (2.6,2.5), (3.4,3.8), (4.2,3.6), (5,4.9), (5.8,5.5), (6.6,5.2), (7.4,6.8), (8.2,6.5)`. Não há sorteio nem seed. Um ajuste CART por erro quadrático com profundidade máxima 2 escolhe raiz `4.6`, divisão esquerda `3` e direita `7`; as quatro médias terminais, em ordem de x, são `2.4`, `3.7`, `5.2`, `6.65`. O teste recompõe o ajuste a partir dos valores, sem confiar nos rótulos do gráfico.
- **Transferência:** em outra árvore de folhas constantes, localizar a última folha e reconhecer que novas entradas mais distantes mantêm a mesma previsão, sem concluir que a relação real seja plana.

## 3. Estrutura do artigo

Progressão **Orientar → Observar → Explicar → Generalizar**; leitura rápida, com um exemplo e um gráfico.

1. **Orientar — “What happens beyond the dots?”** Retomar a média de folha do artigo anterior. Apresentar dez pontos com tendência geral crescente e oscilação plausível, sem tabela. A faixa observada no gráfico vai de `x=1` a `8.2`.
2. **Observar — “Slide x and watch the prediction.”** Logo após introduzir os dados, inserir `[PLAYGROUND: ten fixed observations, depth-two CART mean leaves, slider aligned to x-axis from 0 to 10, current x and prediction, shaded observed-input band, four tree steps and moving prediction marker]`. O slider opera imediatamente por ponteiro, teclado ou toque. Nenhuma edição numérica ou etapa de revelação. A árvore não é reajustada ao mover x.
3. **Explicar — “Why does the prediction stay level?”** Usar `x=7`, `8.2`, `9.5` e `10`. A última folha contém `6.8` e `6.5`, logo prevê `6.65`; o platô começa depois de `7`, dentro dos dados. Diferenciar x fora da faixa `[1,8.2]` de y previsto dentro dos alvos `[2,6.8]`. Folhas médias não ultrapassam os alvos observados.
4. **Generalizar — “A prediction is not a continuation.”** Mais folhas podem mudar a altura do último degrau, sem lhe dar inclinação. A continuação real é desconhecida. Delimitar a exceção breve de folhas lineares e encerrar com a pergunta prática sobre qual folha recebe a nova entrada.

### Visuais e interações

**Pergunta do gráfico:** ao mover x para além dos pontos, a previsão também continua subindo? Mostrar somente pontos observados, faixa observada, degraus da árvore, marcador da previsão e slider alinhado ao eixo x. Um par numérico `x → previsão` acompanha o movimento. Sem hipótese linear desenhada, painel de rota ou legendas duplicadas. A legenda curta distingue os pontos da linha, inclusive sem depender de cor. A descrição SVG enuncia pontos, divisões e médias para leitores de tela. A escala fixa de 0 a 10 inclui valores antes e depois da faixa de treino. Conferir limites do slider, limiares `3`, `4.6`, `7`, teclado, ponteiro, toque e larguras desktop/celular.

Princípios do usuário: **contexto → mudança ou problema → evidência → conclusão ou ação**; escolher o gráfico certo, remover o que não ajuda e destacar o que importa.

## 4. Rascunho redigido — inglês

### Why a regression tree stops at the edge

A regression tree turns a set of questions into a numeric prediction. In the previous article, each leaf returned the average outcome of the training observations that reached it. What happens when we ask that kind of tree about an input beyond everything it has seen?

The graph below shows ten observations. Their outcomes generally rise as `x` increases, though not at a perfectly steady rate. The shaded band marks the observed inputs, from `x=1` to `x=8.2`. A small tree fitted to these points makes the green step-shaped predictions. Slide along the x-axis to compare its predictions inside and beyond the band. The tree stays fixed as you move the input.

[PLAYGROUND: ten fixed observations, depth-two CART mean leaves, slider aligned to x-axis from 0 to 10, current x and prediction, shaded observed-input band, four tree steps and moving prediction marker.]

### Why does the prediction stay level?

Try `x=7` and then move just past it. The tree's last split sends larger inputs to a leaf containing the outcomes `6.8` and `6.5`, whose mean is `6.65`. At `x=8.2`, the largest observed input, the tree predicts `6.65`. It gives the same answer at `x=9.5` and at `x=10`: all three inputs reach that same leaf, which stores one number rather than a rule for continuing the upward pattern.

The flat segment begins just after `x=7`, *inside* the observed input range. Crossing the edge at `8.2` does not create it. A tree with more constant leaves might put the final observations into different groups and change the height of the last step, but its rightmost leaf would still return a fixed value for every input farther right.

Notice the two different ranges. `x=9.5` is outside the observed **input** range. The prediction `6.65` remains within the observed **outcome** range of `2` to `6.8`. A mean-valued leaf cannot predict above the largest or below the smallest training outcome that reached it, so this kind of tree also cannot predict beyond the overall observed outcome extremes.

### A prediction is not a continuation

The rising observations do not tell us what the real outcome at `x=9.5` will be. It might continue upward, level off, or turn down. The tree can return `6.65` there, but that does not mean the underlying relationship is flat. Some tree architectures place a linear model in a leaf, as the Beyond CART article describes. The flat-tail argument here applies to conventional regression trees with constant leaves.

When you see one of these trees predict beyond its training inputs, ask which leaf the new input reaches and what that leaf stores. That tells you what the model can compute; observations beyond the training range are still needed to judge how the real pattern continues.

## 5. Estrutura dos posts

### Email (rascunho local; não enviar)

1. Abrir com a pergunta sobre x além dos pontos crescentes.
2. Descrever brevemente a última folha e a previsão constante.
3. Convidar ao slider do artigo, sem simular uma edição aprovada da newsletter.

### LinkedIn (rascunho local; não publicar)

1. Apresentar a intuição de continuar uma tendência visual.
2. Explicar o último degrau e a média terminal.
3. Delimitar a conclusão ao modelo e deixar o link pendente.

## 6. Rascunhos dos posts — inglês

### Email

**Subject:** What does a regression tree predict past its last data point?

Ten observations generally rise as the input increases, with small variations along the way. What happens when we move farther right than the last observed input?

A small conventional regression tree returns the average stored in its rightmost leaf: `6.65`. It predicts that value at the last observed input and beyond it. The model's flat tail does not tell us whether the real outcome will keep rising.

The Aflora draft lets you move an input directly along the graph and watch where the tree's prediction stops changing. [Article link pending publication]

### LinkedIn

A rising set of observations invites us to imagine what comes next. A conventional regression tree with mean-valued leaves does something more specific: every input beyond its last split reaches the same terminal leaf.

In a small example with ten training points, that final leaf predicts `6.65`. Moving farther past the observed x values leaves the prediction there. The flat segment can begin before the edge of the data because the leaf, rather than the edge, creates it.

That is a property of this model, not proof that the real relationship is flat. The Aflora article draft uses one slider to make the difference visible. [Article link pending publication]

## Technical sources and review checks

- [scikit-learn decision-tree user guide](https://scikit-learn.org/stable/modules/tree.html): piecewise-constant regression and mean-valued leaves under squared error.
- [Quinlan, *Learning with Continuous Classes* (1992)](https://sci2s.ugr.es/keel/pdf/algorithm/congreso/1992-Quinlan-AI.pdf): linear models in leaves as a scoped exception.
- A test recomputes greedy squared-error splits and terminal means from the fixed observations. There is no invented continuation line or claim that the observed rising pattern must persist.
