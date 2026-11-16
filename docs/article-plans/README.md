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
The [data-systems preparation](data-systems-trade-offs.md) preserves the structure
and its original proposal metadata. On 2026-11-15 the editor explicitly approved
the current structure for a drafting test. The resulting
[Portuguese first draft](data-systems-trade-offs-draft-pt-br.md) is saved separately
for editorial review. On 2026-11-16 the editor designated it as the official
working draft for subsequent visual development on
`feature/254-data-systems-article`, tracked in
[issue #254](https://github.com/luccae11235/grove/issues/254). The text and its eight
visual placeholders remain unchanged; it is still a draft, with publication
remaining a separate decision.
The [visual review](data-systems-visuals.md) collects the eight scenes being
developed from that manuscript, with editable images and a standalone gallery.
The [rejected first trial](data-systems-trade-offs-trial-v1.md) is preserved as
editorial evidence, not a model to copy.

## Drafting assistance

After explicit structure approval, use the repository-local
`$aflora-article-draft` skill to turn conceptual instructions into a complete first
draft. It preserves the approved scope, explanatory order, headings and literal
visual placeholders while developing natural, connected prose. Supply the article
language when it differs from the plan; headings can be translated faithfully,
but placeholders remain unchanged. Existing approval in the conversation is enough.

For example: `$aflora-article-draft Redija em português a estrutura aprovada em
<arquivo>, usando o learning scope e os exemplos de escrita anexados.` The draft
remains outside the publication collection unless implementation is separately
requested. Invoking the skill does not itself approve a structure or implement
its visuals.

## Integrated data-systems review

The editor requested a joint text/visual review on 2026-11-16. The eight visual
candidates now appear in place within the
[integrated Portuguese MDX draft](../../apps/web/src/drafts/data-systems-pt-br.mdx),
using native Astro components rather than embedded gallery pages. All source
paragraphs and their order are preserved. The separate preparation and first
Markdown draft remain editorial evidence.

The Docker review is at
[`/pt-br/rascunhos/sistemas-de-dados/`](http://127.0.0.1:4321/pt-br/rascunhos/sistemas-de-dados/).
The route exists only in development or builds with `SHOW_DRAFTS=true`, carries
`noindex, nofollow`, and is outside the published article catalog. The integrated
MDX is the working text for this review; incorporating the candidates is not
editorial approval or publication.

To recreate the local preview from the repository root:

```sh
docker build -f apps/web/Dockerfile -t aflora-data-systems-review:local \
  --build-arg SHOW_DRAFTS=true --build-arg SITE_URL=http://localhost:4321 .
docker run -d --name aflora-data-systems-review \
  -p 127.0.0.1:4321:8080 aflora-data-systems-review:local
```

The existing Dockerfile produces a static site, so source changes require a
rebuild and replacement of this named review container. No database or API service
is needed. The current container leaves API integrations disabled.

## Historical examples

| Preparation | Article ID in the current content collection | Source state |
| --- | --- | --- |
| [Precision, Recall, and Accuracy](precision-recall-accuracy.md) | `is-my-model-good` | Scope, structure, visual notes, first draft |
| [Markovianness](markovianness.md) | `the-markov-principle` | Scope, structure, visual notes, first draft |
| [Beyond CART](beyond-cart.md) | `beyond-cart-tree-architectures` | Scope, structure, drafting prompt, repeated material, candidate drafts and comparison; no explicit approved winner |
| [Gradient Boosting](gradient-boosting.md) | `gradient-boosting-quick-deep-dive` | Detailed scope and structure; no complete first draft |

These IDs connect plans to article records; the historical files do not update the published content or claim that the current MDX matches their prose. Review notes in each preface flag concerns without changing the source.
