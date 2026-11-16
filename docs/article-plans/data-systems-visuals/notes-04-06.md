# Visuals 04–06

Editable static SVGs and standalone Portuguese HTMLs accompany the approved manuscript under issue #254. The HTMLs use the shared local `visual.css`; they contain no network calls or runtime dependencies. Native buttons support keyboard activation, visible focus and polite state announcements. There is no animation or autoplay, so reduced motion uses the same states.

## 04 — Responsibilities

- **Question:** Which responsibility changes when more service is contracted?
- **Inference:** Delegated work still exists. Cloud hosting and software self-management can coexist; access configuration and data purpose remain organizational decisions.
- **Invariant:** The same four tasks, in the same order. Only equipment and database-update owners change.
- **Evidence and control:** Three arrangements update the owner column. Managed updates read “Provedor conforme contrato”; the boundary is explicitly illustrative.
- **Removed clutter:** Datacenter imagery, service logos, infrastructure layers and a compressed twelve-cell comparison. The static SVG stacks the three arrangements for readable labels at 360 px.
- **Correctness:** Own equipment assigns all tasks to the organization; a cloud VM delegates equipment but retains database administration; managed database delegates updates according to contract. No universal managed-service boundary is claimed.

## 05 — Copies and partitions

- **Question:** Does another machine hold a copy or a different part, and which destinations does a query need?
- **Inference:** Replication duplicates the six reservations. Partitioning by unit separates A/101–103 and B/104–106; a global query must gather both parts.
- **Invariant:** Reservation identities and unit membership. Both complete copies always contain 101–106.
- **Evidence and control:** “Só unidade A” queries node 1 in either arrangement. “Todas as unidades” continues to choose one complete replica but queries both partitions. Direct “Consultado” labels make emphasis independent of color. The SVG preserves the global comparison.
- **Removed clutter:** Routing arrows, moving requests, timing, capacity bars, speed and availability claims. Node boundaries mark data placement; they are not decorative cards.
- **Correctness:** Replica selection is an illustrative routing choice. Freshness, replica coordination and recovery are outside this representation; the note does not imply identical current state under arbitrary failures.

## 06 — Missing response

- **Question:** What can a client know when confirmation does not arrive?
- **Inference:** The same client observation is compatible with either an unrecorded reservation or a recorded reservation whose response was lost.
- **Invariant:** Client and server positions and the client's exact text “Sem confirmação” in both situations.
- **Evidence and control:** Initially both server states are unrevealed. A single reversible reveal shows request loss versus response loss while preserving the client's observation. The static SVG shows both complete situations.
- **Removed clutter:** Network animation, packet counts, clocks, shutdown icons, retries and request IDs. Direct text communicates the two paths without an additional arrow code to decode.
- **Correctness:** The server can remain operational in both cases. This visual makes no exactly-once or identifier guarantee; it isolates uncertainty after missing confirmation.

## Checks and limits

- HTML uses responsive native text and a two-column node layout; controls wrap rather than overflow. SVGs use a 360 px viewBox, direct labels and text at least 14 px.
- Model values, reservation identity, labels and accessible text were checked against each scenario. The combined Chromium review at 820/360 px passed, including keyboard/state actions and text bounds for exported SVGs.
- All three inline scripts passed JavaScript syntax checks; all three SVGs passed `xmllint --noout`. The integrator completed rendered inspection with the approved local browser.
- These are editorial preview assets, not article integration or publication. The static SVGs show comparison/revealed states rather than reproducing the HTML reveal interaction.
