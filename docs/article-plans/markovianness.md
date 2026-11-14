# Historical preparation: Markovianness — When the State Is Not Enough

Article ID in current content collection: `the-markov-principle`
Source Library filename: `Pasted text(20261010-170344).txt`
Source SHA-256: `c9dfe8a25cffe6330a098cb75ff10fd3953d30472127d961eb3915db5d4de1e7`
Coverage: Scope, structure, visual notes, and first draft.

This is historical editorial evidence, not approval to publish or revise the existing article. The source begins after the marker below and is preserved byte for byte. The preface and review note are separate from the source.

**Review note:** Check the distinction between deterministic and probabilistic transitions and verify claimed experiment behavior. The historical draft translates some visual placeholders despite its own literal-placeholder instruction. These are review notes, not source edits.

<!-- ORIGINAL SOURCE START — all following bytes are unchanged -->
# 1. Tópico

- **Título provisório:** *Markovianness — When the State Is Not Enough*
- **Pergunta ou ideia central:** Como a representação do estado determina se um problema de RL respeita a propriedade de Markov?
- **Por que este tema merece um artigo:**
    - O mesmo ambiente pode ser mais fácil ou mais difícil de aprender dependendo apenas da representação do estado.
    - Markovianness não surge automaticamente da dinâmica do ambiente.
    - Uma representação incompleta pode esconder informações necessárias para prever o futuro.
    - Comparar agentes sob representações diferentes torna esse efeito diretamente observável.

# 2. Learning Scope

- **Tema central:**
    - Markovianness em MDPs.
    - Representação de estado em Reinforcement Learning.
- **Objetivo principal de aprendizagem:**
    - Entender por que o estado deve preservar toda informação do passado relevante para prever o futuro.
    - Entender como uma representação não-Markoviana pode prejudicar ou impedir o aprendizado.
    - Reconhecer que a qualidade da representação de estado faz parte do design do problema.
- **Persona:**
    - Leitores com conhecimento básico de Reinforcement Learning.
    - Familiaridade com MDPs.
    - Familiaridade com estado, ação, recompensa, política e transições.
- **Conceitos de apoio:**
    - Propriedade de Markov.
    - Estado versus observação.
    - Informação relevante do histórico.
    - State aliasing.
    - Suficiência da representação de estado.
    - Distribuição condicional das próximas transições.
    - Dependência entre representação e política ótima.
    - Comparação empírica entre diferentes representações de estado.
- **Limites de escopo:**
    - Não aprofundar POMDPs.
    - Não abordar belief states.
    - Não usar RNNs, memória ou frame stacking para recuperar informações ausentes.
    - Não comparar diferentes algoritmos de RL.
    - Não alterar reward ou dinâmica entre experimentos.
    - Não buscar formalmente a representação mínima ou ótima de estado.
    - Não tratar os ambientes como benchmarks de performance.

# 3. Estrutura de Aprendizagem

- **Orientar → Observar → Explicar → Generalizar**

# Principio de Markov

[inicie relembrando o leitor que todo problema em RL é definido rigorosamente por um MDP]

[relembre brevemente os elementos de um MDP]

[dar ênfase na função de transição, que recebe um estado, uma ação,  e retorna um novo estado e uma recompensa]

[apresente a fórmula de transição]

[levante a duvida do porque a função de transição precisa somente de um estado, e não do histórico de estados]

[apresente a fórmula de transição condicionada em H também, que no caso seria o histórico, ou sequencia de estados até o último]

[apresente o principio de markov. Apresente a ideia que um estado S pode ter quaisquer formatos que quisermos, e que desde que a afirmação a seguir seja real, o principio de markov foi respeitado “O estado atual deve conter toda a informação do passado que ainda é relevante para determinar o que pode acontecer a seguir.”]

[explique que do ponto de vista de fórmula, o principio de markov é justamente ambas fórmulas, condicionada a H ou não, serem idênticas]

[IMAGEM: No canto esquerdo, mostra uma trajetória vertical de S,A,R,S,A estilo “branches” mostrando um caminho que o agente percorreu. Apontar que se o H (conjunto de S), for necessário para determinar o que vai acontecer depois, então o principo de markov foi violado. No canto direito, mostrar o contrário, que o histórico não importa para determinar o que vai acontecer]

[Dar ênfase que o princípio de Markov é sobre a função de transição, não sobre o agente, política, algoritmo e etc. Dar enfase também que pode muito bem ser uma questão de design, isto é, como decidimos representar o espaço de estados. Dependendo de como formulamos o estado, incluir o histórico de estados que o agente percorreu pode sim apresentar uma previsão diferente]

[Explique que nestes artigo vamos explorar 3 problemas (3 MDPs), e para cada um vamos criar duas formulações do espaço de estado, uma que viola o principio de markov, e outra que não viola. Para cada cenário, vamos tentar treinar um agente para realizar uma atividade específica]

# Pong

[apresente que o ping pong é um ótimo estudo de caso de RL. É um exemplo simples, onde a recompensa é óbvia, mas que na prática a recompensa é um tanto “esparça” (pode demorar a receber uma recompensa ou não, e a maioria das recompensas são 0, além de que por ser um estado contínuo (infinitas posições de bola), na maioria das vezes precisamos de um algoritmo que faz algum tipo de “function approximation”]

## O MDP

[apresente o MDP de forma matemática de acordo com a descrição a seguir: “O primeiro MDP é um Pong simplificado em que uma bola se move continuamente por uma arena retangular, quica nas paredes e deve ser rebatida por um paddle controlado pelo agente na parte inferior. As ações são mover o paddle para a esquerda, permanecer parado ou mover para a direita, e a recompensa é positiva quando a bola é rebatida e negativa quando ela é perdida. O experimento compara duas representações do mesmo ambiente. Na **representação não-Markoviana**, o agente observa apenas a posição da bola e do paddle, (z_t=(x_t,y_t,p_t)). Essa informação não é suficiente para determinar a próxima transição, porque a mesma posição da bola pode corresponder, por exemplo, a uma bola subindo ou descendo; conhecer posições anteriores ainda revelaria informação sobre o futuro. Na **representação Markoviana**, adicionamos a velocidade da bola, (z_t=(x_t,y_t,v_t^x,v_t^y,p_t)). Agora posição e velocidade descrevem a dinâmica relevante naquele instante, de modo que conhecer posições anteriores não acrescenta informação necessária para determinar a próxima transição.”]

[IMAGEM: uma ilustração do agente e ambiente. Um paddle horizontal que pode se mover para a esquerda ou direita dentro de uma caixa, onde há uma bola que ricochiteia pelas paredes. Acertar a bola com o paddle é +1 de recompensa, perder a bola é -1. De resto é 0]

[apresente como podemos criar duas representações de espaço. Uma mais simples, que possui apenas a posição da bola e do paddle, e outra com a velocidade]

[explique do ponto de vista matemático, o porque o primeiro caso viola o principio de markov. O motivo é claro: sem a direção, não conseguimos prever a próxima etapa. Ou seja, a distribuição de “próximo estado” é probabilistica. Só que se incluirmos a última posição da bola na função de transição, podemos saber de que direção a bola veio, e portanto para onde vai. Ou seja, incluir o histórico, muda a função de transição, mais especificamente, de puramente probabilisitca, para deterministica.

[IMAGEM: No canto esquerda, uma bola parada acima do paddle, saindo dela bola, inúmeras setas apontando para todas as direções indicando que não sabemos para onde ela esta indo. No topo desta imagem, quero o fórmula de S, que é a posição da bola + paddle. No canto direito, uma imagem parecida, so que agora a fórmula incorpora a velocidade, e portanto podemos saber para onde a bola vai]

[Explicar do ponto de vista matemática que no primeiro caso, a função de transição retorna uma distribuição de probabilidade e que incluir o histórico atualiza a previsão. Ou seja, quebra a igualdade “p( s` | s,a) = p( s` | s,a, H))]

[Explicar do ponto de vista matemático, que no segundo caso, incluir o histórico não ajuda em nada, porque a velocidade já fala para onde a bola vai, ou seja, a igualdade se mantém de pé]

## Aprendendo

[Explicar que no playground a seguir, vamos botar um algoritmo para aprender a rebater a bola. Só que não vamos incluir a informação de velocidade]

[PLAYGROUND: No canto esquerdo, o ping pong descrito anteriormente. O paddle se move para esquerda e direita. No canto direito superior: um pequeno gráfico de recompensas por episódio. Abaixo do gráfico: parametros para controlar a velocidade com que o agente está aprendendo.

No rodapé do playground, quero um drop down que explica melhor o algoritmo por trás do aprendizado por cima, apenas para os curiosos]

[explicar o esperado: o agente consegue aprender algo, talvez demora mais que o necessário]

[explicar que agora vamos ver o mesmo playground, mas agora o agente tem informação da bola]

[PLAYGROUND: mesmo playground que o de antes, mas agora o agente recebe a velocidade. O objetivo é ver que o agente aprende mais rápido]

[Comparar as performances de aprendizado. Mostrar que no segundo caso agente aprendeu mais rápido]

[IMAGEM: Comparar as duas curvas de aprendizado]

[Explicar que este caso representa “**Missing dynamics”**]

# A porta e a chave

## O MDP

[apresente o segundo ambiente como um pequeno gridworld em que o agente precisa buscar uma chave antes de atravessar uma porta e alcançar o objetivo. A chave e a porta ficam em lados diferentes do mapa, de forma que o agente precisa retornar por uma região central depois de coletar a chave]

[apresente o MDP matematicamente. O estado completo é (s_t=(p_t,k_t)), onde (p_t) representa a posição do agente e (k_t\in{0,1}) indica se a chave já foi coletada. As ações são (A={up,down,left,right}). A porta bloqueia a passagem quando (k_t=0) e permite a passagem quando (k_t=1). A recompensa é positiva ao alcançar o objetivo e o episódio termina]

[IMAGEM: gridworld simples com o agente inicialmente no centro, uma chave em uma extremidade, uma porta em outra e o objetivo atrás da porta. Destacar visualmente que o agente precisa ir até a chave e depois retornar em direção à porta]

[apresente as duas representações. Na primeira, (z_t=p_t): o agente sabe apenas onde está. Na segunda, (z_t=(p_t,k_t)): além da posição, sabe se a chave já foi coletada]

[explique que agora o problema é diferente do Pong. Não está faltando informação sobre a dinâmica instantânea do movimento. Se o agente está em uma célula e anda para a esquerda, sabemos normalmente para qual célula ele irá. O que está faltando é informação sobre algo que aconteceu no passado]

[use como exemplo uma posição imediatamente antes da porta. O mesmo (p_t) pode representar dois estados físicos diferentes: ((p_t,0)), antes da chave ter sido coletada, e ((p_t,1)), depois da chave ter sido coletada]

[explique matematicamente que executar a mesma ação nesses dois estados produz transições diferentes. Se (k_t=0), a porta bloqueia o agente; se (k_t=1), ele atravessa. Como (z_t=p_t) mistura os dois casos, (p(z_{t+1},r_{t+1}\mid z_t,a_t)) precisa representar uma mistura das duas possibilidades]

[explique que conhecer o histórico resolve a ambiguidade. Se (H_t) mostra que o agente já passou pela célula da chave, então sabemos que (k_t=1). Consequentemente,

[

p(z_{t+1},r_{t+1}\mid z_t,a_t,H_t)

\neq

p(z_{t+1},r_{t+1}\mid z_t,a_t)

]

e a representação viola a propriedade de Markov]

[explique que adicionar (k_t) resolve o problema justamente porque transforma um acontecimento potencialmente distante no histórico em uma única variável do estado. Uma vez conhecido (k_t), saber exatamente como o agente chegou ali não acrescenta informação relevante para a próxima transição]

[IMAGEM: mostrar a mesma célula próxima à porta duas vezes. À esquerda, agente sem chave e porta fechada; à direita, agente com chave e porta aberta. Na representação (z=p), os dois casos parecem ser exatamente o mesmo estado. Na representação (z=(p,k)), tornam-se estados diferentes]

[dar o nome deste caso: **Missing memory**. Diferentemente do Pong, a informação ausente não descreve para onde algo está se movendo, mas resume algo importante que ocorreu anteriormente]

## Aprendendo

[explique que novamente vamos treinar exatamente o mesmo algoritmo, com a mesma recompensa, dinâmica e parâmetros. A única mudança será a representação fornecida ao agente]

[PLAYGROUND: gridworld da chave e da porta à esquerda. À direita, gráfico de recompensa ou taxa de sucesso por episódio e controles dos parâmetros de treinamento. O agente recebe apenas (z_t=p_t). No rodapé, um dropdown opcional explicando o algoritmo utilizado]

[explique o comportamento esperado. Como posições anteriores à coleta da chave e posteriores à coleta da chave são tratadas como o mesmo estado, o agente recebe sinais de aprendizado conflitantes. Em regiões compartilhadas do mapa, uma mesma observação pode exigir comportamentos diferentes dependendo de algo que ocorreu muito antes]

[explique que ele ainda pode eventualmente chegar ao objetivo, principalmente por exploração, mas tende a aprender uma política menos eficiente e menos estável]

[apresente agora exatamente o mesmo experimento incluindo (k_t)]

[PLAYGROUND: mesmo ambiente e mesmos parâmetros, mas utilizando (z_t=(p_t,k_t)). Visualmente indicar se has_key=0 ou has_key=1]

[explicar que agora o agente consegue distinguir, por exemplo, “estar no centro antes de pegar a chave” de “estar no centro depois de pegar a chave”. Estados que exigem decisões diferentes deixam de ser representados como a mesma coisa]

[comparar as curvas de aprendizado e mostrar que a representação Markoviana converge mais rapidamente para uma política consistente]

[IMAGEM: curvas de aprendizado das duas representações lado a lado ou sobrepostas]

[concluir brevemente que, enquanto no Pong adicionamos uma variável para representar a dinâmica atual, aqui adicionamos uma variável que resume uma informação relevante do passado]

# Checkpoints

## O MDP

[apresente o terceiro ambiente como um gridworld com um hub central conectado aos checkpoints A, B e C. Para completar o episódio, o agente precisa visitá-los na ordem (A\rightarrow B\rightarrow C)]

[deixe claro que, diferente da porta e da chave, nenhum caminho fica bloqueado ou liberado. A geometria e as possibilidades físicas de movimento permanecem exatamente as mesmas durante todo o episódio]

[apresente o MDP matematicamente. O estado completo é (s_t=(p_t,q_t)), onde (p_t) é a posição e (q_t\in{A,B,C,done}) representa o próximo checkpoint esperado. As ações movimentam o agente pelo grid. (q_t) avança quando o checkpoint correto é visitado, e a recompensa positiva é produzida quando o agente alcança o checkpoint esperado]

[IMAGEM: hub central com três caminhos terminando em A, B e C. Mostrar a sequência A → B → C separadamente, sem bloquear fisicamente nenhum caminho]

[apresente novamente duas representações: (z_t=p_t) e (z_t=(p_t,q_t))]

[explique que este caso parece inicialmente mais estranho, porque somente (p_t) já é suficiente para prever o movimento físico do agente. Para qualquer posição e ação,

# [p(p_{t+1}\mid p_t,a_t,H_t)

p(p_{t+1}\mid p_t,a_t)

]

O histórico não melhora a previsão de onde o agente estará]

[em seguida, mostre que um MDP não precisa apenas determinar o próximo estado físico: o estado atual também deve ser suficiente para determinar a distribuição da recompensa]

[use um checkpoint como exemplo. Entrar em B quando (q_t=B) produz recompensa e avança a tarefa. Entrar exatamente na mesma célula B quando (q_t=A) ou (q_t=C) pode produzir recompensa zero ou uma penalidade. A posição e a ação podem ser idênticas, mas a recompensa é diferente]

[explique que (q_t) depende do histórico da tarefa. Saber quais checkpoints já foram visitados corretamente permite descobrir qual recompensa aquela mesma transição produzirá]

[formalize que, apesar de a dinâmica espacial continuar Markoviana,

[

p(r_{t+1}\mid p_t,a_t,H_t)

\neq

p(r_{t+1}\mid p_t,a_t)

]

e, portanto, para a transição completa do MDP,

[

p(z_{t+1},r_{t+1}\mid z_t,a_t,H_t)

\neq

p(z_{t+1},r_{t+1}\mid z_t,a_t)

]

]

[explique que adicionar (q_t) torna explícito o estado atual da tarefa. Uma vez que sabemos posição e próximo checkpoint esperado, o restante do histórico deixa de ser necessário para determinar tanto a próxima transição quanto a recompensa]

[IMAGEM: mostrar o agente entrando exatamente no checkpoint B em dois momentos diferentes. Em um, (q=B) e aparece +1. No outro, (q=C) e aparece 0. Destacar que posição e movimento são os mesmos; somente o estado da tarefa mudou]

[dar o nome deste terceiro caso: **Missing reward state**. Aqui não estamos escondendo a dinâmica física nem simplesmente uma condição que libera novas transições. Estamos escondendo a variável que determina o significado da mesma transição para a tarefa]

## Aprendendo

[explique que treinaremos novamente o mesmo algoritmo mantendo dinâmica espacial, recompensa e parâmetros constantes]

[PLAYGROUND: gridworld com os três checkpoints à esquerda. À direita, gráfico de recompensa, checkpoints corretos por episódio ou taxa de conclusão. O agente observa apenas (z_t=p_t). Parâmetros de aprendizado abaixo e dropdown com detalhes do algoritmo no rodapé]

[explique que o problema aparece principalmente no hub central. A mesma posição pode exigir ir para A, B ou C dependendo do progresso da sequência, mas a representação reduzida apresenta todos esses momentos como o mesmo estado]

[explique que uma política sem essa informação pode aprender preferências médias ou depender da exploração para eventualmente visitar os checkpoints na ordem correta, mas não consegue condicionar sua decisão explicitamente ao progresso da tarefa]

[apresente o segundo experimento incluindo (q_t)]

[PLAYGROUND: exatamente o mesmo ambiente e treinamento, agora com (z_t=(p_t,q_t)). Mostrar discretamente qual checkpoint é atualmente esperado]

[explicar que agora o agente pode aprender políticas diferentes para “hub esperando A”, “hub esperando B” e “hub esperando C”, mesmo estando fisicamente na mesma posição]

[comparar as curvas de aprendizado e mostrar maior velocidade, estabilidade e taxa de conclusão quando o estado da tarefa é representado explicitamente]

[IMAGEM: comparação das duas curvas de aprendizado]

[concluir que este é um terceiro tipo de informação escondida: a representação podia prever perfeitamente o movimento seguinte, mas ainda não era suficiente para representar corretamente o processo de recompensa]

# O que estava faltando?

[retome os três experimentos lado a lado. Em todos eles, dinâmica real, recompensa, algoritmo e parâmetros permaneceram constantes entre as duas versões. Alteramos apenas aquilo que o agente chamava de estado]

[resuma o primeiro caso como **Missing dynamics**: no Pong, posição não informa velocidade. O histórico permite inferir a direção da bola e altera a distribuição do próximo estado]

[resuma o segundo como **Missing memory**: em Key–Door, a posição não informa se um evento importante já aconteceu. O histórico revela se a chave foi coletada e, consequentemente, quais transições são possíveis]

[resuma o terceiro como **Missing reward state**: em Checkpoints, a posição já determina corretamente o próximo movimento, mas não determina a recompensa. O histórico revela em qual estágio da tarefa o agente está]

[IMAGEM: três colunas — Pong / Key–Door / Checkpoints. Em cada uma, destacar respectivamente Velocity, Has Key e Next Checkpoint como a informação adicionada à representação]

[explique que esses três exemplos são manifestações da mesma condição matemática. Se algum detalhe do histórico modifica a distribuição prevista para o próximo estado ou recompensa mesmo depois de conhecermos (s_t) e (a_t), então aquilo que chamamos de estado ainda não é suficiente]

# [p(s_{t+1},r_{t+1}\mid s_t,a_t,H_t)

p(s_{t+1},r_{t+1}\mid s_t,a_t)

]

[concluir que construir um MDP não consiste apenas em decidir quais variáveis são convenientes para entregar ao agente. A representação precisa condensar toda informação do passado que continua relevante para o futuro]

[finalizar reforçando a principal observação empírica do artigo: nos três ambientes, adicionar a informação ausente não mudou o problema real que o agente estava tentando resolver. Mudou apenas sua representação. Mesmo assim, o aprendizado se tornou mais rápido, estável e eficiente]

[encerrar com a ideia de que **Markovianness é uma propriedade da representação escolhida para descrever o processo**: o ambiente pode ser o mesmo, mas uma representação pode ser suficiente enquanto outra esconde exatamente a informação que o agente precisa]

# 4. Visuais e Interações

- **contexto → mudança ou problema → evidência → conclusão ou ação**
- **escolha o gráfico certo → remova o que não ajuda → destaque o que importa.**
- **Uma boa visualização não mostra tudo que você sabe; ela torna difícil não perceber aquilo que importa.**

# 5. Primeiro Rascunho

# The Markov Principle

Every problem in reinforcement learning is rigorously defined by a Markov decision process (MDP). An MDP brings together a set of states, actions, rewards, and a transition function that dictates how the environment evolves. The transition function takes a state and an action, and returns a new state and a reward.

We can write this transition as a probability distribution: $p(s', r \mid s, a)$. This formulation raises a natural question. Why does the transition function rely solely on the current state and action, rather than the entire history of states the agent has traversed?

If we were to condition this distribution on the history $H$, which represents the sequence of all past states and actions leading up to the current moment, we would write $p(s', r \mid s, a, H)$. The Markov principle provides the answer. It states that the current state must contain all the information from the past that remains relevant to determining what can happen next. The state $S$ can take any form we design, as long as this condition holds.

Mathematically, the Markov principle is satisfied when the transition probabilities are identical whether we condition on the history or not:

$$p(s', r \mid s, a) = p(s', r \mid s, a, H)$$

[IMAGE: In the left corner, it shows a vertical trajectory of S,A,R,S,A in a "branches" style showing a path the agent took. Point out that if H (set of S) is necessary to determine what will happen next, then the Markov principle was violated. In the right corner, show the opposite, that the history does not matter to determine what will happen]

The Markov property is a characteristic of the transition function and the state representation, rather than the agent, the policy, or the learning algorithm. It is often a matter of design. Depending on how we formulate the state space, including the history of the agent's trajectory might indeed change the prediction of the future. When we define a state representation that omits critical information, the history suddenly becomes necessary to predict the next transition.

We will explore three different MDPs to observe this effect. For each environment, we will construct two formulations of the state space: one that violates the Markov principle and one that respects it. By training an agent in each scenario, we can see directly how the choice of representation impacts learning.

# Pong

Ping pong serves as an excellent case study in reinforcement learning. The objective is intuitive and the reward signal is clear, but in practice, that reward is sparse. The agent only receives feedback when it hits or misses the ball, and most steps yield a reward of zero. Because the ball's position is continuous, the state space is essentially infinite, requiring some form of function approximation to learn effectively.

## The MDP

Our first MDP is a simplified Pong environment where a ball moves continuously across a rectangular arena. It bounces off the walls and must be hit by a paddle controlled by the agent at the bottom of the screen. The agent can choose to move the paddle left, stay still, or move right. The reward is positive when the ball is hit and negative when it is missed.

We will compare two representations of this environment. In the non-Markovian representation, the agent only observes the position of the ball and the paddle, so the state is $z_t=(x_t,y_t,p_t)$. This information is insufficient to determine the next transition. A ball at a specific position could be moving up or moving down. If the agent knew the previous positions, it could infer the trajectory and predict the future. In the Markovian representation, we add the ball's velocity, forming the state $z_t=(x_t,y_t,v_t^x,v_t^y,p_t)$. Now, the position and velocity fully describe the relevant dynamics at that instant. Knowing the previous positions adds no necessary information for determining the next transition.

[IMAGE: an illustration of the agent and environment. A horizontal paddle that can move left or right inside a box, where there is a ball that bounces off the walls. Hitting the ball with the paddle is +1 reward, losing the ball is -1. Otherwise it is 0]

The first representation violates the Markov principle because, without the direction of movement, we cannot predict the next state deterministically. The distribution of the next state becomes probabilistically spread across possible trajectories. If we were to include the ball's last position in our transition function, we would know exactly where it came from and where it is going. Including the history changes the transition function from a probabilistic spread to a deterministic update.

[IMAGE: In the left corner, a stationary ball above the paddle, with numerous arrows pointing in all directions indicating that we do not know where it is going. At the top of this image, I want the formula for S, which is the position of the ball + paddle. In the right corner, a similar image, but now the formula incorporates velocity, and therefore we can know where the ball is going]

In mathematical terms, the first representation yields a transition function that returns a broad probability distribution. Supplying the history narrows this distribution, meaning that the probability equality is broken.

In the second case, providing the history offers no advantage. The velocity already dictates where the ball will go next, ensuring the equality holds perfectly.

## Learning

We can test this by deploying an algorithm to learn how to return the ball. Initially, we will withhold the velocity information from the agent's state representation.

[PLAYGROUND: In the left corner, the ping pong described earlier. The paddle moves left and right. In the top right corner: a small graph of rewards per episode. Below the graph: parameters to control the learning speed of the agent. In the footer of the playground, I want a drop down that briefly explains the algorithm behind the learning, just for the curious]

Under these conditions, the agent struggles. It manages to learn a suboptimal policy, but the process takes significantly longer than necessary because it cannot perceive the full dynamics of the environment.

We can then run the exact same playground, but provide the agent with the ball's velocity.

[PLAYGROUND: same playground as before, but now the agent receives the velocity. The goal is to see that the agent learns faster]

With the Markovian representation, the agent learns the task much faster.

[IMAGE: Compare the two learning curves]

This scenario exemplifies what we can call **Missing dynamics**, where the state fails to capture the instantaneous motion required to predict physical transitions.

# The Door and the Key

## The MDP

Our second environment is a small gridworld where the agent must retrieve a key before passing through a door to reach the goal. The key and the door are located on opposite sides of the map, forcing the agent to traverse a central region, collect the key, and then retrace its steps toward the door.

The complete state in this MDP is $s_t=(p_t,k_t)$, where $p_t$ represents the agent's position and $k_t \in \{0, 1\}$ indicates whether the key has been collected. The available actions are $A=\{\text{up}, \text{down}, \text{left}, \text{right}\}$. The door acts as a solid wall when $k_t=0$ and allows passage when $k_t=1$. Reaching the goal yields a positive reward and ends the episode.

[IMAGE: simple gridworld with the agent initially in the center, a key at one end, a door at the other and the objective behind the door. Visually highlight that the agent needs to go to the key and then return towards the door]

We evaluate two representations. In the first, $z_t=p_t$, meaning the agent only knows its current position. In the second, $z_t=(p_t,k_t)$, it knows its position and whether it holds the key.

This presents a different challenge from Pong. There is no missing information regarding instantaneous movement dynamics. If the agent is in an empty cell and moves left, we know exactly which cell it will land in. Instead, the missing information relates to an event that occurred in the past.

Consider the position immediately in front of the door. The same spatial position $p_t$ represents two distinct physical states: $(p_t,0)$ before the key is collected, and $(p_t,1)$ after the key is collected.

Executing the same action in these two states produces completely different transitions. If $k_t=0$, moving toward the door results in the agent being blocked. If $k_t=1$, the agent steps through. Because the representation $z_t=p_t$ merges these two realities, the transition probability $p(z_{t+1}, r_{t+1} \mid z_t, a_t)$ is forced to represent a mixture of both possible outcomes.

Knowing the history resolves this ambiguity. If the history $H_t$ shows that the agent previously visited the key's location, we know with certainty that $k_t=1$. Consequently, the transition probabilities differ:

$$p(z_{t+1},r_{t+1}\mid z_t,a_t,H_t) \neq p(z_{t+1},r_{t+1}\mid z_t,a_t)$$

This shows the position-only representation violates the Markov property. Adding $k_t$ to the state resolves the issue by compressing a potentially distant historical event into a single current variable. Once $k_t$ is known, the exact path the agent took to get there adds no further relevant information for predicting the next transition.

[IMAGE: show the same cell near the door twice. On the left, agent without key and closed door; on the right, agent with key and open door. In representation (z=p), both cases appear to be exactly the same state. In representation (z=(p,k)), they become different states]

We can refer to this as **Missing memory**. Unlike Pong, the hidden information does not describe physical momentum, but rather summarizes a critical milestone that occurred earlier in the episode.

## Learning

We will train the same learning algorithm, keeping the reward structure, transition dynamics, and hyperparameters constant. The only variable is the state representation provided to the agent.

[PLAYGROUND: key and door gridworld on the left. On the right, graph of reward or success rate per episode and training parameter controls. The agent receives only (z_t=p_t). In the footer, an optional dropdown explaining the algorithm used]

When the agent observes only its position, it receives conflicting learning signals. Prior to collecting the key and after collecting the key, it perceives itself to be in the exact same state when crossing the center of the map. However, the optimal action in that shared space depends entirely on an event that happened many steps ago.

The agent might eventually stumble to the goal through random exploration, but it tends to converge on a highly inefficient and unstable policy.

We can run the identical experiment while including $k_t$ in the state.

[PLAYGROUND: same environment and same parameters, but using (z_t=(p_t,k_t)). Visually indicate whether has_key=0 or has_key=1]

The agent is now capable of distinguishing the state of being in the center before getting the key from being in the center after getting the key. States that demand different decisions are no longer aliased into a single representation.

Comparing the learning curves confirms that the Markovian representation converges much faster to a consistent and optimal policy.

[IMAGE: learning curves of the two representations side by side or superimposed]

In Pong, we added a variable to capture current momentum. Here, we added a variable to compress relevant past events.

# Checkpoints

## The MDP

The third environment is a gridworld featuring a central hub connected to three distinct checkpoints: A, B, and C. To successfully complete the episode, the agent must visit these checkpoints in the strict order of $A \rightarrow B \rightarrow C$.

Importantly, no paths are physically blocked or altered during the episode. The geometry of the map and the physical mechanics of movement remain entirely unchanged from start to finish.

The complete state for this MDP is $s_t=(p_t,q_t)$. The variable $p_t$ defines the spatial position, and $q_t \in \{A, B, C, \text{done}\}$ tracks the next expected checkpoint in the sequence. Moving the agent updates its position on the grid. The task state $q_t$ advances only when the correct checkpoint is visited, generating a positive reward.

[IMAGE: central hub with three paths ending in A, B and C. Show the sequence A -> B -> C separately, without physically blocking any path]

We evaluate the representations $z_t=p_t$ and $z_t=(p_t,q_t)$.

This scenario presents a subtle counterintuitive challenge. The position $p_t$ alone is perfectly sufficient to predict the physical movement of the agent. For any given position and action, the spatial transition holds true regardless of the past:

$$p(p_{t+1}\mid p_t,a_t,H_t) = p(p_{t+1}\mid p_t,a_t)$$

Knowing the history does not improve our ability to predict where the agent will physically end up next.

However, an MDP defines both the next state and the reward. The current state must be sufficient to determine the reward distribution as well.

Consider entering checkpoint B. If $q_t=B$, entering the cell generates a positive reward and advances the task. If the agent enters that exact same cell while $q_t=A$ or $q_t=C$, the transition yields zero reward or even a penalty. The physical position and the executed action are identical, yet the resulting reward is fundamentally different.

The variable $q_t$ is entirely dependent on the task history. Knowing which checkpoints have been visited allows us to deduce what reward a specific transition will produce.

While the spatial dynamics are fully Markovian, the reward distribution is not:

$$p(r_{t+1}\mid p_t,a_t,H_t) \neq p(r_{t+1}\mid p_t,a_t)$$

Consequently, the full transition distribution of the MDP violates the Markov property under the reduced representation:

$$p(z_{t+1},r_{t+1}\mid z_t,a_t,H_t) \neq p(z_{t+1},r_{t+1}\mid z_t,a_t)$$

Including $q_t$ makes the current state of the task explicit. Once we know the physical position and the expected checkpoint, the rest of the history is no longer needed to predict the full transition, including the reward.

[IMAGE: show the agent entering exactly checkpoint B at two different moments. In one, (q=B) and +1 appears. In the other, (q=C) and 0 appears. Highlight that position and movement are the same; only the state of the task has changed]

We categorize this as **Missing reward state**. We are not obscuring physical dynamics, nor are we hiding a condition that enables new physical movements. We are hiding the variable that assigns meaning to a physical transition within the context of the task.

## Learning

We train the algorithm once again, maintaining the same spatial dynamics, reward logic, and hyperparameters.

[PLAYGROUND: gridworld with the three checkpoints on the left. On the right, reward graph, correct checkpoints per episode or completion rate. The agent observes only (z_t=p_t). Learning parameters below and dropdown with algorithm details in the footer]

The limitation of the reduced representation becomes obvious in the central hub. Being in the center requires heading to A, B, or C depending on the progress of the sequence. The agent observes all of these distinct situations as the same state.

Without the task context, the policy might learn an average preference across the paths or rely heavily on random exploration to eventually trigger the checkpoints in the correct order. It fundamentally cannot condition its decisions on the progress of the task.

We run the second experiment by explicitly providing $q_t$.

[PLAYGROUND: exactly the same environment and training, now with (z_t=(p_t,q_t)). Discreetly show which checkpoint is currently expected]

The agent is now equipped to learn distinct policies for being in the hub while expecting A, expecting B, or expecting C, despite occupying the exact same physical position.

Comparing the learning curves demonstrates a dramatic improvement in learning speed, policy stability, and task completion rate when the task state is explicitly represented.

[IMAGE: comparison of the two learning curves]

This highlights a third category of hidden information. The representation perfectly predicted the next physical state, but failed to capture the variables necessary to determine the reward process.

# What was missing?

When we place all three experiments side by side, a clear pattern emerges. In every case, the underlying physical dynamics, the true reward function, the learning algorithm, and the hyperparameters remained completely constant between the two versions. We only altered what the agent considered to be its state.

In the first case, **Missing dynamics**, position failed to inform velocity. The history allowed us to infer the ball's trajectory, thereby altering the predicted distribution of the next spatial state.

In the second case, **Missing memory**, position failed to indicate whether a crucial event had occurred. The history revealed if the key had been collected, dictating which physical transitions were possible moving forward.

In the third case, **Missing reward state**, position perfectly predicted the next movement but failed to determine the reward. The history revealed the agent's progress within the task sequence.

[IMAGE: three columns — Pong / Key–Door / Checkpoints. In each, respectively highlight Velocity, Has Key and Next Checkpoint as the information added to the representation]

These three distinct examples are manifestations of the exact same mathematical condition. If any detail from the history modifies the predicted distribution of the next state or reward, even after we know the current state and action, then what we are calling the state is simply not sufficient:

$$p(s_{t+1},r_{t+1}\mid s_t,a_t,H_t) \neq p(s_{t+1},r_{t+1}\mid s_t,a_t)$$

Constructing an MDP requires more than just picking out convenient variables to hand to an agent. The chosen representation must successfully condense all information from the past that continues to hold relevance for the future.

Our empirical observations across the three environments reinforce a core truth. Adding the missing information never changed the actual problem the agent was trying to solve. It only changed the representation of that problem. Yet, in every instance, learning became demonstrably faster, more stable, and vastly more efficient.

Markovianness is fundamentally a property of the representation chosen to describe the process. The physical environment itself remains the same, but one representation might capture everything necessary to predict the future, while another hides the exact information the agent needs to succeed.