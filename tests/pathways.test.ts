import { describe, it, expect } from "vitest";
import { findPathways, pathwayEdges } from "@/lib/pathways";
import type { UserSituation } from "@/types";

function baseSituation(overrides: Partial<UserSituation> = {}): UserSituation {
  return {
    nationality: "United Kingdom",
    age: 28,
    currentLocation: "inside_australia",
    currentVisaSubclass: "500",
    occupationCodeOrName: "software engineer",
    englishLevel: "competent",
    highestQualification: "bachelor",
    australianStudyCompleted: false,
    yearsRelevantExperience: 2,
    hasEligibleEmployerSponsor: false,
    hasStateNomination: false,
    willingToLiveRegional: false,
    studyIntent: true,
    fundsBand: "20k_50k",
    goal: "pr",
    ...overrides,
  };
}

describe("pathway graph", () => {
  it("includes all required edges", () => {
    const required: Array<[string, string]> = [
      ["500", "485"],
      ["485", "482"],
      ["482", "186"],
      ["491", "191"], // explicit 491 -> 191 step per spec
      ["191", "PR"], // 191 is a PR stepping stone for 491 holders
      ["190", "PR"],
      ["189", "PR"],
      ["417", "500"],
      ["462", "500"],
      ["500", "482"],
    ];
    for (const [from, to] of required) {
      const found = pathwayEdges.some((e) => e.from === from && e.to === to);
      expect(found, `missing edge ${from} -> ${to}`).toBe(true);
    }
  });

  it("491 -> 191 edge exists explicitly and is distinct from 191 -> PR", () => {
    const e491to191 = pathwayEdges.find((e) => e.from === "491" && e.to === "191");
    expect(e491to191).toBeDefined();
    expect(e491to191!.conditions.length).toBeGreaterThan(0);
    expect(e491to191!.sources.length).toBeGreaterThan(0);

    const e191toPR = pathwayEdges.find((e) => e.from === "191" && e.to === "PR");
    expect(e191toPR).toBeDefined();
  });

  it("findPathways(situation, 'pr') from an eligible 491 holder yields 491 -> 191 -> PR", () => {
    const paths = findPathways(
      baseSituation({
        currentVisaSubclass: "491",
        hasStateNomination: true,
        willingToLiveRegional: true,
        goal: "pr",
      }),
      "pr",
    );
    expect(paths.length).toBeGreaterThan(0);
    const found = paths.some(
      (p) =>
        p.nodes[0] === "491" &&
        p.nodes.includes("191") &&
        p.nodes[p.nodes.length - 1] === "PR",
    );
    expect(found).toBe(true);
  });

  it("findPathways goal=pr from 500 yields the 500 -> 485 -> 482 -> 186 chain", () => {
    const paths = findPathways(baseSituation({ currentVisaSubclass: "500" }), "pr");
    expect(paths.length).toBeGreaterThan(0);
    const found = paths.some(
      (p) =>
        p.nodes[0] === "500" &&
        p.nodes.includes("485") &&
        p.nodes.includes("482") &&
        p.nodes.includes("186") &&
        p.nodes[p.nodes.length - 1] === "PR",
    );
    expect(found).toBe(true);
  });

  it("respects the 4-hop limit (paths have at most 4 edges)", () => {
    const paths = findPathways(baseSituation({ currentVisaSubclass: "500" }), "pr");
    for (const p of paths) {
      expect(p.edges.length).toBeLessThanOrEqual(4);
    }
  });

  it("417 -> 500 edge is reachable for goal=study from a 417 holder", () => {
    const paths = findPathways(
      baseSituation({ currentVisaSubclass: "417", goal: "study" }),
      "study",
    );
    expect(paths.length).toBeGreaterThan(0);
    const found = paths.some(
      (p) => p.nodes[0] === "417" && p.nodes.includes("500"),
    );
    expect(found).toBe(true);
  });

  it("returns an empty array when no path satisfies the goal", () => {
    // A 485 holder with goal 'temporary': 485 doesn't lead to 417/462/500
    // in our graph, so no path is found.
    const paths = findPathways(
      baseSituation({ currentVisaSubclass: "485", goal: "temporary" }),
      "temporary",
    );
    expect(Array.isArray(paths)).toBe(true);
    expect(paths.length).toBe(0);
  });

  it("each pathway has a non-empty summary and timeframe", () => {
    const paths = findPathways(baseSituation({ currentVisaSubclass: "500" }), "pr");
    for (const p of paths) {
      expect(p.summary.length).toBeGreaterThan(0);
      expect(p.totalIndicativeTimeframe.length).toBeGreaterThan(0);
      expect(p.nodes.length).toBe(p.edges.length + 1);
    }
  });

  it("returns valid pathways from a fallback entry when currentVisaSubclass is out-of-MVP", () => {
    // 457 is an old subclass not in our supported nine. findPathways should
    // ignore the unknown subclass and fall back to goal-based entry nodes
    // rather than crash.
    const paths = findPathways(
      baseSituation({ currentVisaSubclass: "457", goal: "pr" }),
      "pr",
    );
    expect(Array.isArray(paths)).toBe(true);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) {
      expect(p.nodes.length).toBe(p.edges.length + 1);
      expect(p.summary.length).toBeGreaterThan(0);
    }
  });

  it("sorts pathways by total indicative timeframe (shortest first)", () => {
    const paths = findPathways(baseSituation({ currentVisaSubclass: "500" }), "pr");
    const weights = paths.map((p) =>
      p.edges.reduce((acc, e) => {
        const m = e.indicativeTimeframe.match(/(\d+(?:\.\d+)?)/);
        return acc + (m ? parseFloat(m[1]) : 1);
      }, 0),
    );
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeGreaterThanOrEqual(weights[i - 1]);
    }
  });
});
