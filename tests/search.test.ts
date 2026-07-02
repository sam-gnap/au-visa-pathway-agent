import { describe, expect, it } from "vitest";
import { searchDocs } from "@/lib/search";

describe("searchDocs", () => {
  it("ranks regional-australia.txt top for 'regional'", () => {
    const results = searchDocs("regional");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.docId).toBe("regional-australia");
  });

  it("ranks points-test.txt top for 'points test'", () => {
    const results = searchDocs("points test");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.docId).toBe("points-test");
  });

  it("filters by subclass 417", () => {
    const results = searchDocs("visa", { filterSubclass: "417" });
    expect(results.length).toBeGreaterThan(0);
    // Only docs whose metadata relates them to 417.
    const relatedTo417 = ["working-holiday", "common-pr-routes"];
    for (const r of results) {
      expect(relatedTo417).toContain(r.docId);
    }
  });

  it("returns [] for an empty query", () => {
    expect(searchDocs("")).toEqual([]);
    expect(searchDocs("   ")).toEqual([]);
  });

  it("returns [] for a whitespace/stopword-only query", () => {
    // 'the and of' are all stopwords, should tokenize to nothing.
    expect(searchDocs("the and of")).toEqual([]);
  });

  it("provides a non-empty snippet on any match", () => {
    const results = searchDocs("student visa");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.snippet.length).toBeGreaterThan(0);
    }
  });

  it("respects topK", () => {
    const results = searchDocs("visa", { topK: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });
});
