import type { Locale } from "../i18n";

const sectionCopy = {
  en: {
    "tree-based-machine-learning": {
      label: "Decision trees",
      description: "How trees split, predict, and become stronger together.",
    },
    "reinforcement-learning": {
      label: "Reinforcement learning",
      description: "How agents learn from rewards, experience, and state.",
    },
    "time-series": {
      label: "Time series",
      description: "How models find useful structure across time.",
    },
    other: {
      label: "Foundations and evaluation",
      description: "Core ideas for understanding and judging machine-learning models.",
    },
  },
  "pt-BR": {
    "tree-based-machine-learning": {
      label: "Árvores de decisão",
      description: "Como árvores dividem, predizem e ganham força em conjunto.",
    },
    "reinforcement-learning": {
      label: "Aprendizado por reforço",
      description: "Como agentes aprendem com recompensas, experiências e estados.",
    },
    "time-series": {
      label: "Séries temporais",
      description: "Como modelos encontram estruturas úteis ao longo do tempo.",
    },
    other: {
      label: "Fundamentos e avaliação",
      description: "Ideias centrais para entender e avaliar modelos de aprendizado de máquina.",
    },
  },
} as const;

type SectionKey = keyof typeof sectionCopy.en;

export interface ArticleLibrarySection<T> {
  id: SectionKey;
  label: string;
  description: string;
  articles: T[];
}

const sectionOrder = [
  "tree-based-machine-learning",
  "reinforcement-learning",
  "time-series",
  "other",
] as const satisfies readonly SectionKey[];

function sectionKey(series?: string): SectionKey {
  return sectionOrder.includes(series as SectionKey)
    ? (series as SectionKey)
    : "other";
}

export function groupArticlesBySeries<T extends { series?: string }>(
  articles: readonly T[],
  locale: Locale,
): ArticleLibrarySection<T>[] {
  const grouped = new Map<SectionKey, T[]>(
    sectionOrder.map((key) => [key, []]),
  );

  for (const article of articles) {
    grouped.get(sectionKey(article.series))?.push(article);
  }

  return sectionOrder.flatMap((id) => {
    const sectionArticles = grouped.get(id) ?? [];
    if (sectionArticles.length === 0) return [];

    return [{ id, ...sectionCopy[locale][id], articles: sectionArticles }];
  });
}
