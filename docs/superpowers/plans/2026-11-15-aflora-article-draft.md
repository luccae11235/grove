# Aflora article drafting skill

Issue: [#247](https://github.com/luccae11235/grove/issues/247).

## Contract supplied by the editor

Create the repository-local `aflora-article-draft` skill from the supplied drafting
prompt and writing style. The input is an approved learning structure; the output
is the complete first draft in Markdown. Preserve scope, headings, idea order,
examples and literal visual placeholders. Develop connected reasoning rather
than expanding each bracket into one paragraph. Writing examples guide cadence
and voice without supplying text to copy.

The source is the editor's 2026-11-15 attachment beginning “ROLE You are a technical
educational writer specialized in Machine Learning.” Generalize the domain to
Aflora articles, as requested for the structure skill; retain its substantive
drafting contract. Include the editor's subsequent preference against rhetorical
colon/dash title splits. The skill must work without access to the attachment.

## Implementation choices

- A self-contained `SKILL.md` and UI metadata; no scripts or duplicated prompt.
- Use the approved plan and existing context without requiring XML input fields.
- Preserve existing approval; ask only if approval or a consequential input is
  actually missing. Creating the skill does not approve the data-systems plan.
- Preserve headings by default. An explicitly requested different article language
  allows faithful heading translation, keeping hierarchy; placeholders stay literal.
  Explicit contradictory requirements need resolution before a full draft.
- Verify technical claims locally or against primary sources as needed. Research
  supports the approved explanation; it does not restart conceptual planning.
- Return the article without process notes. Resolve a blocking contradiction or
  essential uncertainty with the editor before producing a misleading manuscript.
- No visual implementation, article collection entry, publication or Notion change.

The new branch starts at the latest `origin/develop` and incorporates the existing
structure-skill branch, so both tools remain available. Its PR depends on #246;
until that PR merges, the comparison against develop also includes its commits.

## Validation plan

1. Run the original supplied prompt against a small approved synthetic structure.
2. Validate the new skill's metadata and compare its input handling with the prompt.
3. Have a fresh agent use the skill on that fixture and on unapproved/conflicting
   material, with all generated manuscripts isolated outside the repository.
4. Inspect actual prose, calculations, heading progression, literal placeholders,
   mathematical brackets and Markdown links. Record observed limits honestly;
   a passing schema or a single trial does not establish editorial quality.
5. Update preparation guidance and the task queue, then open an issue-linked PR.

## Results

The raw-prompt baseline produced a coherent English draft with faithfully
translated headings, all four Portuguese visual placeholders, the `[0, 1]`
interval and Markdown link intact. It correctly calculated 99% accuracy and 0%
recall, and separated hypothetical alternatives from measured results. No material
failure was observed in this one baseline; the new skill packages the supplied
contract for reuse rather than claiming to fix a demonstrated baseline failure.

The official skill validator passes. UI metadata lengths, the invocation prompt,
automatic discovery and the two-file resource layout were checked. An independent
contract review found no consequential mismatch against the supplied prompt,
writing style and repository approval boundary.

A fresh agent used only the new skill and a synthetic approved fixture to produce
an English draft from Portuguese planning material. Manual review found developed
reasoning across the three sections, correct calculations (99%/0%, then 98%/0%
and 100%/100%), and explicit hypothetical status. The draft preserved all four
visual placeholders literally and in order, translated headings faithfully, and
retained the mathematical interval and source link. Both this draft and the
baseline use some questions and introductory framing; this trial cannot establish
consistent editorial quality or superiority to the original prompt.

Two additional independent usage cases produced questions rather than manuscripts:
an explicitly unapproved outline required structure approval, and an approved plan
with a central arithmetic/conceptual contradiction led to an explanation of the
correct 90% accuracy and a request to correct that idea. These are simulated cases,
not approvals or changes to real article plans.

Generated trial manuscripts stay in a temporary directory; the existing
data-systems proposal and historical preparations remain untouched. Whitespace
validation passes. No application code or publication records changed, so local
verification is scoped to skill metadata, contract review and behavioral outputs;
the PR also runs the repository's remote quality gates. There is no changed web
experience to review in staging, and no merge is performed as part of this task.
