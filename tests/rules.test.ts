import { describe, it, expect } from "vitest";
import { allRules, evaluators, rulesById } from "@/rules";
import type { UserSituation, VisaSubclassId } from "@/types";

const SUPPORTED: VisaSubclassId[] = [
  "189",
  "190",
  "491",
  "482",
  "186",
  "417",
  "462",
  "485",
  "500",
];

function baseSituation(overrides: Partial<UserSituation> = {}): UserSituation {
  return {
    nationality: "United Kingdom",
    age: 28,
    currentLocation: "outside_australia",
    currentVisaSubclass: undefined,
    occupationCodeOrName: "software engineer",
    englishLevel: "competent",
    highestQualification: "bachelor",
    australianStudyCompleted: false,
    yearsRelevantExperience: 3,
    hasEligibleEmployerSponsor: false,
    hasStateNomination: false,
    willingToLiveRegional: false,
    studyIntent: false,
    fundsBand: "20k_50k",
    goal: "pr",
    ...overrides,
  };
}

describe("rules dataset", () => {
  it("includes all 9 supported subclasses", () => {
    expect(allRules).toHaveLength(9);
    const ids = allRules.map((r) => r.subclassId).sort();
    expect(ids).toEqual([...SUPPORTED].sort());
  });

  it("every rule has non-empty sources, lastCheckedDate, and caveat", () => {
    for (const r of allRules) {
      expect(r.sources.length).toBeGreaterThan(0);
      for (const s of r.sources) {
        expect(s.url).toMatch(/^https:\/\/immi\.homeaffairs\.gov\.au\//);
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      expect(r.lastCheckedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.caveat.length).toBeGreaterThan(10);
      expect(r.keyRequirements.length).toBeGreaterThan(0);
      expect(r.commonBlockers.length).toBeGreaterThan(0);
    }
  });

  it("every rule has a non-empty simplifiedChecks array of strings", () => {
    for (const r of allRules) {
      expect(Array.isArray(r.simplifiedChecks)).toBe(true);
      expect(r.simplifiedChecks.length).toBeGreaterThan(0);
      for (const c of r.simplifiedChecks) {
        expect(typeof c).toBe("string");
        expect(c.length).toBeGreaterThan(0);
      }
    }
  });

  it("evaluators are pure — same input yields identical output", () => {
    const inputs: UserSituation[] = [
      baseSituation(),
      baseSituation({ age: 50, englishLevel: "functional" }),
      baseSituation({ nationality: "Brazil", goal: "temporary" }),
      baseSituation({ australianStudyCompleted: true, age: 25, goal: "study" }),
      baseSituation({ hasEligibleEmployerSponsor: true, goal: "work" }),
    ];

    for (const id of SUPPORTED) {
      const evalFn = evaluators[id];
      for (const input of inputs) {
        const a = evalFn(input);
        const b = evalFn(input);
        expect(a).toEqual(b);
      }
    }
  });

  it("rulesById indexes every subclass", () => {
    for (const id of SUPPORTED) {
      expect(rulesById[id].subclassId).toBe(id);
    }
  });
});
