# Encoding categorical variables: what can a tree learn from a name?

## Introdução

In the earlier articles on [classification trees](https://aflora.page/learn/decision-trees) and [regression trees](https://aflora.page/learn/regression-trees), each node asked a question that divided the training records into groups. Training searched for questions that improved a prediction criterion, such as reducing class impurity or squared error. With a numerical feature, the question could take the familiar form

$$x_j\leq t,$$

where $x_j$ is the value of one feature and $t$ is a threshold. A measurement has an order, so the tree can move a threshold along that order and compare the resulting groups.

Now suppose the feature contains names: a species, a shop, or a product family. We can assign numbers to those names, but the numbers do not automatically express a useful relationship. Putting Cedro before Jacarandá is a choice of representation, and that choice changes which groups a numerical threshold can create.

Some categories do have an order worth preserving. Small, medium, and large are different from arbitrary species names. The question is which relationships belong to the variable, which ones we introduce through encoding, and which ones the next model can use.

We will follow ten entirely fictitious seed records. The target, `germinated`, is 1 when germination occurred and 0 otherwise. The species names are teaching labels: the outcomes and specimen sizes below make no botanical claims about those species.

| Record | Species | Specimen size | Germinated |
| --- | --- | --- | --- |
| 1 | Ipê | Small | 1 |
| 2 | Cedro | Large | 0 |
| 3 | Ipê | Medium | 1 |
| 4 | Jacarandá | Large | 1 |
| 5 | Cedro | Small | 0 |
| 6 | Ipê | Large | 1 |
| 7 | Acácia | Medium | 0 |
| 8 | Jacarandá | Medium | 1 |
| 9 | Cedro | Medium | 0 |
| 10 | Ipê | Small | 0 |

To keep the equations readable, let **A = Ipê**, **B = Cedro**, **C = Jacarandá**, and **D = Acácia**. There are $n=10$ records and $K=4$ categories. If $n_c$ counts records in category $c$ and $S_c$ sums their targets, the summaries are

$$(n_A,S_A)=(4,3),\quad(n_B,S_B)=(3,0),\quad(n_C,S_C)=(2,2),\quad(n_D,S_D)=(1,0).$$

Five seeds germinated, giving a global target mean $p=0.5$. Ipê and Jacarandá contain all five positive outcomes. Could a tree put those two species on one side and Cedro and Acácia on the other **in a single node**?

The answer depends on both the representation and the tree's splitting algorithm. We will return to the same grouping, $AC\mid BD$, as we change what the model receives.

Our route has four families. Target-free encodings construct values without consulting $y$. Supervised encodings summarize observed relationships with $y$. Learned representations fit vectors through an objective. Native categorical handling moves the treatment of categories inside tree training. The first three families can serve models beyond trees; the fourth describes how particular trees work.

These are explanatory categories with overlaps. An embedding can be supervised, and a library with native categorical support can calculate target statistics internally. What matters is where the representation comes from and how it enters the prediction process.

[IMAGEM: grade 2×2 com as quatro famílias. Mostrar, respectivamente, categoria → indicadores/código; categoria + targets de referência → estatística; categoria → vetor aprendido; categoria → ramos do nó. Objetivo: distinguir de onde vem a representação e onde ocorre a transformação. Manter a mesma categoria nos quatro quadrantes, setas simples e uma legenda sobre as sobreposições.]
Codificações sem target
[Explicar que “sem target” não significa “sem ajuste”: vocabulário, frequências e protótipos podem ser obtidos dos dados. No cenário indutivo habitual, ajustá-los no treino e reaplicá-los à validação. Organizar a família em três ideias: representar identidade, representar prevalência e representar semelhança textual.]
Ordinal e códigos inteiros
[Explicar $z(c)=r(c)$: cada categoria recebe um inteiro. Começar pela ordem legítima pequeno → 0, médio → 1, grande → 2; contrastar com os IDs arbitrários A → 0, B → 1, C → 2, D → 3. Distinguir o nome informal “label encoding” de LabelEncoder, destinado ao target no scikit-learn; para features, citar OrdinalEncoder.]

## Codificações sem target

An encoder can avoid the target and still need fitting. A vocabulary, a category frequency, or a set of representative strings can all come from the data. In the usual setting where we predict records not available during training, learn these resources from the training portion and reuse them on validation data.

Within this family, we can preserve identity, describe prevalence, or exploit resemblance between strings. Those choices provide different information even when each produces a numerical table.

[PLAYGROUND 1 — SEM TARGET: posicionar um único componente no começo da família e referenciá-lo ao longo dos métodos. À esquerda, o recorte relevante da tabela; à direita, a representação resultante. Seletor com ordinal, one-hot, dummy, binary, base-N, hashing, count, frequency e similarity. Abrir em one-hot. Cada estado inclui o exemplo visual acima, uma equação curta e uma legenda sobre o que passou a ser preservado ou perdido. A troca de estado só revela tabelas e marcações predefinidas.]

### Ordinal e códigos inteiros

Start with the specimen size. Assigning Small → 0, Medium → 1, and Large → 2 preserves a meaningful order. A threshold at 0.5 separates small specimens from the other two sizes; a threshold at 1.5 separates small and medium specimens from large ones. Neither choice requires the target to increase monotonically with size. Different nodes can use different cuts along the same legitimate order.

For species, we could instead assign A → 0, B → 1, C → 2, and D → 3. In either case, the mapping has the form

$$z(c)=r(c),$$

where $r(c)$ is the assigned integer. The difference is what that integer means. The size code preserves an existing order; the species code invents one.

With species ordered A, B, C, D, a threshold at 1.5 creates $AB\mid CD$. No single threshold produces $AC\mid BD$, because A and C are separated by B along the number line.

[VISUALIZAÇÃO NO PLAYGROUND: alinhar A, B, C e D nos códigos 0, 1, 2 e 3 e marcar o limiar 1,5, que produz AB | CD. Destacar que AC | BD não cabe em um único limiar nessa ordem. Explicar que a árvore usa a ordenação dos códigos; ela não presume que código 2 tenha “o dobro do efeito” de código 1.]

A threshold tree uses the order of these codes. It does not infer that code 2 has twice the effect of code 1. Even so, the imposed order restricts the groups available at one node and can require extra depth. Linear and distance-based models can impose additional relationships through the numerical gaps themselves.

Integer coding uses one column and is a natural first representation for an ordered category. For nominal categories, its compactness comes with an arbitrary ordering. The informal phrase *label encoding* can obscure an API distinction: scikit-learn's [LabelEncoder](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.LabelEncoder.html) encodes the target, whereas [OrdinalEncoder](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.OrdinalEncoder.html) is intended for input features.

### One-hot e dummy

We can retain each identity without putting the species on one ordered axis. Give each species its own indicator:

$$z_j(c)=\mathbf{1}[c=c_j].$$

The indicator is 1 when the input equals category $c_j$ and 0 otherwise. In the column order A, B, C, D, A becomes $(1,0,0,0)$ and C becomes $(0,0,1,0)$.

A tree can now ask whether the A column exceeds 0.5, meaning “Is this Ipê?” In a tree that splits on one feature at a time, that question isolates A. Grouping A and C together still requires more than one question, although their eventual leaves can predict the same value.

[VISUALIZAÇÃO NO PLAYGROUND: transformar “espécie” em quatro indicadores; no estado dummy, ocultar apenas a coluna de referência. Destacar que “é Ipê?” isola uma categoria em um nó, enquanto reunir Ipê e Jacarandá exige mais perguntas em uma árvore com splits univariados.]

*Dummy coding* drops one reference column and retains $K-1$ indicators. Removing a redundant column can avoid exact collinearity in a linear model with an intercept. Trees do not require that removal. In particular, the omitted category is represented indirectly by all retained indicators being zero, which can change the questions needed to isolate it.

One-hot coding preserves separate identities without inventing order. Its width grows with cardinality, the number of distinct categories, and that can increase tree-training cost. Width and actual memory use are different, however: a sparse matrix stores the nonzero entries rather than every zero in the expanded table.

### Binary e base-N

An integer ID can also be written using several digit columns. First assign an ID, then express it in base $b$:

$$r(c)=\sum_{j=0}^{d-1}z_j(c)b^j.$$

Here $z_j(c)$ is the digit multiplying $b^j$. For IDs from 0 through $K-1$, $d=\lceil\log_b K\rceil$ digits suffice in this example. Reserving extra codes for missing or unknown values can increase the required width.

Using the same four IDs, binary gives A → 00, B → 01, C → 10, and D → 11. Base 3 gives 00, 01, 02, and 10. We write the most significant digit first when displaying these strings.

[VISUALIZAÇÃO NO PLAYGROUND: substituir os indicadores por duas colunas de dígitos. Destacar um bit: ele reúne categorias pelo ID escolhido. Neste exemplo, um dos bits até separa AC | BD; mostrar que esse alinhamento é consequência do mapa arbitrário, sem ter sido aprendido dos targets.]

In the binary representation, the rightmost bit is 0 for A and C and 1 for B and D. That single column happens to make our desired grouping available immediately. Nothing about the targets established this alignment: it follows from the arbitrary ID assignment. A different assignment could make a different pair easy to separate.

Binary and base-N coding reduce the width to roughly $\log_b K$ columns. They also introduce digit-based groupings. This is a useful compression mechanism, but compression alone does not discover which species behave alike.

### Hashing

Hashing fixes the width in advance. A deterministic function sends each category to one of $m$ buckets, and the unsigned indicator version is

$$z_j(c)=\mathbf{1}[h(c)=j].$$

Suppose an illustrative map sends four species into three buckets, with A and B sharing one bucket. Those two species now have identical encoded vectors. If this is their only representation, no downstream tree can recover which of them generated a record. Other features might help with prediction, but they do not reverse that collision.

[VISUALIZAÇÃO NO PLAYGROUND: quatro categorias apontam para três buckets; A e B compartilham uma coluna. Identificar o mapa como ilustrativo. Mostrar que a árvore perde a distinção entre categorias que colidem quando essa é sua única representação.]

Hashing avoids keeping an explicit category vocabulary and can accommodate an open or very large set of names at a fixed width. A previously unseen name receives a bucket too, although that does not make its prediction informative. Collisions can mix categories with different behavior and make an individual column difficult to interpret. Signed variants use values such as −1 and +1; our example keeps simple unsigned indicators so that the collision remains visible.

### Count e frequency

Instead of asking which category appeared, we can ask how often it appeared in the training reference data:

$$z_{\mathrm{count}}(c)=n_c,\qquad z_{\mathrm{frequency}}(c)=\frac{n_c}{n}.$$

A therefore receives 4 or 0.4, B receives 3 or 0.3, C receives 2 or 0.2, and D receives 1 or 0.1. The tree now receives a description of prevalence. A split can distinguish rare from common categories without knowing their individual names.

[VISUALIZAÇÃO NO PLAYGROUND: substituir cada nome pela contagem ou frequência correspondente e mostrar o mapa categoria → valor. Ressaltar que categorias igualmente frequentes se tornariam indistinguíveis.]

This takes one column, but equally frequent categories become indistinguishable. A frequent category can have either a high or a low germination rate, so frequency does not directly summarize the target. Frequencies can also change across populations or periods.

For an exact threshold tree, dividing all counts from the same reference dataset by the positive constant $n$ preserves the ordering and possible partitions. Count and frequency are different scales of the same information in that setting. Approximate implementations need not behave identically in every detail.

### Similarity encoding

Sometimes the category is a string whose spelling contains useful structure. Imagine that record 5 contains the typed name `Cedroo` rather than `Cedro`. Treating every spelling as an unrelated identity loses a clue that these values might refer to the same thing.

This is the only example where we use the auxiliary `typed name` field: it matches the species name in every record except record 5. Choose the prototypes Cedro and Ipê and represent a string through its similarity to each prototype:

$$z(c)=\bigl(\operatorname{sim}(c,p_1),\ldots,\operatorname{sim}(c,p_M)\bigr).$$

The $M$ prototypes determine the output width. One similarity measure uses sets of character n-grams, short consecutive character sequences:

$$\operatorname{sim}(a,b)=\frac{|G(a)\cap G(b)|}{|G(a)\cup G(b)|}.$$

For this example, lowercase the strings, remove accents, and use adjacent bigrams without boundary padding. The set for `cedro` is {ce, ed, dr, ro}. The set for `cedroo` adds oo, so its Jaccard similarity to Cedro is $4/5=0.8$. The normalized string `ipe` shares no bigrams with `cedroo`, giving the two-prototype vector $(0.8,0)$.

[VISUALIZAÇÃO NO PLAYGROUND: usar a coluna “nome digitado” e os protótipos Cedro e Ipê. Após normalização declarada, os bigramas de “cedro” são ce, ed, dr, ro; “cedroo” acrescenta oo. Logo, a similaridade com Cedro é 4/5 = 0,8. Mostrar a coluna de similaridade recebida pela árvore, que pode aplicar um limiar sobre ela.]

A tree can threshold either similarity column. Related spellings can thus share information without first being collapsed into a single identity. [Cerda and colleagues](https://arxiv.org/abs/1806.00979) develop this idea for dirty categorical variables. It is useful when characters carry relevant resemblance; two opaque IDs that happen to share characters have no comparable justification. Prototype count also trades representation width against cost.

Across this family, a code can preserve identity, describe frequency, or expose textual resemblance. None of those operations directly estimates which species have similar target behavior. For that, we need to decide how the labels may enter the representation.

## Codificações supervisionadas

A supervised encoder asks what response has been observed for a category. The resulting number can place species with similar outcomes close together, making a threshold useful even when the original names have no order. A single average can still hide different response distributions or interactions with specimen size.

Before calculating anything, separate two uses of the same reference table. Its ten known outcomes can encode a **new observation whose target is unknown**. Encoding those ten training records themselves requires a rule for which labels may contribute to each feature. Otherwise, the model may receive a transformed version of the answer it is supposed to predict.

Label leakage and unstable estimation are different problems. An estimate may use only permitted labels and still be unreliable because it rests on one observation. Conversely, making an estimate smoother does not make an impermissible source of labels acceptable.

### Mean ou target encoding

The simplest target statistic is the category mean:

$$z(c)=\frac{S_c}{n_c}.$$

For a new observation, our reference table gives A → 0.75, B → 0, C → 1, and D → 0. The mapping is compact, and categories with similar observed responses receive similar values. For regression, average the continuous target; for multiclass classification, one can instead return a vector of class estimates.

[VISUALIZAÇÃO NO PLAYGROUND: mostrar a tabela de somas e contagens e os valores destinados a observações novas. Na versão ingênua aplicada ao treino, destacar o próprio target contribuindo para a feature; um ID único receberia seu próprio rótulo.]

The problem appears when we calculate that map and apply it back to the same training rows. Each row helped construct its own feature. A category that occurs once receives exactly its own target, allowing an arbitrary identifier to carry the answer. Separately, D's estimate of 0 is supported by just one observation and is statistically fragile. Having many categories does not remove the need for enough observations to estimate their behavior.

### Cross-fitting ou OOF

Cross-fitting controls the source of the labels rather than defining a new statistic. Divide the training data $T$ into folds. For row $i$ in fold $F_k$, fit its encoder on the other folds:

$$z_i=E_{T\setminus F_k}(x_i).$$

The symbol $E$ stands for the chosen encoder. Every quantity learned from labels, including a global prior, must follow the same separation. The downstream model is fitted on the assembled out-of-fold, or OOF, features. To encode an external validation set, use a separate map fitted on all of $T$, without accessing validation targets.

Take $F_1=\{1,4,5,6,7\}$ and $F_2=\{2,3,8,9,10\}$. Record 1 belongs to $F_1$, so its Ipê mean uses only records 3 and 10. Their targets are 1 and 0, giving $1/2$, rather than the full-table mean $3/4$. The full-table map remains available for new observations.

[VISUALIZAÇÃO NO PLAYGROUND: fixar dois folds ilustrativos: $F_1={1,4,5,6,7}$ e $F_2={2,3,8,9,10}$. Ao codificar o registro 1, apagar visualmente os targets de $F_1$; os Ipês restantes são os registros 3 e 10, dando 1/2. Contrastar com 3/4 da média ingênua e mostrar, separadamente, o mapa do treino completo para inferência.]

This excludes direct participation of a row's label in its own statistic, at the cost of fewer reference observations per estimate. The split must also match the prediction problem: random folds can be inappropriate for repeated entities or future predictions. For a temporal task, only labels already available at the prediction time may be used, including any reporting delay. Two folds here serve illustration rather than a universal recommendation.

Scikit-learn's [TargetEncoder documentation](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.TargetEncoder.html) makes the training/inference distinction explicit: `fit_transform` uses cross-fitting, whereas fitting a map and transforming those same records does not produce the same training representation.

### M-estimate e suavização

To stabilize a rare category, blend its observations with a prior:

$$z_m(c)=\frac{S_c+mp}{n_c+m}.$$

The prior mean is $p$, and $m$ controls its strength as an equivalent amount of reference evidence. With $m=2$ and $p=0.5$, A receives $(3+1)/(4+2)=4/6\approx0.667$. D receives $(0+1)/(1+2)=1/3\approx0.333$.

Both move toward the global mean, but D moves proportionally more because it has less evidence of its own. An unseen category, with no count or target sum, naturally falls back to $p$ when $m>0$.

[VISUALIZAÇÃO NO PLAYGROUND: exibir média bruta, média global e valor suavizado para A e D, com setas curtas em direção ao prior. Valores são previamente preparados.]

Shrinkage can reduce variance, but excessive shrinkage can erase a real effect in a rare category. Its strength therefore needs choosing or estimating. When the prior is estimated from the data, this has an empirical-Bayes interpretation. For training features, fit the prior and category statistics using the permitted reference rows. Smoothing and OOF can be combined because they address different decisions.

### Weight of Evidence

For binary classification, Weight of Evidence compares how a category is distributed among positives and negatives. Let $n_{c,+}$ and $n_{c,-}$ count category $c$ within those classes, and let $N_+$ and $N_-$ be the total class counts. Using positive evidence to mean greater relative prevalence among positives, define

$$z(c)=\log\left(\frac{(n_{c,+}+\alpha)/(N_++K\alpha)}{(n_{c,-}+\alpha)/(N_-+K\alpha)}\right),\qquad\alpha>0.$$

The pseudocount $\alpha$ avoids zero class frequencies. Here $N_+=N_-=5$. With $\alpha=0.5$, A has three positives and one negative, so the shared denominators cancel and its value is $\log(3.5/1.5)\approx0.847$.

[VISUALIZAÇÃO NO PLAYGROUND: separar as duas contagens de A e apontar para a log-razão. Mostrar zero como evidência neutra na convenção escolhida, e os sinais positivo e negativo com rótulos textuais.]

Zero means neutral relative evidence under this sign convention; positive and negative values favor the respective classes. This compact expression is particularly natural for logistic models and scorecards. It is ordinarily binary and needs regularization when class counts are small or absent.

There is no automatic special advantage for a tree in taking logarithms. Strictly monotone transformations of the same rates preserve the ordering and partitions available to an exact threshold tree. Different smoothing rules or approximate split procedures can break that equivalence. WoE still uses labels, so the training-feature protocol remains part of the method.

### Leave-one-out

A more local exclusion removes only the queried row:

$$z_i=\frac{S_{c_i}-y_i}{n_{c_i}-1}.$$

A positive Ipê record receives $(3-1)/(4-1)=2/3$. The negative Ipê record receives $(3-0)/(4-1)=1$. The same category therefore receives different representations for different training rows. Acácia has no remaining category observation after removal and needs a fallback estimated without the excluded label. For new observations, use the available training reference statistics.

[VISUALIZAÇÃO NO PLAYGROUND: riscar somente a linha consultada antes da conta. Exibir lado a lado os resultados dos Ipês positivos e do negativo para tornar visível que a representação da mesma categoria varia entre linhas.]

Leave-one-out retains almost all other category observations. However, removing a row's own label does not guarantee that the resulting training representation avoids problematic label dependence. Our Ipê values already show how the excluded outcome determines what remains. The [CatBoost paper](https://papers.neurips.cc/paper_files/paper/2018/file/14491b756b3a51daac41c24863285549-Paper.pdf) gives a counterexample to the general safety of leave-one-out target statistics. LOO should therefore not be treated as a general replacement for OOF.

### James–Stein

Shrinkage can also depend on estimated uncertainty instead of a single manually chosen pseudocount strength. A useful expression of the idea is

$$z(c)=(1-B_c)\bar y_c+B_cp,$$

where $\bar y_c$ is the category mean and $B_c$ is its shrinkage weight toward the global mean. If we choose the **hypothetical** value $B_A=0.5$, A receives $0.5(0.75)+0.5(0.5)=0.625$.

[VISUALIZAÇÃO NO PLAYGROUND: mostrar média da categoria, média global e peso de encolhimento; identificar o peso como ilustrativo, sem simular que foi estimado dos dez registros.]

That calculation illustrates a weighted mixture; it does not estimate $B_A$ from our ten rows. A complete estimator needs a rule for learning the weight and assumptions about variability. [James–Stein encoder variants](https://contrib.scikit-learn.org/category_encoders/jamesstein.html) differ in those choices, including how they adapt the idea to binary data. Their attraction is uncertainty-dependent shrinkage, and their limitation is that the name alone does not specify the estimator. Label separation is still required.

### GLMM

A generalized linear mixed model introduces a category effect while sharing a statistical distribution across categories. For a binary target, consider

$$\operatorname{logit}P(y_i=1\mid c_i)=\beta_0+u_{c_i},\qquad u_c\sim\mathcal N(0,\tau^2).$$

The logit transforms a probability $q$ into $\log(q/(1-q))$. The intercept $\beta_0$ provides a baseline, and the category effect $u_c$ shifts the log-odds relative to it. The shared variance $\tau^2$ controls the spread allowed for these effects.

Here we take the encoded feature to be $z(c)=\hat u_c$, the estimated effect. With the explicitly hypothetical parameters $\beta_0=0$ and $\hat u_A=0.6$, the feature returned for A is 0.6. It is an effect on a log-odds scale, not a probability of 0.6.

[VISUALIZAÇÃO NO PLAYGROUND: mostrar categoria → efeito estimado, com efeitos pouco sustentados pelos dados próximos de zero. Um exemplo esquemático pode usar $\beta_0=0$ e $\hat u_A=0,6$, produzindo feature 0,6; rotular os parâmetros como hipotéticos. Não confundir esse efeito com a probabilidade final.]

Partially pooling category effects can keep poorly supported estimates near zero while allowing the data to support larger differences. It also introduces another model-fitting problem, assumptions, and possible convergence difficulties. Implementations can return effects or predictions, so check what the output means; the [Category Encoders GLMM documentation](https://contrib.scikit-learn.org/category_encoders/glmm.html) describes its convention. This is an alternative to compare when the added statistical machinery is justified, with the same care over permitted labels.

### Ordered target statistics

Another way to define permitted labels is to order the records and use only earlier occurrences of the category:

$$z_i=\frac{S_{c_i,<i}+ap_0}{n_{c_i,<i}+a}.$$

Here $S_{c_i,<i}$ and $n_{c_i,<i}$ summarize the category before row $i$ in that order. Set the teaching prior $p_0=0.5$ **in advance** and use $a=2$. The first Ipê has no history and receives 0.5. When record 3 arrives, record 1 supplies one positive Ipê, giving $(1+2\cdot0.5)/(1+2)=2/3$.

[VISUALIZAÇÃO NO PLAYGROUND: mostrar a sequência de registros, destacando o prefixo disponível e deixando o restante apagado. Explicar que uma permutação pode criar essa ordem em dados intercambiáveis; previsão temporal exige disponibilidade real dos dados.]

The current target does not enter its own statistic. Early occurrences nevertheless have little history and depend strongly on the prior. In exchangeable data, a permutation can provide the order. In a temporal application, that artificial order cannot replace actual label availability.

Ordered target statistics are part of CatBoost's approach, but they are distinct from *ordered boosting*, which addresses a separate aspect of fitting the boosted model. We will return to that distinction when the encoder moves inside the tree library.

[PLAYGROUND 2 — SUPERVISIONADAS: um único seletor com mean, OOF, M-estimate, WoE, LOO, James–Stein, GLMM e ordered statistics; identificar OOF como protocolo. Abrir em target com OOF. Manter tabela de referência, linhas autorizadas para a conta e saída codificada. Cada estado declara se representa construção de features de treino ou transformação de observações novas. Para mean/M-estimate/WoE, apresentar também o mapa do treino completo destinado à inferência; não exibi-lo como procedimento seguro para codificar as próprias linhas. James–Stein e GLMM usam os parâmetros hipotéticos declarados acima. Todos os resultados e destaques são fixos.]

The methods in this family answer three connected questions: which statistic represents a category, how strongly it is regularized, and which rows are permitted to estimate it. OOF is a protocol across statistics; smoothing is an estimation choice. Treating every name as an independent competitor hides combinations that are often the useful ones.

## Representações aprendidas

So far, we have chosen what the category should become: an indicator, a frequency, or a target statistic. We can instead learn a vector through an objective. The signal can come from the target, from a self-supervised task, or from an external training problem. A learned representation is therefore not necessarily target-free.

### Entity embeddings

An entity embedding stores one vector per category in a matrix $E\in\mathbb R^{K\times d}$. To encode category $c$, look up its row:

$$z(c)=E_{c,:}.$$

The width $d$ is the embedding dimension. One way to learn the matrix is to train it together with a predictor whose other parameters are $\theta$:

$$\min_{E,\theta}\sum_i\ell\bigl(y_i,f_\theta(E_{c_i})\bigr).$$

The loss $\ell$ measures prediction error. Other input features are omitted only to simplify the notation; in a real model they can help shape the useful representation. [Guo and Berkhahn's entity-embedding work](https://arxiv.org/abs/1604.06737) describes learning category vectors through supervised neural-network training and reusing them with other models.

As an illustration, A might receive $(0.2,0.8)$ and C might receive $(0.3,0.7)$. These coordinates are schematic, not a fitted result from our seed dataset. Similar category target means alone do not guarantee nearby vectors: the training objective, interactions, and model all influence what is learned.

[VISUALIZAÇÃO NO PLAYGROUND: substituir a categoria por duas coordenadas e mostrar quatro pontos com seus nomes. Declarar que os vetores ilustram o mecanismo e não resultam de treino nesse pequeno dataset; proximidade não é garantida apenas por médias de target semelhantes.]

Embeddings can learn useful sharing of signal in a small output dimension, while their lookup table still contains $Kd$ parameters. Rare categories may provide little evidence for their own vectors. To use them with a tree, export the coordinates as numerical features. The tree can threshold those coordinates; it does not automatically start computing distances between embedding vectors.

### Representações pré-treinadas

Instead of fitting category vectors from this target, we can reuse an encoder learned elsewhere:

$$z(c)=g_\phi\bigl(\operatorname{description}(c)\bigr).$$

The parameters $\phi$ are already trained, and a meaningful description provides the input. For our fictional catalog, descriptions might say “teaching category A; seed lot used in the first demonstration” or “teaching category C; seed lot used in the second demonstration.” These invented descriptions explain the interface rather than establish useful botanical knowledge. In a real catalog, the relevant metadata would need to contain information that could transfer to the task. An opaque arbitrary ID alone supplies no comparable semantic content.

A fixed lookup table can only return vectors for its known entries. An encoder that processes descriptions can also receive a previously unseen description. A schematic new category could then receive $(0.4,0.6)$, whereas a closed lookup might return an `UNK` vector reserved for unknown identities.

[VISUALIZAÇÃO NO PLAYGROUND: categoria + descrição → encoder já treinado → vetor fixo. Mostrar uma categoria inédita com descrição recebendo, por exemplo, (0,4; 0,6), explicitamente esquemático; contrastar, em legenda, com o fallback UNK de um lookup fechado.]

Pretraining need not come from language. A tabular model can learn by reconstructing corrupted values and identifying masked or corrupted inputs; [VIME](https://proceedings.neurips.cc/paper_files/paper/2020/hash/7d97667a3e056acab9aaf653807b4a03-Abstract.html) is one example of self-supervised representation learning for tables.

The possible benefit is external information, especially when useful metadata exists and target labels are scarce. The limitation is whether the pretraining signal matches the new task. A description may be semantically informative yet irrelevant to germination, and obtaining and maintaining the encoder has a cost.

### Embeddings contextuais

A fixed lookup assigns A the same vector in every record. A contextual encoder also receives the other features in the row:

$$z_i=g_\phi(c_i,x_{i,-c}),$$

where $x_{i,-c}$ denotes the remaining features. Record 1 and record 3 both contain Ipê, but their specimen sizes differ. Their schematic contextual vectors might be $(0.2,0.8)$ and $(0.6,0.4)$ respectively.

[VISUALIZAÇÃO NO PLAYGROUND: destacar dois registros da mesma espécie com portes diferentes: o registro 1 recebe (0,2; 0,8) e o registro 3 recebe (0,6; 0,4), ambos esquemáticos. Manter os demais elementos fixos para evidenciar somente a dependência do contexto.]

Now the coordinates describe a category in its current context. [TabTransformer](https://arxiv.org/abs/2012.06678) is an example of contextualizing categorical feature embeddings through interactions among categorical inputs. We do not need its full architecture to see the change: the representation can depend on the row rather than only on an identity.

This can incorporate feature relationships before a downstream model receives its input. It also requires a more complex encoder and makes feature generation depend on the necessary context at inference time. All vectors in these examples are schematic; their purpose is to distinguish a lookup, an external encoder, and a contextual representation.

[PLAYGROUND 3 — APRENDIDAS: um seletor entre entity embedding, pré-treinado e contextual; abrir em entity embedding. À esquerda, categorias e eventual contexto/descrição; à direita, coordenadas prontas e um pequeno mapa 2D quando o vetor corresponder a uma categoria. No estado contextual, identificar pontos por registro. Todos os vetores são esquemáticos e rotulados como tais; não oferecer treino, projeção, escolha de dimensão ou consulta a modelos.]

Evaluation needs the same separation as before. Fit task-specific encoders inside the outer training split, since supervised embeddings can transport memorized outcomes. Also, vectors from independently trained networks need not share coordinate axes. Concatenating OOF embeddings from separate networks as if their columns had identical meanings is not automatically valid; a common frozen encoder simplifies coordinate consistency without guaranteeing better predictions.

Until now, the tree has received features produced before it was fitted. We can also let the tree-training procedure decide how to handle categories as it constructs the model.

## Tratamento categórico nativo em árvores

Return to $AC\mid BD$. A node could ask directly whether the species belongs to a subset $S$:

$$c\in S.$$

Choosing $S=\{A,C\}$ creates the desired grouping in one question. For $K$ categories, there are $2^{K-1}-1$ nontrivial binary partitions after treating swapped left and right sides as the same partition. With four categories there are seven; the number grows rapidly.

For certain local objectives, an ordering based on an appropriate category statistic allows the search to consider $K-1$ consecutive cuts instead of every subset. This is a statement about particular split criteria and their assumptions. It does not imply that any category ordering works, or that greedy split search finds the globally optimal tree.

A native grouping can be chosen again at every node. In boosting, it can also change with the current gradients as the ensemble changes. A single external scalar map, fitted once for the whole dataset, need not preserve the groupings useful in each of those local problems. Native support can itself include internal encodings, so it does not always mean a direct subset test on raw names.

### ID3 e C4.5

One direct treatment gives each category its own branch. A species node could have four children, containing A's four records, B's three, C's two, and D's one. ID3 compares candidate attributes through information gain:

$$IG=H(Y)-\sum_c\frac{n_c}{n}H(Y\mid c).$$

Entropy $H$ measures class uncertainty, here using base-2 logarithms. The parent contains equal class proportions and has entropy 1 bit. Averaging the children's entropies gives approximately 0.325 bit, so the information gain is approximately **0.675 bit**.

C4.5's use of gain ratio is an important distinction. Dividing by the entropy of the category distribution gives

$$GR=\frac{IG}{H(C)}\approx0.366.$$

This normalization is part of C4.5's attribute-selection machinery, rather than a complete description of the algorithm. The original accounts are [Quinlan's ID3 paper](https://storm.cis.fordham.edu/~gweiss/selected-papers/quinlan86.pdf) and [C4.5](https://www.educate.elsevier.com/book/details/9780080500584).

[VISUALIZAÇÃO NO PLAYGROUND: um nó de espécie com quatro saídas e contagens em cada filho. Um estado ID3/C4.5 pode compartilhar o diagrama e mudar a legenda do critério.]

The nominal values become branches without an artificial order. However, many distinct values fragment the available records. Raw information gain can favor attributes with many levels, and gain ratio seeks to attenuate that preference. It does not manufacture more evidence in a branch supported by one example.

### CART clássico

Classical categorical CART chooses a binary subset by the improvement it gives to a local impurity criterion:

$$\Delta(S)=I(P)-\frac{n_L}{n_P}I(L)-\frac{n_R}{n_P}I(R).$$

Here $P$ is the parent, $L$ and $R$ are its children, and $I$ is the chosen impurity. For Gini impurity in our binary example, $I=2q(1-q)$ when $q$ is the positive proportion.

With $S=\{A,C\}$, the left child contains six records: five positives and one negative. The right contains four negatives. Parent impurity is 0.5; weighted child impurity is $(6/10)\,2(5/6)(1/6)=1/6\approx0.167$. The gain is therefore approximately **0.333**.

[VISUALIZAÇÃO NO PLAYGROUND: um único nó com AC à esquerda e BD à direita; contrastar com o limiar ordinal da introdução. Usando Gini, a impureza passa de 0,5 para uma média ponderada de aproximadamente 0,167, com ganho de 0,333.]

The species grouping is available in a single binary split, unlike the initial threshold on A, B, C, D integer codes. The unrestricted subset search can be combinatorial, although useful criteria admit shortcuts.

Distinguish CART's treatment in the literature from the interface of a library that builds CART-style trees. Scikit-learn's [decision-tree guide](https://scikit-learn.org/stable/modules/tree.html) documents numerical-feature support rather than native categorical splitting for `DecisionTreeClassifier`. Its capabilities should not be inferred from those of `HistGradientBoostingClassifier`.

### HistGradientBoosting

Scikit-learn's histogram gradient boosting provides categorical handling within its split search. Conceptually, categories receive local statistics, those statistics determine an order, and the algorithm examines cuts in that order. The illustrative order B, D, A, C permits $BD\mid AC$, even though the original integer codes of A and C were 0 and 2.

[VISUALIZAÇÃO NO PLAYGROUND: mostrar uma ordenação local ilustrativa B, D, A, C e um corte BD | AC, deixando explícito que os códigos originais não são magnitudes.]

The codes identify categories; they are not numerical magnitudes to threshold in their original order. This allows grouping without expanding every species into a separate indicator. The feature must be correctly marked or recognized as categorical, and cardinality is constrained by `max_bins`; sparse evidence for rare categories also remains a concern. The [categorical-support guide](https://scikit-learn.org/stable/modules/ensemble.html#categorical-features-support) describes these requirements and the split-search mechanism.

### LightGBM

LightGBM also searches categorical groupings through an ordering based on local statistics. A simplified illustration uses the ratio of summed gradients to summed Hessians, $G_c/H_c$. These quantities describe the current loss and predictions for the records reaching the node, rather than a permanent global target mean.

Start binary logistic loss at predicted probability 0.5 for every record. Using derivatives with respect to the raw prediction score, an unregularized illustration gives

$$G_c=\sum_{i:c_i=c}(0.5-y_i),\qquad H_c=0.25n_c.$$

The resulting ratios are C → −2, A → −1, B → 2, and D → 2. Thus an order C, A, B, D makes $CA\mid BD$ available as one consecutive cut. These numbers explain a local ordering; they are not a complete execution of LightGBM, whose regularization and search details also affect the result.

[VISUALIZAÇÃO NO PLAYGROUND: pequenas barras de estatísticas locais levam a uma ordem e ao agrupamento binário. Valores e corte são ilustrativos, previamente fixados.]

The benefit is an efficient search over useful categorical groups inside boosting. Rare categories can still overfit. In [LightGBM's documentation](https://lightgbm.readthedocs.io/en/latest/Advanced-Topics.html#categorical-feature-support), `categorical_feature` identifies categorical inputs, while `cat_smooth` and `min_data_per_group` connect to regularizing their treatment. These are practical starting points, not a recipe that removes the need for validation.

### XGBoost

XGBoost distinguishes equality questions, $c=c_j$, from partition questions, $c\in S$. An equality split isolates one category; a partition split can put A and C together.

[VISUALIZAÇÃO NO PLAYGROUND: no estado XGBoost, exibir lado a lado dois exemplos fixos, “é A?” e “pertence a AC?”, com a condição de uso indicada na legenda.]

Configuration controls which strategy is available or selected. `enable_categorical` enables categorical handling in supported interfaces, while the [categorical-feature parameters](https://xgboost.readthedocs.io/en/stable/parameter.html#parameters-for-categorical-feature) include `max_cat_to_onehot`, which controls the cardinality threshold for equality-style versus partition-based splitting, and `max_cat_threshold`, which constrains the partition search. The [categorical-data tutorial](https://xgboost.readthedocs.io/en/stable/tutorials/categorical.html) documents supported types and tree methods and requires categorical information to be preserved when saving the model, using JSON or UBJSON.

Integrating both strategies into tree training provides flexibility without external one-hot expansion in every case. It also makes the input types, compatible interface, and consistent category schema part of the pipeline. We have described the mechanisms, rather than assuming fixed parameter defaults across releases.

### CatBoost

CatBoost combines several internal treatments. For some low-cardinality features it can use one-hot handling; elsewhere, it constructs statistics from categories and category combinations, including supervised statistics. The route is therefore category → internal representation → a split on that representation, rather than a universal direct search over nominal subsets.

[VISUALIZAÇÃO NO PLAYGROUND: categoria → representação interna → split numérico sobre essa representação. Mostrar caminhos one-hot e estatística ordenada como possibilidades de configuração; não desenhar CatBoost como busca universal de subconjuntos nominais diretos.]

The [categorical-features documentation](https://catboost.ai/docs/en/features/categorical-features) explains the configurable one-hot treatment and its relationship to internal statistics. The ordered target statistics discussed earlier control which labels contribute to a training row's representation. Ordered boosting is a separate mechanism for addressing prediction shift during boosting, as distinguished in the [CatBoost paper](https://papers.neurips.cc/paper_files/paper/2018/file/14491b756b3a51daac41c24863285549-Paper.pdf).

Coordinating categorical processing with tree fitting can make rich statistical representations available within one training procedure. Computing statistics and combinations adds cost and makes individual transformations less transparent. Internal protections also cannot repair an outer split that uses future information or places the same entity on both sides when the task is to predict new entities.

[PLAYGROUND 4 — NATIVAS: um seletor com ID3, C4.5, CART clássico, HistGradientBoosting, LightGBM, XGBoost e CatBoost; abrir em CART com AC | BD. Manter a tabela e trocar apenas o mecanismo ilustrado, a pergunta do nó e os grupos resultantes. Nos métodos de boosting, usar snapshots conceituais identificados como exemplos, sem alegar reproduzir um modelo treinado. Em CatBoost, a representação interna faz parte do desenho. Não mostrar ranking, acurácia ou treino interativo.]
Comparações e conclusões
[Abrir a síntese retomando as perguntas comuns: que informação foi usada; qual identidade ou estrutura foi preservada; o que foi perdido; qual operação a árvore pode fazer; quais são os custos e os riscos de estimação. Comparar propriedades verificáveis separadamente de desempenho preditivo.]

## Comparações e conclusões

We can now ask the same questions of every method. Which information created the representation? Which distinctions survived? Which were discarded? What question can the next tree ask, and what did that representation cost to obtain?

The table compares these observable properties. Output widths refer to one original categorical feature. The scalar supervised entries assume binary classification or regression; multiclass variants may require multiple columns.

| Method | Uses target? | Output per feature | Main advantage | Main limitation |
| --- | --- | --- | --- | --- |
| Ordinal / integer codes | No | 1 column | Compact; can preserve a genuine order | Arbitrary codes restrict nominal groupings |
| One-hot / dummy | No | $K$ / $K-1$ columns | Keeps identities without an order | Width and extra questions for category unions |
| Binary / base-N | No | About $\log_bK$ digit columns | Compact representation | ID-dependent groupings |
| Hashing | No | $m$ bucket columns | Fixed width without an explicit vocabulary | Collisions merge identities |
| Count / frequency | No | 1 column | Exposes rarity and prevalence | Equal frequencies merge categories; prevalence can drift |
| Similarity | No | $M$ prototype-similarity columns | Shares information across related strings | Character resemblance may be irrelevant |
| Mean / target | Yes | 1 column in scalar form | Orders categories by observed response | Unstable rare means and unsafe self-encoding |
| OOF / cross-fitting | According to encoder | Width of the chosen encoder | Separates each fold's labels from its feature estimates | Less reference data; folds must match deployment |
| M-estimate | Yes | 1 column | Shrinks toward a prior | Regularization can suppress real rare effects |
| WoE | Yes | 1 column in the binary form | Expresses relative class evidence | Requires regularization and a sign convention |
| Leave-one-out | Yes | 1 column in scalar form | Uses nearly all other category records | Does not generally remove problematic dependence |
| James–Stein | Yes | 1 column in the illustrated form | Uncertainty-dependent shrinkage | Variant and assumptions determine the estimator |
| GLMM | Yes | 1 category effect in our convention | Statistical sharing across categories | Added model fitting, assumptions, and convergence concerns |
| Ordered statistics | Yes | 1 column in the illustrated form | Excludes current and later labels in the chosen order | Early occurrences rely heavily on the prior |
| Entity embeddings | Often; depends on objective | $d$ coordinates | Learns representations and interactions | $Kd$ lookup parameters; rare vectors can be weak |
| Pretrained representations | Depends on pretraining; no local target if frozen | $d$ coordinates | Transfers external signal; descriptions may cover unseen categories | Domain mismatch and encoder cost |
| Contextual embeddings | Depends on objective | $d$ coordinates per row | Represents categories in their context | Complex encoder and context-dependent inference |
| ID3 / C4.5 | Yes, during tree training | Internal representation | Direct nominal branches | Fragmented data; cardinality bias in split selection |
| Classical categorical CART | Yes, during tree training | Internal representation | Binary category subsets | Search complexity and implementation support |
| HistGradientBoosting | Yes, through local boosting statistics | Internal representation | Ordered categorical partition search | Cardinality limits and rare-category estimation |
| LightGBM | Yes, through local boosting statistics | Internal representation | Efficient group search | Regularization and category support matter |
| XGBoost | Yes, through local boosting statistics | Internal representation | Equality and partition strategies | Compatible types, methods, and saved schema required |
| CatBoost | Some internal statistics do | Internal representation | Coordinates categorical statistics with fitting | Added complexity; outer validation still matters |

OOF is a transversal protocol in this table. It can be combined with different statistics and regularization choices rather than selected as if it were another scalar formula.

Fewer columns do not establish that a pipeline will be more accurate or faster. Sparse storage, library implementation, regularization, and the tree's depth and leaf budget can change the comparison. One-hot may need additional nodes to form a union that a native subset split represents directly, while a compact target mean may discard distinctions useful in interaction with another feature.

Useful first experiments follow from the data and prediction setting:

| Scenario | Initial alternatives | What to examine |
| --- | --- | --- |
| A true semantic order | Ordinal; compare with one-hot or native handling | Whether the order helps useful cuts; no monotone target relationship is required |
| Few nominal categories | One-hot and native handling | Width, required depth, and validation performance |
| Many recurring categories | Native handling; smoothed target encoding with OOF; a baseline grouping rare levels | Per-category counts, stability, and cost |
| High cardinality with limited memory | Hashing or binary/base-N as infrastructure alternatives | Collisions and arbitrary groupings; compactness does not guarantee signal |
| Very rare or almost unique identities | Question identity's value; test metadata, rare grouping, and fallback | Generalization to new entities and memorization risk |
| Spelling variants and dirty text | Cleaning and similarity; compare one-hot after cleaning | Whether character resemblance captures relevant meaning |
| Useful descriptions with little target data | Pretrained representations alongside tabular baselines | Actual transfer, cost, and unseen-category behavior |
| Many observations and interest in interactions or transfer | Entity or contextual embeddings alongside native baselines | Whether gains justify training and maintenance |
| A logistic model or binary scorecard | One-hot/dummy and regularized WoE | Interpretation, zero counts, and base-rate stability |
| Future predictions or new entities | Choose the evaluation split before the encoder | Label availability, entity groups, and unseen-category frequency |

There is no universal threshold at which cardinality becomes high. Four categories in ten records already leave one category supported by a single observation. The same $K$ in a million balanced records is a different estimation problem. Consider $K$, $n$, the distribution of $n_c$, and the rate of genuinely new categories together.

Missing values and unseen categories also need separate policies. Missing means that a value is absent; unseen means that a value exists but was not in the fitted reference data. Closed mappings can reserve IDs or tokens, one-hot needs a specified unknown policy, and hashing always returns a bucket. Similarity and description-based encoders can process new text, supervised statistics can fall back to an authorized prior, and embeddings can use `UNK` or metadata. Native libraries have their own rules. Fit or define these resources within the permitted training data and persist the same scheme for inference; the behavior is not identical across libraries and versions.

A fair comparison begins by deciding what a future prediction represents: a new row from familiar entities, a new entity, or a later point in time. Keep the training, validation, and test splits consistent with that setting. Fit encoders inside each training division, construct supervised training features with an appropriate internal protocol such as OOF, and compare complete encoder-plus-model pipelines at similar budgets. Measure the task metric and its variability alongside training time, inference cost, memory, and performance on rare and unseen categories. Evaluating an encoder in isolation leaves out the model that must use it.

The evidence supports testing these choices rather than declaring one winner. [Pargent and colleagues](https://arxiv.org/abs/2104.00629) found strong results for regularized target encoding in their high-cardinality benchmark, but that comparison does not establish dominance over every native tree or learned representation. [Matteucci and colleagues' broader encoder benchmark](https://proceedings.neurips.cc/paper_files/paper/2023/hash/ac01e21bb14609416760f790dd8966ae-Abstract-Datasets_and_Benchmarks.html) shows how conclusions depend on the datasets, experimental factors, and aggregation of results. The relevant evidence is whether a complete pipeline generalizes under the conditions in which it will be used.

Our opening question now has several precise answers. The initial integer order cannot produce $AC\mid BD$ with one threshold. One-hot exposes each identity but needs more questions to combine those two species. A particular binary ID map happens to make the grouping available in one bit. A target statistic or a native categorical procedure can make it available through information learned from outcomes, subject to the fitting protocol and algorithm.

Representing a category determines which distinctions are easy, difficult, or impossible for the next model. Choose a representation that fits the available evidence and the tree's operations, then test its generalization in the intended prediction setting. Implementation details and extensive benchmarks can build on that understanding in later material.
