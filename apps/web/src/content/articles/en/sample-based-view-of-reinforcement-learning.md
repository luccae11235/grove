---
articleId: sample-based-view-of-reinforcement-learning
locale: en
routeSlug: sample-based-view-of-reinforcement-learning
href: /learn/sample-based-view-of-reinforcement-learning
title: "A Sample-Based View of Reinforcement Learning"
navTitle: A sample-based view of RL
description: "Understand many reinforcement learning algorithms as different ways of turning sampled MDP experience into improved behavior."
eyebrow: Reinforcement learning · Sample-based learning
area: Reinforcement learning
topic: Sample-based reinforcement learning
summary: Follow experience through an MDP, then compare how reinforcement learning algorithms collect samples, update learned quantities, and represent what they learn.
status: draft
readingTime: 35–45 min
interactiveCount: 2
staticVisualCount: 12
difficulty: foundational
series: reinforcement-learning
access: public
prerequisites: []
related:
  - reward-hacking-three-mdps
implementation: mdx
learning:
  priorKnowledge:
    - Understand the basic idea of a learning algorithm.
    - Follow basic mathematical notation and probabilistic statements.
    - Understand at a high level that an objective can be improved.
  likelyMisconception: Reinforcement learning algorithms are disconnected named methods rather than different ways of learning from sampled experience.
  transferOutcome: Explain an unfamiliar reinforcement learning algorithm by identifying how it samples experience, whether it waits or bootstraps, which policies generate and receive the learning, what it updates, and how that learned quantity is represented.
  motivatingQuestion: What common process sits underneath the many different families of reinforcement learning algorithms?
  conceptualBottleneck: Separate the MDP that makes experience possible, the policy that helps generate particular experience, and the learning rule that extracts information from those samples.
  evidenceOfUnderstanding:
    - Distinguish Monte Carlo updates from Temporal-Difference updates.
    - Distinguish the behavior policy from the target policy.
    - Identify whether an algorithm learns values, a policy, or both.
    - Identify whether learned quantities use a table or function approximation.
    - Relate sampled updates back to Bellman equations and Generalized Policy Iteration.
---

## Before you begin

Reinforcement learning can become mathematically demanding very quickly. A typical introduction starts with Markov Decision Processes, moves into Bellman equations and dynamic programming, develops value functions, and only after a fair amount of formalism reaches algorithms such as Monte Carlo control, SARSA, and Q-learning.

That foundation is important, and we are not trying to replace it. In this article, however, we will deliberately take a different route.

Our goal is to build a broad mental model of reinforcement learning before going deeply into individual algorithms. We will establish only the mathematical notation we need, then use it to understand ideas that are often introduced much later, such as Monte Carlo versus Temporal Difference learning, on-policy versus off-policy learning, value-based versus policy-based methods, actor-critic methods, and function approximation.

The idea is that, by the time you eventually study SARSA or Q-learning in detail, you should already know what kinds of decisions those algorithms are making and where they fit in the larger RL landscape. The formal theory will still matter, but it becomes much easier to learn once there is already an intuitive structure to attach it to.

<figure class="static-figure sample-based-rl-roadmap">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/conceptual-shortcut-mobile.png"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/conceptual-shortcut.png"
      alt="A conventional reinforcement-learning path moves from bandits through an MDP, Bellman equations and planning, and value functions before reaching sample-based learning and major algorithm families. A green shortcut shows that this article moves directly from the MDP to sample-based learning while leaving the formal steps visible for later study."
      width="1774"
      height="887"
      loading="eager"
      decoding="async"
    />
  </picture>
</figure>

## A quick overview of RL

Machine learning contains several **learning paradigms**. A paradigm is simply a broad way of defining what information a learning system receives and what kind of problem it is expected to solve.

In supervised learning, we observe examples containing inputs and desired outputs. Given pairs such as $(x,y)$, the model tries to learn a function that maps new inputs $x$ to appropriate outputs $y$. Image classification is a familiar example: we provide images together with their labels and train a model to predict the label of an unseen image.

In unsupervised learning, there is no explicit target $y$. Instead, the algorithm tries to discover useful structure inside the data $X$, perhaps by grouping similar observations, learning a compressed representation, or estimating how the data is distributed.

Reinforcement learning starts from a different setting. Instead of receiving a static dataset and being asked to model it, we have an **agent interacting with an environment**. The agent makes decisions, those decisions change what happens next, and the consequences of its actions provide information about which behaviors are useful.

This pattern is surprisingly common outside machine learning. A baby learning to walk does not receive a dataset containing the correct muscle movement for every possible body position. It moves, loses balance, adjusts, succeeds occasionally, and gradually becomes better at controlling its body. An intern entering a new job often learns in a similar way: some decisions work, others create problems, and repeated interaction provides evidence about what to do in similar situations in the future.

Many problems naturally have this structure. A robot must decide how to move while interacting with the physical world. A game-playing agent must choose actions while the game changes around it. A recommendation system may select content and then observe how users respond. In each case, useful data is produced partly by the decisions of the agent itself.

That interaction between decisions and their consequences is the central setting of reinforcement learning.

<figure class="static-figure sample-based-rl-learning-paradigms">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/learning-paradigms-mobile.png"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/learning-paradigms.png"
      alt="Three learning paradigms differ in the information that guides learning. Supervised learning maps inputs X to known targets y. Unsupervised learning finds relationships and groups within X. Reinforcement learning uses a loop in which an agent sends actions to an environment and receives the next state and a reward."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

### A little deeper

#### Policy

If an agent repeatedly needs to decide what to do, then we need some rule that maps what the agent currently observes to a decision.

In reinforcement learning, we call this rule a **policy**.

A policy receives information describing the current situation and determines which action the agent should take. We commonly represent it as

$$

\pi(a \mid s)

$$

where $s$ is the current state and $a$ is an action. More precisely, $\pi(a\mid s)$ tells us the probability of choosing action $a$ when the agent is in state $s$.

A deterministic policy is simply a special case in which one action receives probability $1$ for each state. In that case, we can think of it more casually as a function $a=\pi(s)$.

Consider a simple game of Pong. Suppose the agent knows the position and velocity of the ball together with the position of its paddle. A policy can use that information to decide whether the paddle should move upward or downward.

<figure class="static-figure sample-based-rl-pong-policy">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pong-policy-mobile.png"
      width="887"
      height="1774"
    />
    <img
      src="/articles/sample-based-rl/pong-policy.png"
      alt="A single-player Pong environment has a ball descending toward a horizontal paddle inside a softly framed playfield. The policy receives the ball position, ball velocity, and paddle position as its state and chooses the action move right, matching the green arrow beneath the paddle."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

The policy does not need to be sophisticated. For example, imagine that $y_b$ represents the vertical position of the ball and $y_p$ the vertical position of the paddle. A very simple deterministic policy could be

$$

\pi(s)=

\begin{cases}

\text{UP}, & y_b > y_p \\

\text{DOWN}, & y_b < y_p \\

\text{STAY}, & y_b = y_p

\end{cases}

$$

The current state $s$ may contain much more information than $y_b$ and $y_p$, but this particular policy chooses to use only those two values. Its rule is simple: move the paddle toward the ball.

Nothing in the definition of a policy requires this particular form. A policy could be a small table, a logistic regression model, a large neural network, an LLM, or an arbitrarily complicated program. What matters is its role in the interaction: given the current state, it determines how the agent acts.

#### The reward

Creating a policy is easy. We could define one right now by choosing actions randomly.

The harder question is whether the policy is any good.

A random Pong policy is still a perfectly valid policy in the RL sense, but it will move the paddle without using the situation intelligently and will therefore miss the ball frequently. A better policy should use the available information in ways that produce better outcomes.

To distinguish useful behavior from useless behavior, reinforcement learning uses **rewards**.

A reward is a numerical signal describing the immediate consequence of what the agent just did. In a simple Pong environment, we might define the reward so that hitting the ball produces $+1$, losing the ball produces $-1$, and most intermediate interactions produce $0$.

We can initially think of reward as a function

$$

r(s,a)

$$

that associates a numerical value with taking action $a$ in state $s$.

A policy that repeatedly produces interactions with larger rewards is generally preferable to one that produces smaller rewards. The same idea applies across many environments: we may reward a robot for reaching its destination, a spacecraft controller for landing successfully, or a game-playing agent for scoring points.

> **Note:** In a more complete formulation, reward can depend on the resulting state as well, so we often write something such as $r(s,a,s')$. Rewards can also be stochastic rather than fixed.
>

The reward therefore defines what the learning process is trying to accomplish. The agent does not directly optimize an informal sentence such as “play Pong well.” It interacts with the numerical signal supplied by the environment, and the quality of a policy is ultimately judged by the rewards it accumulates over time.

<div data-pong-reward-comparison></div>

#### The transition

There is still one important piece missing.

Suppose the agent is in a particular state and chooses an action. What happens afterward?

The environment changes. In Pong, moving the paddle changes its position while the ball continues moving. In a robot, activating a motor changes joint angles and perhaps the robot's position. In a board game, placing a piece produces a new board configuration.

We describe this behavior using the **transition dynamics**:

$$

P(s' \mid s,a)

$$

This expression describes the probability of reaching state $s'$ after taking action $a$ from state $s$.

<figure class="static-figure sample-based-rl-transition-dynamics">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/transition-dynamics-mobile.png"
      width="887"
      height="1774"
    />
    <img
      src="/articles/sample-based-rl/transition-dynamics.png"
      alt="A grid-world agent begins in the center cell of state s. It takes action a, moving right. The transition dynamics P of s prime given s and a produce the next state s prime, where the same agent occupies the cell immediately to the right."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

Sometimes the transition is deterministic. If a grid-world agent moves right from cell $(2,3)$, for example, it may always arrive at $(2,4)$.

Other environments are stochastic. A robot wheel might slip. An opponent may behave unpredictably. A game may contain randomness. In those situations, the same state and action can lead to several possible next states, each with some probability.

#### The complete MDP

We can now describe the basic interaction loop of reinforcement learning.

The agent observes the current state $s_t$. Its policy selects an action $a_t$. The environment responds according to its transition dynamics, producing a new state $s_{t+1}$, while also providing a reward associated with the transition. The agent observes this new situation and chooses again.

Then the process repeats.

This is a very natural sequence:

1. observe the state;
2. choose an action using the policy;
3. let the environment transition;
4. receive the resulting reward;
5. observe the next state;
6. choose again.

Formalizing this interaction gives us a **Markov Decision Process**, or MDP.

An MDP is commonly described using states $S$, actions $A$, transition dynamics $P$, rewards $R$, and, depending on the formulation, a discount factor $\gamma$. We will introduce the role of $\gamma$ shortly.

<figure class="static-figure sample-based-rl-mdp-loop">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/mdp-loop-mobile.png"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/mdp-loop.png"
      alt="An agent and environment form a loop. The policy pi of action a sub t given state s sub t chooses action a sub t. The environment's transition dynamics P produce state s sub t plus one, while its reward function produces reward r sub t plus one, which return to the agent."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

If we initialize the environment and let an agent interact with it, we obtain a sequence such as

$$

s_0,a_0,r_1,s_1,a_1,r_2,s_2,\ldots,s_T

$$

This sequence is called a **trajectory**, or sometimes an episode when it eventually terminates.

Each state tells us where the agent was, each action tells us what it did, and each reward tells us something about the consequence. A complete trajectory is therefore a record of one run through the environment.

<div data-mdp-trajectory-machine-slot></div>

Running the same policy twice does not necessarily produce the same trajectory.

Imagine first a small deterministic maze. The agent uses a deterministic policy and every action has a predictable result. Starting from the same state will always produce exactly the same sequence.

Now imagine a robot navigating a crowded room. The policy may randomly choose between several reasonable movements, people may move unpredictably, and sensor or reward signals may contain noise. Starting from exactly the same situation can now produce very different trajectories.

Variation can enter through several places. The policy itself may be stochastic, the environment's transitions may be stochastic, and the reward may also contain randomness.

Despite all these possibilities, the trajectory representation remains the same. We still observe states, actions, rewards, and new states.

This is one reason the MDP framework is so useful. An arcade game, a robot, a recommender system, and a control problem may look completely different, yet their agent-environment interactions can all be recorded using the same basic sequence of states, actions, and rewards.

### The final objective

Rewards happen one interaction at a time, but evaluating a decision usually requires looking further into the future.

Suppose our Pong agent moves downward and receives reward $0$. If that movement puts the paddle in exactly the right position to hit the ball two steps later and receive $+1$, saying that the original action was worth only zero would miss part of its consequence.

For that reason, reinforcement learning commonly works with a **return**: the cumulative future reward following a point in the trajectory.

One common definition is

$$
G_t

=

R_{t+1}

+

\gamma R_{t+2}

+

\gamma^2 R_{t+3}

+

\cdots

$$

or equivalently,

$$
G_t

=

\sum_{k=0}^{T-t-1}\gamma^kR_{t+k+1}.

$$

The parameter

$$

0\leq\gamma\leq1

$$

is called the **discount factor**. When $\gamma$ is close to $1$, rewards far into the future remain important. With a smaller $\gamma$, immediate rewards matter considerably more.

<figure class="static-figure sample-based-rl-discounted-returns">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/discounted-returns-aligned-mobile.svg"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/discounted-returns-aligned.svg"
      alt="A trajectory alternates states, actions, and rewards through terminal action a sub T, reward r sub T, and state s sub T. Vertical bands align each reward with its return term. G one includes r one through gamma to the T minus one times r sub T. G two excludes r one and includes r two through gamma to the T minus two times r sub T."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

We can now state the objective of reinforcement learning more precisely. We want a policy whose interactions with the environment produce high expected returns:

$$
\pi^*

=

\arg\max_{\pi}

\mathbb{E}_{\tau\sim\pi}[G(\tau)].

$$

The notation $\tau\sim\pi$ means that the trajectory $\tau$ was generated while following policy $\pi$, together with whatever randomness exists in the environment.

This expectation matters because a single trajectory may be lucky or unlucky. A policy might occasionally produce a huge reward while usually performing badly. To estimate its actual performance, we could run the policy thousands of times, calculate the return for every trajectory, and average the results.

Conceptually, reinforcement learning asks us to find the policy that makes this expected return as large as possible.

## The algorithm reads trajectories

We now have an MDP and a clear objective, but we have not explained the learning itself.

How do we actually find a better policy?

There is a broad idea in reinforcement learning called **Generalized Policy Iteration**, or GPI, which describes the interaction between two processes.

**Policy evaluation** tries to determine how good the current policy is.

**Policy improvement** uses that information to produce a better policy.

These two processes can appear in many different forms. Sometimes evaluation is performed exactly using a complete model of the environment. Sometimes it is only approximated. Sometimes the policy is changed explicitly, while in other algorithms improvement happens indirectly through another learned function.

For this article, we will concentrate on one particularly useful perspective: **sample-based learning**.

Instead of assuming that we know exactly how the environment works, we interact with it and collect trajectories. Those trajectories contain samples of states, actions, rewards, and transitions. The learning algorithm examines those observations and uses them to determine how its current behavior should change.

At a very high level:

1. sample experience from the MDP;
2. extract information from relationships between states, actions, rewards, and future outcomes;
3. use that information to improve the agent.

We can begin with almost any policy. It might even behave randomly. We let it interact with the environment, collect experience, and then apply some **update procedure**.

We can write this abstractly as

$$

\pi' = U(\pi,\mathcal{D}),

$$

where $\mathcal{D}$ represents information collected from experience and $U$ is an update rule that uses this information to produce a new policy $\pi'$.

In practice, the policy will often be represented by parameters. If we write it as $\pi_\theta$, then $\theta$ simply represents whatever adjustable numbers determine its behavior: entries in a table, coefficients in a linear model, or millions of neural-network weights.

The update can therefore be understood as changing those numbers:

$$

\theta' = U(\theta,\mathcal{D}).

$$

There is nothing mysterious about $\theta$. It is simply the part of the agent that learning is allowed to modify.

<figure class="static-figure sample-based-rl-policy-update">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/policy-update-mobile.svg"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/policy-update.svg"
      alt="The current policy gives the same state two action preferences. Experience supplies a compact learning signal to update rule U, which produces policy pi prime with the useful action made more likely while the policy's role stays unchanged."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

A reinforcement learning algorithm tells us how this update should happen. It specifies which information should be extracted from experience, how that information should be converted into a learning signal, what representation should be modified, and how strongly it should change.

We perform this process repeatedly. The updated agent generates more experience, that experience generates another update, and the cycle continues.

<figure class="static-figure sample-based-rl-learning-cycle">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/sample-learning-cycle-mobile.svg"
      width="1024"
      height="1380"
    />
    <img
      src="/articles/sample-based-rl/sample-learning-cycle.svg"
      alt="Policy pi acts in an MDP and generates multiple trajectories that alternate states, actions, and rewards. Update rule U learns from those samples and produces an improved policy pi prime. A return arrow sends that policy back into the same interaction loop so learning can repeat."
      width="1774"
      height="700"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

### Other forms

Sampling trajectories may seem like the obvious way to learn, but notice what we have deliberately ignored: the transition function $P(s'\mid s,a)$.

Suppose we knew it perfectly.

If an agent were considering moving right, we could directly calculate which next states might result and with what probabilities. We could then reason about the consequences of those states, their future rewards, and the decisions available afterward. Instead of discovering the environment only by repeatedly trying actions, we could exploit our model of its dynamics.

For small environments where the full MDP is known, this leads to a rich body of theory involving dynamic programming, Bellman equations, exact or approximate value computation, and planning.

We are intentionally skipping that path here.

In many practical problems, the complete transition dynamics are unknown or impossibly complicated to enumerate. We do not have a table telling a robot the exact probability distribution over every future physical configuration after every possible motor command. We generally cannot write down the exact transition probabilities of interacting with a user or controlling a complicated simulator.

We can, however, observe what happened.

That makes sampled experience enormously useful, which is why we will use it as our main mental model for comparing algorithms.

## The questions

So far, both the update procedure $U$ and the internal form of our agent have remained intentionally vague.

That vagueness is useful because many important families of reinforcement learning algorithms appear when we start asking how those pieces should work.

We will focus on four questions:

1. **When should we update?**
2. **Is the policy we are training the same policy that generated our experience?**
3. **What does the agent learn in order to make decisions?**
4. **How does it represent what it learns?**

Each question exposes a different axis along which RL algorithms can differ.

### When should we update the policy?

Imagine that our agent has started generating a trajectory.

One possibility is to let the entire episode finish, observe everything that happened, calculate its returns, and only then use that information for learning.

Another possibility is to begin learning while the episode is still happening. After observing a transition, the algorithm may already have enough information to make an update.

<figure class="static-figure sample-based-rl-mc-td">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/monte-carlo-vs-td-mobile.svg"
      width="1024"
      height="1840"
    />
    <img
      src="/articles/sample-based-rl/monte-carlo-vs-td.svg"
      alt="Monte Carlo applies the update U only after the sampled episode reaches its terminal state. Temporal Difference learning can apply U after intermediate transitions, updating the policy repeatedly while the same episode is still being sampled."
      width="1774"
      height="1040"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

This gives us a useful first intuition for the distinction between **Monte Carlo** and **Temporal Difference**, or **TD**, methods.

Monte Carlo methods wait until the relevant return has actually been observed. If we want to know the return following some action, we let the trajectory unfold and use the rewards that really occurred afterward. This gives us a direct sample of the return, but it means that in episodic tasks we generally have to wait until the episode finishes before that complete target is available.

TD methods can update earlier because they use **bootstrapping**. Instead of waiting to observe the entire future return, they combine an immediate reward with an estimate of what comes afterward.

This difference is deeper than update timing itself. The fundamental distinction concerns **where the learning target comes from**: Monte Carlo uses observed returns, while TD methods partially construct their targets from existing estimates. Update timing is nevertheless a useful way to first see the consequence of that distinction.

Waiting for complete returns can give a clean learning signal, but those returns may have high variance and may take a long time to obtain. TD methods can learn from incomplete trajectories and therefore update much more frequently, although their targets depend partly on estimates that may themselves still be inaccurate.

**Monte Carlo control** is a family of methods that estimates how good actions are from completed episodes and then improves the policy using those estimates.

**SARSA**, in contrast, is a TD control algorithm. After observing a transition and the next action chosen by the policy, it can update its estimate immediately instead of waiting for the entire episode to end.

So our first question points toward an important split:

- **Monte Carlo:** learn from observed returns.
- **TD:** learn using bootstrapped estimates of future return.

### Is the policy we are training the same one we are using to sample?

An MDP does not generate useful trajectories on its own. Someone has to choose the actions.

That means every sampled trajectory depends on some policy.

Suppose our agent reaches a state where it could move left or right. A policy that almost always moves left will generate a dataset dominated by leftward actions. A different policy may explore both directions evenly. The experience we collect therefore reflects the behavior of the policy that produced it.

We call the policy used to collect experience the **behavior policy**.

Separately, we can ask which policy the algorithm is actually trying to evaluate or improve. This is the **target policy**.

If they are the same, we have an **on-policy** method:

$$
\pi_{\text{behavior}}

=

\pi_{\text{target}}.

$$

If they are different, we have an **off-policy** method:

$$

\pi_{\text{behavior}}

\neq

\pi_{\text{target}}.

$$

<figure class="static-figure sample-based-rl-policy-roles">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/on-policy-vs-off-policy-mobile.svg"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/on-policy-vs-off-policy.svg"
      alt="In on-policy learning, the same policy generates the sampled trajectory and receives the update. In off-policy learning, a behavior policy generates the trajectory while the update is applied to a distinct target policy."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

Why would we deliberately learn about one policy using data generated by another?

Exploration gives us one reason. Imagine that our current best Pong policy always moves toward what it currently believes is the optimal position. If we follow it perfectly, we may stop trying alternative actions and never discover that some of them are better. We could therefore use a behavior policy that occasionally explores random actions while still learning a target policy representing what we currently believe to be the best behavior.

Another reason is data reuse. Suppose we already collected a large dataset of robot interactions yesterday, but the policy has changed since then. If our algorithm can learn off-policy, old trajectories may still contain useful information for improving today's policy.

This distinction appears clearly when comparing SARSA and Q-learning.

SARSA is typically **on-policy**. Its update considers the action that the current behavior policy actually chooses next, so what it learns reflects the policy that is producing the experience.

Q-learning is **off-policy**. The agent may behave exploratorily while its update estimates what would happen under a greedier target policy. The behavior used to generate experience and the behavior being learned therefore do not need to be identical.

The distinction is conceptually simple once the two roles are named: **who generated the data, and whose behavior are we trying to learn?**

### What does the policy learn to make its decisions?

There are several ways an agent can become better at choosing actions.

One natural strategy is to learn how good different situations and decisions tend to be, then use those estimates to choose what to do.

Humans often reason this way at work. Suppose you have repeatedly faced a particular type of production incident. Over time, experience tells you that restarting one service usually makes the problem worse, while checking another component first tends to resolve it. You have implicitly attached different expected outcomes to different actions in the same situation.

Reinforcement learning formalizes this idea through **value functions**.

A state-value function,

$$

V^\pi(s),

$$

describes the expected return when we start from state $s$ and then follow policy $\pi$.

An action-value function,

$$

Q^\pi(s,a),

$$

is more specific. It describes the expected return when we take action $a$ in state $s$ and then continue according to policy $\pi$.

The difference is small but important. $V$ evaluates a state. $Q$ evaluates a state-action pair.

If we have sampled many trajectories, we can use the outcomes we observed to estimate these quantities. Once we know that one action consistently has higher value than the alternatives in a particular state, the policy can prefer that action.

Methods organized around learning these values and deriving behavior from them are called **value-based methods**.

But there is another possibility.

Instead of learning a separate score for actions and then converting those scores into behavior, we can parameterize the policy itself and optimize those parameters directly.

Return to our Pong policy. Imagine that a parameter $\theta$ controls how strongly the paddle responds to the vertical difference between itself and the ball. We try one value of $\theta$, collect trajectories, and obtain some average return. If modifying $\theta$ changes the policy in a way that increases expected return, we want learning to push the parameter in that direction.

More generally, if our policy is

$$

\pi_\theta(a\mid s),

$$

we can try to adjust $\theta$ directly so that the expected return increases.

<figure class="static-figure sample-based-rl-value-policy">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/value-vs-policy-learning-mobile.svg"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/value-vs-policy-learning.svg"
      alt="A value-based agent first learns a Q table of expected returns, then a policy chooses the action with the highest value. A policy-based agent instead learns the action probabilities directly, assigning 30 percent to left and 70 percent to right without an intermediate value table."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

Learning to ride a bicycle provides a useful analogy. We do not consciously maintain a gigantic table saying, “At this angle and this velocity, turning the handlebars three degrees left historically produced a return of 7.4.”

Our control behavior adapts more directly. We leaned one way and fell, so our future behavior changes. We balanced successfully another way, so that behavior becomes more likely.

Algorithms that directly optimize a parameterized policy belong to the family of **policy-based methods**, and when the optimization is performed using the gradient of expected return with respect to the policy parameters, we call them **policy-gradient methods**.

**REINFORCE** is the classic example. It uses sampled returns to modify the policy parameters so that actions associated with good outcomes become more probable.

**DQN**, on the other hand, is fundamentally value-based. It learns an approximation to $Q(s,a)$, then chooses actions using the learned action values.

There is also an important middle ground: **actor-critic methods**.

An actor-critic agent contains both ideas. The **actor** is a policy that determines behavior, while the **critic** learns a value function that evaluates what the actor is doing. The critic's estimates provide a learning signal that helps improve the actor.

So this question gives us three broad families:

- **value-based:** learn values and derive decisions from them;
- **policy-based:** learn the policy directly;
- **actor-critic:** learn a policy while simultaneously learning values that help train it.

### What does the policy do to learn?

There is still another decision hidden underneath all of these algorithms: how should the learned information actually be represented?

For sufficiently small problems, we can store it explicitly.

Imagine an agent learning tic-tac-toe. The set of possible board configurations is finite. In principle, we could maintain a table containing states or state-action pairs together with estimates of their values. Every time we encounter one of them again, we update the corresponding entry.

A simplified action-value table might look conceptually like this:

<div class="sample-based-rl-action-values-table-wrap">
  <table class="sample-based-rl-action-values-table">
    <thead>
      <tr>
        <th scope="col">State</th>
        <th scope="col">Action</th>
        <th scope="col">Estimated value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Board A</th>
        <td>Center</td>
        <td>0.82</td>
      </tr>
      <tr>
        <th scope="row">Board A</th>
        <td>Corner</td>
        <td>0.61</td>
      </tr>
      <tr>
        <th scope="row">Board A</th>
        <td>Edge</td>
        <td>0.20</td>
      </tr>
    </tbody>
  </table>
</div>

If the same state appears again, there is no need to generalize. We simply look it up.

This is the basic idea behind **tabular reinforcement learning**.

The approach stops being practical when the space becomes large or continuous.

Consider a robotic arm. Its state may contain several joint angles, velocities, forces, camera observations, and other measurements. Even if each measurement were represented with modest precision, the number of possible combinations would become enormous. With truly continuous values, there are effectively infinitely many possible states.

We cannot wait to observe every possible configuration separately.

Instead, we need **function approximation**.

Rather than storing

$$

Q(s,a)

$$

as one independent table entry for every possible pair, we represent it using a parameterized function

$$

Q_\theta(s,a).

$$

A neural network is one possible choice. If it learns that certain states behave similarly, experience collected in one state can influence its predictions in another. This ability to generalize is exactly what makes large-scale reinforcement learning possible.

<figure class="static-figure sample-based-rl-representation">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/tabular-vs-function-approximation-mobile.svg"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/tabular-vs-function-approximation.svg"
      alt="A tabular method stores the value of each state-action pair in its own table cell. A function approximator instead sends the same state-action pair through a neural network that maps it to a learned value."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

This distinction gives us another broad classification:

- **tabular methods:** explicitly store learned quantities for individual states or state-action pairs;
- **function approximation:** use a parameterized function to generalize across them.

Q-learning provides a useful connection between the two worlds.

Classic tabular Q-learning maintains explicit values for state-action pairs. DQN retains the central Q-learning idea of learning action values from TD targets, but represents $Q(s,a)$ with a neural network and introduces additional machinery needed to make that form of learning practical and stable.

The underlying question is therefore not only what the agent learns, but how that learned information can be stored and generalized.

## Conclusions

We have covered a large part of the conceptual landscape of reinforcement learning without deriving any of its major algorithms in detail.

We began with the basic idea of RL: an agent repeatedly interacts with an environment and learns behavior from the consequences of its actions.

We then formalized that interaction using an MDP. A policy chooses actions, transition dynamics determine how the environment evolves, rewards provide numerical feedback, and repeated interaction produces trajectories containing states, actions, rewards, and future states.

From there, we defined returns and expressed the goal of reinforcement learning as finding a policy that maximizes expected return.

The central perspective of this article was then to treat an MDP as a source of sampled experience. An agent generates trajectories, a learning procedure extracts useful information from them, the agent is updated, and the process repeats.

Once we had that loop, several apparently advanced distinctions became questions about how the update works.

**When does learning happen, and where does its target come from?** This led us to Monte Carlo and Temporal Difference methods.

**Did the same policy generate the experience and receive the update?** This separated on-policy from off-policy learning.

**What does the agent learn in order to make decisions?** This led to value-based methods, policy-based methods, and actor-critic methods.

**How is that information represented?** This separated tabular methods from function approximation.

These dimensions can be combined. An algorithm can be TD and on-policy, or TD and off-policy. It can be value-based and tabular, or value-based with a neural network. An actor-critic algorithm can be on-policy or off-policy and almost always uses function approximation in modern applications.

This is why reinforcement learning contains so many algorithms without requiring a completely different mental model for each one. They often operate on the same agent-environment interaction and differ mainly in the choices they make about **how to collect experience, how to construct a learning signal, what to update, and how to represent what has been learned**.

There is still an important body of theory underneath this picture. Bellman equations explain relationships between values across successive states. Dynamic programming shows what becomes possible when the environment model is known. Convergence theory tells us when particular updates can be trusted. More detailed treatments of Monte Carlo, TD learning, SARSA, Q-learning, policy gradients, and actor-critic methods make all of these ideas precise.

Those foundations are worth studying.

The advantage now is that, when the equations appear, they no longer need to introduce the entire conceptual landscape at the same time. You already know what the algorithms are trying to accomplish and which questions distinguish one family from another.
