import type { VisaSubclassId } from "./subclass";

/**
 * Metadata for a curated explainer/regulatory text file under `data/docs/`.
 */
export interface DocMetadata {
  id: string;
  title: string;
  sourceUrl: string;
  /** ISO date string. */
  lastChecked: string;
  relatedSubclasses: VisaSubclassId[];
}

/**
 * One hit from the local keyword search index.
 */
export interface DocSearchResult {
  docId: string;
  title: string;
  sourceUrl: string;
  snippet: string;
  score: number;
}
