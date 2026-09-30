import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const difficulty = z.enum(["foundational", "intermediate", "advanced"]);
const locale = z.enum(["en", "pt-BR"]);

const articles = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/articles" }),
  schema: z.object({
    articleId: z.string().min(1),
    locale,
    routeSlug: z.string().min(1),
    href: z.string().startsWith("/"),
    title: z.string().min(1),
    navTitle: z.string().min(1),
    description: z.string().min(1),
    eyebrow: z.string().min(1),
    area: z.string().min(1),
    topic: z.string().min(1),
    summary: z.string().min(1),
    status: z.enum(["draft", "published"]),
    publishedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    readingTime: z.string().min(1),
    interactiveCount: z.number().int().nonnegative(),
    staticVisualCount: z.number().int().nonnegative(),
    difficulty,
    quickRead: z.boolean().optional(),
    series: z.string().min(1).optional(),
    access: z.enum(["public", "member", "paid"]).default("public"),
    prerequisites: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
    implementation: z.enum(["mdx", "legacy-astro"]).default("mdx"),
    learning: z.object({
      priorKnowledge: z.array(z.string()).min(1),
      likelyMisconception: z.string().min(1),
      transferOutcome: z.string().min(1),
      motivatingQuestion: z.string().min(1),
      conceptualBottleneck: z.string().min(1),
      evidenceOfUnderstanding: z.array(z.string()).min(1),
    }),
  }).superRefine((article, context) => {
    if (article.status === "published" && !article.publishedAt) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Published articles require a publication date.",
      });
    }
  }),
});

const issues = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/issues" }),
  schema: z.object({
    issueId: z.string().min(1),
    locale,
    issueNumber: z.number().int().positive(),
    routeSlug: z.string().min(1),
    href: z.string().startsWith("/"),
    subject: z.string().min(1).max(120),
    preheader: z.string().min(1).max(180),
    summary: z.string().min(1),
    status: z.enum(["draft", "ready", "published"]),
    publishedAt: z.coerce.date().optional(),
    featuredArticles: z.array(z.string()).min(1),
    tags: z.array(z.string()).default([]),
    cta: z.object({
      label: z.string().min(1),
      href: z.string().startsWith("/"),
    }),
  }).superRefine((issue, context) => {
    if (issue.status === "published" && !issue.publishedAt) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Published newsletter issues require a publication date.",
      });
    }
  }),
});

export const collections = { articles, issues };
