# Historical preparation: Beyond CART: Decision Trees Don’t Have to Look Like CART

Article ID in current content collection: `beyond-cart-tree-architectures`
Source Library filename: `Pasted text(20261010-170346).txt`
Source SHA-256: `bad5207e7e5fd509415952f71d168b6d594cf8d5f5bf2e8ad7cc00735dacc280`
Coverage: Scope, structure, a reusable drafting prompt, repeated source material, candidate drafts, and a comparison.

This is historical editorial evidence, not approval to publish or revise the existing article. The source begins after the marker below and is preserved byte for byte. The preface and review note are separate from the source.

**Review note:** Two candidate drafts appear without an explicit approved winner. Preserve both and the repeated material. Claims about hard oblique stump equivalence to logistic regression and differentiable feature selection need technical verification.

<!-- ORIGINAL SOURCE START — all following bytes are unchanged -->
# 1. Tópico

- **Provisional title:** Beyond CART: Decision Trees Don’t Have to Look Like CART
- **Central question or idea:** Which assumptions define a standard CART tree, and what happens when we change them?
- **Why this deserves an article:** A decision tree is often taught as if its CART formulation were the definition of a decision tree: one feature per split, hard left/right routing, independently chosen splits, and constant predictions at the leaves. In reality, these are design choices. Changing the split function, routing mechanism, structural constraints, or leaf model produces substantially different families of trees. Comparing these variants reveals what a decision tree fundamentally is and the trade-offs introduced by different architectural choices.

# 2. Learning Scope

- **Central theme:** Variations of the decision-tree architecture beyond standard CART.
- **Primary learning objective:** Understand that a decision tree is a general routing-and-prediction architecture, while CART represents one particular set of design choices. The reader should be able to identify which assumption changes in an oblique, soft, oblivious, or model tree and reason about what that change provides and costs.
- **Supporting concepts:**
    - CART as the baseline architecture
    - Axis-aligned versus oblique splits
    - Hard versus soft/probabilistic routing
    - Independent versus depth-shared splitting rules
    - Constant versus learned leaf predictors
    - Expressiveness versus structural constraints
    - Interpretability and computational trade-offs
    - The distinction between **tree architecture** and **tree training algorithm**
- **Required prerequisites:**
    - Basic decision-tree structure: root, internal nodes, branches, and leaves
    - How a standard CART split works: $x_j < t$
    - Basic classification or regression concepts
- **Helpful prerequisites:**
    - Sigmoid function
    - Linear decision boundaries
    - Basic probability
    - Basic gradient descent
- **Not required:**
    - Mixed-integer programming
    - Genetic algorithms
    - Optimal decision-tree algorithms
    - Neural-network training details
    - Tree ensembles such as Random Forest or Gradient Boosting
    - Mathematical optimization theory
- **Scope boundaries:**
    - Use **standard CART** as the reference architecture.
    - Cover four primary variations:
        1. **Oblique trees — change the split:** $x_j < t \rightarrow w^\top x < t$
        2. **Soft trees — change the routing:** deterministic left/right routing $\rightarrow$ probabilistic routing
        3. **Oblivious trees — change the structure:** independent node splits $\rightarrow$ one shared splitting rule per depth
        4. **Model trees — change the leaves:** constant predictions $\rightarrow$ local predictive models
    - Other tree variants may be mentioned briefly only when they reinforce this taxonomy.
    - Do not turn the article into a survey of every historical decision-tree algorithm.
    - Do not deeply explain how these architectures are optimized. Greedy search, gradient-based optimization, genetic algorithms, MIP, dynamic programming, and globally optimal trees belong to a separate article about **how trees are trained**.
    - Do not focus on ensemble methods. CatBoost may appear as a practical example of oblivious/symmetric trees, but boosting itself is outside the scope.
    - Focus on the architectural trade-off introduced by each modification rather than benchmarking which tree type is universally “best.”

## Intended mental model

The reader should finish the article seeing a decision tree as four configurable components:

$$
\boxed{\text{Split} \rightarrow \text{Routing} \rightarrow \text{Structure} \rightarrow \text{Leaf}}
$$

Standard CART makes one choice for each:

$$
\text{Split}: x_j < t,\quad \text{Routing}: \text{hard left/right},\quad \text{Structure}: \text{independent splits},\quad \text{Leaf}: \text{constant prediction}
$$

Different tree families emerge by changing one of these assumptions:

$$
\text{Oblique} \rightarrow \text{change the split},\quad \text{Soft} \rightarrow \text{change the routing},\quad \text{Oblivious} \rightarrow \text{change the structure},\quad \text{Model tree} \rightarrow \text{change the leaf}
$$

The central takeaway is therefore not simply **“there are many kinds of decision trees.”**

It is:

> **CART is one particular architecture inside a much larger decision-tree design space.**
> 

Standard CART assumes:

- **Axis-aligned splits:** each split considers a single feature.
- **Hard routing:** each observation goes entirely left or right.
- **Independent node splits:** each internal node can use its own splitting rule.
- **Constant leaf predictions:** each leaf produces a constant value or class distribution.
- **Binary branching:** each internal node has exactly two children.

# 3. Estrutura do artigo

## Estrutura

# A model is a collection of assumptions

[open by presenting the decision tree as one of the foundational models of machine learning. Briefly connect its importance to the larger family of tree-based methods that remain extremely strong on tabular data]

[briefly introduce CART and explain that when we learn “a decision tree”, we usually learn one particular collection of design choices rather than the only possible definition of a tree]

[present the four CART assumptions that the article will investigate:

- **Axis-aligned splits:** one feature determines each split.
- **Hard routing:** each observation follows exactly one branch.
- **Independent node rules:** every node learns its own splitting rule.
- **Constant leaves:** once an observation reaches a leaf, the prediction is constant.]

[emphasize that these assumptions are not arbitrary mistakes. Together they give CART many of its desirable properties: simple optimization, sparse computation, heterogeneous feature handling, local structure, and interpretability]

[raise the central question of the article: **what happens if we relax each assumption individually?**]

[IMAGE: a simple CART tree in the center. Around it, highlight four pieces independently: the equation inside a node, the left/right routing arrow, different rules across nodes, and the constant values in leaves. Label them Split geometry / Routing / Parameter sharing / Leaf model]

[introduce the central idea explicitly: **a machine-learning model is often better understood as a collection of design assumptions. New model families can emerge when we relax, replace, or share those assumptions.**]

[explain that we are not looking for four universally superior versions of CART. Every relaxation buys something and gives something up. Understanding those exchanges is the purpose of the article]

# Why only one feature?

[show a standard CART node:

[

x_j < t

]

Explain that CART searches for one feature (j) and one threshold (t)]

[ask why the boundary needs to be perpendicular to one feature axis]

[introduce an oblique split:

[

w^\top x < t

]

Explain that a node can instead learn a weighted combination of several features]

[use a simple 2D classification dataset whose natural boundary is diagonal. Show that CART requires multiple axis-aligned cuts while one oblique split can solve the same geometry]

[IMAGE: same dataset twice. Left: several staircase-like CART partitions approximating a diagonal boundary. Right: one diagonal oblique split]

[make the main lesson explicit: **greater node complexity can produce lower tree complexity.** We moved representational power from the tree structure into the individual node]

[briefly explain the tradeoff. CART searches over ((j,t)); an oblique tree must search over ((w,t)). The representation becomes more efficient, but optimization becomes harder and individual decisions become less interpretable]

[briefly mention that there are several ways of learning (w): candidate directions, linear models, direct optimization, and differentiable formulations. Do not derive them]

[make the logistic-regression connection explicit: a depth-1 oblique classifier can be essentially a linear classifier. This shows that changing one architectural assumption can make two apparently different model families begin to overlap]

[conclude the section with the transferable lesson: **expressiveness can be distributed differently across a model. Simple components require more structure; stronger components can require less structure.**]

# Why choose only one path?

[start with two almost identical observations around a CART threshold:

[

x=t-\epsilon

\qquad\text{and}\qquad

x=t+\epsilon

]

Show that one goes completely left and the other completely right]

[ANIMATION: move a single observation slowly across a threshold. In the hard tree, its selected branch suddenly switches from left to right and the prediction jumps]

[ask whether routing itself needs to be discrete]

[introduce soft routing by replacing the indicator decision with a smooth gate:

[

p_R(x)=\sigma\left(\frac{x_j-t}{\tau}\right)

]

and

[

p_L(x)=1-p_R(x)

]]

[explain intuitively that an observation can now belong partly to both branches. The tree no longer selects one leaf; it maintains weights over several possible leaves]

[for the simplest depth-1 tree, show:

[

\hat y(x)=p_L(x)v_L+p_R(x)v_R

]

Then generalize briefly: in a deeper tree, each leaf receives the product of the routing probabilities along its path]

[PLAYGROUND: depth-1 regression tree. Show the threshold and two leaf predictions. Let the reader move (x) and control temperature (\tau). Display (p_L), (p_R), and the resulting prediction. As (\tau\rightarrow0), the soft tree visually becomes the hard CART tree]

[explain the deeper consequence: the discrete routing operation has been replaced with a continuous relaxation. Because the gate is differentiable, split parameters can now potentially be learned with gradients together with the rest of the model]

[connect this explicitly to a general ML technique: **when a useful operation is discrete and difficult to optimize, one strategy is to replace it with a differentiable approximation.**]

[explain the price. The model loses the crisp single decision path; observations may activate many leaves; inference can become less sparse; and the model begins to resemble a gated neural architecture]

[briefly acknowledge the tension rather than hiding it: making a tree more differentiable can also remove some properties that made trees attractive]

[conclude with the section lesson: **continuous relaxation exchanges discrete structure for smoother optimization.**]

# Why should every node ask a different question?

[show a normal depth-3 CART tree. Highlight that every internal node is independently free to select its own feature and threshold]

[ask whether this flexibility is always desirable]

[introduce an oblivious or symmetric tree. Every node at the same depth shares the same splitting rule]

[IMAGE: left, irregular CART tree with different questions at every node. Right, perfectly symmetric tree where all nodes on each horizontal level display the same rule]

[explain that this is the opposite direction from the previous modifications. We are not making the tree more expressive. We are deliberately constraining it]

[show conceptually:

[

g_{d,1}=g_{d,2}=\cdots=g_d

]

where every node at depth (d) shares the same decision]

[explain what is lost: one tree has less freedom to adapt locally]

[then explain what is gained: regular structure, predictable memory access, easier vectorization, simpler execution, and useful regularization]

[briefly use CatBoost as the real production anchor. Explain that symmetric or oblivious trees are not merely a theoretical curiosity: CatBoost uses symmetric trees by default, in part because their constrained structure enables very efficient evaluation]

[ANIMATION: evaluate one ordinary tree and one oblivious tree for a small batch. Show the irregular traversal of CART versus applying the same test across each level of the symmetric tree]

[make the general lesson explicit: **more flexibility is not automatically better. Architectural constraints can make models easier to optimize, execute, and generalize.**]

# Why should a leaf be a constant?

[show how CART regression works after partitioning the space. Once (x) reaches leaf (\ell), the prediction is simply:

[

f(x)=c_\ell

]]

[point out the hidden assumption: CART assumes that after finding a sufficiently local region, there is no useful structure left inside it]

[ask why the tree needs to perform both jobs: deciding *which region we are in* and deciding *what function applies inside that region*]

[introduce model trees:

[

f(x)=f_\ell(x)

]

For example, a linear model inside every leaf:

[

f_\ell(x)=\beta_\ell^\top x+b_\ell

]]

[use one simple regression dataset formed by two regimes, each approximately linear but with different slopes. Show that ordinary leaves approximate each regime with steps while model leaves can represent the local trends directly]

[IMAGE: left, piecewise-constant CART approximation. Right, same partition boundaries but each region contains its own fitted line]

[explain the conceptual decomposition:

**Tree:** Which regime am I in?

**Leaf model:** What happens inside this regime?]

[briefly connect this to broader ML ideas such as local models and mixture-of-experts architectures]

[explain the price: each leaf now needs more data and more parameters, fitting becomes more complicated, and the clean simplicity of a constant prediction disappears]

[conclude with the lesson: **different components of a model can specialize in different jobs. Partitioning the input space and modeling behavior inside each region do not need to be the same operation.**]

# A design space, not four algorithms

[return to the original CART tree and place the four assumptions side by side]

[IMAGE: compact table or design-space diagram:

| Design choice | CART | Relaxation |
| --- | --- | --- |
| Split geometry | Axis-aligned | Oblique |
| Routing | Hard | Soft |
| Node rules | Independent | Shared / oblivious |
| Leaf prediction | Constant | Model-based |

]

[explain that these are largely independent architectural dimensions. We have not discovered four mutually exclusive tree algorithms]

[show that the choices can be combined:

- oblique + hard;
- axis-aligned + soft;
- soft + oblique;
- oblivious + soft;
- oblique + model leaves;
- etc.]

[PLAYGROUND: **Build a Tree.** Use one small 2D dataset and a shallow fixed-depth tree. Provide four controls:

- Split: Axis-aligned / Oblique
- Routing: Hard / Soft
- Rules: Independent / Shared by depth
- Leaves: Constant / Linear

As each control changes, update the decision surface, tree diagram, number of parameters, and approximate number of node evaluations. The purpose is not benchmarking every possible combination; it is letting the reader see that a “model” can be assembled from relatively independent architectural decisions]

[use a few intentionally selected presets rather than expecting the reader to explore all combinations:

**CART**

axis-aligned + hard + independent + constant

**Soft tree**

axis-aligned + soft + independent + constant

**Oblivious tree**

axis-aligned + hard + shared + constant

**Highly relaxed tree**

oblique + soft + independent + linear leaves]

[point out what happens with the last configuration: once splits are linear combinations, gates become differentiable, and leaves become learned functions, the architecture begins to resemble a hierarchical mixture-of-experts neural model]

[raise the question explicitly: **at what point does a modified decision tree stop behaving like the kind of model we originally valued as a tree?**]

# Constraints define models

[return to the opening argument. CART’s assumptions initially looked like limitations that could simply be removed]

[explain that the experiments reveal something different: every restriction was also buying something]

[briefly summarize:

- Axis alignment sacrifices compactness for simple, local decisions.
- Hard routing sacrifices smoothness for sparse computation and crisp paths.
- Independent rules sacrifice regularity for local flexibility.
- Constant leaves sacrifice local expressiveness for simplicity and statistical efficiency.]

[explain that relaxing an assumption therefore does not automatically improve the model. It changes its inductive bias and moves complexity somewhere else]

[IMAGE: CART in the center with four arrows pointing outward toward Oblique / Soft / Oblivious / Model leaves. Under every arrow show **Gain ↔ Cost**, rather than presenting the variants as upgrades]

[finish with the central principle of the article:

**A machine-learning model is not an indivisible algorithm. It is a collection of choices about what the model is allowed to represent, how information flows through it, which parameters are shared, and how predictions are produced.**

Changing one of those choices can create a new model family.]

[close by returning to CART specifically: its restrictions are not merely historical baggage. The fact that many of them survive in some of the strongest tabular models suggests that constraints themselves can be useful inductive biases]

[final sentence should broaden beyond trees: **Learning to design models begins with learning to notice the assumptions hidden inside the models we already use.**]

## Prompt estrutura → rascunho redigido

```
# ROLE

You are a technical educational writer specialized in Machine Learning.

Your task is to transform an already planned article into a complete first draft that is technically rigorous, clear, and fluid.

# CONTEXT

You will receive:

* `LEARNING_SCOPE`: defines what the article should teach, the assumed prior knowledge, and its boundaries.
* `ARTICLE_STRUCTURE`: defines the chapters and the planned sequence of explanation.
* `WRITING_INSTRUCTIONS`: specific writing rules.
* `WRITING_EXAMPLES`: references for voice, rhythm, density, and style.
* `ADDITIONAL_CONTEXT`: technical material that may help develop the explanations.

The conceptual planning of the article has already been completed. Your job is to **write the article, not redesign it**.

The `ARTICLE_STRUCTURE` is a specification of ideas and their order of presentation.

Blocks such as:

```text
[Explain why...]
[Introduce the idea of...]
[Compare...]
```

describe **what should be explained**. They do not necessarily correspond to a single paragraph. Develop each idea with as much prose as necessary to explain it well, and combine related blocks when doing so produces a more natural flow.

The structure and its order should be preserved by default. Make only small local adjustments when they are clearly necessary for continuity or comprehension; do not change the architecture of the article.

Elements such as:

```text
[IMAGE: ...]
[ANIMATION: ...]
[PLAYGROUND: ...]
[VISUALIZATION: ...]
```

are editorial placeholders. **Preserve them literally and in their corresponding position within the narrative.** Do not implement them or turn their descriptions into article prose.

Use the `LEARNING_SCOPE` to control depth and avoid digressions. Use `ADDITIONAL_CONTEXT` only when it contributes to the planned structure.

Use `WRITING_EXAMPLES` as style references, not as text to be copied.

The language used inside `LEARNING_SCOPE`, `ARTICLE_STRUCTURE`, `WRITING_INSTRUCTIONS`, `WRITING_EXAMPLES`, and `ADDITIONAL_CONTEXT` may differ from the requested article language. In particular, the structure and planning material may be written in Portuguese. **Regardless of the language of the input materials, the article itself must be written entirely in the language specified by `ARTICLE_LANGUAGE`.** Translate conceptual instructions internally as needed, but do not change the meaning, structure, headings, or placeholders unless explicitly instructed.

In case of conflict, prioritize:

`LEARNING_SCOPE → ARTICLE_STRUCTURE → WRITING_INSTRUCTIONS → ADDITIONAL_CONTEXT → WRITING_EXAMPLES`

# TASK

Write the complete first draft of the article.

Transform all conceptual instructions in the `ARTICLE_STRUCTURE` into natural, developed prose while preserving headings, examples, pedagogical progression, and placeholders.

Write it as a continuous article, not as a mechanical expansion of bullet points. Determine paragraph length autonomously and connect related ideas with natural transitions.

Preserve the planned pedagogical progression: do not introduce formalism or concepts before the reader has enough context to understand them.

Write the entire article in the language specified by `ARTICLE_LANGUAGE`, even if the `ARTICLE_STRUCTURE` or any other input section is written in another language.

Prioritize:

1. conceptual correctness;
2. fidelity to the learning scope and structure;
3. clarity and pedagogical progression;
4. fluidity;
5. concision.

# FORMAT

Return only the article in Markdown.

Preserve the headings from the `ARTICLE_STRUCTURE` and copy all image, animation, visualization, and playground placeholders literally.

Do not include comments about the process, editorial decisions, suggestions, or explanations of what you did.

The final article must be written entirely in the language specified by `ARTICLE_LANGUAGE`.

# INPUT

<ARTICLE_LANGUAGE>
english
</ARTICLE_LANGUAGE>

<LEARNING_SCOPE>
# 1. Tópico

- **Provisional title:** Beyond CART: Decision Trees Don’t Have to Look Like CART
- **Central question or idea:** Which assumptions define a standard CART tree, and what happens when we change them?
- **Why this deserves an article:** A decision tree is often taught as if its CART formulation were the definition of a decision tree: one feature per split, hard left/right routing, independently chosen splits, and constant predictions at the leaves. In reality, these are design choices. Changing the split function, routing mechanism, structural constraints, or leaf model produces substantially different families of trees. Comparing these variants reveals what a decision tree fundamentally is and the trade-offs introduced by different architectural choices.

# 2. Learning Scope

- **Central theme:** Variations of the decision-tree architecture beyond standard CART.
- **Primary learning objective:** Understand that a decision tree is a general routing-and-prediction architecture, while CART represents one particular set of design choices. The reader should be able to identify which assumption changes in an oblique, soft, oblivious, or model tree and reason about what that change provides and costs.
- **Supporting concepts:**
    - CART as the baseline architecture
    - Axis-aligned versus oblique splits
    - Hard versus soft/probabilistic routing
    - Independent versus depth-shared splitting rules
    - Constant versus learned leaf predictors
    - Expressiveness versus structural constraints
    - Interpretability and computational trade-offs
    - The distinction between **tree architecture** and **tree training algorithm**
- **Required prerequisites:**
    - Basic decision-tree structure: root, internal nodes, branches, and leaves
    - How a standard CART split works: $x_j < t$
    - Basic classification or regression concepts
- **Helpful prerequisites:**
    - Sigmoid function
    - Linear decision boundaries
    - Basic probability
    - Basic gradient descent
- **Not required:**
    - Mixed-integer programming
    - Genetic algorithms
    - Optimal decision-tree algorithms
    - Neural-network training details
    - Tree ensembles such as Random Forest or Gradient Boosting
    - Mathematical optimization theory
- **Scope boundaries:**
    - Use **standard CART** as the reference architecture.
    - Cover four primary variations:
        1. **Oblique trees — change the split:** $x_j < t \rightarrow w^\top x < t$
        2. **Soft trees — change the routing:** deterministic left/right routing $\rightarrow$ probabilistic routing
        3. **Oblivious trees — change the structure:** independent node splits $\rightarrow$ one shared splitting rule per depth
        4. **Model trees — change the leaves:** constant predictions $\rightarrow$ local predictive models
    - Other tree variants may be mentioned briefly only when they reinforce this taxonomy.
    - Do not turn the article into a survey of every historical decision-tree algorithm.
    - Do not deeply explain how these architectures are optimized. Greedy search, gradient-based optimization, genetic algorithms, MIP, dynamic programming, and globally optimal trees belong to a separate article about **how trees are trained**.
    - Do not focus on ensemble methods. CatBoost may appear as a practical example of oblivious/symmetric trees, but boosting itself is outside the scope.
    - Focus on the architectural trade-off introduced by each modification rather than benchmarking which tree type is universally “best.”

## Intended mental model

The reader should finish the article seeing a decision tree as four configurable components:

$$
\boxed{\text{Split} \rightarrow \text{Routing} \rightarrow \text{Structure} \rightarrow \text{Leaf}}
$$

Standard CART makes one choice for each:

$$
\text{Split}: x_j < t,\quad \text{Routing}: \text{hard left/right},\quad \text{Structure}: \text{independent splits},\quad \text{Leaf}: \text{constant prediction}
$$

Different tree families emerge by changing one of these assumptions:

$$
\text{Oblique} \rightarrow \text{change the split},\quad \text{Soft} \rightarrow \text{change the routing},\quad \text{Oblivious} \rightarrow \text{change the structure},\quad \text{Model tree} \rightarrow \text{change the leaf}
$$

The central takeaway is therefore not simply **“there are many kinds of decision trees.”**

It is:

> **CART is one particular architecture inside a much larger decision-tree design space.**
> 

Standard CART assumes:

- **Axis-aligned splits:** each split considers a single feature.
- **Hard routing:** each observation goes entirely left or right.
- **Independent node splits:** each internal node can use its own splitting rule.
- **Constant leaf predictions:** each leaf produces a constant value or class distribution.
- **Binary branching:** each internal node has exactly two children.
</LEARNING_SCOPE>

<ARTICLE_STRUCTURE>
# A model is a collection of assumptions

[open by presenting the decision tree as one of the foundational models of machine learning. Briefly connect its importance to the larger family of tree-based methods that remain extremely strong on tabular data]

[briefly introduce CART and explain that when we learn “a decision tree”, we usually learn one particular collection of design choices rather than the only possible definition of a tree]

[present the four CART assumptions that the article will investigate:

* **Axis-aligned splits:** one feature determines each split.
* **Hard routing:** each observation follows exactly one branch.
* **Independent node rules:** every node learns its own splitting rule.
* **Constant leaves:** once an observation reaches a leaf, the prediction is constant.]

[emphasize that these assumptions are not arbitrary mistakes. Together they give CART many of its desirable properties: simple optimization, sparse computation, heterogeneous feature handling, local structure, and interpretability]

[raise the central question of the article: **what happens if we relax each assumption individually?**]

[IMAGE: a simple CART tree in the center. Around it, highlight four pieces independently: the equation inside a node, the left/right routing arrow, different rules across nodes, and the constant values in leaves. Label them Split geometry / Routing / Parameter sharing / Leaf model]

[introduce the central idea explicitly: **a machine-learning model is often better understood as a collection of design assumptions. New model families can emerge when we relax, replace, or share those assumptions.**]

[explain that we are not looking for four universally superior versions of CART. Every relaxation buys something and gives something up. Understanding those exchanges is the purpose of the article]

# Why only one feature?

[show a standard CART node:

[
x_j < t
]

Explain that CART searches for one feature (j) and one threshold (t)]

[ask why the boundary needs to be perpendicular to one feature axis]

[introduce an oblique split:

[
w^\top x < t
]

Explain that a node can instead learn a weighted combination of several features]

[use a simple 2D classification dataset whose natural boundary is diagonal. Show that CART requires multiple axis-aligned cuts while one oblique split can solve the same geometry]

[IMAGE: same dataset twice. Left: several staircase-like CART partitions approximating a diagonal boundary. Right: one diagonal oblique split]

[make the main lesson explicit: **greater node complexity can produce lower tree complexity.** We moved representational power from the tree structure into the individual node]

[briefly explain the tradeoff. CART searches over ((j,t)); an oblique tree must search over ((w,t)). The representation becomes more efficient, but optimization becomes harder and individual decisions become less interpretable]

[briefly mention that there are several ways of learning (w): candidate directions, linear models, direct optimization, and differentiable formulations. Do not derive them]

[make the logistic-regression connection explicit: a depth-1 oblique classifier can be essentially a linear classifier. This shows that changing one architectural assumption can make two apparently different model families begin to overlap]

[conclude the section with the transferable lesson: **expressiveness can be distributed differently across a model. Simple components require more structure; stronger components can require less structure.**]

# Why choose only one path?

[start with two almost identical observations around a CART threshold:

[
x=t-\epsilon
\qquad\text{and}\qquad
x=t+\epsilon
]

Show that one goes completely left and the other completely right]

[ANIMATION: move a single observation slowly across a threshold. In the hard tree, its selected branch suddenly switches from left to right and the prediction jumps]

[ask whether routing itself needs to be discrete]

[introduce soft routing by replacing the indicator decision with a smooth gate:

[
p_R(x)=\sigma\left(\frac{x_j-t}{\tau}\right)
]

and

[
p_L(x)=1-p_R(x)
]]

[explain intuitively that an observation can now belong partly to both branches. The tree no longer selects one leaf; it maintains weights over several possible leaves]

[for the simplest depth-1 tree, show:

[
\hat y(x)=p_L(x)v_L+p_R(x)v_R
]

Then generalize briefly: in a deeper tree, each leaf receives the product of the routing probabilities along its path]

[PLAYGROUND: depth-1 regression tree. Show the threshold and two leaf predictions. Let the reader move (x) and control temperature (\tau). Display (p_L), (p_R), and the resulting prediction. As (\tau\rightarrow0), the soft tree visually becomes the hard CART tree]

[explain the deeper consequence: the discrete routing operation has been replaced with a continuous relaxation. Because the gate is differentiable, split parameters can now potentially be learned with gradients together with the rest of the model]

[connect this explicitly to a general ML technique: **when a useful operation is discrete and difficult to optimize, one strategy is to replace it with a differentiable approximation.**]

[explain the price. The model loses the crisp single decision path; observations may activate many leaves; inference can become less sparse; and the model begins to resemble a gated neural architecture]

[briefly acknowledge the tension rather than hiding it: making a tree more differentiable can also remove some properties that made trees attractive]

[conclude with the section lesson: **continuous relaxation exchanges discrete structure for smoother optimization.**]

# Why should every node ask a different question?

[show a normal depth-3 CART tree. Highlight that every internal node is independently free to select its own feature and threshold]

[ask whether this flexibility is always desirable]

[introduce an oblivious or symmetric tree. Every node at the same depth shares the same splitting rule]

[IMAGE: left, irregular CART tree with different questions at every node. Right, perfectly symmetric tree where all nodes on each horizontal level display the same rule]

[explain that this is the opposite direction from the previous modifications. We are not making the tree more expressive. We are deliberately constraining it]

[show conceptually:

[
g_{d,1}=g_{d,2}=\cdots=g_d
]

where every node at depth (d) shares the same decision]

[explain what is lost: one tree has less freedom to adapt locally]

[then explain what is gained: regular structure, predictable memory access, easier vectorization, simpler execution, and useful regularization]

[briefly use CatBoost as the real production anchor. Explain that symmetric or oblivious trees are not merely a theoretical curiosity: CatBoost uses symmetric trees by default, in part because their constrained structure enables very efficient evaluation]

[ANIMATION: evaluate one ordinary tree and one oblivious tree for a small batch. Show the irregular traversal of CART versus applying the same test across each level of the symmetric tree]

[make the general lesson explicit: **more flexibility is not automatically better. Architectural constraints can make models easier to optimize, execute, and generalize.**]

# Why should a leaf be a constant?

[show how CART regression works after partitioning the space. Once (x) reaches leaf (\ell), the prediction is simply:

[
f(x)=c_\ell
]]

[point out the hidden assumption: CART assumes that after finding a sufficiently local region, there is no useful structure left inside it]

[ask why the tree needs to perform both jobs: deciding *which region we are in* and deciding *what function applies inside that region*]

[introduce model trees:

[
f(x)=f_\ell(x)
]

For example, a linear model inside every leaf:

[
f_\ell(x)=\beta_\ell^\top x+b_\ell
]]

[use one simple regression dataset formed by two regimes, each approximately linear but with different slopes. Show that ordinary leaves approximate each regime with steps while model leaves can represent the local trends directly]

[IMAGE: left, piecewise-constant CART approximation. Right, same partition boundaries but each region contains its own fitted line]

[explain the conceptual decomposition:

**Tree:** Which regime am I in?

**Leaf model:** What happens inside this regime?]

[briefly connect this to broader ML ideas such as local models and mixture-of-experts architectures]

[explain the price: each leaf now needs more data and more parameters, fitting becomes more complicated, and the clean simplicity of a constant prediction disappears]

[conclude with the lesson: **different components of a model can specialize in different jobs. Partitioning the input space and modeling behavior inside each region do not need to be the same operation.**]

# A design space, not four algorithms

[return to the original CART tree and place the four assumptions side by side]

[IMAGE: compact table or design-space diagram:

| Design choice   | CART         | Relaxation         |
| --------------- | ------------ | ------------------ |
| Split geometry  | Axis-aligned | Oblique            |
| Routing         | Hard         | Soft               |
| Node rules      | Independent  | Shared / oblivious |
| Leaf prediction | Constant     | Model-based        |

]

[explain that these are largely independent architectural dimensions. We have not discovered four mutually exclusive tree algorithms]

[show that the choices can be combined:

* oblique + hard;
* axis-aligned + soft;
* soft + oblique;
* oblivious + soft;
* oblique + model leaves;
* etc.]

[PLAYGROUND: **Build a Tree.** Use one small 2D dataset and a shallow fixed-depth tree. Provide four controls:

* Split: Axis-aligned / Oblique
* Routing: Hard / Soft
* Rules: Independent / Shared by depth
* Leaves: Constant / Linear

As each control changes, update the decision surface, tree diagram, number of parameters, and approximate number of node evaluations. The purpose is not benchmarking every possible combination; it is letting the reader see that a “model” can be assembled from relatively independent architectural decisions]

[use a few intentionally selected presets rather than expecting the reader to explore all combinations:

**CART**
axis-aligned + hard + independent + constant

**Soft tree**
axis-aligned + soft + independent + constant

**Oblivious tree**
axis-aligned + hard + shared + constant

**Highly relaxed tree**
oblique + soft + independent + linear leaves]

[point out what happens with the last configuration: once splits are linear combinations, gates become differentiable, and leaves become learned functions, the architecture begins to resemble a hierarchical mixture-of-experts neural model]

[raise the question explicitly: **at what point does a modified decision tree stop behaving like the kind of model we originally valued as a tree?**]

# Constraints define models

[return to the opening argument. CART’s assumptions initially looked like limitations that could simply be removed]

[explain that the experiments reveal something different: every restriction was also buying something]

[briefly summarize:

* Axis alignment sacrifices compactness for simple, local decisions.
* Hard routing sacrifices smoothness for sparse computation and crisp paths.
* Independent rules sacrifice regularity for local flexibility.
* Constant leaves sacrifice local expressiveness for simplicity and statistical efficiency.]

[explain that relaxing an assumption therefore does not automatically improve the model. It changes its inductive bias and moves complexity somewhere else]

[IMAGE: CART in the center with four arrows pointing outward toward Oblique / Soft / Oblivious / Model leaves. Under every arrow show **Gain ↔ Cost**, rather than presenting the variants as upgrades]

[finish with the central principle of the article:

**A machine-learning model is not an indivisible algorithm. It is a collection of choices about what the model is allowed to represent, how information flows through it, which parameters are shared, and how predictions are produced.**

Changing one of those choices can create a new model family.]

[close by returning to CART specifically: its restrictions are not merely historical baggage. The fact that many of them survive in some of the strongest tabular models suggests that constraints themselves can be useful inductive biases]

[final sentence should broaden beyond trees: **Learning to design models begins with learning to notice the assumptions hidden inside the models we already use.**]

</ARTICLE_STRUCTURE>

<WRITING_INSTRUCTIONS>

Write in natural, continuous prose. Develop ideas as connected reasoning rather than as sequences of self-contained rhetorical statements.

Prefer sentences whose relationships are expressed naturally through syntax, conjunctions, and transitions. Vary sentence length and structure according to the idea being explained.

Avoid repeatedly using short dramatic qualifications, sentence fragments, artificial punchlines, or formulaic contrasts such as “It is not X. It is Y.” and “It is not just X, but Y.” These constructions are valid occasionally, but should not become recurring rhetorical patterns.

Do not force every paragraph to have a polished hook, contrast, climax, or concluding punchline. Prefer precise, natural explanation over rhetorical effect.

When writing examples are provided, use their cadence, sentence structure, transitions, vocabulary, and paragraph development as the primary stylistic reference.

</WRITING_INSTRUCTIONS>

<WRITING_EXAMPLES>
Introduction
The first algorithm that every machine learning course teaches is linear regression.

It’s undoubtedly one of the most fundamental and widely used algorithms in statistics and machine learning.

This is primarily because of its simplicity and ease of interpretation.

However, despite its prevalence, there is often a surprising oversight – understanding the assumptions that ensure the effectiveness of linear regression.

In other words, linear regression is only effective when certain assumptions are validated. We must revisit the model (or data) if the assumptions are violated.

Linear regression with assumptions validated vs. not validated
In my experience, when someone first learns linear regression, either of the two things happens:

The teaching material does not highlight the critical assumptions that go into linear regression, which guarantees it to work effectively.
Even if it does, in most cases, folks are never taught about the origin of those assumptions.
But it is worth questioning the underlying assumptions of using a specific learning algorithm and why those assumptions should not be violated.

In other words, have you ever wondered what is the origin of linear regression's assumptions?

They can't just appear from thin air, can they?

There should be some concrete reasoning to support them, right?

Thus, in this blog, let me walk you through the origin of each of the assumptions of linear regression in detail.

</WRITING_EXAMPLES>

```

## Comparison

```
# ROLE

You are a technical editor specialized in Machine Learning education.

Your task is to compare two drafts of the same article and determine which one is better.

Be critical and objective. Do not try to artificially balance the comparison. If one article is clearly stronger, say so.

# CONTEXT

You will receive:

* `LEARNING_SCOPE`: what the article should teach and its boundaries.
* `ARTICLE_STRUCTURE`: the intended content and pedagogical progression.
* `WRITING_INSTRUCTIONS`: expected writing style.
* `ARTICLE_1`
* `ARTICLE_2`

Both articles were written from the same plan.

Evaluate the texts themselves. Do not speculate about which model or person wrote them.

# TASK

Compare the two articles based on:

1. **Technical correctness**
2. **Fidelity to the learning scope**
3. **Fidelity to the planned structure**
4. **Pedagogical clarity and progression**
5. **Quality of explanations and examples**
6. **Writing quality and flow**
7. **Concision and information density**
8. **Overall educational effectiveness**

Focus on meaningful differences rather than minor stylistic details.

Be specific about why one version works better than the other. Point to concrete explanations, passages, or structural decisions when useful.

Do not assume that longer, more technical, or more polished writing is automatically better. Judge whether it actually improves understanding.

# FORMAT

Return the evaluation in Markdown with:

## Verdict

Clearly state:

**Article 1 wins**, **Article 2 wins**, or **No meaningful overall winner**.

Briefly explain the main reasons.

## Scores

Score each article from 1–10 on:

| Criterion             | Article 1 | Article 2 |
| --------------------- | --------: | --------: |
| Technical correctness |           |           |
| Pedagogical quality   |           |           |
| Clarity               |           |           |
| Writing quality       |           |           |
| Fidelity to the plan  |           |           |
| Overall effectiveness |           |           |

## Comparison

Explain the most important strengths and weaknesses of each article and the main differences between them.

## Final assessment

Explain why the winner is better and what, if anything, should be preserved from the weaker article.

# INPUT

<LEARNING_SCOPE>
# 1. Tópico

- **Provisional title:** Beyond CART: Decision Trees Don’t Have to Look Like CART
- **Central question or idea:** Which assumptions define a standard CART tree, and what happens when we change them?
- **Why this deserves an article:** A decision tree is often taught as if its CART formulation were the definition of a decision tree: one feature per split, hard left/right routing, independently chosen splits, and constant predictions at the leaves. In reality, these are design choices. Changing the split function, routing mechanism, structural constraints, or leaf model produces substantially different families of trees. Comparing these variants reveals what a decision tree fundamentally is and the trade-offs introduced by different architectural choices.

# 2. Learning Scope

- **Central theme:** Variations of the decision-tree architecture beyond standard CART.
- **Primary learning objective:** Understand that a decision tree is a general routing-and-prediction architecture, while CART represents one particular set of design choices. The reader should be able to identify which assumption changes in an oblique, soft, oblivious, or model tree and reason about what that change provides and costs.
- **Supporting concepts:**
    - CART as the baseline architecture
    - Axis-aligned versus oblique splits
    - Hard versus soft/probabilistic routing
    - Independent versus depth-shared splitting rules
    - Constant versus learned leaf predictors
    - Expressiveness versus structural constraints
    - Interpretability and computational trade-offs
    - The distinction between **tree architecture** and **tree training algorithm**
- **Required prerequisites:**
    - Basic decision-tree structure: root, internal nodes, branches, and leaves
    - How a standard CART split works: $x_j < t$
    - Basic classification or regression concepts
- **Helpful prerequisites:**
    - Sigmoid function
    - Linear decision boundaries
    - Basic probability
    - Basic gradient descent
- **Not required:**
    - Mixed-integer programming
    - Genetic algorithms
    - Optimal decision-tree algorithms
    - Neural-network training details
    - Tree ensembles such as Random Forest or Gradient Boosting
    - Mathematical optimization theory
- **Scope boundaries:**
    - Use **standard CART** as the reference architecture.
    - Cover four primary variations:
        1. **Oblique trees — change the split:** $x_j < t \rightarrow w^\top x < t$
        2. **Soft trees — change the routing:** deterministic left/right routing $\rightarrow$ probabilistic routing
        3. **Oblivious trees — change the structure:** independent node splits $\rightarrow$ one shared splitting rule per depth
        4. **Model trees — change the leaves:** constant predictions $\rightarrow$ local predictive models
    - Other tree variants may be mentioned briefly only when they reinforce this taxonomy.
    - Do not turn the article into a survey of every historical decision-tree algorithm.
    - Do not deeply explain how these architectures are optimized. Greedy search, gradient-based optimization, genetic algorithms, MIP, dynamic programming, and globally optimal trees belong to a separate article about **how trees are trained**.
    - Do not focus on ensemble methods. CatBoost may appear as a practical example of oblivious/symmetric trees, but boosting itself is outside the scope.
    - Focus on the architectural trade-off introduced by each modification rather than benchmarking which tree type is universally “best.”

## Intended mental model

The reader should finish the article seeing a decision tree as four configurable components:

$$
\boxed{\text{Split} \rightarrow \text{Routing} \rightarrow \text{Structure} \rightarrow \text{Leaf}}
$$

Standard CART makes one choice for each:

$$
\text{Split}: x_j < t,\quad \text{Routing}: \text{hard left/right},\quad \text{Structure}: \text{independent splits},\quad \text{Leaf}: \text{constant prediction}
$$

Different tree families emerge by changing one of these assumptions:

$$
\text{Oblique} \rightarrow \text{change the split},\quad \text{Soft} \rightarrow \text{change the routing},\quad \text{Oblivious} \rightarrow \text{change the structure},\quad \text{Model tree} \rightarrow \text{change the leaf}
$$

The central takeaway is therefore not simply **“there are many kinds of decision trees.”**

It is:

> **CART is one particular architecture inside a much larger decision-tree design space.**
> 

Standard CART assumes:

- **Axis-aligned splits:** each split considers a single feature.
- **Hard routing:** each observation goes entirely left or right.
- **Independent node splits:** each internal node can use its own splitting rule.
- **Constant leaf predictions:** each leaf produces a constant value or class distribution.
- **Binary branching:** each internal node has exactly two children.
</LEARNING_SCOPE>

<ARTICLE_1>
# A model is a collection of assumptions

Decision trees are one of the foundational models of machine learning. They are easy to visualize, require relatively few assumptions about the shape of the data, and form the basis of some of the strongest methods for tabular problems.

When decision trees are first introduced, however, we usually learn one particular version of them: **CART**, or Classification and Regression Trees.

A standard CART tree makes several architectural choices:

* **Axis-aligned splits:** one feature determines each split.
* **Hard routing:** each observation follows exactly one branch.
* **Independent node rules:** every node learns its own splitting rule.
* **Constant leaves:** once an observation reaches a leaf, the prediction is constant.

These choices are so familiar that they can easily start to feel like the definition of a decision tree itself. But they are not.

They are design assumptions.

Importantly, they are also useful assumptions. Restricting each node to one feature makes split search relatively simple and individual decisions easy to inspect. Hard routing means that only one path needs to be evaluated for each observation. Independent nodes allow different parts of the feature space to behave differently, while constant leaves keep local predictions statistically and computationally simple.

Together, these restrictions give CART many of the properties that make trees attractive in the first place: sparse computation, heterogeneous feature handling, local structure, straightforward optimization, and interpretability.

But what happens if we relax them individually?

[IMAGE: a simple CART tree in the center. Around it, highlight four pieces independently: the equation inside a node, the left/right routing arrow, different rules across nodes, and the constant values in leaves. Label them Split geometry / Routing / Parameter sharing / Leaf model]

This is a useful way to think about machine-learning models more generally. A model is often better understood as a collection of design assumptions. New model families can emerge when we relax, replace, or share those assumptions.

The goal is not to find four improved versions of CART. Every modification will give us something while taking something else away. What matters is understanding that exchange.

# Why only one feature?

A standard CART node asks a question of the form

[
x_j < t
]

where (j) selects one feature and (t) is a threshold.

If we have two features (x_1) and (x_2), the split might therefore be

[
x_1 < 3.7
]

or

[
x_2 < 8.1.
]

Geometrically, this restricts the decision boundary to be perpendicular to one of the feature axes.

But why should that restriction exist?

Suppose two classes in a 2D dataset are naturally separated by a diagonal line. An axis-aligned tree cannot draw that line directly. It must approximate it using several horizontal and vertical cuts, creating the familiar staircase-like partition produced by decision trees.

An **oblique tree** changes the splitting function itself. Instead of examining one feature, a node can examine a weighted combination of features:

[
w^\top x < t.
]

For two features, this could become

[
0.8x_1 - 0.5x_2 < 2.
]

The node can now create a diagonal boundary.

[IMAGE: same dataset twice. Left: several staircase-like CART partitions approximating a diagonal boundary. Right: one diagonal oblique split]

This changes where the model stores its representational complexity.

CART keeps each individual node extremely simple, so complicated boundaries must emerge from many nodes arranged into a deeper tree. An oblique tree gives each node more expressive power, which can allow a much smaller tree to represent the same geometry.

In other words, **greater node complexity can produce lower tree complexity**.

That extra expressiveness is not free. CART searches over candidate pairs ((j,t)): choose a feature, then choose a threshold. An oblique node must search over ((w,t)), where (w) may contain one coefficient for every feature. The search space becomes much larger, and a decision involving several weighted variables is generally harder to interpret than a rule such as `age < 35`.

There are many ways to learn (w). Some methods test candidate directions, some fit linear models, and others optimize the coefficients directly or use differentiable formulations. The exact training procedure is a separate question from the architecture itself.

There is also an interesting boundary case. A tree containing only one oblique split is essentially learning a linear decision boundary. Depending on the formulation, it begins to look remarkably similar to a linear classifier such as logistic regression.

By changing only one assumption, two model families that initially look unrelated start to overlap.

The broader lesson is that expressiveness can be distributed across a model in different ways. Simple components generally require more structure around them; stronger components can sometimes accomplish the same task with less structure.

# Why choose only one path?

Consider two observations lying almost exactly on opposite sides of a CART threshold:

[
x=t-\epsilon
]

and

[
x=t+\epsilon.
]

Even if (\epsilon) is tiny, the first observation goes completely to one branch and the second goes completely to the other.

[ANIMATION: move a single observation slowly across a threshold. In the hard tree, its selected branch suddenly switches from left to right and the prediction jumps]

This happens because CART routing is discrete. Each split produces a binary decision: left or right.

But the routing operation itself does not have to be discrete.

A **soft tree** replaces the hard decision with a smooth gate. One possible formulation is

[
p_R(x)=\sigma\left(\frac{x_j-t}{\tau}\right)
]

and

[
p_L(x)=1-p_R(x),
]

where (\sigma) is the sigmoid function and (\tau) controls how gradual the transition is.

Instead of saying that an observation belongs entirely to the left or right branch, the tree can assign weight to both.

For a depth-1 regression tree with leaf values (v_L) and (v_R), the prediction becomes

[
\hat y(x)=p_L(x)v_L+p_R(x)v_R.
]

An observation close to the threshold might receive

[
p_L(x)=0.55,\qquad p_R(x)=0.45,
]

so both leaves contribute to the prediction.

In a deeper tree, the same idea continues recursively. The weight assigned to a leaf is the product of the routing probabilities along the path leading to it.

[PLAYGROUND: depth-1 regression tree. Show the threshold and two leaf predictions. Let the reader move (x) and control temperature (\tau). Display (p_L), (p_R), and the resulting prediction. As (\tau\rightarrow0), the soft tree visually becomes the hard CART tree]

The parameter (\tau) makes the relationship with CART especially clear. With a large temperature, routing changes gradually around the threshold. As

[
\tau\rightarrow0,
]

the transition becomes increasingly sharp, until the soft gate approaches the hard left-or-right decision used by CART.

Something deeper has happened than merely smoothing the prediction. We replaced a discrete operation with a continuous relaxation.

Because the gate is differentiable, parameters controlling the split can potentially be adjusted using gradients together with other parameters in the model. This is an instance of a much broader technique in machine learning: when an operation is useful but discrete and difficult to optimize, we can sometimes replace it with a differentiable approximation.

Again, the relaxation comes with a price.

A hard tree evaluates one crisp path. A soft tree may assign meaningful probability to several paths simultaneously, which makes inference less sparse and explanations less direct. Instead of saying that an observation reached a leaf because three decisions were true, we may need to describe how several weighted paths contributed to its prediction.

As more of the tree becomes differentiable, its computation also begins to resemble a gated neural architecture.

This exposes an important tension. Making a tree easier to integrate with gradient-based learning can remove some of the discrete structure that made trees attractive.

**Continuous relaxation exchanges discrete structure for smoother optimization.**

# Why should every node ask a different question?

In a normal CART tree, every internal node is independent.

A depth-3 tree might ask about `income` at the root, `age` on one branch, `account_age` on another, and completely different questions farther down the tree.

That flexibility is useful because each region of the input space can develop its own local logic. But do we always need it?

An **oblivious tree**, also called a **symmetric tree**, imposes a strong structural constraint: every node at the same depth uses the same splitting rule.

[IMAGE: left, irregular CART tree with different questions at every node. Right, perfectly symmetric tree where all nodes on each horizontal level display the same rule]

If the first level asks

[
x_3 < 5,
]

every observation is evaluated using that rule. At the second level, another rule is chosen and applied regardless of which first-level branch the observation followed.

Conceptually, if (g_{d,i}) denotes the split used by node (i) at depth (d), then an oblivious tree imposes

[
g_{d,1}=g_{d,2}=\cdots=g_d.
]

This modification moves in the opposite direction from oblique and soft trees.

We are deliberately making the model **less expressive**.

A standard tree can specialize each node to a small local region. An oblivious tree cannot. If one branch would benefit from splitting on age while another would benefit from splitting on income at the same depth, the model must still choose a single shared rule.

What we gain is regularity.

Because every observation receives the same test at each depth, evaluation becomes highly structured. Memory access is more predictable, operations can be vectorized more easily, and a complete path can be represented by the sequence of binary outcomes produced across the levels.

The constraint can also act as regularization. By preventing different branches from independently inventing increasingly specialized rules, we reduce the flexibility of each individual tree.

This architecture is not merely theoretical. CatBoost uses symmetric trees by default. Their regular structure is particularly convenient for efficient evaluation, which matters when large numbers of trees must be executed repeatedly in production.

[ANIMATION: evaluate one ordinary tree and one oblivious tree for a small batch. Show the irregular traversal of CART versus applying the same test across each level of the symmetric tree]

The interesting point is that we improved some properties of the model by restricting what it was allowed to do.

More flexibility is not automatically better. Architectural constraints can make models easier to execute, regularize, and sometimes optimize, even when those constraints reduce the expressive power of an individual model.

# Why should a leaf be a constant?

So far we have changed the internal nodes. The leaves contain another assumption that is easy to overlook.

In CART regression, once an observation reaches leaf (\ell), its prediction is simply

[
f(x)=c_\ell.
]

Every observation reaching that leaf receives the same value.

This means that CART is making an implicit assumption: once the input space has been partitioned into a sufficiently local region, there is no remaining structure inside that region worth modeling.

Consider a regression problem with two regimes. In the first region, the target increases approximately linearly with (x). In the second region, it also follows a roughly linear trend, but with a different slope.

A standard regression tree can identify the two regimes. Once inside each regime, however, it still approximates the trend using constant steps. Capturing the slope requires additional partitions.

Why should the tree have to do both jobs?

A **model tree** separates them.

Instead of storing a constant in leaf (\ell),

[
f(x)=f_\ell(x),
]

where (f_\ell) is itself a predictive model.

For example, each leaf might contain a linear regression:

[
f_\ell(x)=\beta_\ell^\top x+b_\ell.
]

[IMAGE: left, piecewise-constant CART approximation. Right, same partition boundaries but each region contains its own fitted line]

The resulting decomposition is useful:

**Tree:** Which regime am I in?

**Leaf model:** What happens inside this regime?

The tree handles discontinuities and regime changes, while the leaf model handles smoother local relationships.

This idea connects naturally to local models and mixture-of-experts architectures. Different parts of the input space can use different predictive functions, with the tree acting as the mechanism that selects which local model should be responsible.

The cost is additional complexity. A constant leaf may need only a mean or a class distribution. A linear leaf requires several coefficients, enough local observations to estimate them reliably, and a more involved fitting procedure.

As the leaf models become more expressive, the original simplicity of tree predictions gradually disappears.

Still, the architectural lesson is broader than model trees themselves: different parts of a model can specialize in different jobs. Partitioning the input space and modeling behavior inside each partition do not need to be performed by the same mechanism.

# A design space, not four algorithms

We can now return to the original CART tree and describe it as a collection of choices.

[IMAGE: compact table or design-space diagram:

| Design choice   | CART         | Relaxation         |
| --------------- | ------------ | ------------------ |
| Split geometry  | Axis-aligned | Oblique            |
| Routing         | Hard         | Soft               |
| Node rules      | Independent  | Shared / oblivious |
| Leaf prediction | Constant     | Model-based        |

]

These dimensions are largely independent.

An oblique tree does not need soft routing. A soft tree does not need linear leaves. An oblivious tree can still use ordinary axis-aligned splits.

We can therefore construct combinations such as:

* oblique + hard;
* axis-aligned + soft;
* soft + oblique;
* oblivious + soft;
* oblique + model leaves.

Thinking in terms of architecture makes these combinations much easier to understand. We have not discovered four mutually exclusive algorithms. We have identified four decisions that CART happens to make in one particular way.

[PLAYGROUND: **Build a Tree.** Use one small 2D dataset and a shallow fixed-depth tree. Provide four controls:

* Split: Axis-aligned / Oblique
* Routing: Hard / Soft
* Rules: Independent / Shared by depth
* Leaves: Constant / Linear

As each control changes, update the decision surface, tree diagram, number of parameters, and approximate number of node evaluations. The purpose is not benchmarking every possible combination; it is letting the reader see that a “model” can be assembled from relatively independent architectural decisions]

A few presets make the design space easier to navigate.

**CART**

axis-aligned + hard + independent + constant

**Soft tree**

axis-aligned + soft + independent + constant

**Oblivious tree**

axis-aligned + hard + shared + constant

**Highly relaxed tree**

oblique + soft + independent + linear leaves

The last configuration is particularly revealing.

Its nodes compute weighted combinations of features. Its routing is smooth and differentiable. Several paths may contribute to a prediction. Its leaves contain learned functions rather than constants.

At that point, the architecture begins to resemble a hierarchical mixture-of-experts neural model much more than the textbook tree we started with.

This raises an interesting question: **at what point does a modified decision tree stop behaving like the kind of model we originally valued as a tree?**

There is no single boundary. But the question matters because every relaxation changes not only what the model can represent, but also how it computes, how it is trained, and how easily its predictions can be understood.

# Constraints define models

At the beginning, CART's assumptions looked like limitations.

Why restrict a split to one feature when several could be combined? Why force an observation onto one branch? Why prevent nodes from sharing parameters? Why make every leaf constant?

After relaxing them individually, the picture becomes more nuanced.

Each restriction was buying something:

* Axis alignment sacrifices compactness for simple, local decisions.
* Hard routing sacrifices smoothness for sparse computation and crisp paths.
* Independent rules sacrifice regularity for local flexibility.
* Constant leaves sacrifice local expressiveness for simplicity and statistical efficiency.

Relaxing an assumption therefore does not automatically improve the model. It changes its inductive bias and moves complexity somewhere else.

[IMAGE: CART in the center with four arrows pointing outward toward Oblique / Soft / Oblivious / Model leaves. Under every arrow show **Gain ↔ Cost**, rather than presenting the variants as upgrades]

This gives us a more useful way to think about machine-learning architectures.

**A machine-learning model is not an indivisible algorithm. It is a collection of choices about what the model is allowed to represent, how information flows through it, which parameters are shared, and how predictions are produced.**

Changing one of those choices can create a new model family.

CART's restrictions are therefore more than historical baggage. Many of them remain present in some of the strongest models for tabular data precisely because constraints can be useful inductive biases.

**Learning to design models begins with learning to notice the assumptions hidden inside the models we already use.**

</ARTICLE_1>

<ARTICLE_2>
# Beyond CART: Decision Trees Don’t Have to Look Like CART

## A model is a collection of assumptions

The decision tree is one of the first models that appears in machine learning courses, and for good reason. It requires no feature scaling, handles heterogeneous data types naturally, captures interactions through its hierarchical structure, and remains one of the few model families that a non-specialist can inspect and understand at a glance. These properties explain why tree-based methods, from simple CART to modern gradient-boosted implementations, continue to dominate tabular data competitions and production systems decades after their introduction.

When textbooks teach "a decision tree," what they almost always mean is a very specific formulation known as CART: Classification and Regression Trees. This formulation is so standard that its particular design choices have become synonymous with the term "decision tree" itself. Yet those choices represent only one point in a substantially larger design space, and recognizing this opens the door to a richer understanding of what tree models can be.

Standard CART rests on four architectural assumptions. First, splits are **axis-aligned**: each internal node tests a single feature against a threshold, producing decisions of the form \(x_j < t\). Second, routing is **hard**: each observation follows exactly one branch, arriving at exactly one leaf. Third, node rules are **independent**: every internal node learns its own splitting rule without reference to what other nodes at the same depth are doing. Fourth, leaves are **constant**: once an observation reaches a leaf, the prediction is a fixed value or class distribution, with no further structure.

These assumptions are not mistakes. Together they give CART its desirable properties. Axis-aligned splits keep individual decisions interpretable and make the search over possible splits computationally tractable. Hard routing guarantees sparse evaluation—only the nodes along one path need to be computed for each prediction. Independent node rules allow the tree to adapt locally, asking different questions in different regions of the input space. Constant leaves provide statistical stability, since a leaf prediction requires estimating only one or a few parameters from the observations that fall into it. Removing any one of these assumptions changes what the model can represent, what it costs to train, and how it behaves at inference time.

The question that motivates this article is: **what happens if we relax each assumption individually?** By modifying one component at a time, we can map the trade-offs that define the broader decision-tree design space.

[IMAGE: a simple CART tree in the center. Around it, highlight four pieces independently: the equation inside a node, the left/right routing arrow, different rules across nodes, and the constant values in leaves. Label them Split geometry / Routing / Parameter sharing / Leaf model]

A machine-learning model is often better understood as a collection of design assumptions rather than as a monolithic algorithm. When we relax, replace, or share those assumptions, new model families emerge that inherit some properties of the original while changing others.

This article does not argue that any of the four variants we will examine is universally superior to CART. Each relaxation buys something—more expressiveness, smoother optimization, greater regularity—and gives something up in return. Understanding those exchanges, rather than memorizing a catalog of variants, is the purpose of what follows.

## Why only one feature?

Consider the test performed at a typical CART internal node. Given an observation \(x \in \mathbb{R}^d\), the tree selects one feature index \(j\) and one threshold \(t\), then routes the observation left if \(x_j < t\) and right otherwise. The search during training therefore spans all possible pairs \((j, t)\), where \(j\) ranges over the available features and \(t\) over candidate thresholds.

Geometrically, this test corresponds to a decision boundary that is perpendicular to feature axis \(j\). The question the tree is allowed to ask is always of the form: "Is the value of this single feature above or below some cutoff?" But why should the boundary need to be perpendicular to one of the axes? A boundary running diagonally through the feature space might separate the data more compactly, yet CART has no way of expressing such a boundary with a single split.

An **oblique split** relaxes this restriction by allowing the node to learn a linear combination of features:

\[
w^\top x < t
\]

where \(w\) is a weight vector and \(t\) remains a threshold. The decision boundary is now a hyperplane with arbitrary orientation, not one constrained to be axis-aligned. The node can ask questions like "Is \(2x_1 - 3x_2\) below 5?" rather than being limited to questions about one feature at a time.

Consider a two-dimensional classification dataset where the natural boundary between classes runs diagonally across the feature space. A CART tree must approximate this diagonal with a staircase of axis-aligned cuts, partitioning the space into a grid of rectangles and assigning each rectangle to one class or the other. An oblique tree, by contrast, can place a single diagonal split that captures the boundary directly.

[IMAGE: same dataset twice. Left: several staircase-like CART partitions approximating a diagonal boundary. Right: one diagonal oblique split]

The lesson here is that **greater node complexity can produce lower tree complexity**. The oblique split moves representational power from the tree structure into the individual node. A single oblique node does work that might require several levels of axis-aligned splits to approximate, yielding a shallower tree with fewer leaves.

That gain comes at a price. CART's search over \((j, t)\) is simple and efficient: there are finitely many candidate features and finitely many meaningful thresholds for each. An oblique tree must search over \((w, t)\), where \(w\) is a continuous vector in \(\mathbb{R}^d\). The optimization problem becomes substantially harder, and the resulting splits lose much of their interpretability. "Age below 40" is easy to explain; "0.7 times age minus 1.2 times income below 3.4" requires more cognitive effort, and this gap widens as the dimensionality grows.

Several approaches exist for learning oblique splits, ranging from randomized candidate directions to linear models fit locally at each node to fully differentiable formulations that optimize the weight vector jointly with the rest of the tree. The details of these training procedures are a separate topic; for our purposes, the architectural point is what matters.

One illuminating observation is that a depth-1 oblique classifier is essentially a linear classifier. If the root node computes \(w^\top x < t\) and each leaf stores a constant, the resulting model is exactly a logistic regression or linear discriminant with a learned threshold. Changing one architectural assumption—replacing axis-aligned splits with oblique ones—makes a decision tree begin to overlap with an apparently different model family. The boundary between "tree" and "linear model" is not as sharp as the taxonomy of algorithms might suggest.

The transferable lesson: **expressiveness can be distributed differently across a model.** When components are simple—as axis-aligned splits are—the tree needs more of them, arranged in a deeper structure, to represent complex boundaries. When components are stronger, the same boundaries can be represented with less structure. The total representational capacity is shared between the sophistication of individual components and the complexity of their arrangement.

## Why choose only one path?

Consider two observations near a CART threshold. If the split tests \(x_j < t\), then an observation with \(x_j = t - \epsilon\) goes entirely left, while one with \(x_j = t + \epsilon\) goes entirely right. The difference between them can be arbitrarily small, yet their assigned paths through the tree are completely disjoint, and their predictions may differ dramatically.

[ANIMATION: move a single observation slowly across a threshold. In the hard tree, its selected branch suddenly switches from left to right and the prediction jumps]

This discontinuity is a direct consequence of hard routing. The routing decision is a step function: it outputs 0 for all values below the threshold and 1 for all values above it, with no intermediate states. But does routing need to be discrete? Could an observation belong partly to both branches, with the degree of membership varying smoothly as it moves across the threshold?

**Soft routing** replaces the hard step with a smooth gate. Instead of an indicator function, the probability of going right is given by a sigmoid:

\[
p_R(x) = \sigma\left(\frac{x_j - t}{\tau}\right)
\]

and the probability of going left is \(p_L(x) = 1 - p_R(x)\). The parameter \(\tau\), often called a temperature, controls how sharply the gate transitions from 0 to 1. Large \(\tau\) produces gentle transitions; as \(\tau \to 0\), the sigmoid approaches the hard step function of CART.

Intuitively, an observation can now belong partly to both branches. The tree no longer selects a single leaf; instead, it maintains weights over several possible leaves. For a depth-1 tree with leaf predictions \(v_L\) and \(v_R\), the model's output becomes:

\[
\hat y(x) = p_L(x) v_L + p_R(x) v_R
\]

For deeper trees, each leaf receives the product of routing probabilities along its path, and the final prediction is a weighted average over all leaves. An observation that sits near a threshold contributes to the predictions of leaves on both sides, with influence proportional to the routing probabilities.

[PLAYGROUND: depth-1 regression tree. Show the threshold and two leaf predictions. Let the reader move (x) and control temperature (\tau). Display (p_L), (p_R), and the resulting prediction. As (\tau\rightarrow0), the soft tree visually becomes the hard CART tree]

The deeper consequence of soft routing is that the discrete routing operation has been replaced with a continuous relaxation. The sigmoid gate is differentiable everywhere, which means split parameters—the feature index, the threshold, and even the temperature—can potentially be learned with gradient-based methods together with the rest of the model. This is not possible with hard routing, where the step function has zero gradient almost everywhere.

This connects to a general machine-learning technique: **when a useful operation is discrete and difficult to optimize, one strategy is to replace it with a differentiable approximation.** The soft tree applies this idea directly, trading exact discreteness for smoothness that gradient-based optimizers can exploit.

The price is equally clear. The model loses the crisp single decision path that makes CART interpretable. Observations may activate many leaves simultaneously, inference becomes less sparse because every observation contributes to a weighted sum over many leaves, and the architecture begins to resemble a gated neural network more than a traditional tree. The tension is genuine: making a tree more differentiable can also remove some of the properties that made trees attractive in the first place, such as sparse evaluation, simple explanations, and natural handling of heterogeneous features.

The section lesson: **continuous relaxation exchanges discrete structure for smoother optimization.** Whether that exchange is worthwhile depends on whether the optimization benefits outweigh the loss of interpretability and sparsity for the problem at hand.

## Why should every node ask a different question?

A standard depth-3 CART tree gives every internal node the freedom to select its own feature and threshold. The root might split on age, its left child on income, and its right child on education level, with no requirement that these choices be coordinated. This flexibility is one of CART's strengths: the tree adapts its questions to the local structure of the data in each region.

But is this flexibility always desirable? Consider what is lost when every node is independently parameterized. The tree's evaluation path is irregular: to process a batch of observations, each observation follows a different route through the tree, visiting different nodes and performing different feature lookups. This irregularity complicates efficient implementation, particularly on hardware that benefits from regular memory access patterns and vectorized computation.

An **oblivious tree**, also called a symmetric tree, imposes a different structure. Every node at the same depth shares the same splitting rule. If depth 1 splits on feature \(j_1\) at threshold \(t_1\), then every depth-1 node uses exactly that rule; if depth 2 splits on \(j_2\), then all depth-2 nodes use the same \(j_2\) and \(t_2\), and so on.

[IMAGE: left, irregular CART tree with different questions at every node. Right, perfectly symmetric tree where all nodes on each horizontal level display the same rule]

Formally, for every node at depth \(d\), the splitting rule is identical:

\[
g_{d,1} = g_{d,2} = \cdots = g_d
\]

This is the opposite direction from the previous modifications. Oblique splits made individual nodes more expressive; soft routing made the flow more continuous. The oblivious tree deliberately constrains the model, removing the freedom of each node to adapt locally.

What is lost is clear: one tree has less freedom to adapt to local structure, since it must apply the same question across all regions at a given depth. This constraint acts as a form of regularization, limiting the tree's capacity to fit idiosyncratic patterns in the training data.

What is gained is equally concrete. Because all nodes at a given depth apply the same test, evaluating the tree for a batch of observations becomes highly regular. The same feature is accessed and the same comparison is performed for every observation at each level, which enables efficient vectorization and predictable memory access. The tree's structure is also easier to analyze and reason about, since the number of distinct decisions is just the tree depth, not the number of internal nodes.

CatBoost, one of the strongest gradient-boosting libraries for tabular data, uses symmetric trees by default. This is not a purely theoretical preference: the constrained structure enables the very efficient evaluation and training procedures that contribute to CatBoost's practical performance. The oblivious tree is therefore a production-proven design, not just an intellectual curiosity.

[ANIMATION: evaluate one ordinary tree and one oblivious tree for a small batch. Show the irregular traversal of CART versus applying the same test across each level of the symmetric tree]

The general lesson: **more flexibility is not automatically better.** Architectural constraints can make models easier to optimize, execute, and generalize by trading away capacity that may not be needed and that may even encourage overfitting. The oblivious tree demonstrates that sometimes the right move is to impose structure rather than remove it.

## Why should a leaf be a constant?

Once a CART tree has partitioned the input space, each leaf produces a single constant prediction. For regression, the leaf value is typically the mean of the training observations that fall into that leaf; for classification, it is the class distribution. The hidden assumption is that within any sufficiently local region, there is no useful structure left to model—the best prediction is just a constant.

But why should the tree need to perform both jobs? The tree is responsible for deciding *which region we are in*, and then it is also responsible for deciding *what function applies inside that region*. These are conceptually distinct tasks, and CART couples them by requiring that the answer to the second question always be "a constant."

**Model trees** relax this by allowing each leaf to contain a learned predictive model. For example, a linear model tree fits a separate linear function inside every leaf:

\[
f_\ell(x) = \beta_\ell^\top x + b_\ell
\]

When an observation reaches leaf \(\ell\), the prediction is the output of that leaf's linear model applied to the observation's features, rather than a fixed constant.

Consider a regression dataset formed by two regimes, each approximately linear but with different slopes and intercepts. A CART tree must approximate each regime with a staircase of constant steps, requiring many leaves and still producing visible approximation error. A model tree with the same partition boundaries can represent each regime directly with a single fitted line per leaf.

[IMAGE: left, piecewise-constant CART approximation. Right, same partition boundaries but each region contains its own fitted line]

This reveals a clean conceptual decomposition. The tree structure answers: *Which regime am I in?* The leaf model answers: *What happens inside this regime?* These two questions can be answered by different components of the model, each specialized for its role.

The connection to broader machine-learning ideas is immediate. Mixture-of-experts architectures, which route inputs to specialized submodels, embody the same principle: a gating mechanism decides which experts handle each input, and the experts themselves are predictive models. Model trees are a simple instance of this family, with a tree serving as the gating mechanism and leaf models serving as the experts.

The price of this decomposition is that each leaf now needs more data and more parameters. Fitting a linear model per leaf requires sufficient observations in each leaf to estimate its coefficients reliably, which places greater demands on the training data and complicates the fitting procedure. The clean simplicity of a constant prediction disappears: the leaf is no longer a single number but a parameter vector.

The section lesson: **different components of a model can specialize in different jobs.** Partitioning the input space and modeling behavior inside each region do not need to be the same operation. Separating these concerns can produce models that are more expressive per unit of structure, at the cost of increased complexity and data requirements at the leaves.

## A design space, not four algorithms

Returning to the original CART tree, we can now place the four assumptions side by side and see them as independent dimensions of a design space rather than as fixed properties of "decision trees."

[IMAGE: compact table or design-space diagram:

| Design choice   | CART         | Relaxation         |
| --------------- | ------------ | ------------------ |
| Split geometry  | Axis-aligned | Oblique            |
| Routing         | Hard         | Soft               |
| Node rules      | Independent  | Shared / oblivious |
| Leaf prediction | Constant     | Model-based        |
]

These dimensions are largely independent. We have not discovered four mutually exclusive tree algorithms; we have identified four axes along which the architecture can be varied. The variants combine naturally: an oblique tree with hard routing is different from an axis-aligned tree with soft routing, which is different from an oblivious tree with model leaves. The total design space has far more points than the handful of named variants that appear in the literature.

[PLAYGROUND: **Build a Tree.** Use one small 2D dataset and a shallow fixed-depth tree. Provide four controls:

* Split: Axis-aligned / Oblique
* Routing: Hard / Soft
* Rules: Independent / Shared by depth
* Leaves: Constant / Linear

As each control changes, update the decision surface, tree diagram, number of parameters, and approximate number of node evaluations. The purpose is not benchmarking every possible combination; it is letting the reader see that a "model" can be assembled from relatively independent architectural decisions]

Some presets illustrate the range of possibilities more clearly than exhaustive exploration. **CART** combines axis-aligned splits, hard routing, independent rules, and constant leaves—the baseline from which this article began. A **soft tree** changes only the routing, keeping everything else CART-like but producing smooth, differentiable predictions. An **oblivious tree** changes only the structure, imposing depth-shared rules while keeping hard routing and constant leaves. A **highly relaxed tree** changes everything at once: oblique splits, soft routing, independent rules, and linear leaves. This last configuration begins to resemble a hierarchical mixture-of-experts neural model, where linear combinations route inputs through differentiable gates toward locally specialized regressors.

That resemblance raises a question worth pausing on: **at what point does a modified decision tree stop behaving like the kind of model we originally valued as a tree?** When splits become linear combinations, gates become smooth, and leaves become learned functions, the properties that distinguished a tree—sparse evaluation, simple explanations, discrete decision paths—have all been eroded. The model may still be useful, but it is no longer the interpretable, lightweight structure that the word "tree" evokes.

## Constraints define models

CART's assumptions initially looked like limitations that could simply be removed. Each section of this article began by identifying something CART cannot do—represent diagonal boundaries, produce smooth predictions, share structure across nodes, model trends within leaves—and then showed how relaxing the corresponding assumption enables that capability.

But the experiments reveal something more subtle: every restriction was also buying something. Axis alignment sacrifices compactness for simple, locally interpretable decisions and a tractable search space. Hard routing sacrifices smoothness for sparse computation and crisp decision paths. Independent node rules sacrifice regularity for local flexibility. Constant leaves sacrifice local expressiveness for simplicity and statistical efficiency, since estimating a constant requires far less data than fitting a model.

Relaxing an assumption therefore does not automatically improve the model. It changes the inductive bias and moves complexity somewhere else—into the search space, into the optimization procedure, into the inference cost, or into the data requirements of individual components.

[IMAGE: CART in the center with four arrows pointing outward toward Oblique / Soft / Oblivious / Model leaves. Under every arrow show **Gain ↔ Cost**, rather than presenting the variants as upgrades]

The central principle of this article extends beyond decision trees:

**A machine-learning model is not an indivisible algorithm. It is a collection of choices about what the model is allowed to represent, how information flows through it, which parameters are shared, and how predictions are produced.**

Changing one of those choices can create a new model family, with its own characteristic strengths, weaknesses, and training procedures. Recognizing these choices as choices—rather than as inevitable parts of whatever model one learned first—is what allows practitioners to select architectures thoughtfully and to combine ideas across model families.

Returning to CART specifically: its restrictions are not merely historical baggage. The fact that many of them survive, in one form or another, in some of the strongest tabular models suggests that constraints themselves can be useful inductive biases. The oblivious trees of CatBoost retain CART's axis-aligned splits and hard routing while imposing stricter structure; the resulting model is not more expressive than a fully flexible tree, yet it performs exceptionally well in practice. Sometimes the constraint is the feature.

Learning to design models begins with learning to notice the assumptions hidden inside the models we already use.
</ARTICLE_2>

```

# 4. Rascunho redigido

# A model is a collection of assumptions

Decision trees are one of the foundational models of machine learning. They are easy to visualize, require relatively few assumptions about the shape of the data, and form the basis of some of the strongest methods for tabular problems.

When decision trees are first introduced, however, we usually learn one particular version of them: **CART**, or Classification and Regression Trees.

A standard CART tree makes several architectural choices:

- **Axis-aligned splits:** one feature determines each split.
- **Hard routing:** each observation follows exactly one branch.
- **Independent node rules:** every node learns its own splitting rule.
- **Constant leaves:** once an observation reaches a leaf, the prediction is constant.

These choices are so familiar that they can easily start to feel like the definition of a decision tree itself. But they are not.

They are design assumptions.

Importantly, they are also useful assumptions. Restricting each node to one feature makes split search relatively simple and individual decisions easy to inspect. Hard routing means that only one path needs to be evaluated for each observation. Independent nodes allow different parts of the feature space to behave differently, while constant leaves keep local predictions statistically and computationally simple.

Together, these restrictions give CART many of the properties that make trees attractive in the first place: sparse computation, heterogeneous feature handling, local structure, straightforward optimization, and interpretability.

But what happens if we relax them individually?

[IMAGE: a simple CART tree in the center. Around it, highlight four pieces independently: the equation inside a node, the left/right routing arrow, different rules across nodes, and the constant values in leaves. Label them Split geometry / Routing / Parameter sharing / Leaf model]

This is a useful way to think about machine-learning models more generally. A model is often better understood as a collection of design assumptions. New model families can emerge when we relax, replace, or share those assumptions.

The goal is not to find four improved versions of CART. Every modification will give us something while taking something else away. What matters is understanding that exchange.

# Why only one feature?

A standard CART node asks a question of the form

[

x_j < t

]

where (j) selects one feature and (t) is a threshold.

If we have two features (x_1) and (x_2), the split might therefore be

[

x_1 < 3.7

]

or

[

x_2 < 8.1.

]

Geometrically, this restricts the decision boundary to be perpendicular to one of the feature axes.

But why should that restriction exist?

Suppose two classes in a 2D dataset are naturally separated by a diagonal line. An axis-aligned tree cannot draw that line directly. It must approximate it using several horizontal and vertical cuts, creating the familiar staircase-like partition produced by decision trees.

An **oblique tree** changes the splitting function itself. Instead of examining one feature, a node can examine a weighted combination of features:

[

w^\top x < t.

]

For two features, this could become

[

0.8x_1 - 0.5x_2 < 2.

]

The node can now create a diagonal boundary.

[IMAGE: same dataset twice. Left: several staircase-like CART partitions approximating a diagonal boundary. Right: one diagonal oblique split]

This changes where the model stores its representational complexity.

CART keeps each individual node extremely simple, so complicated boundaries must emerge from many nodes arranged into a deeper tree. An oblique tree gives each node more expressive power, which can allow a much smaller tree to represent the same geometry.

In other words, **greater node complexity can produce lower tree complexity**.

That extra expressiveness is not free. CART searches over candidate pairs ((j,t)): choose a feature, then choose a threshold. An oblique node must search over ((w,t)), where (w) may contain one coefficient for every feature. The search space becomes much larger, and a decision involving several weighted variables is generally harder to interpret than a rule such as `age < 35`.

There are many ways to learn (w). Some methods test candidate directions, some fit linear models, and others optimize the coefficients directly or use differentiable formulations. The exact training procedure is a separate question from the architecture itself.

There is also an interesting boundary case. A tree containing only one oblique split is essentially learning a linear decision boundary. Depending on the formulation, it begins to look remarkably similar to a linear classifier such as logistic regression.

By changing only one assumption, two model families that initially look unrelated start to overlap.

The broader lesson is that expressiveness can be distributed across a model in different ways. Simple components generally require more structure around them; stronger components can sometimes accomplish the same task with less structure.

# Why choose only one path?

Consider two observations lying almost exactly on opposite sides of a CART threshold:

[

x=t-\epsilon

]

and

[

x=t+\epsilon.

]

Even if (\epsilon) is tiny, the first observation goes completely to one branch and the second goes completely to the other.

[ANIMATION: move a single observation slowly across a threshold. In the hard tree, its selected branch suddenly switches from left to right and the prediction jumps]

This happens because CART routing is discrete. Each split produces a binary decision: left or right.

But the routing operation itself does not have to be discrete.

A **soft tree** replaces the hard decision with a smooth gate. One possible formulation is

[

p_R(x)=\sigma\left(\frac{x_j-t}{\tau}\right)

]

and

[

p_L(x)=1-p_R(x),

]

where (\sigma) is the sigmoid function and (\tau) controls how gradual the transition is.

Instead of saying that an observation belongs entirely to the left or right branch, the tree can assign weight to both.

For a depth-1 regression tree with leaf values (v_L) and (v_R), the prediction becomes

[

\hat y(x)=p_L(x)v_L+p_R(x)v_R.

]

An observation close to the threshold might receive

[

p_L(x)=0.55,\qquad p_R(x)=0.45,

]

so both leaves contribute to the prediction.

In a deeper tree, the same idea continues recursively. The weight assigned to a leaf is the product of the routing probabilities along the path leading to it.

[PLAYGROUND: depth-1 regression tree. Show the threshold and two leaf predictions. Let the reader move (x) and control temperature (\tau). Display (p_L), (p_R), and the resulting prediction. As (\tau\rightarrow0), the soft tree visually becomes the hard CART tree]

The parameter (\tau) makes the relationship with CART especially clear. With a large temperature, routing changes gradually around the threshold. As

[

\tau\rightarrow0,

]

the transition becomes increasingly sharp, until the soft gate approaches the hard left-or-right decision used by CART.

Something deeper has happened than merely smoothing the prediction. We replaced a discrete operation with a continuous relaxation.

Because the gate is differentiable, parameters controlling the split can potentially be adjusted using gradients together with other parameters in the model. This is an instance of a much broader technique in machine learning: when an operation is useful but discrete and difficult to optimize, we can sometimes replace it with a differentiable approximation.

Again, the relaxation comes with a price.

A hard tree evaluates one crisp path. A soft tree may assign meaningful probability to several paths simultaneously, which makes inference less sparse and explanations less direct. Instead of saying that an observation reached a leaf because three decisions were true, we may need to describe how several weighted paths contributed to its prediction.

As more of the tree becomes differentiable, its computation also begins to resemble a gated neural architecture.

This exposes an important tension. Making a tree easier to integrate with gradient-based learning can remove some of the discrete structure that made trees attractive.

**Continuous relaxation exchanges discrete structure for smoother optimization.**

# Why should every node ask a different question?

In a normal CART tree, every internal node is independent.

A depth-3 tree might ask about `income` at the root, `age` on one branch, `account_age` on another, and completely different questions farther down the tree.

That flexibility is useful because each region of the input space can develop its own local logic. But do we always need it?

An **oblivious tree**, also called a **symmetric tree**, imposes a strong structural constraint: every node at the same depth uses the same splitting rule.

[IMAGE: left, irregular CART tree with different questions at every node. Right, perfectly symmetric tree where all nodes on each horizontal level display the same rule]

If the first level asks

[

x_3 < 5,

]

every observation is evaluated using that rule. At the second level, another rule is chosen and applied regardless of which first-level branch the observation followed.

Conceptually, if (g_{d,i}) denotes the split used by node (i) at depth (d), then an oblivious tree imposes

[

g_{d,1}=g_{d,2}=\cdots=g_d.

]

This modification moves in the opposite direction from oblique and soft trees.

We are deliberately making the model **less expressive**.

A standard tree can specialize each node to a small local region. An oblivious tree cannot. If one branch would benefit from splitting on age while another would benefit from splitting on income at the same depth, the model must still choose a single shared rule.

What we gain is regularity.

Because every observation receives the same test at each depth, evaluation becomes highly structured. Memory access is more predictable, operations can be vectorized more easily, and a complete path can be represented by the sequence of binary outcomes produced across the levels.

The constraint can also act as regularization. By preventing different branches from independently inventing increasingly specialized rules, we reduce the flexibility of each individual tree.

This architecture is not merely theoretical. CatBoost uses symmetric trees by default. Their regular structure is particularly convenient for efficient evaluation, which matters when large numbers of trees must be executed repeatedly in production.

[ANIMATION: evaluate one ordinary tree and one oblivious tree for a small batch. Show the irregular traversal of CART versus applying the same test across each level of the symmetric tree]

The interesting point is that we improved some properties of the model by restricting what it was allowed to do.

More flexibility is not automatically better. Architectural constraints can make models easier to execute, regularize, and sometimes optimize, even when those constraints reduce the expressive power of an individual model.

# Why should a leaf be a constant?

So far we have changed the internal nodes. The leaves contain another assumption that is easy to overlook.

In CART regression, once an observation reaches leaf (\ell), its prediction is simply

[

f(x)=c_\ell.

]

Every observation reaching that leaf receives the same value.

This means that CART is making an implicit assumption: once the input space has been partitioned into a sufficiently local region, there is no remaining structure inside that region worth modeling.

Consider a regression problem with two regimes. In the first region, the target increases approximately linearly with (x). In the second region, it also follows a roughly linear trend, but with a different slope.

A standard regression tree can identify the two regimes. Once inside each regime, however, it still approximates the trend using constant steps. Capturing the slope requires additional partitions.

Why should the tree have to do both jobs?

A **model tree** separates them.

Instead of storing a constant in leaf (\ell),

[

f(x)=f_\ell(x),

]

where (f_\ell) is itself a predictive model.

For example, each leaf might contain a linear regression:

[

f_\ell(x)=\beta_\ell^\top x+b_\ell.

]

[IMAGE: left, piecewise-constant CART approximation. Right, same partition boundaries but each region contains its own fitted line]

The resulting decomposition is useful:

**Tree:** Which regime am I in?

**Leaf model:** What happens inside this regime?

The tree handles discontinuities and regime changes, while the leaf model handles smoother local relationships.

This idea connects naturally to local models and mixture-of-experts architectures. Different parts of the input space can use different predictive functions, with the tree acting as the mechanism that selects which local model should be responsible.

The cost is additional complexity. A constant leaf may need only a mean or a class distribution. A linear leaf requires several coefficients, enough local observations to estimate them reliably, and a more involved fitting procedure.

As the leaf models become more expressive, the original simplicity of tree predictions gradually disappears.

Still, the architectural lesson is broader than model trees themselves: different parts of a model can specialize in different jobs. Partitioning the input space and modeling behavior inside each partition do not need to be performed by the same mechanism.

# A design space, not four algorithms

We can now return to the original CART tree and describe it as a collection of choices.

[IMAGE: compact table or design-space diagram:

| Design choice | CART | Relaxation |
| --- | --- | --- |
| Split geometry | Axis-aligned | Oblique |
| Routing | Hard | Soft |
| Node rules | Independent | Shared / oblivious |
| Leaf prediction | Constant | Model-based |

]

These dimensions are largely independent.

An oblique tree does not need soft routing. A soft tree does not need linear leaves. An oblivious tree can still use ordinary axis-aligned splits.

We can therefore construct combinations such as:

- oblique + hard;
- axis-aligned + soft;
- soft + oblique;
- oblivious + soft;
- oblique + model leaves.

Thinking in terms of architecture makes these combinations much easier to understand. We have not discovered four mutually exclusive algorithms. We have identified four decisions that CART happens to make in one particular way.

[PLAYGROUND: **Build a Tree.** Use one small 2D dataset and a shallow fixed-depth tree. Provide four controls:

- Split: Axis-aligned / Oblique
- Routing: Hard / Soft
- Rules: Independent / Shared by depth
- Leaves: Constant / Linear

As each control changes, update the decision surface, tree diagram, number of parameters, and approximate number of node evaluations. The purpose is not benchmarking every possible combination; it is letting the reader see that a “model” can be assembled from relatively independent architectural decisions]

A few presets make the design space easier to navigate.

**CART**

axis-aligned + hard + independent + constant

**Soft tree**

axis-aligned + soft + independent + constant

**Oblivious tree**

axis-aligned + hard + shared + constant

**Highly relaxed tree**

oblique + soft + independent + linear leaves

The last configuration is particularly revealing.

Its nodes compute weighted combinations of features. Its routing is smooth and differentiable. Several paths may contribute to a prediction. Its leaves contain learned functions rather than constants.

At that point, the architecture begins to resemble a hierarchical mixture-of-experts neural model much more than the textbook tree we started with.

This raises an interesting question: **at what point does a modified decision tree stop behaving like the kind of model we originally valued as a tree?**

There is no single boundary. But the question matters because every relaxation changes not only what the model can represent, but also how it computes, how it is trained, and how easily its predictions can be understood.

# Constraints define models

At the beginning, CART's assumptions looked like limitations.

Why restrict a split to one feature when several could be combined? Why force an observation onto one branch? Why prevent nodes from sharing parameters? Why make every leaf constant?

After relaxing them individually, the picture becomes more nuanced.

Each restriction was buying something:

- Axis alignment sacrifices compactness for simple, local decisions.
- Hard routing sacrifices smoothness for sparse computation and crisp paths.
- Independent rules sacrifice regularity for local flexibility.
- Constant leaves sacrifice local expressiveness for simplicity and statistical efficiency.

Relaxing an assumption therefore does not automatically improve the model. It changes its inductive bias and moves complexity somewhere else.

[IMAGE: CART in the center with four arrows pointing outward toward Oblique / Soft / Oblivious / Model leaves. Under every arrow show **Gain ↔ Cost**, rather than presenting the variants as upgrades]

This gives us a more useful way to think about machine-learning architectures.

**A machine-learning model is not an indivisible algorithm. It is a collection of choices about what the model is allowed to represent, how information flows through it, which parameters are shared, and how predictions are produced.**

Changing one of those choices can create a new model family.

CART's restrictions are therefore more than historical baggage. Many of them remain present in some of the strongest models for tabular data precisely because constraints can be useful inductive biases.

**Learning to design models begins with learning to notice the assumptions hidden inside the models we already use.**