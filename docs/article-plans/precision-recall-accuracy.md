# Historical preparation: Precision, Recall, and Accuracy — Seeing What Classification Metrics Actually Measure

Article ID in current content collection: `is-my-model-good`
Source Library filename: `Pasted text(20261010-170122).txt`
Source SHA-256: `7de48aaa19fd53299630d78eb42e4fff2607b768706d0b1c5b640fcd7216d88f`
Coverage: Scope, structure, visual notes, and first draft.

This is historical editorial evidence, not approval to publish or revise the existing article. The source begins after the marker below and is preserved byte for byte. The preface and review note are separate from the source.

**Review note:** The historical source includes a specificity scope inconsistency and a question about four quantities overall versus per prediction circle. Its first draft also contains generic Portuguese instructions in prose. Review these separately; the source below is unchanged.

<!-- ORIGINAL SOURCE START — all following bytes are unchanged -->
# 1. Tópico

- **Título provisório:** *Precision, Recall, and Accuracy — Seeing What Classification Metrics Actually Measure*
- **Pergunta ou ideia central:** Como diferentes métricas de classificação avaliam aspectos diferentes exatamente das mesmas previsões?
- **Por que este tema merece um artigo:** Precisão, recall, acurácia, sensibilidade e especificidade costumam ser aprendidas como fórmulas sobre TP, FP, FN e TN. Uma representação visual permite enxergar diretamente o que cada métrica conta, o que ela ignora e por que um modelo pode parecer excelente segundo uma métrica e ruim segundo outra.

# 2. Learning Scope

- **Tema central:**
    - Métricas de avaliação para classificação binária.
    - Relação entre classe real, classe prevista e os quatro possíveis resultados de uma classificação.
- **Objetivo principal de aprendizagem:**
    - Desenvolver uma intuição visual de **precision, recall, accuracy, sensitivity e specificity**, permitindo que o leitor interprete cada métrica sem depender da memorização de fórmulas.
    - Entender que cada métrica responde a uma **pergunta diferente sobre os mesmos TP, FP, FN e TN**.
    - Ser capaz de prever como mover pontos entre as classes previstas altera cada métrica.
- **Persona:**
    - Leitor que entende o conceito básico de classificação binária.
    - Sabe que um modelo produz previsões positivas ou negativas.
    - Já encontrou termos como precision, recall e accuracy, mas ainda os confunde ou depende das fórmulas para interpretá-los.
    - Não precisa conhecer estatística avançada ou detalhes de treinamento de classificadores.
- **Conceitos de apoio:**
    - Classe positiva e classe negativa.
    - Classe real versus classe prevista.
    - True Positive.
    - False Positive.
    - True Negative.
    - False Negative.
    - Confusion matrix.
    - Precision.
    - Recall.
    - Sensitivity.
    - Specificity.
    - Accuracy.
    - Class imbalance.
    - Prevalência da classe positiva.
    - Trade-off entre falsos positivos e falsos negativos.
    - Diferença entre perguntar **“entre os positivos previstos, quantos estavam corretos?”** e **“entre os positivos reais, quantos encontramos?”**.
- **Limites de escopo:**
    - Não explicar algoritmos de classificação.
    - Não explicar como o modelo é treinado.
    - Não aprofundar probability calibration.
    - Não aprofundar escolha ou otimização de decision thresholds.
    - Não cobrir ROC curves ou AUC.
    - Não cobrir Precision-Recall curves.
    - Não aprofundar F1, F-beta ou outras métricas compostas.
    - Não tratar classificação multiclasse.
    - Não entrar em inferência estatística ou intervalos de confiança das métricas.

# 3. Estrutura de Aprendizagem

- **Orientar → Observar → Explicar → Generalizar**

# Meu modelo está bom?

[Relembrar que aprendizado supervisionado pode assumir diferentes formatos de previsão. Apresentar exemplos simples:

- regressão → prever o preço de uma casa;
- classificação binária → prever se um paciente possui ou não uma doença;
- classificação multiclasse → identificar qual objeto aparece em uma imagem;
- count regression → prever quantas chamadas um call center receberá;
- ranking → ordenar resultados de busca por relevância.]

[Explicar que, como a natureza da previsão muda, também muda a forma como avaliamos se o modelo está fazendo um bom trabalho.]

[Apresentar algumas métricas clássicas apenas como exemplos:

- regressão → MSE / MAE;
- classificação → accuracy;
- ranking → NDCG.

Enfatizar que nenhum desses problemas possui uma única métrica universal. Existem várias métricas porque elas medem aspectos diferentes do comportamento de um modelo.]

[Explicar que o artigo será sobre classificação binária.]

[Introduzir o visual central do artigo. Existem pontos realmente verdes e realmente vermelhos. Um classificador recebe esses pontos e os joga em um de dois círculos:

- círculo verde → o modelo disse que o exemplo é positivo;
- círculo vermelho → o modelo disse que o exemplo é negativo.

A cor do ponto representa o que ele realmente é. O círculo representa o que o modelo disse que ele era.]

[IMAGEM: modelo recebendo uma sequência de pontos e separando-os entre os dois círculos.]

[Mostrar que a primeira métrica intuitiva seria simplesmente perguntar quantos pontos foram colocados no círculo correto.]

[

Accuracy =

\frac{\text{classificações corretas}}

{\text{todas as classificações}}

]

[Explicar que isso responde a uma pergunta útil: "Com que frequência o modelo acerta?".]

[Mas introduzir a questão central do artigo: às vezes não queremos apenas saber quantas vezes o modelo acertou. Queremos saber **como ele está errando**.]

[Apresentar as duas perguntas que guiarão todo o artigo:

**Precision:** entre os exemplos que eu **disse** que eram positivos, quantos realmente eram positivos?

**Recall:** entre os exemplos que **realmente eram** positivos, quantos eu consegui identificar como positivos?]

[Não aprofundar ainda nas fórmulas. Primeiro mostrar por que essas duas perguntas existem.]

[Explicar que ROC, AUC, F1, PR-AUC, specificity e outras métricas existem, mas estão fora do escopo deste artigo.]

---

# Quando deixar um caso passar é perigoso

[Imagine um exame usado para fazer triagem de câncer.]

[Cada paciente será representado por um ponto.

- verde → paciente possui câncer;
- vermelho → paciente não possui câncer.]

[O modelo recebe informações sobre o paciente e produz uma decisão simples:

- círculo verde → investigar o paciente;
- círculo vermelho → não investigar.]

[IMAGEM: reutilizar exatamente o visual central com pacientes sendo classificados.]

[Apresentar dois tipos de erro sem ainda utilizar TP, FP, FN ou TN.]

[Erro 1: uma pessoa saudável é enviada para investigação adicional.]

[Ela pode precisar realizar outro exame, gastar tempo e passar por preocupação desnecessária. Isso tem um custo.]

[Erro 2: uma pessoa que realmente possui câncer é classificada como saudável.]

[Essa pessoa pode deixar o sistema sem investigação adicional.]

[Explicar que os dois erros são ruins, mas que em um sistema de **screening** existe normalmente uma assimetria clara: deixar um caso real passar pode ser muito mais grave.]

[Portanto, podemos aceitar que alguns pontos vermelhos caiam no círculo verde se isso nos ajudar a evitar que pontos verdes escapem para o círculo vermelho.]

[VISUAL: mover progressivamente o limite do classificador. Mostrar mais pontos vermelhos entrando no círculo verde, mas cada vez menos pontos verdes ficando no círculo vermelho.]

[Destacar visualmente todos os pontos realmente verdes, independentemente do círculo em que estão.]

[Agora formular a pergunta natural:

> De todos os pacientes que realmente possuem câncer, quantos nós conseguimos detectar?]
> 

[Introduzir que essa pergunta recebe o nome de **recall** — ou sensibilidade nesse contexto.]

[

Recall =

\frac{\text{verdes no círculo verde}}

{\text{todos os pontos realmente verdes}}

]

[Mostrar visualmente o denominador: os pontos verdes existentes nos **dois círculos**.]

[Mostrar visualmente o numerador: apenas os pontos verdes que chegaram ao círculo verde.]

[Construir a intuição central:

> Recall começa olhando para a realidade: quais pontos são realmente positivos?]
> 

[Mostrar um classificador de alto recall, mesmo que alguns pontos vermelhos também tenham sido enviados para o círculo verde.]

[Explicar que alto recall não significa necessariamente um bom modelo. Significa apenas que poucos positivos reais foram perdidos.]

---

# Quando acusar exige certeza

[Agora trocar completamente o problema.]

[Imagine um filtro de e-mail que pode mandar automaticamente mensagens consideradas spam para uma área de quarentena ou removê-las.]

[Cada e-mail novamente será um ponto:

- verde → realmente é spam;
- vermelho → realmente é um e-mail legítimo.]

[O classificador decide:

- círculo verde → classificado como spam;
- círculo vermelho → classificado como legítimo.]

[IMAGEM: utilizar exatamente o mesmo mecanismo visual do capítulo anterior.]

[Novamente apresentar os dois erros.]

[Erro 1: um spam é classificado como legítimo.]

[Um e-mail indesejado chega à caixa de entrada. É irritante, mas normalmente recuperável.]

[Erro 2: um e-mail legítimo é classificado como spam.]

[Uma mensagem importante pode deixar de ser vista ou ser removida.]

[Mostrar que agora a assimetria aponta na direção contrária.]

[Podemos aceitar deixar alguns spams passarem se, em troca, praticamente nunca classificarmos uma mensagem legítima como spam.]

[VISUAL: tornar o modelo progressivamente mais conservador. O círculo verde recebe menos pontos, mas quase todos eles são realmente verdes.]

[Destacar somente o conteúdo do círculo que o modelo chamou de positivo.]

[Formular a nova pergunta:

> Das mensagens que o modelo chamou de spam, quantas realmente eram spam?]
> 

[Introduzir **precision**.]

[

Precision =

\frac{\text{verdes no círculo verde}}

{\text{todos os pontos no círculo verde}}

]

[Construir visualmente o denominador: somente os pontos existentes dentro do círculo verde.]

[Construir o numerador: os que, além de estarem ali, realmente são verdes.]

[Construir a segunda intuição central:

> Precision começa olhando para a afirmação do modelo: quais pontos ele disse que eram positivos?]
> 

[Contrastar diretamente os dois capítulos:

**Recall:** olhar para todos os verdes e perguntar quantos encontramos.

**Precision:** olhar para tudo que chamamos de verde e perguntar quantos realmente eram verdes.]

[VISUAL LADO A LADO igual ao da imagem principal:

Precision → destacar o círculo previsto como verde.

Recall → destacar os pontos realmente verdes espalhados pelos dois círculos.]

---

# Cenários

[Agora remover completamente o contexto de câncer e spam.]

[Voltar ao problema abstrato de bolinhas verdes e vermelhas.]

[Explicar que cada configuração abaixo representa exatamente o resultado de algum classificador.]

[Introduzir também accuracy para permitir que as três métricas sejam comparadas.]

## Cenário 1 — Accuracy alta pode esconder um modelo ruim

[Mostrar 100 pontos:

- 5 realmente verdes;
- 95 realmente vermelhos.

Resultado:

- círculo verde: 1 verde + 1 vermelho;
- círculo vermelho: 4 verdes + 94 vermelhos.]

[

Accuracy = 95%

]

[

Precision = 50%

]

[

Recall = 20%

]

[Mostrar que "95% de accuracy" parece excelente isoladamente.]

[Mas o modelo encontrou apenas 1 de 5 positivos.]

[Usar este cenário para mostrar por que datasets desbalanceados tornam accuracy especialmente enganosa.]

---

## Cenário 2 — Precision perfeita, recall muito baixo

[Mostrar:

- 10 verdes;
- 90 vermelhos.

Resultado:

- círculo verde: 2 verdes;
- círculo vermelho: 8 verdes + 90 vermelhos.]

[

Accuracy = 92%

]

[

Precision = 100%

]

[

Recall = 20%

]

[Interpretação visual:

Toda vez que o modelo diz "verde", ele está certo.

Mas ele quase nunca diz "verde".]

[Destacar que um modelo pode conseguir precision perfeita simplesmente sendo extremamente conservador.]

---

## Cenário 3 — Recall perfeito, precision baixa

[Mesma distribuição:

- 10 verdes;
- 90 vermelhos.

Resultado:

- círculo verde: 10 verdes + 30 vermelhos;
- círculo vermelho: 60 vermelhos.]

[

Accuracy = 70%

]

[

Precision = 25%

]

[

Recall = 100%

]

[Interpretação:

Nenhum ponto verde escapou.

Mas a maioria dos pontos que receberam a classificação positiva era, na verdade, vermelha.]

[Destacar que um modelo pode conseguir recall perfeito simplesmente classificando muitos exemplos como positivos.]

---

## Cenário 4 — Um modelo equilibrado

[Mostrar uma população balanceada:

- 50 verdes;
- 50 vermelhos.

Resultado:

- círculo verde: 45 verdes + 5 vermelhos;
- círculo vermelho: 5 verdes + 45 vermelhos.]

[

Accuracy = 90%

]

[

Precision = 90%

]

[

Recall = 90%

]

[Usar como referência visual para um modelo cujo comportamento é relativamente simétrico.]

---

## Cenário 5 — Mesma accuracy, comportamentos completamente diferentes

[Apresentar dois classificadores lado a lado sobre os mesmos 100 pontos: 50 verdes e 50 vermelhos.]

### Modelo A

- círculo verde: 30 verdes;
- círculo vermelho: 20 verdes + 50 vermelhos.

[

Accuracy = 80%

]

[

Precision = 100%

]

[

Recall = 60%

]

### Modelo B

- círculo verde: 50 verdes + 20 vermelhos;
- círculo vermelho: 30 vermelhos.

[

Accuracy = 80%

]

[

Precision \approx 71%

]

[

Recall = 100%

]

[Destacar a conclusão:

Os dois modelos possuem exatamente a mesma accuracy.

Mas um é extremamente conservador e o outro extremamente agressivo ao prever a classe positiva.]

[Conectar novamente aos exemplos anteriores:

- dependendo do problema, o Modelo A pode ser preferível;
- dependendo do problema, o Modelo B pode ser preferível.]

[Concluir que uma métrica não descreve "a qualidade do modelo" de maneira absoluta. Ela descreve uma propriedade específica do comportamento dele.]

---

# Explore você mesmo

[Apresentar um playground utilizando exatamente os dois círculos do restante do artigo.]

[Explicar que o leitor agora controla diretamente o resultado de uma classificação.]

[Cada círculo deve permitir definir quatro quantidades através de sliders ou inputs:]

**Círculo classificado como verde**

- quantidade de pontos realmente verdes;
- quantidade de pontos realmente vermelhos.

**Círculo classificado como vermelho**

- quantidade de pontos realmente verdes;
- quantidade de pontos realmente vermelhos.

[Os pontos devem aparecer ou desaparecer imediatamente conforme os valores são alterados.]

[Calcular automaticamente:]

[

Accuracy

]

[

Precision

]

[

Recall

]

[Mostrar ao lado de cada métrica sua interpretação visual.]

**Precision**

Destacar somente o círculo previsto como verde.

> Dos pontos que eu disse que eram verdes, quantos realmente eram verdes?
> 

**Recall**

Diminuir visualmente a intensidade dos pontos vermelhos e destacar todos os pontos realmente verdes nos dois círculos.

> Dos pontos que realmente eram verdes, quantos eu disse que eram verdes?
> 

**Accuracy**

Destacar os pontos que estão no círculo correspondente à própria classe.

> De todos os pontos, quantos foram classificados corretamente?
> 

[Adicionar alguns presets que o leitor pode selecionar:

- High accuracy, low recall;
- High precision, low recall;
- High recall, low precision;
- Balanced;
- Predict almost everything positive;
- Predict almost everything negative.]

[Permitir também que o usuário construa qualquer distribuição manualmente.]

[Depois da exploração, introduzir uma última ideia importante: **positive não é uma propriedade especial da classe verde**.]

[Explicar que escolhemos verde como "positive" apenas para manter a explicação consistente.]

[Poderíamos inverter completamente o problema e declarar vermelho como a classe positiva.]

[Nesse caso, poderíamos novamente perguntar:]

> Dos pontos que eu disse que eram vermelhos, quantos realmente eram vermelhos?
> 

[Isso seria precision calculada para a classe vermelha.]

> Dos pontos que realmente eram vermelhos, quantos eu consegui classificar como vermelhos?
> 

[Isso seria recall calculado para a classe vermelha.]

[Opcionalmente permitir no playground um botão:

**Positive class: Green / Red**

Ao alterná-lo, nenhuma bolinha muda de lugar. Apenas muda a classe a partir da qual precision e recall são calculados.]

[Usar essa interação para estabelecer uma conclusão importante:

> Precision e recall não pertencem ao modelo como um único número universal. Elas são calculadas em relação à classe que estamos tratando como positiva.]
> 

[Sem aprofundar excessivamente, mencionar que quando verde é tratado como positivo:

- recall dos verdes é frequentemente chamado de sensitivity;
- recall dos vermelhos corresponde ao que normalmente chamamos de specificity.]

[Finalizar recuperando as duas perguntas que devem permanecer na cabeça do leitor:]

> **Precision:** entre aquilo que eu **disse** que era positivo, quanto eu acertei?
> 

> **Recall:** entre aquilo que **realmente era** positivo, quanto eu encontrei?
> 

[Concluir que escolher entre elas não é uma decisão puramente matemática. Depende de qual tipo de erro é mais caro no problema real.]

# 4. Visuais e Interações

- **contexto → mudança ou problema → evidência → conclusão ou ação**
- **escolha o gráfico certo → remova o que não ajuda → destaque o que importa.**
- **Uma boa visualização não mostra tudo que você sabe; ela torna difícil não perceber aquilo que importa.**

# 5. Primeiro Rascunho

```
# Is My Model Good?

Supervised learning can take several different forms depending on what we want a model to predict.

A regression model might predict the price of a house. A binary classifier might predict whether a patient has a disease. A multiclass classifier might identify which object appears in an image. A count regression model might estimate how many calls a call center will receive tomorrow, while a ranking model might decide which search results should appear first.

Because the nature of these predictions changes, the way we evaluate them changes as well.

For regression, metrics such as Mean Squared Error (MSE) and Mean Absolute Error (MAE) measure how far predictions are from the actual values. For classification, accuracy is one common choice. Ranking systems are often evaluated with metrics such as NDCG.

These are only examples. None of these problems has a single universal metric that completely describes whether a model is good. Different metrics exist because they measure different aspects of a model's behavior.

In this article, we will focus on binary classification.

To make the problem visual, we will represent every datapoint as a dot. The dot could correspond to very different kinds of data: a piece of text being classified by emotion, one row of a tabular dataset containing several features about a customer, or an image being classified according to whether it contains a particular object.

The classifier does not actually see a green or red dot. It sees the datapoint and its features and must predict which of two classes it belongs to. Before making that prediction, you can think of the dot as effectively gray: its class is unknown to the model.

Because we are evaluating the classifier on labeled test data, however, **we** know the true class afterward. We will therefore color each dot green or red to show what it really was. The colors exist for us to evaluate the predictions, not as information given to the model.

Now imagine that our test set contains green and red dots. The classifier receives each datapoint and places it into one of two circles:

* the green circle means the model predicted **positive**;
* the red circle means the model predicted **negative**.

The color of the dot represents its true class. The circle represents the model's prediction.

[IMAGEM: modelo recebendo uma sequência de pontos e separando-os entre os dois círculos.]

The most immediate way to evaluate this classifier is simply to count how often the point ended up in the correct circle.

[
\text{Accuracy}
===============

\frac{\text{correct classifications}}
{\text{all classifications}}
]

If a green point lands in the green circle, the model was correct. If a red point lands in the red circle, it was also correct.

Accuracy therefore answers a useful question:

**How often is the model right?**

However, knowing how often a model is right does not tell us everything we may care about. In many applications, we also need to understand **how the model is wrong**.

Two questions will guide the rest of this article.

**Precision:** among the examples I **said** were positive, how many actually were positive?

**Recall:** among the examples that **really were** positive, how many did I successfully identify as positive?

These questions may initially sound similar, but they inspect the same predictions from two very different directions.

Before looking at their formulas, it is more useful to understand why we would want to ask them in the first place.

Metrics such as ROC-AUC, F1, PR-AUC, specificity, and many others offer additional ways to evaluate classifiers. We will leave most of them aside here and focus on building a clear intuition for accuracy, precision, and recall.

---

# When Missing a Case Is Dangerous

Imagine a medical test used for cancer screening.

Each patient is represented by one point:

* green means the patient actually has cancer;
* red means the patient does not.

The classifier uses information about the patient and makes a simple decision:

* green circle → investigate the patient further;
* red circle → do not investigate further.

[IMAGEM: reutilizar exatamente o visual central com pacientes sendo classificados.]

There are two ways this classifier can make a mistake.

The first is sending a healthy patient for further investigation.

That patient may need another test, spend additional time in the healthcare system, and experience unnecessary worry. This error clearly has a cost.

The second error is more serious: a patient who actually has cancer is classified as healthy.

That patient may leave the screening process without receiving the additional investigation they needed.

Both mistakes matter, but screening systems usually have a clear asymmetry between them. Missing a real case can be considerably more costly than investigating someone who eventually turns out to be healthy.

Because of that, we might deliberately tolerate some red points entering the green circle if doing so prevents green points from escaping into the red circle.

[VISUAL: mover progressivamente o limite do classificador. Mostrar mais pontos vermelhos entrando no círculo verde, mas cada vez menos pontos verdes ficando no círculo vermelho.]

Now ignore the red points for a moment and highlight every patient who actually has cancer, regardless of which circle the classifier placed them in.

This leads naturally to the question we care about:

> Of all the patients who actually have cancer, how many did we detect?

This quantity is called **recall**, also commonly called **sensitivity** in medical contexts.

[
\text{Recall}
=============

\frac{\text{green points in the green circle}}
{\text{all actually green points}}
]

The denominator includes every green point in the dataset. Some may be in the green circle and some may be in the red circle.

The numerator keeps only the green points that the classifier successfully sent to the green circle.

Visually, recall begins from **reality**.

Before looking at what the model predicted, we first ask: *Which points are actually positive?* Then we measure how many of those points the classifier found.

A classifier can therefore have high recall even when some red points are also being sent to the green circle. If almost every genuinely green point is captured, recall will be high.

This does not mean the classifier is necessarily good overall. High recall tells us something more specific: **few actual positives were missed**.

---

# When an Accusation Requires Confidence

Now consider a completely different problem.

Suppose an email filter can automatically send messages classified as spam to a quarantine area or remove them from the main inbox.

Again, every email is represented by one point:

* green → actually spam;
* red → actually legitimate.

The classifier decides:

* green circle → classified as spam;
* red circle → classified as legitimate.

[IMAGEM: utilizar exatamente o mesmo mecanismo visual do capítulo anterior.]

Once again, there are two kinds of mistakes.

The first occurs when a spam message is classified as legitimate. An unwanted email reaches the inbox. This is annoying, but usually recoverable.

The second occurs when a legitimate message is classified as spam. An important email may never be seen or may even be removed.

The asymmetry now points in the opposite direction.

We may prefer to let some spam through if doing so means that almost nothing classified as spam is actually a legitimate message.

In visual terms, the classifier becomes more conservative about placing points in the green circle.

[VISUAL: tornar o modelo progressivamente mais conservador. O círculo verde recebe menos pontos, mas quase todos eles são realmente verdes.]

Instead of highlighting all genuinely green points, now look only at the contents of the circle that the model labeled positive.

The relevant question becomes:

> Of the messages the model called spam, how many were actually spam?

This is **precision**.

[
\text{Precision}
================

\frac{\text{green points in the green circle}}
{\text{all points in the green circle}}
]

The denominator is now determined entirely by the model's predictions. We look at everything inside the predicted-positive circle, whether the points themselves are green or red.

The numerator keeps only the points that really are green.

Precision therefore begins from **the model's claim**.

We first ask: *Which points did the classifier say were positive?* Then we inspect how often that claim was correct.

This gives us the central distinction between precision and recall:

**Recall:** look at all the green points and ask how many we found.

**Precision:** look at everything we called green and ask how much of it really was green.

[VISUAL LADO A LADO igual ao da imagem principal:

Precision → destacar o círculo previsto como verde.

Recall → destacar os pontos realmente verdes espalhados pelos dois círculos.]

The numerator happens to be the same in both metrics: green points correctly placed in the green circle.

What changes is the denominator, and therefore the question we are asking.

---

# Scenarios

We can now remove cancer, patients, email, and spam completely.

All we need are green and red points and the two circles.

Every arrangement below could be the result produced by some binary classifier.

The four possible combinations also correspond to the familiar confusion-matrix terms:

* a green point in the green circle is a **true positive**;
* a red point in the green circle is a **false positive**;
* a green point in the red circle is a **false negative**;
* a red point in the red circle is a **true negative**.

We will compare precision and recall with accuracy, which measures the fraction of all points that were placed in the correct circle.

## Scenario 1 — High Accuracy Can Hide a Poor Model

Consider 100 points:

* 5 are actually green;
* 95 are actually red.

The classifier produces:

* green circle: 1 green + 1 red;
* red circle: 4 green + 94 red.

[
\text{Accuracy}=95%
]

[
\text{Precision}=50%
]

[
\text{Recall}=20%
]

If we looked only at the statement **95% accuracy**, this classifier might sound excellent.

Yet among the five genuinely green points, it found only one.

The high accuracy comes largely from the fact that red points dominate the dataset. Correctly classifying 94 of the 95 red points is enough to make the overall accuracy look impressive even though the classifier performs poorly on the rare positive class.

This is one reason accuracy can become especially misleading on imbalanced datasets. The prevalence of each class affects how much each type of correct prediction contributes to the final number.

---

## Scenario 2 — Perfect Precision, Very Low Recall

Now suppose we have:

* 10 green points;
* 90 red points.

The classifier produces:

* green circle: 2 green;
* red circle: 8 green + 90 red.

[
\text{Accuracy}=92%
]

[
\text{Precision}=100%
]

[
\text{Recall}=20%
]

Every time this classifier says **green**, it is right.

There are no red points in the green circle, so its precision is perfect.

However, the classifier almost never predicts green. It identifies only 2 of the 10 genuinely green points, giving it a recall of only 20%.

Perfect precision can therefore be achieved by behaving very conservatively: make very few positive predictions, but make them only when the model is highly confident.

The price is that many actual positives may be missed.

---

## Scenario 3 — Perfect Recall, Low Precision

Keep the same class distribution:

* 10 green points;
* 90 red points.

This time the classifier produces:

* green circle: 10 green + 30 red;
* red circle: 60 red.

[
\text{Accuracy}=70%
]

[
\text{Precision}=25%
]

[
\text{Recall}=100%
]

Now no green point escapes.

Every genuinely green example is inside the green circle, which gives us perfect recall.

But the model also classified 30 red points as positive. Among the 40 points it called green, only 10 really were green.

The classifier therefore finds every positive at the cost of producing many false alarms.

Just as precision can be increased by being conservative, recall can be pushed toward 100% by becoming increasingly aggressive about predicting the positive class.

---

## Scenario 4 — A Balanced Model

Now consider a balanced population:

* 50 green points;
* 50 red points.

The classifier produces:

* green circle: 45 green + 5 red;
* red circle: 5 green + 45 red.

[
\text{Accuracy}=90%
]

[
\text{Precision}=90%
]

[
\text{Recall}=90%
]

This classifier behaves symmetrically.

It correctly identifies 45 of the 50 green points while making only five incorrect positive predictions. It also correctly classifies 45 of the 50 red points.

In this particular configuration, accuracy, precision, and recall happen to have the same value. That is a consequence of the balanced class distribution and symmetric errors, not a general relationship between the metrics.

---

## Scenario 5 — Same Accuracy, Completely Different Behavior

Finally, consider two classifiers evaluated on exactly the same 100 points:

* 50 green;
* 50 red.

Both classifiers achieve the same accuracy.

### Model A

* green circle: 30 green;
* red circle: 20 green + 50 red.

[
\text{Accuracy}=80%
]

[
\text{Precision}=100%
]

[
\text{Recall}=60%
]

Model A is extremely conservative.

Whenever it predicts green, it is correct. However, it leaves 20 genuinely green points in the red circle.

### Model B

* green circle: 50 green + 20 red;
* red circle: 30 red.

[
\text{Accuracy}=80%
]

[
\text{Precision}\approx71%
]

[
\text{Recall}=100%
]

Model B behaves in almost the opposite way.

It captures every green point, but it also sends 20 red points into the green circle.

Both models are correct on 80 of the 100 observations, so their accuracy is exactly the same. Yet their behavior is clearly different.

Model A avoids false positive predictions at the cost of missing some actual positives. Model B avoids missing positives at the cost of producing more false alarms.

Depending on the real problem, either behavior could be preferable.

For something similar to the spam-filter example, we might prefer Model A's caution. For something similar to cancer screening, Model B's ability to capture every positive might matter more.

This is why a metric should not be interpreted as an absolute description of **model quality**. Each metric summarizes a particular property of the classifier's behavior.

---

# Explore It Yourself

We can make these relationships easier to see by directly controlling the contents of the two circles.

[Apresentar um playground utilizando exatamente os dois círculos do restante do artigo.]

Instead of changing a classifier or its training process, you control its final predictions directly.

[Explicar que o leitor agora controla diretamente o resultado de uma classificação.]

Each circle should allow four quantities to be manipulated:

**Predicted green circle**

* number of actually green points;
* number of actually red points.

**Predicted red circle**

* number of actually green points;
* number of actually red points.

[Os pontos devem aparecer ou desaparecer imediatamente conforme os valores são alterados.]

From those four numbers, the playground can calculate all three metrics automatically.

[
\text{Accuracy}
]

[
\text{Precision}
]

[
\text{Recall}
]

The important part is not merely seeing the numbers change, but seeing which points each metric pays attention to.

For **precision**, highlight only the predicted-green circle.

> Of the points I said were green, how many really were green?

For **recall**, fade the red points and highlight every actually green point across both circles.

> Of the points that really were green, how many did I say were green?

For **accuracy**, highlight every point whose actual color agrees with the circle containing it.

> Of all the points, how many were classified correctly?

[Adicionar alguns presets que o leitor pode selecionar:

* High accuracy, low recall;
* High precision, low recall;
* High recall, low precision;
* Balanced;
* Predict almost everything positive;
* Predict almost everything negative.]

[Permitir também que o usuário construa qualquer distribuição manualmente.]

After experimenting with the distributions, there is one final detail worth making explicit.

There is nothing inherently special about green being the **positive** class.

We chose green as positive simply to keep the visual language consistent throughout the article. We could reverse the definition and declare red to be the positive class instead.

The points would not move. The classifier would not change. Only the perspective from which we calculate precision and recall would change.

We could then ask:

> Of the points I said were red, how many really were red?

That would be precision for the red class.

Or:

> Of the points that really were red, how many did I correctly classify as red?

That would be recall for the red class.

[Opcionalmente permitir no playground um botão:

**Positive class: Green / Red**

Ao alterná-lo, nenhuma bolinha muda de lugar. Apenas muda a classe a partir da qual precision e recall são calculados.]

This reveals an important property of both metrics:

> Precision and recall are not single universal numbers that belong to a classifier independently of how we define the task. They are calculated relative to whichever class we choose to treat as positive.

When green is the positive class, recall for green is often called **sensitivity**.

The corresponding ability to correctly identify red examples—the recall of the negative class—is what is usually called **specificity**:

[
\text{Specificity}
==================

\frac{\text{red points in the red circle}}
{\text{all actually red points}}
]

The terminology is useful, but the visual logic remains exactly the same.

The two questions worth remembering are simpler than the formulas:

> **Precision:** among what I **said** was positive, how much did I get right?

> **Recall:** among what **really was** positive, how much did I find?

Neither is universally more important.

The appropriate metric depends on what the classifier is being used for and, especially, on which kind of error is more costly in the real problem.

```