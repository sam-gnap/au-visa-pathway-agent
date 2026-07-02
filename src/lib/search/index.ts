import fs from "node:fs";
import path from "node:path";
import type { DocMetadata, DocSearchResult, VisaSubclassId } from "@/types";

// ---------- Tokenization ----------

const STOPWORDS = new Set<string>([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "is", "it", "its", "of", "on", "or", "that",
  "the", "to", "was", "were", "will", "with", "this", "these", "those",
  "but", "not", "if",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((tok) => tok.length > 0 && !STOPWORDS.has(tok));
}

// ---------- Doc loading ----------

interface IndexedDoc {
  meta: DocMetadata;
  rawText: string;
  tokens: string[];
  termFreq: Map<string, number>;
  length: number;
  titleTokens: Set<string>;
}

function loadDocs(): IndexedDoc[] {
  const docsDir = path.join(process.cwd(), "data", "docs");
  const docs: IndexedDoc[] = [];

  let entries: string[];
  try {
    entries = fs.readdirSync(docsDir);
  } catch (err) {
    // Surface misconfiguration during dev — silent empty results were
    // confusing when the docs directory was missing.
    console.warn(
      `[search] could not read docs directory ${docsDir}: ${(err as Error).message}`,
    );
    return docs;
  }

  for (const entry of entries) {
    if (!entry.endsWith(".txt")) continue;
    const base = entry.slice(0, -".txt".length);
    const txtPath = path.join(docsDir, entry);
    const metaPath = path.join(docsDir, `${base}.meta.json`);
    let meta: DocMetadata;
    let rawText: string;
    try {
      rawText = fs.readFileSync(txtPath, "utf8");
      const metaRaw = fs.readFileSync(metaPath, "utf8");
      meta = JSON.parse(metaRaw) as DocMetadata;
    } catch {
      // Skip docs missing a sidecar or unreadable.
      continue;
    }

    const tokens = tokenize(rawText);
    const termFreq = new Map<string, number>();
    for (const tok of tokens) {
      termFreq.set(tok, (termFreq.get(tok) ?? 0) + 1);
    }
    const titleTokens = new Set(tokenize(meta.title));
    docs.push({
      meta,
      rawText,
      tokens,
      termFreq,
      length: tokens.length,
      titleTokens,
    });
  }
  if (docs.length === 0) {
    console.warn(
      `[search] no indexed docs found under ${docsDir} — searchDocs will return [] for all queries`,
    );
  }
  return docs;
}

// Eagerly load at module init. Reasonably small corpus so this is cheap.
const DOCS: IndexedDoc[] = loadDocs();
const AVG_DOC_LEN =
  DOCS.length === 0
    ? 0
    : DOCS.reduce((sum, d) => sum + d.length, 0) / DOCS.length;

const DOC_FREQ: Map<string, number> = (() => {
  const df = new Map<string, number>();
  for (const d of DOCS) {
    for (const term of d.termFreq.keys()) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  return df;
})();

// ---------- BM25 scoring ----------

const K1 = 1.5;
const B = 0.75;

function idf(term: string): number {
  const n = DOCS.length;
  const df = DOC_FREQ.get(term) ?? 0;
  // BM25 IDF with +1 smoothing to avoid negative scores on common terms.
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

// Title hits are a strong signal that a doc is on-topic; weight them.
const TITLE_BOOST = 1.5;

function bm25Score(queryTerms: string[], doc: IndexedDoc): number {
  if (AVG_DOC_LEN === 0) return 0;
  let score = 0;
  for (const term of queryTerms) {
    const tf = doc.termFreq.get(term) ?? 0;
    if (tf === 0) continue;
    const numerator = tf * (K1 + 1);
    const denominator =
      tf + K1 * (1 - B + B * (doc.length / AVG_DOC_LEN));
    let termScore = idf(term) * (numerator / denominator);
    if (doc.titleTokens.has(term)) termScore += TITLE_BOOST * idf(term);
    score += termScore;
  }
  return score;
}

// ---------- Snippet extraction ----------

const SNIPPET_RADIUS = 100; // ~200 chars total window

function bestSnippet(rawText: string, queryTerms: string[]): string {
  if (queryTerms.length === 0) {
    return rawText.slice(0, SNIPPET_RADIUS * 2).trim();
  }
  const lower = rawText.toLowerCase();
  // Collect all term positions.
  const positions: number[] = [];
  for (const term of queryTerms) {
    let start = 0;
    while (true) {
      const idx = lower.indexOf(term, start);
      if (idx === -1) break;
      positions.push(idx);
      start = idx + term.length;
    }
  }
  if (positions.length === 0) {
    return rawText.slice(0, SNIPPET_RADIUS * 2).trim();
  }
  positions.sort((a, b) => a - b);

  // Find the window of width ~2*radius with the most match positions.
  // `windowStart` is the left edge of the snippet window — i.e. the position
  // of the leftmost match included in the chosen window. The inner loop is
  // guaranteed to update this on i=0 (count >= 1), so the initial value is
  // effectively unused; we still set it defensively.
  const windowWidth = SNIPPET_RADIUS * 2;
  let windowStart = positions[0]!;
  let bestCount = 0;
  for (let i = 0; i < positions.length; i++) {
    const leftEdge = positions[i]!;
    let count = 0;
    for (let j = i; j < positions.length; j++) {
      if (positions[j]! - leftEdge <= windowWidth) count++;
      else break;
    }
    if (count > bestCount) {
      bestCount = count;
      // Anchor the window so its left edge sits on `leftEdge`. We previously
      // shifted by +halfWindow and then subtracted SNIPPET_RADIUS below; those
      // cancel out, so just assign `leftEdge` directly.
      windowStart = leftEdge;
    }
  }
  const start = Math.max(0, windowStart);
  const end = Math.min(rawText.length, start + windowWidth);
  let snippet = rawText.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < rawText.length) snippet = snippet + "...";
  // Normalize internal whitespace for readability.
  return snippet.replace(/\s+/g, " ");
}

// ---------- Public API ----------

export interface SearchOptions {
  topK?: number;
  filterSubclass?: VisaSubclassId;
}

/**
 * Keyword search over `data/docs/*.txt` using BM25.
 *
 * - Returns up to `topK` results (default 5), sorted by descending score.
 * - `filterSubclass` restricts the candidate set to docs that list that
 *   subclass in `relatedSubclasses` BEFORE ranking.
 * - Empty/whitespace-only queries return `[]` rather than crashing.
 */
export function searchDocs(
  query: string,
  options?: SearchOptions,
): DocSearchResult[] {
  const topK = options?.topK ?? 5;
  const filter = options?.filterSubclass;

  if (typeof query !== "string") return [];
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const candidates = filter
    ? DOCS.filter((d) => d.meta.relatedSubclasses.includes(filter))
    : DOCS;

  const scored: DocSearchResult[] = [];
  for (const doc of candidates) {
    const score = bm25Score(queryTerms, doc);
    if (score <= 0) continue;
    scored.push({
      docId: doc.meta.id,
      title: doc.meta.title,
      sourceUrl: doc.meta.sourceUrl,
      snippet: bestSnippet(doc.rawText, queryTerms),
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
