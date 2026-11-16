# Visuais do artigo sobre sistemas de dados

O [draft oficial](data-systems-trade-offs-draft-pt-br.md) orienta estas oito cenas.
A produção foi dividida entre três agentes e passou por uma leitura independente
de simplicidade. As cenas estão reunidas numa
[galeria de revisão](data-systems-visuals/index.html). Os arquivos HTML funcionam
sem dependências externas; cada cena tem também uma imagem SVG editável.
Há também prévias PNG em resolução dupla para revisão.
A incorporação ao artigo vem depois da revisão visual. O texto, a estrutura e os
placeholders originais permanecem preservados.

## Percurso visual

| Cena | Pergunta que precisa responder | Revisão | Imagem estática |
| --- | --- | --- | --- |
| 1 | Como muda o percurso entre consultar uma reserva e analisar muitas? | [Explorar](data-systems-visuals/01-query-paths.html) | [SVG](data-systems-visuals/01-query-paths.svg) · [PNG](data-systems-visuals/previews/01-query-paths.png) |
| 2 | O que fica próximo ao organizar por reserva ou por atributo? | [Comparar](data-systems-visuals/02-row-columns.html) | [SVG](data-systems-visuals/02-row-columns.svg) · [PNG](data-systems-visuals/previews/02-row-columns.png) |
| 3 | Por que o relatório ainda mostra a situação anterior? | [Acompanhar](data-systems-visuals/03-analytical-update.html) | [SVG](data-systems-visuals/03-analytical-update.svg) · [PNG](data-systems-visuals/previews/03-analytical-update.png) |
| 4 | Qual trabalho muda de responsável ao contratar um serviço? | [Comparar](data-systems-visuals/04-responsibilities.html) | [SVG](data-systems-visuals/04-responsibilities.svg) · [PNG](data-systems-visuals/previews/04-responsibilities.png) |
| 5 | A segunda máquina recebe uma cópia ou uma parte dos dados? | [Comparar](data-systems-visuals/05-copies-partitions.html) | [SVG](data-systems-visuals/05-copies-partitions.svg) · [PNG](data-systems-visuals/previews/05-copies-partitions.png) |
| 6 | O que sabemos quando a confirmação não chega? | [Investigar](data-systems-visuals/06-missing-response.html) | [SVG](data-systems-visuals/06-missing-response.svg) · [PNG](data-systems-visuals/previews/06-missing-response.png) |
| 7 | Por que corrigir o registro ainda não muda o bloqueio? | [Acompanhar](data-systems-visuals/07-correction-path.html) | [SVG](data-systems-visuals/07-correction-path.svg) · [PNG](data-systems-visuals/previews/07-correction-path.png) |
| 8 | Como o mesmo fato produz caminhos diferentes sob regras diferentes? | [Experimentar](data-systems-visuals/08-policy-choice.html) | [SVG](data-systems-visuals/08-policy-choice.svg) · [PNG](data-systems-visuals/previews/08-policy-choice.png) |

## Critérios de revisão

Cada cena tem uma pergunta e conserva os objetos que o leitor precisa acompanhar.
Usamos rótulos diretos, poucas cores e passos manuais quando existe uma mudança
importante para observar. Não há reprodução automática, cronômetros de desempenho
ou pontuações de qualidade ética. O leitor escolhe uma comparação ou avança um
estado; detalhes que não mudam a inferência ficam fora da imagem.

Os registros são exemplos hipotéticos. A organização por linhas e colunas é
esquemática; não mede desempenho. A divisão de responsabilidades depende do
serviço contratado. A comparação de políticas mantém um atraso confirmado fixo;
encaminhar o caso para avaliação deixa a decisão pendente e não atesta justiça
nem conformidade jurídica.

## Verificação

- As oito cenas foram abertas no Chromium a 820 e 360 pixels, sem rolagem
  horizontal, cortes de conteúdo visível, textos menores que 13 pixels ou erros
  de JavaScript. Um texto de status oculto em 01 é intencional e serve às
  tecnologias assistivas; não é conteúdo visual cortado.
- Os sete visuais interativos tiveram os estados conferidos: contagem 3/2,
  cancelamento pendente e propagado, responsabilidades por arranjo, destinos de
  consulta, resposta perdida, correção parcial e políticas com fato fixo. Ações
  de teclado foram exercitadas nos controles, com movimento reduzido ativo.
- As oito SVGs passaram em validação XML e checagem dos limites dos textos, e
  foram inspecionadas após renderização. Todos os rótulos continuam editáveis.
  As PNGs são exportações dessas fontes, não fontes independentes.
- A leitura independente sugeriu explicitar o agrupamento por tipo na consulta
  analítica e retirar uma explicação repetida antes da revelação em 06. Esses
  ajustes foram aplicados, junto da retirada do resumo redundante em 01 e da
  troca da sigla VM por uma expressão mais familiar.
- A galeria foi conferida em tela pequena, incluindo navegação e ajuste de altura.
  Scripts, referências locais e ausência de dependências externas foram verificados.
  O manuscrito, a estrutura e as fontes históricas não têm alterações.

Esta é uma primeira versão para revisão editorial, não evidência de aprendizagem
com leitores reais. Não foi feita uma sessão com leitor de tela. Nenhuma entrada
na coleção de artigos, publicação ou implantação foi criada.
