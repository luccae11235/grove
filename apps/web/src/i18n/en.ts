export const siteCopy = {
  brand: "Grove",
  tagline: "Tree-based ML, made visible.",
  skipToContent: "Skip to content",
  browseChapters: "Browse chapters",
  comingSoon: "Soon",
};

export const navigation = [
  {
    label: "Start",
    items: [{ label: "Introduction", href: "/" }],
  },
  {
    label: "Decision trees",
    items: [
      { label: "How trees learn", href: "/learn/decision-trees" },
      { label: "Gini or entropy?", href: "/learn/gini-vs-entropy" },
      { label: "Regression trees", status: "soon" as const },
    ],
  },
  {
    label: "Ensembles",
    items: [
      { label: "Random forests", status: "soon" as const },
      { label: "Gradient boosting", status: "soon" as const },
    ],
  },
  {
    label: "Applications",
    items: [{ label: "Trees in reinforcement learning", status: "soon" as const }],
  },
  {
    label: "Project",
    items: [
      { label: "Learning path", href: "/roadmap" },
      { label: "About", href: "/about" },
    ],
  },
];

