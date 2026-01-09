import { Category } from "@prisma/client";

export type ParsedHeadline = {
  sourceName: string;
  sourceUrl: string;
  articleUrl: string;
  originalTitle: string;
  publishedAt?: Date | null;
};

export type RewriteResult = {
  neutralTitle: string;
  rewriteFlags: string[];
  rewriteMode: "rules" | "llm";
};

export type CategorizeResult = {
  category: Category;
};

export type IngestStats = {
  bySource: Record<string, { fetched: number; stored: number; errors: number; lastError?: string }>;
  startedAt: string;
  finishedAt: string;
};
