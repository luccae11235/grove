# Visuais 01–03 — issue #254

Fonte: o primeiro rascunho oficial em `../data-systems-trade-offs-draft-pt-br.md`.
Preparação abaixo registrada antes do desenho. São exemplos esquemáticos; não
há medições de desempenho ou uma simulação de armazenamento.

## 01 — Percursos de consulta

- Pergunta: por que consultar a reserva 104 e comparar confirmadas em março
  requerem dados diferentes?
- Inferência: uma resposta local usa um registro; a comparação combina atributos
  de várias reservas e exclui a cancelada.
- Invariante: seis reservas, posições, valores e quatro campos. IDs 101, 102 e
  104: furadeira confirmada; 103: furadeira cancelada; 105 e 106: serra
  confirmada. Todas são de março.
- Evidência: escolha entre uma linha marcada e os campos tipo, mês e situação;
  resultado analítico calculado a partir dos registros: três furadeiras e duas
  serras. A linha 103 permanece visível para tornar a exclusão verificável.
- Equívoco a evitar: o destaque não representa uma varredura física, índice ou
  tempo de execução. O HTML oferece duas escolhas sem animação automática; o
  SVG compara os dois resultados verticalmente.
- Checagem de compreensão: por que a reserva 103 não aumenta a barra de
  furadeiras?

## 02 — Agrupamento no armazenamento

- Pergunta: o que fica junto quando agrupamos por reserva ou por atributo?
- Inferência: os mesmos valores podem ter proximidades físicas diferentes;
  uma coluna selecionada na tela não altera o armazenamento.
- Invariante: todos os valores e sua ordem 101–106. Nenhum campo é removido.
- Evidência: um contorno reúne cada registro; depois um contorno reúne cada
  atributo. O ID na mesma posição preserva a correspondência entre os campos.
- Equívoco a evitar: o desenho é um esquema de agrupamento, não uma afirmação
  de que um formato sempre é mais rápido. Não há controle porque as duas
  organizações precisam ser comparadas diretamente.
- Checagem de compreensão: onde continuam os valores da reserva 103 em cada
  organização?

## 03 — Atualização analítica

- Pergunta: quando o cancelamento chega ao relatório?
- Inferência: entre alterar a origem e propagar a mudança, o relatório pode
  continuar descrevendo um estado anterior.
- Invariante: reserva 104 e posições de origem, atualização e relatório.
- Evidência: três estados manuais: ambas confirmadas; origem cancelada com
  atualização pendente; ambas canceladas após propagação.
- Equívoco a evitar: nenhuma duração é atribuída ao intervalo. O relatório
  analítico não oferece, por este desenho, uma garantia para prometer a última
  ferramenta.
- Checagem de compreensão: no segundo estado, por que as duas respostas diferem?

## Simplificação e verificação

- Arquivos: `01-query-paths.{html,svg}`, `02-row-columns.{html,svg}` e
  `03-analytical-update.{html,svg}`. Os SVGs mantêm texto editável, título e
  descrição; o HTML usa texto nativo e a folha local `visual.css`.
- Passagem de simplicidade: em 01 foi removida a síntese que repetia a linha
  104. O primeiro estado mostra apenas a linha destacada; só a comparação
  revela barras. Em 02 foram dispensados controles e quaisquer painéis sobre
  velocidade. Em 03 foram dispensados reprodução automática e cronômetro.
- Correção: a execução dos scripts dos HTMLs com DOM de verificação confirmou
  as seis identidades e a ordem, o resultado derivado 3/2, a troca e o retorno
  entre consultas, os três estados da atualização, a indicação pendente e o
  retorno ao início. Todos os SVGs passaram `xmllint --noout`.
- Acessibilidade: documentos `pt-BR`, controles nativos com mínimo de 44px,
  foco visível compartilhado, seleção por `aria-pressed`, mudança significativa
  anunciada por status e pistas que não dependem apenas de cor. Não há
  movimento automático ou dependência de rede. Texto dos SVGs: mínimo de
  14px na largura nativa de 360px.
- Verificação integrada: os três HTMLs foram renderizados no Chromium a 360 e
  820px, com teclado e movimento reduzido. O integrador confirmou os estados
  de 01/03, o cálculo 3/2, a contenção e a geometria dos textos exportados.
  A checagem é técnica e editorial; não equivale a teste de aprendizagem real.
