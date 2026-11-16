# Visuais 07–08

Desenvolvimento visual do manuscrito oficial em português, issue #254. Os
arquivos são materiais editoriais locais; não publicam o artigo nem mudam sua
estrutura ou seus placeholders. Ambos usam apenas recursos locais.

## 07 — Caminho da correção

- **Pergunta:** por que C17 continua bloqueada depois de corrigir o registro?
- **Inferência:** corrigir a origem, atualizar uma representação derivada e
  reavaliar uma ação são trabalhos distintos. Uma lista antiga pode conservar
  a consequência depois de a origem estar correta.
- **Invariante:** cliente C17 e os três objetos — registro de devolução, lista
  de bloqueio, tentativa de reserva — permanecem no mesmo percurso e na mesma
  ordem. No HTML, não são substituídos ao avançar.
- **Estados:** registro de atraso errado → correção para devolução no prazo,
  com lista e bloqueio ainda antigos → lista atualizada e tentativa reavaliada,
  permitindo a reserva neste exemplo específico.
- **Exploração:** dois botões nativos permitem avançar e voltar. O segundo
  estado isola a correção da origem; o último identifica tanto a atualização
  quanto a reavaliação. O número da etapa e o resultado têm anúncio educado
  para tecnologia assistiva. A SVG reúne três instantâneos para comparação.
- **Simplificação:** só há uma origem, um derivado e uma tentativa. Nenhuma
  topologia, fila, serviço ou protocolo é inventado. A liberação final é
  limitada ao caso apresentado; não representa uma regra universal nem uma
  exigência de implementação decorrente de lei.
- **Passagem de simplicidade:** foram dispensados ícones, legenda, painel de
  resultados duplicado e controles de velocidade. O texto dos três objetos
  mostra a mudança; a cor apenas destaca o que foi alterado.

## 08 — Escolha de política

- **Pergunta:** um atraso verdadeiro exige, por si só, bloquear a reserva?
- **Inferência:** o fato registrado permanece fixo enquanto uma política
  determina o caminho e o estado da decisão.
- **Invariante:** a mesma cliente C17, agora em uma variação explícita do caso,
  devolveu a ferramenta com atraso verdadeiro e confirmado. Escolher a regra
  nunca altera esse fato.
- **Exploração:** antes da primeira escolha, o leitor é convidado a prever
  se o fato exige bloqueio. Dois botões com estado pressionado comparam
  “Bloquear por atraso” → “Bloqueio automático” e “Avaliar o contexto” →
  “Decisão pendente de avaliação”. O resultado muda imediatamente, com anúncio
  educado. É possível alternar livremente entre as regras. A SVG mostra as
  duas rotas sob o mesmo fato.
- **Limite:** o segundo caminho não libera a reserva e não resolve a decisão.
  Nenhuma regra recebe nota ética, selo de justiça ou promessa de conformidade
  jurídica. A nota curta fica fora do percurso principal.
- **Passagem de simplicidade:** não há atributos pessoais, contextos
  inventados, pontuação, decisão final, ou painel paralelo que repita o fato.
  As duas escolhas usam a mesma apresentação visual.

## Verificações e limites

- As duas SVGs passaram em `xmllint --noout` e foram renderizadas com
  `rsvg-convert`. A inspeção das imagens confirmou rótulos legíveis, sem
  sobreposição. O menor texto é de 14 px em viewBox de 360 px; títulos,
  descrições e textos continuam editáveis.
- O agente principal informou revisão dos HTMLs no Chromium a 360 e 820 px,
  sem corte ou texto pequeno. Os controles empilham na largura estreita; os
  conectores de 07 reservam altura para rótulos de duas linhas. Não há
  rolagem horizontal prevista nem texto desenhado em canvas.
- Botões nativos, foco visível da folha compartilhada e alvos de pelo menos
  44 px fornecem a base de teclado. Os estados são discretos, sem movimento
  automático; a mesma sequência vale com movimento reduzido.
- O integrador confirmou no navegador os estados, a ida e volta por teclado,
  a manutenção do fato fixo em 08 e a decisão pendente sem liberação. A geometria
  dos textos exportados também passou. Não foi feita sessão com leitor de tela
  nem um teste de aprendizagem com leitores reais.
