# Editorial release checklist

Use this checklist for every Grove article before changing its content entry from
`draft` to `published`. The author owns the checklist; a second reader should
perform the editorial and accessibility review whenever one is available.

## 1. Learning objective and technical review

- [ ] The article states one motivating question and one observable transfer
  outcome in its content frontmatter.
- [ ] Every prerequisite is necessary, linked by immutable `articleId`, and
  available to the intended reader.
- [ ] Claims, terminology, calculations, datasets, and code examples have been
  checked against primary sources or the canonical Grove implementation.
- [ ] The likely misconception and conceptual bottleneck are addressed in the
  article rather than only recorded in metadata.
- [ ] Each interactive answers one learner question and shows the result or
  comparison directly.
- [ ] A simplicity pass removed labels, controls, panels, or repeated values that
  do not help the learner make the intended inference.

## 2. Reading and interaction paths

- [ ] The opening establishes the problem and required prior knowledge before
  introducing specialized vocabulary.
- [ ] Headings form a useful outline and stable section IDs preserve existing
  deep links.
- [ ] Examples progress from concrete to general without unexplained notation.
- [ ] Every interactive has a useful non-interactive or textual fallback.
- [ ] Empty, loading, error, reset, and boundary states are clear where they can
  occur.
- [ ] The conclusion gives the learner a way to test transfer, not only a recap.

## 3. Accessibility and responsive review

- [ ] The complete article and every control can be reached and operated with a
  keyboard, with visible focus and a logical focus order.
- [ ] Headings, landmarks, labels, instructions, tables, and status changes have
  appropriate semantics for a screen reader.
- [ ] Meaning is not conveyed by color alone, and text and essential graphics
  meet the project's contrast requirements.
- [ ] Reduced-motion preferences preserve the same explanation and outcome.
- [ ] At narrow mobile width, content does not overlap or require horizontal page
  scrolling; touch targets remain usable.
- [ ] At wide desktop width, line length, diagrams, and optional chapter
  navigation remain readable.

## 4. Metadata, relationships, and localization

- [ ] `articleId` is immutable and matches the English source counterpart.
- [ ] `locale`, `routeSlug`, `href`, title, navigation title, description,
  summary, difficulty, reading time, and media counts are accurate.
- [ ] Prerequisite, related, and “Build from here” links resolve as intended.
- [ ] Internal article links use `articleHref()` when authored in components and
  do not copy a route that may change.
- [ ] Canonical URL, language alternates, Open Graph/Twitter metadata, social
  image, sitemap entry, and RSS entry are correct in the production build.
- [ ] Every supported translation is either ready for the same release or its
  absence is recorded as an explicit translation-parity task.
- [ ] Localized pages preserve code, equations, anchors, interactive behavior,
  citations, and locale switching.

## 5. Preview and release

- [ ] Preview the draft locally with `pnpm newsletter:preview` when the article is
  connected to an issue; otherwise use `SHOW_DRAFTS=true pnpm build` followed by
  `pnpm preview`.
- [ ] Review the article at mobile and desktop widths and inspect the browser
  console for errors.
- [ ] Check every internal link, external citation, image, download, and call to
  action.
- [ ] Run `pnpm run check` from the repository root and resolve every failure.
- [ ] Set `status: published` and `publishedAt` only after the checks above pass.
- [ ] Build again, then verify the published-only library, language alternates,
  RSS feed, sitemap, and any newsletter web/email artifacts.
- [ ] After deployment, open the canonical URL in a private browser window and
  verify the public page before sending or scheduling an issue.

Record the article ID, reviewer, preview URL, completed check command, and any
accepted limitation in the pull request. Publication and newsletter delivery are
separate approvals; publishing an article never authorizes an email send.
