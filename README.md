# Grove

**Tree-based machine learning, made visible.**

Grove is an open learning project that connects plain-English explanations, from-scratch algorithms, and interactive visualizations. The same trained model and versioned trace drive the calculations, predictions, and diagrams shown in each lesson.

The first release focuses on one question: **how does a classification tree choose its first split?**

## What is available

- a simple, responsive learning interface with chapter navigation;
- an introduction and curriculum roadmap;
- the first interactive decision-tree lesson;
- Gini and entropy implemented from first principles;
- a real decision-stump trainer with a serializable training trace;
- a reusable visualization package connected directly to the model;
- focused unit tests for impurity and split selection.

## Project structure

```text
apps/web                 Astro site and English lesson content
packages/tree-core       Framework-independent tree algorithms and contracts
packages/tree-visuals    React/SVG teaching components driven by tree-core
docs                     Product, architecture, roadmap, and decisions
```

## Run locally

Requirements: Node.js 22 or later and pnpm.

```bash
pnpm install
pnpm dev
```

The local site runs at `http://localhost:4321` by default.

## Quality checks

```bash
pnpm run check
```

This runs type checks, algorithm tests, and the production build.

## Design principles

- **One source of truth:** visuals use the tree and trace produced by the real algorithm.
- **From scratch where it matters:** the machine-learning core has no ML dependency.
- **Visual before ornamental:** an interaction must reveal a decision made by the model.
- **Progressive depth:** simple trees become reusable parts of later ensembles.
- **Static-first:** lessons run locally in the browser and remain compatible with GitHub Pages.
- **English-first, translation-ready:** the first interface is English, with shared navigation and shell copy kept behind a locale boundary.

## Planning

- [Product scope](docs/product-scope.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Contribution workflow](CONTRIBUTING.md)
- [ADR 0001 — static application with a browser-based engine](docs/adr/0001-static-first-browser-engine.md)

## Proposed licensing

- code: MIT;
- original writing and illustrations: CC BY 4.0.

The licenses will be formalized before the first public release.
