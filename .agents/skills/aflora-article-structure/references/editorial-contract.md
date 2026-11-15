# Contrato editorial para a estrutura

## Critérios que orientam decisões

- **Visuais como parte da explicação:** cada visual responde a uma pergunta do leitor e revela uma relação. Interação testa uma hipótese; animação explica uma mudança ou processo; uma imagem estática pode permitir melhor comparação. Não há cota de visuais nem obrigação de um por seção.
- **Simplicidade com profundidade:** mantenha o menor percurso que entrega o aprendizado, sem esconder pré-requisitos ou limites. Retire taxonomias, recapitulações e representações redundantes. Use aprofundamentos opcionais quando houver uma necessidade real.
- **Aprendizado observável:** prefira uma capacidade central que possa ser aplicada em outro caso, acompanhada de uma previsão, explicação ou decisão que a torne verificável. Não transforme todo artigo em uma bateria de exercícios.
- **Progressão e continuidade:** apresente o problema antes do vocabulário especializado que o resolve. Reutilize o exemplo quando ele continuar fiel; varie-o quando a variação ensinar uma diferença necessária. Ajuste a formalização ao conhecimento do leitor.
- **Rigor:** explicite simplificações, limites de analogias e condições de afirmações. Separe resultados calculados de comportamentos esperados e conteúdo verificado de propostas. A estrutura deve funcionar para temas técnicos além de ML.
- **Acessibilidade desde a ideia:** preserve a inferência sem depender só de cor, movimento ou interação. Na etapa de estrutura, registre apenas os requisitos que afetem a escolha pedagógica; layouts e especificações de teclado/mobile vêm depois.
- **Decisão editorial humana:** uma sugestão plausível não é uma escolha aprovada. Distingua complementação, correção conceitual e mudança de arquitetura do artigo.

## Forma de uma entrega

Use o formato do editor. Quando faltar um, esta é uma base adaptável:

### 1. Tópico

Título provisório; pergunta ou ideia central; por que merece um artigo.

### 2. Learning scope

Tema central; objetivo observável e transferência; persona e pré-requisitos; conceitos de apoio; limites; dificuldade conceitual e menor exemplo fiel. Combine itens relacionados em vez de repetir informação. Inclua uma evidência simples de compreensão.

### 3. Estrutura do artigo

Títulos e instruções que permitam redigir o raciocínio sem ter de planejá-lo novamente. Evite tanto indicações vagas como `[Explicar OLTP]` quanto parágrafos de artigo prontos disfarçados de colchetes.

Exemplo de uma seção, não de um modelo obrigatório de artigo:

```markdown
## [Título da seção]

[Retomar o problema concreto. Comparar duas alternativas e explicar a relação que distingue suas consequências. Indicar o limite da comparação e a pergunta que leva à próxima seção.]

[VISUALIZATION: qual pergunta o leitor responde; o que muda; o que fica fixo; o que observar.]
```

Os marcadores `[IMAGE: ...]`, `[ANIMATION: ...]`, `[PLAYGROUND: ...]` e `[VISUALIZATION: ...]` são propostas editoriais, não pedidos de implementação. Interprete colchetes pelo significado; eles também aparecem em matemática. Não normalize nem traduza marcadores existentes sem solicitação.

### Nota editorial

Registre apenas o necessário para avaliar: suposições relevantes; fontes primárias com a afirmação que sustentam e limitações de acesso; pendências técnicas; mudanças propostas com motivo. Identifique mudanças maiores como não aplicadas. Encerre com aprovação da estrutura pendente.

## Referências do projeto

Caminhos relativos à raiz do repositório; consulte somente exemplos pertinentes:

- `docs/article-plans/README.md`: sequência editorial e aprovação.
- `docs/article-system.md`: contrato de aprendizagem e pré-requisitos.
- `docs/article-plans/template.md`: preparação completa; aqui a entrega termina antes do design detalhado e do draft.
- `docs/article-plans/why-regression-trees-stop-at-the-edge.md`: uma pergunta concentrada em uma interação.
- `docs/article-plans/beyond-cart.md`: comparações orientadas por perguntas.
- `docs/article-plans/gradient-boosting.md`: construção gradual de um mecanismo.

Os históricos preservam alternativas e problemas conhecidos; leia suas notas de revisão. Não são modelos integralmente aprovados. Não os corrija ou substitua durante uma nova preparação.
