---
articleId: sample-based-view-of-reinforcement-learning
locale: pt-BR
routeSlug: uma-visao-do-aprendizado-por-reforco-baseada-em-amostras
href: /pt-br/learn/uma-visao-do-aprendizado-por-reforco-baseada-em-amostras
title: "Uma visão do aprendizado por reforço baseada em amostras"
navTitle: Uma visão de RL baseada em amostras
description: "Entenda muitos algoritmos de aprendizado por reforço como maneiras diferentes de transformar experiências amostradas de um MDP em comportamentos melhores."
eyebrow: Aprendizado por reforço · Aprendizado baseado em amostras
area: Aprendizado por reforço
topic: Aprendizado por reforço baseado em amostras
summary: Acompanhe a experiência ao longo de um MDP e compare como algoritmos de aprendizado por reforço coletam amostras, atualizam grandezas aprendidas e representam o que aprendem.
status: published
publishedAt: 2026-08-28
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
    - Entender a ideia básica de um algoritmo de aprendizado.
    - Acompanhar notação matemática básica e afirmações probabilísticas.
    - Entender, em linhas gerais, que um objetivo pode ser melhorado.
  likelyMisconception: Algoritmos de aprendizado por reforço são métodos isolados com nomes próprios, em vez de maneiras diferentes de aprender com experiências amostradas.
  transferOutcome: Explicar um algoritmo desconhecido de aprendizado por reforço identificando como ele amostra experiências, se espera ou usa bootstrapping, quais políticas geram e recebem o aprendizado, o que ele atualiza e como representa a grandeza aprendida.
  motivatingQuestion: Qual processo comum existe por trás das diversas famílias de algoritmos de aprendizado por reforço?
  conceptualBottleneck: Separar o MDP que torna a experiência possível, a política que ajuda a gerar uma experiência específica e a regra de aprendizado que extrai informação dessas amostras.
  evidenceOfUnderstanding:
    - Distinguir atualizações de Monte Carlo de atualizações por diferenças temporais.
    - Distinguir a política de comportamento da política-alvo.
    - Identificar se um algoritmo aprende valores, uma política ou ambos.
    - Identificar se as grandezas aprendidas são representadas por uma tabela ou por aproximação de funções.
    - Relacionar atualizações baseadas em amostras às equações de Bellman e à iteração generalizada de política.
---

## Antes de começar

O aprendizado por reforço pode exigir bastante matemática muito rapidamente. Uma introdução típica começa com processos de decisão de Markov, avança para as equações de Bellman e a programação dinâmica, desenvolve funções valor e, somente depois de uma boa dose de formalismo, chega a algoritmos como controle de Monte Carlo, SARSA e Q-learning.

Essa base é importante, e não pretendemos substituí-la. Neste artigo, porém, seguiremos deliberadamente outro caminho.

Nosso objetivo é construir um modelo mental abrangente do aprendizado por reforço antes de nos aprofundarmos em algoritmos específicos. Estabeleceremos apenas a notação matemática necessária e, com ela, entenderemos ideias que muitas vezes aparecem bem mais adiante: Monte Carlo versus aprendizado por diferenças temporais, métodos on-policy versus off-policy, métodos baseados em valor versus baseados em política, métodos actor-critic e aproximação de funções.

A ideia é que, quando você estudar SARSA ou Q-learning em detalhes, já saiba quais decisões esses algoritmos tomam e onde se encaixam no panorama mais amplo do RL. A teoria formal continuará importante, mas será muito mais fácil aprendê-la quando já houver uma estrutura intuitiva à qual conectá-la.

<figure class="static-figure sample-based-rl-roadmap">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/conceptual-shortcut-mobile.png"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/conceptual-shortcut.png"
      alt="O caminho convencional do aprendizado por reforço parte de bandits e passa por um MDP, pelas equações de Bellman e pelo planejamento, e pelas funções valor antes de chegar ao aprendizado baseado em amostras e às principais famílias de algoritmos. Um atalho verde mostra que este artigo vai diretamente do MDP ao aprendizado baseado em amostras, deixando visíveis as etapas formais para estudo posterior."
      width="1774"
      height="887"
      loading="eager"
      decoding="async"
    />
  </picture>
</figure>

## Uma visão geral rápida de RL

O aprendizado de máquina contém vários **paradigmas de aprendizado**. Um paradigma é uma maneira ampla de definir quais informações um sistema de aprendizado recebe e que tipo de problema deve resolver.

No aprendizado supervisionado, observamos exemplos com entradas e saídas desejadas. Dados pares como $(x,y)$, o modelo tenta aprender uma função que mapeie novas entradas $x$ para saídas $y$ adequadas. A classificação de imagens é um exemplo conhecido: fornecemos imagens com seus rótulos e treinamos um modelo para prever o rótulo de uma imagem ainda não vista.

No aprendizado não supervisionado, não há um alvo explícito $y$. O algoritmo tenta descobrir estruturas úteis nos dados $X$, talvez agrupando observações semelhantes, aprendendo uma representação comprimida ou estimando como os dados estão distribuídos.

O aprendizado por reforço parte de outro cenário. Em vez de recebermos um conjunto de dados estático para modelar, temos um **agente interagindo com um ambiente**. O agente toma decisões, essas decisões alteram o que acontece em seguida, e as consequências de suas ações fornecem informação sobre quais comportamentos são úteis.

Esse padrão é surpreendentemente comum fora do aprendizado de máquina. Um bebê que aprende a andar não recebe um conjunto de dados com o movimento muscular correto para cada posição possível do corpo. Ele se move, perde o equilíbrio, ajusta-se, acerta de vez em quando e, aos poucos, controla melhor o próprio corpo. Uma pessoa em seu primeiro estágio costuma aprender de modo parecido: algumas decisões funcionam, outras criam problemas, e a interação repetida fornece evidências sobre o que fazer em situações semelhantes no futuro.

Muitos problemas apresentam essa estrutura naturalmente. Um robô precisa decidir como se mover enquanto interage com o mundo físico. Um agente de jogo precisa escolher ações enquanto o jogo muda ao seu redor. Um sistema de recomendação pode selecionar conteúdo e depois observar a resposta das pessoas usuárias. Em todos esses casos, os próprios atos do agente ajudam a produzir dados úteis.

Essa interação entre decisões e consequências é o cenário central do aprendizado por reforço.

<figure class="static-figure sample-based-rl-learning-paradigms">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/learning-paradigms-mobile.png"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/learning-paradigms.png"
      alt="Três paradigmas de aprendizado diferem quanto à informação que orienta o aprendizado. O aprendizado supervisionado mapeia entradas X para alvos conhecidos y. O aprendizado não supervisionado encontra relações e grupos em X. O aprendizado por reforço usa um ciclo no qual um agente envia ações a um ambiente e recebe o próximo estado e uma recompensa."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

### Um pouco mais a fundo

#### Política

Se um agente precisa decidir repetidamente o que fazer, precisamos de alguma regra que mapeie aquilo que o agente observa no momento para uma decisão.

No aprendizado por reforço, chamamos essa regra de **política**.

Uma política recebe informações que descrevem a situação atual e determina qual ação o agente deve executar. Costumamos representá-la como

$$

\pi(a \mid s)

$$

em que $s$ é o estado atual e $a$ é uma ação. Mais precisamente, $\pi(a\mid s)$ informa a probabilidade de escolher a ação $a$ quando o agente está no estado $s$.

Uma política determinística é apenas um caso especial em que, para cada estado, uma ação recebe probabilidade $1$. Nesse caso, podemos imaginá-la, informalmente, como uma função $a=\pi(s)$.

Considere uma partida simples de Pong. Suponha que o agente conheça a posição e a velocidade da bola, além da posição de sua raquete. Uma política pode usar essas informações para decidir se a raquete deve se mover para cima ou para baixo.

<figure class="static-figure sample-based-rl-pong-policy">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/pong-policy-mobile.png"
      width="887"
      height="1774"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/pong-policy.png"
      alt="Um ambiente de Pong para uma pessoa tem uma bola descendo em direção a uma raquete horizontal dentro de uma área de jogo suavemente delimitada. A política recebe como estado a posição e a velocidade da bola, além da posição da raquete, e escolhe a ação mover para a direita, de acordo com a seta verde abaixo da raquete."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

A política não precisa ser sofisticada. Por exemplo, imagine que $y_b$ represente a posição vertical da bola e $y_p$, a posição vertical da raquete. Uma política determinística muito simples poderia ser

$$

\pi(s)=

\begin{cases}

\text{UP}, & y_b > y_p \\

\text{DOWN}, & y_b < y_p \\

\text{STAY}, & y_b = y_p

\end{cases}

$$

O estado atual $s$ pode conter muito mais informações do que $y_b$ e $y_p$, mas essa política específica escolhe usar somente esses dois valores. Sua regra é simples: mover a raquete na direção da bola.

Nada na definição de política exige essa forma específica. Uma política pode ser uma tabela pequena, um modelo de regressão logística, uma rede neural grande, um LLM ou um programa arbitrariamente complexo. O que importa é seu papel na interação: dado o estado atual, ela determina como o agente age.

#### A recompensa

Criar uma política é fácil. Poderíamos definir uma agora mesmo escolhendo ações ao acaso.

A questão mais difícil é saber se a política é boa.

Uma política aleatória de Pong continua sendo perfeitamente válida no sentido de RL, mas moverá a raquete sem usar a situação de maneira inteligente e, por isso, errará a bola com frequência. Uma política melhor deve usar as informações disponíveis de maneiras que produzam resultados melhores.

Para distinguir comportamentos úteis de comportamentos inúteis, o aprendizado por reforço usa **recompensas**.

Uma recompensa é um sinal numérico que descreve a consequência imediata daquilo que o agente acabou de fazer. Em um ambiente simples de Pong, podemos definir a recompensa de modo que acertar a bola produza $+1$, perder a bola produza $-1$ e a maioria das interações intermediárias produza $0$.

Inicialmente, podemos pensar na recompensa como uma função

$$

r(s,a)

$$

que associa um valor numérico à execução da ação $a$ no estado $s$.

Em geral, uma política que produz repetidamente interações com recompensas maiores é preferível a outra que produz recompensas menores. A mesma ideia vale em muitos ambientes: podemos recompensar um robô por chegar ao destino, um controlador de espaçonave por pousar com sucesso ou um agente de jogo por marcar pontos.

> **Observação:** Em uma formulação mais completa, a recompensa também pode depender do estado resultante; por isso, frequentemente escrevemos algo como $r(s,a,s')$. As recompensas também podem ser estocásticas, em vez de fixas.

A recompensa, portanto, define o que o processo de aprendizado tenta realizar. O agente não otimiza diretamente uma frase informal como “jogar Pong bem”. Ele interage com o sinal numérico fornecido pelo ambiente, e a qualidade de uma política é avaliada, em última instância, pelas recompensas que ela acumula ao longo do tempo.

<div data-pong-reward-comparison></div>

#### A transição

Ainda falta uma peça importante.

Suponha que o agente esteja em determinado estado e escolha uma ação. O que acontece depois?

O ambiente muda. No Pong, mover a raquete altera sua posição enquanto a bola continua em movimento. Em um robô, acionar um motor muda os ângulos das articulações e talvez a posição do robô. Em um jogo de tabuleiro, colocar uma peça produz uma nova configuração do tabuleiro.

Descrevemos esse comportamento por meio da **dinâmica de transição**:

$$

P(s' \mid s,a)

$$

Essa expressão descreve a probabilidade de chegar ao estado $s'$ depois de executar a ação $a$ a partir do estado $s$.

<figure class="static-figure sample-based-rl-transition-dynamics">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/transition-dynamics-mobile.png"
      width="887"
      height="1774"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/transition-dynamics.png"
      alt="Um agente em um mundo em grade começa na célula central do estado s. Ele executa a ação a e se move para a direita. A dinâmica de transição P de s linha, dados s e a, produz o próximo estado s linha, no qual o mesmo agente ocupa a célula imediatamente à direita."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

Às vezes, a transição é determinística. Se um agente em um mundo em grade se mover para a direita a partir da célula $(2,3)$, por exemplo, ele poderá chegar sempre à célula $(2,4)$.

Outros ambientes são estocásticos. A roda de um robô pode derrapar. Um oponente pode se comportar de maneira imprevisível. Um jogo pode conter aleatoriedade. Nessas situações, o mesmo estado e a mesma ação podem levar a vários estados seguintes possíveis, cada qual com certa probabilidade.

#### O MDP completo

Agora podemos descrever o ciclo básico de interação do aprendizado por reforço.

O agente observa o estado atual $s_t$. Sua política seleciona uma ação $a_t$. O ambiente responde de acordo com sua dinâmica de transição, produzindo um novo estado $s_{t+1}$ e também uma recompensa associada à transição. O agente observa a nova situação e escolhe outra vez.

Então, o processo se repete.

Essa sequência é bastante natural:

1. observar o estado;
2. escolher uma ação usando a política;
3. deixar o ambiente realizar a transição;
4. receber a recompensa resultante;
5. observar o próximo estado;
6. escolher novamente.

Ao formalizar essa interação, obtemos um **processo de decisão de Markov**, ou MDP.

Um MDP costuma ser descrito por estados $S$, ações $A$, dinâmica de transição $P$, recompensas $R$ e, conforme a formulação, um fator de desconto $\gamma$. Em breve, apresentaremos o papel de $\gamma$.

<figure class="static-figure sample-based-rl-mdp-loop">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/mdp-loop-mobile.png"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/mdp-loop.png"
      alt="Um agente e um ambiente formam um ciclo. A política pi da ação a índice t, dado o estado s índice t, escolhe a ação a índice t. A dinâmica de transição P do ambiente produz o estado s índice t mais um, enquanto sua função de recompensa produz a recompensa r índice t mais um; ambos retornam ao agente."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

Se inicializarmos o ambiente e deixarmos um agente interagir com ele, obteremos uma sequência como

$$

s_0,a_0,r_1,s_1,a_1,r_2,s_2,\ldots,s_T

$$

Essa sequência é chamada de **trajetória** ou, quando termina em algum momento, de episódio.

Cada estado informa onde o agente estava, cada ação informa o que ele fez e cada recompensa traz alguma informação sobre a consequência. Uma trajetória completa é, portanto, o registro de uma execução no ambiente.

<div data-mdp-trajectory-machine-slot></div>

Executar a mesma política duas vezes não produz necessariamente a mesma trajetória.

Imagine primeiro um labirinto determinístico pequeno. O agente usa uma política determinística e cada ação tem um resultado previsível. Partir do mesmo estado sempre produzirá exatamente a mesma sequência.

Agora imagine um robô navegando em uma sala cheia. A política pode escolher aleatoriamente entre vários movimentos razoáveis, as pessoas podem se mover de maneira imprevisível e os sinais dos sensores ou das recompensas podem conter ruído. Partir exatamente da mesma situação pode, agora, produzir trajetórias muito diferentes.

A variação pode surgir em vários lugares. A própria política pode ser estocástica, as transições do ambiente podem ser estocásticas e a recompensa também pode conter aleatoriedade.

Apesar de todas essas possibilidades, a representação da trajetória permanece a mesma. Continuamos observando estados, ações, recompensas e novos estados.

Esse é um dos motivos pelos quais a estrutura de um MDP é tão útil. Um jogo de fliperama, um robô, um sistema de recomendação e um problema de controle podem parecer completamente diferentes, mas suas interações entre agente e ambiente podem ser registradas pela mesma sequência básica de estados, ações e recompensas.

### O objetivo final

As recompensas surgem uma interação por vez, mas avaliar uma decisão geralmente exige olhar mais adiante.

Suponha que nosso agente de Pong se mova para baixo e receba recompensa $0$. Se esse movimento colocar a raquete exatamente na posição certa para acertar a bola dois passos depois e receber $+1$, dizer que a ação original valeu apenas zero ignoraria parte de sua consequência.

Por isso, o aprendizado por reforço costuma trabalhar com um **retorno**: a recompensa futura acumulada a partir de determinado ponto da trajetória.

Uma definição comum é

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

ou, de maneira equivalente,

$$
G_t

=

\sum_{k=0}^{T-t-1}\gamma^kR_{t+k+1}.

$$

O parâmetro

$$

0\leq\gamma\leq1

$$

é chamado de **fator de desconto**. Quando $\gamma$ está próximo de $1$, recompensas em um futuro distante continuam importantes. Com um $\gamma$ menor, as recompensas imediatas pesam muito mais.

<figure class="static-figure sample-based-rl-discounted-returns">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/discounted-returns-aligned-mobile.svg"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/discounted-returns-aligned.svg"
      alt="Uma trajetória alterna estados, ações e recompensas até a ação terminal a índice T, a recompensa r índice T e o estado s índice T. Faixas verticais alinham cada recompensa ao termo correspondente do retorno. G um inclui r um até gama elevado a T menos um vezes r índice T. G dois exclui r um e inclui r dois até gama elevado a T menos dois vezes r índice T."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

Agora podemos enunciar o objetivo do aprendizado por reforço com mais precisão. Queremos uma política cujas interações com o ambiente produzam retornos esperados altos:

$$
\pi^*

=

\arg\max_{\pi}

\mathbb{E}_{\tau\sim\pi}[G(\tau)].

$$

A notação $\tau\sim\pi$ significa que a trajetória $\tau$ foi gerada seguindo a política $\pi$, junto com toda a aleatoriedade existente no ambiente.

Essa esperança matemática importa porque uma única trajetória pode ter sorte ou azar. Uma política pode produzir ocasionalmente uma recompensa enorme e, ainda assim, ter um desempenho ruim na maioria das vezes. Para estimar seu desempenho real, poderíamos executar a política milhares de vezes, calcular o retorno de cada trajetória e tirar a média dos resultados.

Conceitualmente, o aprendizado por reforço nos pede que encontremos a política que torne esse retorno esperado o maior possível.

## O algoritmo lê trajetórias

Agora temos um MDP e um objetivo claro, mas ainda não explicamos o aprendizado em si.

Como encontramos, de fato, uma política melhor?

Há uma ideia ampla no aprendizado por reforço chamada **iteração generalizada de política**, ou GPI, que descreve a interação entre dois processos.

A **avaliação de política** tenta determinar quão boa é a política atual.

A **melhoria de política** usa essa informação para produzir uma política melhor.

Esses dois processos podem assumir muitas formas. Às vezes, a avaliação é realizada de maneira exata usando um modelo completo do ambiente. Às vezes, é apenas aproximada. Às vezes, a política é alterada explicitamente; em outros algoritmos, a melhoria acontece indiretamente por meio de outra função aprendida.

Neste artigo, vamos nos concentrar em uma perspectiva especialmente útil: o **aprendizado baseado em amostras**.

Em vez de supor que sabemos exatamente como o ambiente funciona, interagimos com ele e coletamos trajetórias. Essas trajetórias contêm amostras de estados, ações, recompensas e transições. O algoritmo de aprendizado examina essas observações e as usa para determinar como seu comportamento atual deve mudar.

Em termos bastante gerais:

1. amostramos experiências do MDP;
2. extraímos informações das relações entre estados, ações, recompensas e resultados futuros;
3. usamos essas informações para melhorar o agente.

Podemos começar com praticamente qualquer política. Ela pode até agir de modo aleatório. Deixamos que interaja com o ambiente, coletamos experiências e, então, aplicamos algum **procedimento de atualização**.

Podemos escrever isso abstratamente como

$$

\pi' = U(\pi,\mathcal{D}),

$$

em que $\mathcal{D}$ representa informações coletadas da experiência e $U$ é uma regra de atualização que usa essas informações para produzir uma nova política $\pi'$.

Na prática, a política muitas vezes será representada por parâmetros. Se a escrevermos como $\pi_\theta$, então $\theta$ representa apenas os números ajustáveis que determinam seu comportamento: entradas em uma tabela, coeficientes de um modelo linear ou milhões de pesos de uma rede neural.

Assim, podemos entender a atualização como uma alteração nesses números:

$$

\theta' = U(\theta,\mathcal{D}).

$$

Não há nada de misterioso em $\theta$. Ele é apenas a parte do agente que o aprendizado pode modificar.

<figure class="static-figure sample-based-rl-policy-update">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/policy-update-mobile.svg"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/policy-update.svg"
      alt="A política atual atribui duas preferências de ação ao mesmo estado. A experiência fornece um sinal de aprendizado compacto à regra de atualização U, que produz a política pi linha e aumenta a probabilidade da ação útil, enquanto o papel da política permanece o mesmo."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

Um algoritmo de aprendizado por reforço informa como essa atualização deve acontecer. Ele especifica quais informações extrair da experiência, como convertê-las em um sinal de aprendizado, que representação modificar e com que intensidade alterá-la.

Repetimos esse processo. O agente atualizado gera mais experiências, essas experiências produzem outra atualização e o ciclo continua.

<figure class="static-figure sample-based-rl-learning-cycle">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/sample-learning-cycle-mobile.svg"
      width="1024"
      height="1380"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/sample-learning-cycle.svg"
      alt="A política pi atua em um MDP e gera várias trajetórias que alternam estados, ações e recompensas. A regra de atualização U aprende com essas amostras e produz uma política melhorada pi linha. Uma seta de retorno leva essa política de volta ao mesmo ciclo de interação, para que o aprendizado possa se repetir."
      width="1774"
      height="700"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

### Outras formas

Amostrar trajetórias pode parecer a maneira óbvia de aprender, mas observe o que ignoramos deliberadamente: a função de transição $P(s'\mid s,a)$.

Suponha que a conhecêssemos perfeitamente.

Se um agente considerasse mover-se para a direita, poderíamos calcular diretamente quais estados seguintes poderiam resultar e com quais probabilidades. Então, poderíamos raciocinar sobre as consequências desses estados, suas recompensas futuras e as decisões disponíveis depois deles. Em vez de descobrir o ambiente apenas experimentando ações repetidamente, poderíamos explorar nosso modelo de sua dinâmica.

Em ambientes pequenos cujo MDP completo é conhecido, isso leva a um rico corpo teórico que envolve programação dinâmica, equações de Bellman, cálculo exato ou aproximado de valores e planejamento.

Estamos pulando esse caminho de propósito.

Em muitos problemas práticos, a dinâmica de transição completa é desconhecida ou complexa demais para enumerar. Não temos uma tabela que informe a um robô a distribuição exata de probabilidades sobre todas as configurações físicas futuras depois de cada comando possível de motor. Em geral, tampouco podemos escrever as probabilidades exatas de transição de uma interação com uma pessoa usuária ou do controle de um simulador complexo.

Mas podemos observar o que aconteceu.

Isso torna a experiência amostrada extremamente útil. É por esse motivo que a usaremos como nosso principal modelo mental para comparar algoritmos.

## As perguntas

Até aqui, tanto o procedimento de atualização $U$ quanto a forma interna do agente permaneceram intencionalmente vagos.

Essa falta de especificidade é útil porque muitas famílias importantes de algoritmos de aprendizado por reforço aparecem quando começamos a perguntar como essas peças devem funcionar.

Vamos nos concentrar em quatro perguntas:

1. **Quando devemos atualizar?**
2. **A política que estamos treinando é a mesma que gerou nossa experiência?**
3. **O que o agente aprende para tomar decisões?**
4. **Como ele representa o que aprende?**

Cada pergunta revela um eixo diferente ao longo do qual os algoritmos de RL podem variar.

### Quando devemos atualizar a política?

Imagine que nosso agente começou a gerar uma trajetória.

Uma possibilidade é deixar o episódio inteiro terminar, observar tudo o que aconteceu, calcular seus retornos e, somente então, usar essas informações para aprender.

Outra possibilidade é começar a aprender enquanto o episódio ainda acontece. Depois de observar uma transição, o algoritmo talvez já tenha informação suficiente para realizar uma atualização.

<figure class="static-figure sample-based-rl-mc-td">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/monte-carlo-vs-td-mobile.svg"
      width="1024"
      height="1840"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/monte-carlo-vs-td.svg"
      alt="Monte Carlo aplica a atualização U somente depois que o episódio amostrado chega ao estado terminal. O aprendizado por diferenças temporais pode aplicar U após transições intermediárias e atualizar a política várias vezes enquanto o mesmo episódio ainda está sendo amostrado."
      width="1774"
      height="1040"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

Isso nos dá uma primeira intuição útil sobre a distinção entre métodos de **Monte Carlo** e de **diferenças temporais**, ou **TD**.

Métodos de Monte Carlo esperam até que o retorno relevante tenha sido realmente observado. Se quisermos saber o retorno posterior a uma ação, deixamos a trajetória se desenrolar e usamos as recompensas que de fato ocorreram depois. Assim, obtemos uma amostra direta do retorno; porém, em tarefas episódicas, geralmente precisamos aguardar o fim do episódio para ter acesso ao alvo completo.

Métodos TD podem atualizar mais cedo porque usam **bootstrapping**. Em vez de esperar a observação de todo o retorno futuro, eles combinam uma recompensa imediata com uma estimativa do que vem depois.

Essa diferença é mais profunda do que o momento da atualização. A distinção fundamental diz respeito à **origem do alvo de aprendizado**: Monte Carlo usa retornos observados, enquanto métodos TD constroem parte de seus alvos com estimativas existentes. Ainda assim, o momento da atualização é uma boa forma de visualizar primeiro a consequência dessa distinção.

Esperar retornos completos pode fornecer um sinal de aprendizado claro, mas esses retornos podem apresentar variância alta e demorar para chegar. Métodos TD aprendem com trajetórias incompletas e, portanto, podem atualizar com muito mais frequência, embora seus alvos dependam em parte de estimativas que talvez ainda sejam imprecisas.

O **controle de Monte Carlo** é uma família de métodos que estima a qualidade das ações a partir de episódios completos e depois melhora a política usando essas estimativas.

O **SARSA**, em contraste, é um algoritmo de controle TD. Depois de observar uma transição e a próxima ação escolhida pela política, ele pode atualizar sua estimativa imediatamente, sem esperar o fim do episódio.

Portanto, nossa primeira pergunta aponta para uma separação importante:

- **Monte Carlo:** aprende com retornos observados.
- **TD:** aprende usando estimativas com bootstrapping do retorno futuro.

### A política que estamos treinando é a mesma que usamos para amostrar?

Um MDP não gera trajetórias úteis sozinho. Alguém precisa escolher as ações.

Isso significa que toda trajetória amostrada depende de alguma política.

Suponha que nosso agente chegue a um estado no qual possa mover-se para a esquerda ou para a direita. Uma política que quase sempre segue para a esquerda produzirá um conjunto de dados dominado por ações nessa direção. Outra política talvez explore ambas as direções de maneira uniforme. A experiência que coletamos, portanto, reflete o comportamento da política que a produziu.

Chamamos a política usada para coletar experiências de **política de comportamento**.

Separadamente, podemos perguntar qual política o algoritmo realmente tenta avaliar ou melhorar. Essa é a **política-alvo**.

Se ambas forem iguais, temos um método **on-policy**:

$$
\pi_{\text{behavior}}

=

\pi_{\text{target}}.
$$

Se forem diferentes, temos um método **off-policy**:

$$

\pi_{\text{behavior}}

\neq

\pi_{\text{target}}.

$$

<figure class="static-figure sample-based-rl-policy-roles">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/on-policy-vs-off-policy-mobile.svg"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/on-policy-vs-off-policy.svg"
      alt="No aprendizado on-policy, a mesma política gera a trajetória amostrada e recebe a atualização. No aprendizado off-policy, uma política de comportamento gera a trajetória, enquanto a atualização é aplicada a uma política-alvo distinta."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

Por que aprenderíamos deliberadamente sobre uma política usando dados gerados por outra?

A exploração oferece um motivo. Imagine que nossa melhor política atual de Pong sempre se mova em direção ao que considera a posição ideal. Se a seguirmos à risca, talvez deixemos de experimentar ações alternativas e nunca descubramos que algumas são melhores. Poderíamos, então, usar uma política de comportamento que ocasionalmente explore ações aleatórias, enquanto ainda aprendemos uma política-alvo que representa aquilo que atualmente consideramos o melhor comportamento.

Outro motivo é o reaproveitamento de dados. Suponha que ontem tenhamos coletado um grande conjunto de interações de um robô, mas que a política tenha mudado desde então. Se nosso algoritmo aprender off-policy, as trajetórias antigas ainda poderão conter informações úteis para melhorar a política de hoje.

Essa distinção aparece claramente ao compararmos SARSA e Q-learning.

Em geral, o SARSA é **on-policy**. Sua atualização considera a ação que a política de comportamento atual realmente escolhe em seguida; portanto, o que ele aprende reflete a política que produz a experiência.

O Q-learning é **off-policy**. O agente pode se comportar de maneira exploratória enquanto sua atualização estima o que aconteceria sob uma política-alvo mais gulosa. Assim, o comportamento usado para gerar a experiência e o comportamento que está sendo aprendido não precisam ser idênticos.

A distinção conceitual torna-se simples depois que damos nome aos dois papéis: **quem gerou os dados e qual comportamento estamos tentando aprender?**

### O que o agente aprende para tomar decisões?

Há várias maneiras de um agente melhorar suas escolhas.

Uma estratégia natural é aprender quão boas costumam ser diferentes situações e decisões e, então, usar essas estimativas para escolher o que fazer.

As pessoas muitas vezes raciocinam assim no trabalho. Suponha que você tenha enfrentado repetidamente um tipo específico de incidente em produção. Com o tempo, a experiência mostra que reiniciar um serviço costuma piorar o problema, enquanto verificar primeiro outro componente tende a resolvê-lo. Você associou implicitamente resultados esperados diferentes a ações diferentes na mesma situação.

O aprendizado por reforço formaliza essa ideia por meio de **funções valor**.

Uma função valor de estado,

$$

V^\pi(s),

$$

descreve o retorno esperado quando partimos do estado $s$ e, em seguida, seguimos a política $\pi$.

Uma função valor de ação,

$$

Q^\pi(s,a),

$$

é mais específica. Ela descreve o retorno esperado quando executamos a ação $a$ no estado $s$ e depois continuamos conforme a política $\pi$.

A diferença é pequena, mas importante. $V$ avalia um estado. $Q$ avalia um par estado-ação.

Se tivermos amostrado muitas trajetórias, poderemos usar os resultados observados para estimar essas grandezas. Quando soubermos que, em determinado estado, uma ação apresenta consistentemente um valor maior do que as alternativas, a política poderá dar preferência a essa ação.

Métodos organizados em torno do aprendizado desses valores e da derivação do comportamento a partir deles são chamados de **métodos baseados em valor**.

Mas há outra possibilidade.

Em vez de aprender uma pontuação separada para as ações e depois converter essas pontuações em comportamento, podemos parametrizar a própria política e otimizar seus parâmetros diretamente.

Volte à nossa política de Pong. Imagine que um parâmetro $\theta$ controle a intensidade com que a raquete responde à diferença vertical entre ela e a bola. Testamos um valor de $\theta$, coletamos trajetórias e obtemos certo retorno médio. Se modificar $\theta$ alterar a política de modo que aumente o retorno esperado, queremos que o aprendizado empurre o parâmetro nessa direção.

De forma mais geral, se nossa política for

$$

\pi_\theta(a\mid s),

$$

poderemos tentar ajustar $\theta$ diretamente para aumentar o retorno esperado.

<figure class="static-figure sample-based-rl-value-policy">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/value-vs-policy-learning-mobile.svg"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/value-vs-policy-learning.svg"
      alt="Um agente baseado em valor primeiro aprende uma tabela Q de retornos esperados; depois, uma política escolhe a ação com o maior valor. Um agente baseado em política aprende diretamente as probabilidades das ações, atribuindo 30 por cento à esquerda e 70 por cento à direita, sem uma tabela intermediária de valores."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

Aprender a andar de bicicleta fornece uma analogia útil. Não mantemos conscientemente uma tabela gigantesca que diga: “Neste ângulo e nesta velocidade, virar o guidão três graus para a esquerda produziu historicamente um retorno de 7,4.”

Nosso comportamento de controle adapta-se de forma mais direta. Inclinamo-nos para um lado e caímos; por isso, nosso comportamento futuro muda. Conseguimos nos equilibrar de outra maneira; então, esse comportamento torna-se mais provável.

Algoritmos que otimizam diretamente uma política parametrizada pertencem à família dos **métodos baseados em política**. Quando a otimização usa o gradiente do retorno esperado em relação aos parâmetros da política, chamamos esses algoritmos de **métodos de gradiente de política**.

O **REINFORCE** é o exemplo clássico. Ele usa retornos amostrados para modificar os parâmetros da política, aumentando a probabilidade de ações associadas a bons resultados.

O **DQN**, por outro lado, é fundamentalmente baseado em valor. Ele aprende uma aproximação de $Q(s,a)$ e depois escolhe ações usando os valores de ação aprendidos.

Há também um meio-termo importante: os **métodos actor-critic**.

Um agente actor-critic reúne as duas ideias. O **actor** é uma política que determina o comportamento, enquanto o **critic** aprende uma função valor que avalia o que o actor está fazendo. As estimativas do critic fornecem um sinal de aprendizado que ajuda a melhorar o actor.

Portanto, essa pergunta nos leva a três famílias amplas:

- **baseados em valor:** aprendem valores e derivam decisões a partir deles;
- **baseados em política:** aprendem a política diretamente;
- **actor-critic:** aprendem uma política e, ao mesmo tempo, valores que ajudam a treiná-la.

### Como o agente representa o que aprende?

Ainda há outra decisão oculta em todos esses algoritmos: como a informação aprendida deve ser representada?

Em problemas suficientemente pequenos, podemos armazená-la explicitamente.

Imagine um agente aprendendo a jogar jogo da velha. O conjunto de configurações possíveis do tabuleiro é finito. Em princípio, poderíamos manter uma tabela com estados ou pares estado-ação e estimativas de seus valores. Sempre que encontrássemos um deles novamente, atualizaríamos a entrada correspondente.

Uma tabela simplificada de valores de ação poderia ser, conceitualmente, assim:

<div class="sample-based-rl-action-values-table-wrap">
  <table class="sample-based-rl-action-values-table">
    <thead>
      <tr>
        <th scope="col">Estado</th>
        <th scope="col">Ação</th>
        <th scope="col">Valor estimado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Tabuleiro A</th>
        <td>Centro</td>
        <td>0,82</td>
      </tr>
      <tr>
        <th scope="row">Tabuleiro A</th>
        <td>Canto</td>
        <td>0,61</td>
      </tr>
      <tr>
        <th scope="row">Tabuleiro A</th>
        <td>Borda</td>
        <td>0,20</td>
      </tr>
    </tbody>
  </table>
</div>

Se o mesmo estado reaparecer, não será necessário generalizar. Basta consultá-lo na tabela.

Essa é a ideia básica do **aprendizado por reforço tabular**.

A abordagem deixa de ser prática quando o espaço é grande ou contínuo.

Considere um braço robótico. Seu estado pode conter vários ângulos de articulações, velocidades, forças, observações de câmera e outras medições. Mesmo que cada medição seja representada com uma precisão modesta, o número de combinações possíveis torna-se enorme. Com valores verdadeiramente contínuos, há efetivamente uma infinidade de estados possíveis.

Não podemos esperar para observar separadamente cada configuração possível.

Em vez disso, precisamos de **aproximação de funções**.

Em vez de armazenar

$$

Q(s,a)

$$

como uma entrada independente da tabela para cada par possível, nós o representamos por uma função parametrizada

$$

Q_\theta(s,a).

$$

Uma rede neural é uma escolha possível. Se ela aprender que determinados estados se comportam de maneira semelhante, a experiência coletada em um estado poderá influenciar suas previsões em outro. Essa capacidade de generalizar é justamente o que torna possível o aprendizado por reforço em grande escala.

<figure class="static-figure sample-based-rl-representation">
  <picture>
    <source
      media="(max-width: 520px)"
      srcset="/articles/sample-based-rl/pt-BR/tabular-vs-function-approximation-mobile.svg"
      width="1024"
      height="1536"
    />
    <img
      src="/articles/sample-based-rl/pt-BR/tabular-vs-function-approximation.svg"
      alt="Um método tabular armazena o valor de cada par estado-ação em sua própria célula da tabela. Um aproximador de funções envia o mesmo par estado-ação por uma rede neural, que o mapeia para um valor aprendido."
      width="1774"
      height="887"
      loading="lazy"
      decoding="async"
    />
  </picture>
</figure>

Essa distinção fornece outra classificação ampla:

- **métodos tabulares:** armazenam explicitamente grandezas aprendidas para estados ou pares estado-ação individuais;
- **aproximação de funções:** usa uma função parametrizada para generalizar entre eles.

O Q-learning oferece uma conexão útil entre esses dois mundos.

O Q-learning tabular clássico mantém valores explícitos para pares estado-ação. O DQN conserva a ideia central do Q-learning — aprender valores de ação a partir de alvos TD —, mas representa $Q(s,a)$ com uma rede neural e introduz mecanismos adicionais necessários para tornar essa forma de aprendizado prática e estável.

A questão fundamental, portanto, não é apenas o que o agente aprende, mas como a informação aprendida pode ser armazenada e generalizada.

## Conclusões

Percorremos grande parte do panorama conceitual do aprendizado por reforço sem derivar em detalhes nenhum de seus principais algoritmos.

Começamos com a ideia básica de RL: um agente interage repetidamente com um ambiente e aprende um comportamento a partir das consequências de suas ações.

Depois, formalizamos essa interação com um MDP. Uma política escolhe ações, a dinâmica de transição determina como o ambiente evolui, recompensas fornecem feedback numérico e a interação repetida produz trajetórias com estados, ações, recompensas e estados futuros.

A partir daí, definimos retornos e expressamos o objetivo do aprendizado por reforço como a busca por uma política que maximize o retorno esperado.

A perspectiva central deste artigo consistiu em tratar o MDP como fonte de experiências amostradas. Um agente gera trajetórias, um procedimento de aprendizado extrai delas informações úteis, o agente é atualizado e o processo se repete.

Com esse ciclo em mãos, várias distinções aparentemente avançadas tornaram-se perguntas sobre como a atualização funciona.

**Quando o aprendizado acontece, e de onde vem seu alvo?** Isso nos levou aos métodos de Monte Carlo e de diferenças temporais.

**A mesma política gerou a experiência e recebeu a atualização?** Isso separou o aprendizado on-policy do off-policy.

**O que o agente aprende para tomar decisões?** Isso nos levou aos métodos baseados em valor, aos baseados em política e aos métodos actor-critic.

**Como essa informação é representada?** Isso separou os métodos tabulares da aproximação de funções.

Essas dimensões podem ser combinadas. Um algoritmo pode ser TD e on-policy, ou TD e off-policy. Pode ser baseado em valor e tabular, ou baseado em valor com uma rede neural. Um algoritmo actor-critic pode ser on-policy ou off-policy e, em aplicações modernas, quase sempre usa aproximação de funções.

É por isso que o aprendizado por reforço contém tantos algoritmos sem exigir um modelo mental completamente diferente para cada um. Eles frequentemente operam sobre a mesma interação entre agente e ambiente e diferem sobretudo nas escolhas que fazem sobre **como coletar experiências, como construir um sinal de aprendizado, o que atualizar e como representar o que foi aprendido**.

Ainda existe um corpo teórico importante por trás desse quadro. As equações de Bellman explicam as relações entre valores em estados sucessivos. A programação dinâmica mostra o que se torna possível quando o modelo do ambiente é conhecido. A teoria da convergência informa quando podemos confiar em determinadas atualizações. Tratamentos mais detalhados de Monte Carlo, aprendizado TD, SARSA, Q-learning, gradientes de política e métodos actor-critic tornam todas essas ideias precisas.

Vale a pena estudar esses fundamentos.

A vantagem agora é que, quando as equações aparecerem, elas já não precisarão apresentar todo o panorama conceitual ao mesmo tempo. Você já sabe o que os algoritmos tentam realizar e quais perguntas distinguem uma família da outra.
