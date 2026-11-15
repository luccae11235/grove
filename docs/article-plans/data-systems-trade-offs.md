# Preparação proposta: primeiras decisões em sistemas de dados

Article ID: `data-systems-trade-offs` (proposto; sem entrada na coleção)
Preparation status: proposed — skill trial
Editor approval of structure: pending
GitHub issue: [#245](https://github.com/luccae11235/grove/issues/245)
Source: [estrutura parcial recebida](sources/data-systems-trade-offs-outline.md)

Este é o resultado do teste de `$aflora-article-structure` com o exemplo do editor.
O tópico, o scope, as complementações e as correções sinalizadas são propostas.
Os blocos recebidos permanecem reconhecíveis para comparação com a fonte.

# 1. Tópico

- **Título provisório:** Sistemas de dados: as primeiras decisões de arquitetura.
- **Pergunta ou ideia central:** Que perguntas devemos fazer antes de escolher como armazenar, consultar e operar os dados de uma aplicação?
- **Por que este tema merece um artigo:** Decisões sobre finalidade das consultas, hospedagem, distribuição e uso dos dados respondem a necessidades diferentes. Este primeiro artigo oferece um mapa para formular essas escolhas, preparando a leitura da trilha baseada no livro.

# 2. Learning Scope

- **Tema central:** Os quatro eixos recebidos, na mesma ordem: OLTP/OLAP; nuvem/auto-hospedagem; distribuído/nó único; legislação e sociedade.
- **Objetivo principal de aprendizagem:** Diante de um sistema simples, distinguir a necessidade atendida por cada eixo e justificar uma escolha provisória, explicitando a condição que poderia mudá-la. Evidência de transferência: para um serviço de inscrições em cursos, separar registrar uma inscrição de analisar a procura mensal e explicar por que essa distinção, sozinha, não decide hospedagem nem quantidade de nós.
- **Persona:** Pessoa começando em desenvolvimento de aplicações ou análise de dados, familiarizada com tabelas e com a ideia de que um aplicativo salva e consulta informações. Não pressupor experiência com arquitetura, nuvem ou sistemas distribuídos. Idioma proposto do artigo: português brasileiro, ainda não especificado no anexo.
- **Conceitos de apoio:** Carga de trabalho, consulta operacional e analítica, responsabilidade de operação, nó e replicação. Introduzir cada termo ao responder uma necessidade concreta. A dificuldade central é perceber que esses eixos podem combinar-se; eles não formam uma escada obrigatória de evolução tecnológica.
- **Menor exemplo fiel:** Uma pequena loja hipotética registra pedidos e estoque e pergunta quais produtos venderam mais no mês. Reutilizar esse caso sem inventar volumes, custos ou tempos de resposta. A planilha permanece como ponto de partida recebido.
- **Limites de escopo:** Panorama de decisões, sem catálogo de produtos, receita de migração, configuração, benchmark, consenso distribuído ou aconselhamento jurídico. A trilha poderá aprofundar os mecanismos depois; este artigo não deve prometer selecionar uma tecnologia sem requisitos suficientes.

# 3. Estrutura do artigo

**Proposta para avaliação; estrutura e novas ideias visuais com aprovação pendente.** Títulos e sequência recebidos preservados. Os trechos assinalados abaixo exigem decisão editorial antes da redação. O prompt de redação anexado pertence à etapa posterior e não foi executado.

## Estrutura

# Apresentação

[Explicar que este artigo será o primeiro de uma série que vai acompanhar os capítulos do livro Projetando Aplicações com Uso Intensivo de Dados de Martin Kleppman e Chris Riccomini]

[Identificar a referência como Designing Data-Intensive Applications, 2nd Edition, de Martin Kleppmann e Chris Riccomini. Confirmar o título e a edição em português antes de apresentá-los como referência bibliográfica. Delimitar esta abertura aos quatro eixos recebidos; não atribuir exemplos ou conclusões específicos ao texto integral indisponível.]

[Explicar que a trilha não substitui a importancia da leitura do livro original]

[Situar a contribuição da trilha: explorar perguntas concretas e relações visuais que ajudem a acompanhar a leitura, sem reproduzir o livro.]

# Introdução

[Apresentar a ideia que quando planilhas surgiram, muitos problemas se resolviam. Mas que a medida que a complexidade e volume dos dados foi ficando mais complexa, uma planilha já não resolve mais]

[PENDENTE — a formulação histórica e a generalização acima não estão sustentadas pelas fontes fornecidas. Proposta local: partir da loja que usa uma planilha para pedidos e perguntar o que muda quando várias pessoas precisam registrar vendas e consultar estoque. Tratar a adequação da planilha como dependente dos requisitos, sem afirmar que todo crescimento exige abandoná-la.]

[A medida que um sistema cresce, deixar os dados armazenados em um único sistema passa ser inviável]

[PENDENTE — não desenvolver essa inevitabilidade como fato. Proposta local: investigar quando um único sistema continua suficiente e quando requisitos diferentes justificam combinar componentes; deixar a escolha nó único/distribuído para sua seção.]

[Explicar que apesar das complexidades, grande parte dos sistemas ainda utiliza componentes básicos e padronizados como armazenamento num banco de dados, caches, permitir usuários fazer busca por palavra chave (índice de busca), tratar eventos e mudanças nos dados assim que ocorrerem (processamento de fluxos) assim como processar grandes volumes de dados periodicamente]

[Preservar a lista como mapa de funções possíveis: guardar registros, reaproveitar respostas, buscar palavras, reagir a eventos e processar conjuntos periodicamente. Não montar uma arquitetura que exija todos esses componentes. A afirmação de frequência e a atribuição ao livro dependem de verificação adicional.]

[Explicar que o foco desta trilha é explorar que tipo de decisões tomar em cada cenário. Será um guia para saber quais tecnologias usar e como combiná-las]

[Qualificar o guia como apoio ao raciocínio: começar pela tarefa e pelas restrições antes de escolher tecnologias. Reutilizar a loja para manter o problema concreto.]

[Explicar que neste capítulo vamos explorar alguns trade-offs comuns que existe na área de software empresarial]

[Antecipar os quatro eixos, sem explicá-los duas vezes. A primeira pergunta é o que as consultas precisam fazer, antes de decidir onde ou em quantas máquinas executá-las.]

# Sistema operacionais vs analíticos (OLTP vs OLAP)

[Sistemas de dados apresenta uma distinção fundamental perante as responsabilidades. Em um lado existem o profissionais que criar os sistemas que coletam os dados dos usuários (apps, backend e etc) que seriam os engenheiros de backend, e existem o profissionais que analisam estes dados em grandes volumes, que seriam analistas de negócios ou cientistas de dados]

[PENDENTE — o trecho associa a classificação a cargos. Proposta de correção: distinguir as cargas de trabalho. Comparar registrar/consultar um pedido durante a operação com analisar vendas acumuladas. Só então nomear OLTP e OLAP; os cargos podem aparecer como contexto, sem definir a categoria.]

[VISUALIZATION: proposta estática. Pergunta: como os mesmos pedidos sustentam perguntas diferentes? Manter a mesma pequena tabela de pedidos; mudar apenas a pergunta destacada: consultar um pedido ou resumir vendas por período. O leitor deve inferir a diferença de tarefa e abrangência, sem painéis de métricas, aritmética ou simulação de desempenho. As perguntas devem estar escritas, sem depender da cor.]

[Explicar que distinguir tarefas ajuda a discutir necessidades, mas não obriga separar máquinas ou adotar um produto específico. Fazer a transição: agora que sabemos o trabalho desejado, quem cuidará da infraestrutura e da operação?]

# Nuvem vs Auto-hospedagem

[Retomar o mesmo serviço da loja. Esclarecer que nuvem e auto-hospedagem não são categorias excludentes: a própria equipe pode operar software em uma máquina virtual de nuvem. Apresentar a escolha como distribuição de responsabilidades operacionais, com diferentes graus de gerenciamento. Explicar que usar nuvem não elimina responsabilidades do cliente; um serviço gerenciado e uma máquina virtual delegam atividades diferentes. Usar a AWS apenas como exemplo documentado, sem generalizar suas fronteiras para todo fornecedor.]

[VISUALIZATION: proposta de comparação estática. Pergunta: quem assume cada responsabilidade no arranjo escolhido? Manter a tarefa da loja; comparar auto-hospedagem e dois níveis de serviço em nuvem, mostrando apenas responsabilidades verificadas. Inferência: “estar na nuvem” não descreve sozinho o trabalho que permanece com a equipe. Preferir rótulos diretos de responsável; limites concretos aguardam a escolha e verificação dos serviços, sem percentuais inventados.]

[Orientar a decisão pelas condições da equipe, exigências de controle e custos a levantar. Não declarar um vencedor universal. Ligar à próxima seção: local de hospedagem e quantidade de nós são escolhas distintas; ambos os ambientes podem usar um ou vários nós.]

# Sistemas distribuidos vs nó único

[Definir nó como uma instância participante do sistema antes de comparar alternativas. No caso da loja, partir de um banco em um nó e apresentar primary/standby como exemplo limitado de múltiplos nós, apoiado na documentação do PostgreSQL. Não converter o exemplo em recomendação de implantação.]

[VISUALIZATION: proposta estática. Pergunta: o que acrescentar uma réplica muda no caminho de uma atualização? Manter o pedido e o nó primário na mesma posição; comparar o caso de um nó com o caso que acrescenta standby e o caminho de replicação. Inferência: a segunda cópia exige coordenação para receber atualizações. Usar nomes e setas diretamente identificados; não exibir animação, tempos ou garantia de disponibilidade.]

[Usar a diferença entre replicação síncrona e assíncrona apenas para tornar visível que a confirmação de uma escrita e sua chegada à réplica podem ter relações diferentes. Não derivar ganhos quantitativos nem prometer ausência de falhas. Encerrar a comparação com uma decisão condicional: a necessidade que justificaria vários nós precisa estar explícita, e crescimento por si só não determina a resposta.]

[Conectar à última seção: escolhas técnicas não esgotam a decisão; precisamos examinar quais dados são coletados, quem é afetado e quais restrições de uso se aplicam.]

# Sistemas de dados, legislação e sociedade

[Retomar os pedidos da loja para perguntar quais dados pessoais seriam necessários à tarefa, quem poderia acessá-los e quais consequências uma exposição ou uso indevido teria. Apresentar essas perguntas como análise de projeto e impacto, sem declarar obrigações legais universais. Evitar introduzir novo sistema ou novo visual.]

[Separar decisões técnicas, perguntas éticas e requisitos jurídicos que dependem de jurisdição e contexto. Manter qualquer afirmação sobre lei, retenção, localização ou transferência de dados pendente de fonte oficial aplicável. Não afirmar que uma modalidade de hospedagem garante conformidade.]

[Fechar com a situação de transferência das inscrições em cursos: pedir ao leitor que identifique a tarefa operacional e a analítica, formule uma condição para decidir hospedagem ou nós e indique uma questão sobre os dados pessoais. Avaliar a justificativa e a informação ainda necessária, sem oferecer uma arquitetura única como gabarito.]

## Nota editorial

- **Correções para aprovação:** os trechos originais sobre planilhas, inviabilidade de um único sistema e separação por cargos foram preservados e marcados no ponto de uso. As alternativas propostas corrigem o sentido sem trocar a sequência. Na seção de hospedagem, explicitar a sobreposição entre nuvem e operação pela própria equipe, preservando o título recebido. Corrigir também a grafia de Kleppmann e, na revisão de títulos, “Sistema operacionais” e “Sistemas distribuidos”.
- **Suposições editoriais:** público iniciante em arquitetura; português brasileiro; loja hipotética como fio condutor e inscrições como única transferência. Não são exemplos atribuídos ao livro nem experimentos realizados.
- **Fontes fornecidas, consultadas previamente em 15/11/2026:** [O’Reilly, capítulo 1](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/ch01.html) confirma edição, autores e quatro eixos pelo material público; o capítulo integral não foi acessado. [Microsoft: OLTP](https://learn.microsoft.com/en-us/azure/architecture/data-guide/relational-data/online-transaction-processing) sustenta a tarefa operacional; [Microsoft: OLAP](https://learn.microsoft.com/en-us/azure/architecture/data-guide/relational-data/online-analytical-processing), consultas analíticas e tendências. [AWS](https://aws.amazon.com/compliance/shared-responsibility-model/) sustenta a variação de responsabilidades por serviço no seu contexto. [PostgreSQL](https://www.postgresql.org/docs/current/warm-standby.html) sustenta o exemplo primary/standby e a distinção síncrona/assíncrona. Esta proposta usa o registro fornecido dessas consultas; não houve nova navegação nem benchmarks.
- **Pendências:** referência bibliográfica em português; afirmações históricas e de frequência do início; serviços concretos para detalhar responsabilidades; fontes oficiais se forem incluídas regras jurídicas. Não há evidência de custo, latência ou disponibilidade que permita ranquear alternativas.
- **Simplicidade e mudanças maiores:** conservar os quatro eixos e a ordem. Não proponho uma mudança de arquitetura do artigo. Os três visuais novos têm uma pergunta cada; não acrescentar panorama visual redundante, taxonomia de produtos ou interação sem hipótese a testar. Se o visual de responsabilidades repetir o texto sem revelar a delegação, retirá-lo na revisão. Os demais devem manter sua inferência em texto e em telas pequenas, sem depender de cor ou movimento.

**Aprovação explícita da estrutura e das correções pendente antes de rascunho, design visual detalhado ou implementação.**
