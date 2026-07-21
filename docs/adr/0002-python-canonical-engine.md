# ADR 0002 — Python como motor canônico de aprendizagem

- Status: aceito
- Data: 2026-07-13

## Contexto

Grove ensina implementações de árvores a partir do zero. O código exibido ao
aluno deve ser o mesmo código que calcula a árvore, o rastro de treinamento e os
valores usados pelas visualizações. Uma implementação canônica em TypeScript
quebrava essa promessa pedagógica: o aluno veria uma tradução Python, não a
fonte real.

O site continua sendo publicado como arquivos estáticos no GitHub Pages, que não
executa um processo Python. Os laboratórios iniciais usam datasets pequenos e
um conjunto finito de estados didáticos.

## Decisão

O núcleo canônico fica em `packages/tree-core/grove` e é escrito em Python
legível, sem bibliotecas de machine learning e com dependências limitadas à
biblioteca padrão ou, quando necessário, NumPy.

Durante o build, `scripts/build_lesson_data.py` executa o núcleo Python e gera um
artefato JSON versionável contendo dataset, modelos, rastros e o trecho exato de
código usado pela lição. A camada React apenas apresenta esse resultado e troca
entre estados já calculados; ela não recalcula impureza nem escolhe splits.

## Consequências

- código, cálculo, rastro e explicação compartilham uma única fonte;
- os módulos de ML ficam navegáveis e testáveis fora da interface;
- o site publicado continua rápido, privado e compatível com hospedagem estática;
- toda mudança no algoritmo exige regenerar os artefatos, algo automatizado por
  `pnpm dev`, `pnpm build` e CI;
- experiências futuras com datasets arbitrários exigirão um executor Python
  adicional (por exemplo, um Worker com Pyodide ou uma API), sem duplicar o
  algoritmo em TypeScript.

## Limite atual

Interação significa explorar estados calculados pelo modelo Python, não executar
Python no navegador. Esse limite é explícito na interface. Um runtime Python
cliente ou remoto só será adicionado quando uma lição realmente precisar de
entrada livre ou treino contínuo.
