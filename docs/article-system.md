# Grove article system

Grove's articles form a small, authored learning graph. The graph should help a
reader answer three questions without forcing every topic into one linear course:

1. What background does this article expect?
2. Where can I go after understanding it?
3. Which nearby ideas can I explore without committing to a sequence?

The Astro content collection in `apps/web/src/content/articles/` is the source of
truth for publication metadata, stable article identity, learning relationships,
difficulty, publication status, and the learning contract. The module
`apps/web/src/content/articles.ts` validates and queries that collection; it does
not contain authored article records.

The first English and Portuguese lesson bodies remain in their existing `.astro`
routes during the protected Phase 1 migration. Their collection entries use
`implementation: legacy-astro`. New articles should use MDX, and the original
lesson can move section by section later without changing its ID or URL.

## Stable references

Every article receives an immutable public identity (`articleId` in frontmatter
and `id` in the query API), such as
`decision-trees-from-scratch`. Titles and URLs may improve over time; the ID does
not change. Code should look up an article by this ID instead of copying its URL:

```astro
---
import { articleHref } from "../../content/articles";
const decisionTreeHref = articleHref(
  "decision-trees-from-scratch",
  "good-split",
  import.meta.env.BASE_URL,
);
---

<a href={decisionTreeHref}>how a tree chooses its first split</a>
```

The optional second argument creates a deep link to a stable section anchor. A
renamed route then requires one catalog edit instead of edits across every article.

## Learning relationships

Each catalog entry has two authored relationship lists:

- `prerequisites`: the reader needs an idea developed in the target article;
- `related`: a useful lateral connection, comparison, or alternative path.

The direction of a prerequisite points backward, from the new article to the
knowledge it uses. A future random-forest article would declare:

```ts
{
  articleId: "random-forests-reduce-variance",
  // ...display metadata
  prerequisites: ["decision-trees-from-scratch"],
  related: [],
}
```

Grove automatically derives the reverse “Build from here” link on the decision
tree article. Authors never maintain both sides of an edge. Related links are also
resolved symmetrically, even if they are declared on only one entry.

Use a prerequisite only when skipping the target would make the new explanation
substantially harder to reconstruct. Mentioning a concept is not enough. This keeps
the graph useful and leaves room for multiple paths through the library.

References to external papers, datasets, and sources are citations, not learning
graph edges. They should live in the article's prose or bibliography.

## Publication states

An article is either `draft` or `published`. Published entries require a
`publishedAt` date. Production navigation and feeds contain published entries
only. Local development includes drafts; a production-like preview can opt into
them explicitly with `SHOW_DRAFTS=true`.

An article's URL is independent from its source filename. Renaming or translating
a title must not change the stable ID. A URL change requires a redirect plan once
the public Railway deployment supports request-time routing.

## Learning contract

Every article entry records:

- minimum prior knowledge;
- the likely misconception;
- one observable transfer outcome;
- one motivating question;
- the central conceptual bottleneck; and
- evidence that the learner can reason independently.

These fields are editorial checks, not promotional copy. Each interactive remains
responsible for one learner question and must expose evidence that supports an
inference, with keyboard, mobile, reduced-motion, and text paths.

## Difficulty

Difficulty records assumed prior knowledge, not article quality, length, or the
amount of effort a reader may personally feel.

| Level | Use when |
| --- | --- |
| **Foundational** | The article starts from familiar ideas and teaches every machine-learning concept it uses. |
| **Intermediate** | The article assumes core ideas such as training data, fitted models, and evaluation. |
| **Advanced** | The article combines multiple models or domains, or assumes specialized mathematical or technical foundations. |

“Decision trees from scratch” is Foundational because it begins with tables and
yes/no questions. “Decision trees for reinforcement learning” would normally be
Advanced because it combines tree models with the state, action, value, and policy
ideas of another domain. A long derivation can still be Foundational if it builds
all of its required knowledge inside the article.

### Foundational reader contract

A Foundational article is written for a curious reader who can compare ordinary
numbers and follow a yes/no instruction but may not know machine-learning vocabulary,
algorithm notation, probability notation, or how to interpret a specialized chart.
Foundational does not mean short or effortless. It means every load-bearing idea is
constructed inside the article.

Before publishing a Foundational article, verify that it:

1. states its small non-ML starting assumptions near the opening;
2. introduces a concrete problem before naming the method that solves it;
3. asks for a low-cost prediction before revealing the worked answer;
4. explains every symbol in the sentence where it first matters, with compact general
   notation placed behind optional depth when concrete arithmetic is sufficient;
5. gives each playground one primary learner question and a guided fallback;
6. keeps the core view visually simple, with dense traces and secondary metrics opt-in;
7. preserves the same inference on mobile, keyboard, reduced-motion, and text paths;
8. distinguishes the core transfer outcome from optional limits and enrichment; and
9. estimates guided time from the prose plus the expected learner interactions, not
   from prose reading speed alone.

## Publishing checklist

1. Choose an immutable, descriptive article ID.
2. Create its MDX collection entry as a draft and complete the learning contract.
3. Set difficulty from the knowledge expected on the first screen.
4. Add only direct prerequisites; transitive history is already present in the graph.
5. Add optional related paths sparingly.
6. Use `articleHref()` for links in prose and stable section IDs for deep links.
7. Render `ArticleConnections` at the end of the article.
8. Preview the article, metadata, social card, and feed entry before publishing.
9. Change the status and add `publishedAt` only when the public article is ready.
10. Run `pnpm run check`; collection and catalog validation reject duplicate IDs, URLs,
   self-links, and references to unpublished articles.
