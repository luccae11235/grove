# English and Brazilian Portuguese translation workflow

English (`en`) is Grove's source locale. Brazilian Portuguese (`pt-BR`) is a
reviewed counterpart, not an independently evolving article. Both versions share
an immutable `articleId`, learning objective, technical claims, interactives, and
publication intent while allowing natural localized titles, summaries, examples,
and route slugs.

## Sources of truth

- Article bodies and metadata live in
  `apps/web/src/content/articles/<locale>/`.
- Older protected lessons may keep their body in locale-specific `.astro` routes
  while their MDX entries own metadata; `implementation: legacy-astro` records
  this exception.
- Shared interface strings live in `apps/web/src/i18n/en.ts` and
  `apps/web/src/i18n/pt-BR.ts` with the same key shape.
- English article IDs, stable section anchors, code identifiers, formulas,
  component props, and generated data are not translated.
- `apps/web/src/content/articles.ts` validates that every translation has an
  English source entry and resolves localized article links.

## Inventory before translation

For each release, inventory:

1. published and release-bound English entries under
   `apps/web/src/content/articles/en/`;
2. corresponding `pt-BR` entries and, for legacy articles, their route files;
3. newsletter issues, navigation labels, form messages, accessibility text,
   captions, alt text, social metadata, and interactive strings used by those
   entries; and
4. links and reusable components whose visible copy is still embedded outside
   the locale dictionaries.

Track one parity item per missing locale counterpart. Draft English experiments
that are not release-bound may remain untranslated, but a published English
article must not silently lose parity.

## Translate an article

1. Copy the English source entry into the `pt-BR` directory and keep
   `articleId`, `implementation`, difficulty, access, relationship IDs,
   interactive count, static visual count, and learning intent aligned.
2. Translate reader-facing metadata and prose. Use a natural Brazilian
   Portuguese title and `routeSlug`; set an `href` under `/pt-br/learn/`.
3. Preserve stable heading IDs, citations, URLs, code, variable names, file
   paths, equations, component imports, and component behavior.
4. Localize visible labels and accessible names in shared components through the
   locale dictionaries. Do not fork an interactive solely to translate copy.
5. Update language-alternate mappings on legacy routes. Both language-switcher
   links must land on equivalent pages, never a generic index.
6. Keep the translation in `draft` until linguistic, technical, and rendered
   review are complete. Add `publishedAt` when it is released; use `updatedAt`
   for later material revisions.

## Review gates

- **Structural parity:** headings, examples, figures, interactives, citations,
  calls to action, and fallback paths match the English source.
- **Technical parity:** numbers, claims, algorithm behavior, code, and learning
  outcome have the same meaning.
- **Language quality:** terminology is consistent, prose is idiomatic `pt-BR`,
  and English word order or false cognates have not leaked into the text.
- **Interface quality:** translated labels fit at mobile width; keyboard,
  screen-reader, reduced-motion, and non-interactive paths remain intact.
- **Metadata quality:** canonical URL points to the localized page, alternates
  include both locales, and localized RSS/navigation entries use the translated
  metadata.
- **Build quality:** `pnpm run check` passes and both pages are reviewed from the
  production build.

Use the [editorial release checklist](editorial-release-checklist.md) for the
final rendered review.

## Keeping translations current

When the English source changes, classify the change in the pull request:

- **Editorial only:** punctuation or phrasing with no meaning change; update the
  translation when helpful.
- **Meaningful:** a changed claim, example, section, link, visual, interaction,
  learning contract field, or metadata value; update both locales in the same
  pull request or keep both versions in draft.
- **Urgent correction:** fix the English source immediately, record a parity
  task, and avoid promoting the affected translation as current until reviewed.

The English file remains the comparison baseline. Reviewers should diff the two
structures rather than relying on memory. Machine translation may create a first
draft, but a person must review pedagogy, terminology, accessible text, and all
rendered layouts before publication.
