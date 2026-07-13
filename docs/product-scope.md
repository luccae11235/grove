# Escopo do produto

## Visão

Ser uma referência visual e acessível para algoritmos baseados em árvores, com profundidade suficiente para conectar fundamentos, implementação, diagnóstico e aplicações de nicho — em especial aprendizado por reforço.

O diferencial não será a quantidade de artigos. Será a conexão verificável entre:

1. explicação conceitual;
2. implementação própria;
3. estado interno do treinamento;
4. visualização interativa;
5. experimento reproduzível.

## Público inicial

O produto será escrito primeiro para pessoas que já conhecem Python ou fundamentos de machine learning, mas ainda tratam árvores como uma caixa-preta. O conteúdo deve continuar compreensível para estudantes iniciantes por meio de exemplos concretos, linguagem direta e divulgação progressiva de detalhes.

Idioma inicial: português. A estrutura de conteúdo deverá permitir tradução futura, mas internacionalização não faz parte do primeiro lançamento.

## Pilares editoriais

Todo conteúdo futuro deve pertencer a pelo menos um destes pilares:

- **Fundamentos:** classificação, regressão, critérios de impureza, poda e regularização.
- **Implementações do zero:** algoritmo, testes, complexidade e decisões de engenharia.
- **Investigações:** falhas, overfitting, leakage, instabilidade e casos extremos.
- **Comparações técnicas:** Gini vs. entropia, bagging vs. boosting, árvores exatas vs. histogramas.
- **Reprodução e experimentos:** papers, ablações e hipóteses originais.
- **Aplicações:** dados tabulares e, como especialidade editorial, aprendizado por reforço.

## Escopo do MVP — v0.1.0

### História central

> Como estudante, quero acompanhar como uma árvore escolhe cada divisão para entender de onde surgem suas previsões.

### Experiência publicada

Uma única narrativa interativa: **Como uma árvore de classificação aprende**.

Ela deverá conter:

- intuição de nó, divisão e folha;
- dataset 2D predefinido e pequeno;
- controles para critério (`gini` ou `entropy`) e profundidade máxima;
- execução determinística do treinamento;
- navegação por etapas relevantes do treinamento;
- destaque visual da divisão avaliada ou escolhida;
- árvore final ligada às regiões de decisão no plano;
- comparação didática entre Gini e entropia no mesmo problema;
- indicação clara de que o algoritmo foi implementado do zero;
- links para o código, testes e limitações conhecidas.

### Superfícies do MVP

1. **Home:** proposta, demonstração curta, trilha futura e chamada para o laboratório.
2. **Lição/laboratório:** texto e visualização na mesma página, sem exigir cadastro.
3. **Sobre:** princípios, autoria, licenças e link para o repositório.

Não haverá uma seção de blog separada no MVP. A própria lição deve funcionar como conteúdo permanente e como destino do post no LinkedIn.

## Fora do MVP

Itens deliberadamente adiados:

- upload de datasets;
- contas, autenticação, comentários ou progresso salvo;
- API ou banco de dados hospedado;
- árvore de regressão;
- poda completa e tratamento extenso de valores ausentes;
- Random Forest, Gradient Boosting e XGBoost;
- execução de Python no navegador;
- editor genérico de notebooks;
- internacionalização completa;
- biblioteca pública versionada no npm;
- animações cinematográficas ou um motor genérico semelhante ao Manim;
- analytics que use cookies ou colete dados pessoais.

O upload de datasets só entra quando houver limites explícitos de tamanho, validação local, política de privacidade e execução fora da thread principal.

## Requisitos não funcionais

- site estático compatível com GitHub Pages;
- experiência principal utilizável em desktop e celular;
- controles acessíveis por teclado e sem dependência exclusiva de cor;
- funcionamento sem enviar datasets ou resultados a servidores;
- execução determinística mediante uma seed;
- núcleo de ML sem dependências de bibliotecas de machine learning;
- estado da árvore e rastros serializáveis em JSON;
- testes unitários dos cálculos e testes de integração entre treino e visualização;
- orçamento inicial de desempenho: interação fluida para até 500 amostras e árvores pequenas;
- metadados de compartilhamento e imagem Open Graph antes da publicação.

## Definição de pronto da v0.1.0

O primeiro lançamento estará pronto quando:

- existir uma URL pública no GitHub Pages;
- uma pessoa conseguir completar a narrativa sem instrução externa;
- Gini e entropia produzirem cálculos verificáveis e cobertos por testes;
- treino, predição, árvore desenhada e regiões de decisão vierem da mesma estrutura de dados;
- voltar e avançar etapas não alterar o resultado;
- não houver erros no console durante o fluxo principal;
- layout, foco, contraste e textos tiverem sido verificados em celular e desktop;
- build, tipagem, lint e testes passarem na integração contínua;
- README, licença, limitações e instruções locais estiverem públicos;
- o post do LinkedIn puder apontar para a demo e para uma parte específica do código.

## Métricas úteis no início

Sem transformar o projeto em produto de growth, os sinais mais úteis são:

- lançamento semanal ou quinzenal de uma experiência ou investigação;
- pessoas que chegam ao laboratório e concluem a sequência;
- visitas ao repositório e estrelas;
- salvamentos, comentários técnicos e compartilhamentos no LinkedIn;
- contribuições ou relatos de entendimento/dúvida que alimentem novos conteúdos.

No MVP, os indicadores podem vir de dados públicos do GitHub e do LinkedIn; analytics dentro do site não é necessário.

## Guardrails editoriais

- não publicar uma visualização que simule um comportamento diferente do algoritmo;
- declarar simplificações e limitações de cada implementação;
- separar intuição de afirmação matemática;
- acompanhar comparações com datasets, seeds e parâmetros reproduzíveis;
- preferir uma hipótese bem demonstrada a uma lista extensa de conceitos.
