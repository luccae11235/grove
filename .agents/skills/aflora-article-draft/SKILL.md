---
name: aflora-article-draft
description: Use when writing a complete first draft of an Aflora educational article from an approved learning scope and structure, or revising that draft against the approved plan. Not for planning a new structure, implementing visuals or publishing.
---

# Redação de artigos Aflora

Transforme a estrutura aprovada em um primeiro draft rigoroso, claro e fluido. O planejamento conceitual já foi feito; desenvolva o percurso recebido em uma leitura contínua. Esta skill se aplica aos temas do Aflora, sem restringi-los a machine learning.

No projeto, consulte `AGENTS.md` e `docs/article-plans/README.md`. Ao salvar arquivos, siga a fila de tarefas e o GitFlow. Preserve os exemplos históricos e a estrutura fonte; um draft novo não os substitui.

## Reconheça o contrato recebido

Localize no material ou na conversa o idioma do artigo, o learning scope, a estrutura aprovada, as instruções de escrita, exemplos de estilo e contexto técnico. Aceite notas, arquivos e campos como `ARTICLE_LANGUAGE`, `LEARNING_SCOPE`, `ARTICLE_STRUCTURE`, `WRITING_INSTRUCTIONS`, `WRITING_EXAMPLES` e `ADDITIONAL_CONTEXT`; não exija que o editor preencha um formulário quando as informações já estiverem disponíveis.

Use a aprovação explícita existente, inclusive quando o editor apresenta a estrutura como aprovada. Se o material for apenas uma proposta sem aprovação, peça a decisão que falta antes da redação integral. Um pedido para criar esta skill não aprova um artigo. Identifique a versão aprovada quando houver alternativas incompatíveis.

O idioma explicitamente solicitado rege a prosa e os títulos, mesmo com fontes em outro idioma. Preserve títulos e hierarquia; quando for necessário traduzir, conserve seu sentido e função. Placeholders visuais, código, notação e nomes próprios mantêm a forma necessária, mesmo em outro idioma. Se também houver uma exigência explícita de títulos literais incompatível com o idioma pedido, resolva esse conflito com o editor. Na ausência de indicação, aproveite o idioma definido no plano; pergunte somente quando ele continuar ambíguo.

Entre os materiais recebidos, use a prioridade **learning scope → estrutura → instruções de escrita → contexto adicional → exemplos de escrita**. As instruções atuais do editor prevalecem sobre esses materiais. Essa precedência não transforma um erro factual em verdade: resolva uma contradição central antes de redigir.

## Desenvolva a explicação

Leia o plano completo para reconhecer a pergunta central, a compreensão que deve mudar e os elos entre as seções. Preserve capítulos, ordem das ideias, exemplos, recorte e progressão pedagógica. Ajustes locais de ligação são possíveis; uma mudança de arquitetura ou de sentido pede uma proposta ao editor antes de ser adotada.

Converta instruções conceituais como `[Explique por que...]`, `[Introduza...]` e `[Compare...]` em prosa desenvolvida. Um bloco pode exigir vários parágrafos, e blocos relacionados podem ser combinados quando isso melhora a continuidade. Determine a extensão pelo raciocínio necessário, sem proporção fixa de expansão, meta de palavras ou parágrafo obrigatório por instrução. Interprete colchetes pelo significado, preservando intervalos matemáticos, links e outras notações.

Construa as relações que o plano pede: o que observamos, por que ocorre e o que essa compreensão permite perceber a seguir. Introduza termos e formalismo depois do contexto que lhes dá sentido. Use exemplos concretos e cálculos suficientes para sustentar a inferência. Simplicidade retira ruído e digressões; conserva as conexões necessárias ao entendimento profundo.

Copie literalmente cada `[IMAGE: ...]`, `[ANIMATION: ...]`, `[PLAYGROUND: ...]` e `[VISUALIZATION: ...]`, na posição correspondente entre as ideias. Não traduza, reformule, elimine ou transforme sua descrição em texto do artigo. Integre a explicação ao redor da cena planejada, sem repetir sua especificação nem afirmar que a imagem ou interação já foi implementada. A redação não inclui design detalhado, criação de assets ou código.

Use o contexto adicional apenas quando servir ao escopo. Verifique cálculos e afirmações; consulte fontes primárias quando precisar confirmar detalhes ou preencher uma lacuna factual. Preserve a atribuição de fontes e acrescente citações onde forem necessárias, sem inventar referências. Distinga exemplo hipotético, resultado esperado e resultado medido. Se uma incerteza essencial impedir uma explicação correta, resolva-a antes de entregar o draft; não a esconda em prosa confiante. Pesquisa de apoio não autoriza redesenhar a história.

## Escreva com continuidade

- Desenvolva ideias como raciocínio conectado, com relações expressas pela sintaxe, por conjunções e por transições naturais. Varie o comprimento e a construção das frases conforme a ideia.
- Evite a repetição de fragmentos, qualificações dramáticas, frases de efeito e contrastes prontos como “Não é X. É Y.” ou “Não é apenas X, mas Y.” O uso ocasional pode funcionar; não o transforme em cadência recorrente.
- Não force cada parágrafo a ter gancho, contraste, clímax ou conclusão de impacto. Prefira explicação precisa e natural ao efeito retórico.
- Use exemplos de escrita como referência de cadência, sintaxe, transições, vocabulário e desenvolvimento dos parágrafos, sem copiar suas frases ou importar seu conteúdo.
- Evite quase por completo dois-pontos e travessões como separadores retóricos, inclusive `--`, sobretudo nos títulos que estiver autorizado a criar ou reformular. Busque uma ideia contínua ou pergunta natural; trocar o separador por vírgula não resolve a construção “frase, frase”. Preserve títulos aprovados quando não houver autorização para alterá-los. A preferência não altera sintaxe técnica ou placeholders.

## Revise e entregue o draft

Compare o texto com o plano: cada ideia necessária foi desenvolvida no ponto adequado, as transições permitem acompanhar o raciocínio, os exemplos e cálculos são coerentes, os títulos mantêm o contrato e cada placeholder permanece literal e em posição. Releia também a cadência entre frases e parágrafos; conformidade com a estrutura não demonstra fluidez por si só.

Priorize **correção conceitual → fidelidade ao escopo e à estrutura → clareza e progressão pedagógica → fluidez → concisão**.

Entregue somente o artigo em Markdown, com seus títulos e placeholders. Não inclua prefácio de processo, decisões editoriais, sugestões, relatório de revisão ou o learning scope como seção administrativa. Quando uma pergunta for indispensável para começar, faça-a antes da entrega, em vez de misturá-la ao manuscrito. Se houver destino indicado, salve o draft ali sem sobrescrever a estrutura ou fontes. O resultado continua sendo um draft para revisão; não altere o estágio no Notion, crie uma entrada de publicação ou publique o artigo por consequência.
