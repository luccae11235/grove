# ADR 0001 — aplicação estática com motor no navegador

- Status: aceito para o MVP
- Data: 2026-07-13

## Contexto

O projeto precisa ser gratuito, aberto, interativo e publicado no GitHub Pages. Ao mesmo tempo, o núcleo algorítmico deve ser reutilizável e ser a fonte real das visualizações.

GitHub Pages serve HTML, CSS, JavaScript e outros arquivos estáticos; ele não executa continuamente um back-end próprio. As primeiras experiências usam datasets pequenos e não exigem persistência.

## Decisão

Implementar o motor de árvores em TypeScript puro, separado da interface e executado no navegador. Expor o treinamento por um contrato assíncrono para permitir uma futura troca da execução direta por Web Worker ou serviço HTTP.

O núcleo emitirá um rastro de treinamento versionado e serializável. As visualizações consumirão a árvore final e esse rastro, sem reimplementar decisões do algoritmo.

## Consequências positivas

- hospedagem gratuita e simples;
- interação sem latência de rede;
- datasets não deixam o dispositivo;
- uma única linguagem no caminho interativo inicial;
- exemplos podem funcionar offline depois que os assets forem carregados;
- fronteira de execução preserva uma migração futura.

## Custos e limites

- cálculos pesados podem bloquear a interface até a adoção de Web Workers;
- memória e CPU do dispositivo limitam datasets e ensembles;
- não há persistência ou colaboração nativa;
- uma futura implementação Python não compartilhará o mesmo código-fonte, apenas especificações, fixtures e contratos conceituais.

## Alternativas rejeitadas no MVP

### API Python gratuita

Adicionaria um segundo deploy, cold starts, limites de provedor, observabilidade e transmissão de dados sem entregar valor necessário ao primeiro laboratório.

### Python via Pyodide

Preservaria a linguagem comum em ML, mas aumentaria significativamente o carregamento e a complexidade para uma implementação pequena. Pode ser reavaliado para conteúdos especificamente voltados a Python.

### Resultados somente pré-calculados

Simplificaria a página, mas quebraria a promessa de que controles e visualizações refletem uma execução real do algoritmo.

## Gatilhos para revisão

Revisar esta decisão se:

- a execução local não atender o orçamento de desempenho mesmo com Web Workers;
- surgir necessidade comprovada de persistência ou colaboração;
- experimentos exigirem ambientes computacionais reproduzíveis no servidor;
- a experiência Python tornar-se um requisito central, não apenas uma preferência.
