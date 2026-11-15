# Aflora article preparation

This folder holds editorial preparation, outside the Astro article content collection. A preparation file is evidence of a working process, not a publication decision. The four supplied historical examples retain their complete original text after an explicitly marked source boundary; their prefaces are separate metadata. Historical drafts may contain competing options, unresolved claims, or instructions superseded by the process below. Do not silently correct or deduplicate the originals.

## Where this fits

Keep the existing Notion progression: **Ideas → Selection → Research → Building → Staging → Publication**. This repository folder documents the preparation work within **Building**. It does not move an idea between Notion stages. Article MDX, staging review, production approval, and newsletter delivery remain separate decisions and operations.

## Preparation sequence

1. **Suggested topic.** Start with the topic the editor supplies. Record the central question and why it merits an article. Do not treat the suggestion as an approved outline or draft.
2. **Research and scope.** Consult relevant primary technical sources and the existing Aflora article system. Record source links and what each supports, the target reader, prerequisites, central learning objective, transfer outcome, limits, technical uncertainties, and the smallest faithful example. Check claims and formulas before proposing them as fact. Label expected experimental behavior as expected until measured.
3. **Proposed learning structure.** Write the section sequence and the reasoning each section must build. Use the editor's bracketed instruction style, such as `[Explain why...]`, `[Introduce...]`, and `[Compare...]`. Include the visual ideas and labelled placeholders needed to judge the structure, with each learner question, what changes, what remains fixed, and what the reader should notice. Treat these as proposals.
4. **Approval checkpoint.** Present the topic, research, scope, proposed structure, and its essential visual ideas to the editor. **Stop for explicit approval or edits of the structure before the full first draft, detailed visual specification, or implementation.** Revise and seek approval again if the structure changes materially.
5. **Detailed visual specification and first draft.** After approval, develop each visual or interaction for one pedagogical job, with evidence, accessibility, and responsive behavior. Turn unlabelled bracketed conceptual instructions into natural prose while preserving the approved idea order. Keep labelled `[IMAGE: ...]`, `[ANIMATION: ...]`, `[PLAYGROUND: ...]`, and `[VISUALIZATION: ...]` as literal editorial placeholders in position until implemented. Brackets also occur in mathematics and prose; interpret them by meaning, not a regular expression.
6. **Editorial review.** Compare the draft with the approved scope and structure. Prioritize conceptual correctness, fidelity, pedagogical clarity, natural flow, and concision. Verify calculations and claims, examples, transitions, visual behavior, and source attribution. Record unresolved questions separately from the preserved source. Do not imply a candidate draft or visual is approved merely because it appears in a historical plan.

The article should read as connected reasoning with specific examples. Avoid mechanical paragraph expansion, repeated formulas that add no insight, and generic AI phrasing. The approved structure guides the argument; it is not a sentence-by-sentence script. See [template.md](template.md) for a new preparation.

## Structure assistance

Use the repository-local `$aflora-article-structure` skill to research and develop
a story of ideas, learning scope and bracketed structure from an idea or partial
preparation. It develops conceptual and visual progression while preserving the
editor's order and scope; substantial changes are proposed separately. Complex
topics may use focused parallel research followed by synthesis. Its scope ends
at structure review.
The [data-systems trial](data-systems-trade-offs.md) is a proposed preparation,
not an approved structure or manuscript.
The [rejected first trial](data-systems-trade-offs-trial-v1.md) is preserved as
editorial evidence, not a model to copy.

## Historical examples

| Preparation | Article ID in the current content collection | Source state |
| --- | --- | --- |
| [Precision, Recall, and Accuracy](precision-recall-accuracy.md) | `is-my-model-good` | Scope, structure, visual notes, first draft |
| [Markovianness](markovianness.md) | `the-markov-principle` | Scope, structure, visual notes, first draft |
| [Beyond CART](beyond-cart.md) | `beyond-cart-tree-architectures` | Scope, structure, drafting prompt, repeated material, candidate drafts and comparison; no explicit approved winner |
| [Gradient Boosting](gradient-boosting.md) | `gradient-boosting-quick-deep-dive` | Detailed scope and structure; no complete first draft |

These IDs connect plans to article records; the historical files do not update the published content or claim that the current MDX matches their prose. Review notes in each preface flag concerns without changing the source.
