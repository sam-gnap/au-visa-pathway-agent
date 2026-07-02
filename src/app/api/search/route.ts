import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import type { DocMetadata, DocSearchResult, VisaSubclassId } from "@/types";
import { searchDocs } from "@/lib/search";

const VALID_SUBCLASSES: ReadonlySet<VisaSubclassId> = new Set([
  "189",
  "190",
  "491",
  "482",
  "186",
  "417",
  "462",
  "485",
  "500",
]);

const MAX_TOPK = 5;
const DEFAULT_TOPK = 3;
const SNIPPET_LEN = 200;

let fallbackCache: Map<VisaSubclassId, DocSearchResult[]> | null = null;

/**
 * Build a "no-query" fallback list of docs for each subclass: docs whose
 * `relatedSubclasses` includes that subclass, sorted alphabetically by title.
 * This avoids returning [] when the caller has no specific query.
 */
function buildFallbackIndex(): Map<VisaSubclassId, DocSearchResult[]> {
  const map = new Map<VisaSubclassId, DocSearchResult[]>();
  const docsDir = path.join(process.cwd(), "data", "docs");

  let entries: string[] = [];
  try {
    entries = fs.readdirSync(docsDir);
  } catch {
    return map;
  }

  const docs: { meta: DocMetadata; rawText: string }[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".meta.json")) continue;
    const base = entry.slice(0, -".meta.json".length);
    const metaPath = path.join(docsDir, entry);
    const txtPath = path.join(docsDir, `${base}.txt`);
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as DocMetadata;
      const rawText = fs.readFileSync(txtPath, "utf8");
      docs.push({ meta, rawText });
    } catch {
      continue;
    }
  }

  for (const id of VALID_SUBCLASSES) {
    const matched = docs
      .filter((d) => d.meta.relatedSubclasses.includes(id))
      .sort((a, b) => a.meta.title.localeCompare(b.meta.title))
      .map<DocSearchResult>((d) => ({
        docId: d.meta.id,
        title: d.meta.title,
        sourceUrl: d.meta.sourceUrl,
        snippet: d.rawText.replace(/\s+/g, " ").trim().slice(0, SNIPPET_LEN) +
          (d.rawText.length > SNIPPET_LEN ? "..." : ""),
        score: 0,
      }));
    map.set(id, matched);
  }
  return map;
}

function getFallback(subclass: VisaSubclassId, topK: number): DocSearchResult[] {
  if (!fallbackCache) fallbackCache = buildFallbackIndex();
  const list = fallbackCache.get(subclass) ?? [];
  return list.slice(0, topK);
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subclassRaw = searchParams.get("subclass");
  const query = searchParams.get("query") ?? "";
  const topKRaw = searchParams.get("topK");

  if (!subclassRaw || !VALID_SUBCLASSES.has(subclassRaw as VisaSubclassId)) {
    return NextResponse.json(
      { error: "Invalid or missing 'subclass' parameter." },
      { status: 400 },
    );
  }
  const subclass = subclassRaw as VisaSubclassId;

  let topK = DEFAULT_TOPK;
  if (topKRaw !== null) {
    const parsed = Number(topKRaw);
    if (Number.isFinite(parsed) && parsed > 0) {
      topK = Math.min(MAX_TOPK, Math.floor(parsed));
    }
  }

  const trimmed = query.trim();
  let results: DocSearchResult[];
  if (trimmed.length === 0) {
    results = getFallback(subclass, topK);
  } else {
    results = searchDocs(trimmed, { filterSubclass: subclass, topK });
    // If BM25 returns nothing for the query, fall back to alphabetical
    // related-docs list so the UI never shows an empty "Learn more" panel
    // when curated docs do exist for the subclass.
    if (results.length === 0) {
      results = getFallback(subclass, topK);
    }
  }

  return NextResponse.json(results);
}
