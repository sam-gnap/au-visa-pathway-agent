import { describe, expect, it } from "vitest";
import {
  isSupportedOccupation,
  validateSituation,
  supportedOccupations,
} from "@/lib/validation";
import type { UserSituation } from "@/types";

function baseValid(): UserSituation {
  return {
    nationality: "United Kingdom",
    age: 30,
    currentLocation: "outside_australia",
    occupationCodeOrName: "Software Engineer",
    englishLevel: "proficient",
    highestQualification: "bachelor",
    australianStudyCompleted: false,
    yearsRelevantExperience: 5,
    hasEligibleEmployerSponsor: false,
    hasStateNomination: false,
    willingToLiveRegional: true,
    studyIntent: false,
    fundsBand: "20k_50k",
    goal: "pr",
  };
}

describe("validateSituation", () => {
  it("accepts a fully valid situation", () => {
    const result = validateSituation(baseValid());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nationality).toBe("United Kingdom");
      expect(result.value.age).toBe(30);
    }
  });

  it("reports missing required fields with correct field name", () => {
    const { age, ...rest } = baseValid();
    const result = validateSituation(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain("age");
    }
  });

  it("reports missing nationality with correct field name", () => {
    const input = { ...baseValid(), nationality: "" };
    const result = validateSituation(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "nationality")).toBe(true);
    }
  });

  it("rejects age 15 as out of range", () => {
    const result = validateSituation({ ...baseValid(), age: 15 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const ageErr = result.errors.find((e) => e.field === "age");
      expect(ageErr).toBeDefined();
      expect(ageErr!.message).toMatch(/16|100/);
    }
  });

  it("rejects age 101 as out of range", () => {
    const result = validateSituation({ ...baseValid(), age: 101 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "age")).toBe(true);
    }
  });

  it("rejects bad enum value for englishLevel", () => {
    const result = validateSituation({
      ...baseValid(),
      englishLevel: "fluent" as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "englishLevel")).toBe(true);
    }
  });

  it("rejects bad enum value for goal", () => {
    const result = validateSituation({
      ...baseValid(),
      goal: "vacation" as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "goal")).toBe(true);
    }
  });

  it("rejects negative yearsRelevantExperience", () => {
    const result = validateSituation({
      ...baseValid(),
      yearsRelevantExperience: -2,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => e.field === "yearsRelevantExperience"),
      ).toBe(true);
    }
  });

  it("rejects non-object input", () => {
    const result = validateSituation("not an object");
    expect(result.ok).toBe(false);
  });

  it("rejects wrong boolean type", () => {
    const result = validateSituation({
      ...baseValid(),
      studyIntent: "yes" as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.field === "studyIntent")).toBe(true);
    }
  });
});

describe("isSupportedOccupation", () => {
  it("returns true for ANZSCO code 261313", () => {
    expect(isSupportedOccupation("261313")).toBe(true);
  });

  it("returns true for 'Software Engineer' (exact)", () => {
    expect(isSupportedOccupation("Software Engineer")).toBe(true);
  });

  it("returns true for 'software engineer' (case-insensitive)", () => {
    expect(isSupportedOccupation("software engineer")).toBe(true);
  });

  it("returns true when occupation name is embedded in user input", () => {
    expect(isSupportedOccupation("Senior Software Engineer")).toBe(true);
  });

  it("returns false for 'Astronaut'", () => {
    expect(isSupportedOccupation("Astronaut")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSupportedOccupation("")).toBe(false);
  });

  it("exposes a non-empty supportedOccupations list", () => {
    expect(supportedOccupations.length).toBeGreaterThanOrEqual(15);
  });
});

describe("dataset-backed occupation support", () => {
  it("recognises occupations from data/occupations.json, not just a hand-coded subset", () => {
    expect(isSupportedOccupation("Data Scientist")).toBe(true);
    expect(isSupportedOccupation("224115")).toBe(true);
    expect(isSupportedOccupation("Florist")).toBe(true);
  });
});

describe("optional enrichment fields validation", () => {
  const base = {
    nationality: "United Kingdom",
    age: 28,
    currentLocation: "outside_australia",
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
  };

  it("accepts valid optional fields and passes them through", () => {
    const res = validateSituation({
      ...base,
      skillsAssessment: "yes",
      partnerStatus: "single",
      salaryBand: "76k_to_141k",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.skillsAssessment).toBe("yes");
      expect(res.value.partnerStatus).toBe("single");
      expect(res.value.salaryBand).toBe("76k_to_141k");
    }
  });

  it("accepts their absence", () => {
    const res = validateSituation(base);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.skillsAssessment).toBeUndefined();
    }
  });

  it("rejects invalid enum values when present", () => {
    const res = validateSituation({ ...base, salaryBand: "banana" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.field === "salaryBand")).toBe(true);
    }
  });
});
