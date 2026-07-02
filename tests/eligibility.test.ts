import { describe, it, expect } from "vitest";
import { checkEligibility } from "@/lib/eligibility";
import type { UserSituation, VisaSubclassId } from "@/types";

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

function byId(verdicts: ReturnType<typeof checkEligibility>) {
  const map = new Map<VisaSubclassId, (typeof verdicts)[number]>();
  for (const v of verdicts) map.set(v.subclassId, v);
  return map;
}

describe("checkEligibility", () => {
  it("always returns 9 verdicts", () => {
    const v = checkEligibility(baseSituation());
    expect(v).toHaveLength(9);
    const ids = v.map((x) => x.subclassId).sort();
    expect(ids).toEqual(["186", "189", "190", "417", "462", "482", "485", "491", "500"]);
  });

  it("blocked subclasses rank lower than non-blocked subclasses", () => {
    const v = checkEligibility(baseSituation());
    let seenBlocked = false;
    for (const verdict of v) {
      if (verdict.blockers.length > 0) seenBlocked = true;
      else if (seenBlocked) {
        throw new Error(
          `Unblocked ${verdict.subclassId} ranked after a blocked subclass`,
        );
      }
    }
    expect(true).toBe(true);
  });

  it("favors 189/190/491/186 when goal is PR (relative to a non-PR goal)", () => {
    const pr = checkEligibility(baseSituation({ goal: "pr" }));
    const temp = checkEligibility(
      baseSituation({ goal: "temporary", nationality: "United Kingdom" }),
    );

    const prMap = byId(pr);
    const tempMap = byId(temp);

    // 189 should score at least as well under 'pr' as under 'temporary'.
    expect(prMap.get("189")!.score).toBeGreaterThan(tempMap.get("189")!.score);
    expect(prMap.get("190")!.score).toBeGreaterThan(tempMap.get("190")!.score);
  });

  it("417 returns not_eligible for non-partner nationalities", () => {
    const v = checkEligibility(baseSituation({ nationality: "Brazil" }));
    const m = byId(v);
    const v417 = m.get("417")!;
    expect(["not_eligible", "insufficient_evidence"]).toContain(v417.status);
    expect(v417.blockers.length).toBeGreaterThan(0);
  });

  it("482 is not_eligible without an employer sponsor", () => {
    const v = checkEligibility(baseSituation({ hasEligibleEmployerSponsor: false }));
    const m = byId(v);
    const v482 = m.get("482")!;
    expect(v482.status).toBe("not_eligible");
    expect(v482.blockers.some((b) => /sponsor/i.test(b))).toBe(true);
  });

  it("485 is not_eligible without Australian study", () => {
    const v = checkEligibility(baseSituation({ australianStudyCompleted: false }));
    const m = byId(v);
    const v485 = m.get("485")!;
    expect(v485.status).toBe("not_eligible");
    expect(v485.blockers.some((b) => /CRICOS|study/i.test(b))).toBe(true);
  });

  it("each verdict carries summary, nextSteps and sources", () => {
    const v = checkEligibility(baseSituation());
    for (const verdict of v) {
      expect(verdict.summary.length).toBeGreaterThan(0);
      expect(verdict.nextSteps.length).toBeGreaterThanOrEqual(1);
      expect(verdict.nextSteps.length).toBeLessThanOrEqual(5);
      expect(verdict.sources.length).toBeGreaterThan(0);
    }
  });

  it("study goal boosts subclass 500", () => {
    const studyGoal = checkEligibility(
      baseSituation({ goal: "study", studyIntent: true }),
    );
    const prGoal = checkEligibility(baseSituation({ goal: "pr", studyIntent: true }));
    expect(byId(studyGoal).get("500")!.score).toBeGreaterThan(
      byId(prGoal).get("500")!.score,
    );
  });

  it("returns 9 sorted verdicts without crashing when every subclass is blocked", () => {
    // 70-year-old, no English, no qualifications, no occupation, no sponsor,
    // no nomination, no Australian study, no regional willingness, no funds,
    // non-partner nationality.
    const allBlocked = checkEligibility(
      baseSituation({
        nationality: "Atlantis",
        age: 70,
        englishLevel: "none",
        highestQualification: "none",
        occupationCodeOrName: "unknown",
        australianStudyCompleted: false,
        yearsRelevantExperience: 0,
        hasEligibleEmployerSponsor: false,
        hasStateNomination: false,
        willingToLiveRegional: false,
        studyIntent: false,
        fundsBand: "under_5k",
        goal: "pr",
      }),
    );
    expect(allBlocked).toHaveLength(9);
    // Verdicts must still be sorted by the blocked-vs-unblocked then score
    // ordering, and every verdict object must be structurally well-formed.
    for (let i = 1; i < allBlocked.length; i++) {
      const prev = allBlocked[i - 1]!;
      const cur = allBlocked[i]!;
      const prevBlocked = prev.blockers.length > 0 ? 1 : 0;
      const curBlocked = cur.blockers.length > 0 ? 1 : 0;
      if (prevBlocked !== curBlocked) {
        expect(prevBlocked).toBeLessThanOrEqual(curBlocked);
      } else {
        expect(prev.score).toBeGreaterThanOrEqual(cur.score);
      }
    }
    for (const verdict of allBlocked) {
      expect(verdict.summary.length).toBeGreaterThan(0);
      expect(Array.isArray(verdict.matchedCriteria)).toBe(true);
      expect(Array.isArray(verdict.missingCriteria)).toBe(true);
      expect(Array.isArray(verdict.blockers)).toBe(true);
      expect(verdict.sources.length).toBeGreaterThan(0);
    }
  });

  it("491 family-sponsored stream is not blocked solely on missing state nomination when willing to live regional", () => {
    const v = checkEligibility(
      baseSituation({
        hasStateNomination: false,
        willingToLiveRegional: true,
      }),
    );
    const v491 = byId(v).get("491")!;
    // No state nomination + willing-regional should not produce a blocker.
    expect(v491.blockers).toHaveLength(0);
    // The nomination is still a missing requirement, not a hard blocker.
    expect(
      v491.missingCriteria.some((m) => /nomination|family sponsor/i.test(m)),
    ).toBe(true);
    expect(["potentially_eligible", "likely_eligible", "insufficient_evidence"]).toContain(
      v491.status,
    );
  });
});

describe("per-visa occupation lists", () => {
  it("an STSOL-only occupation (Florist) blocks 189 but not 190", () => {
    const v = byId(
      checkEligibility(baseSituation({ occupationCodeOrName: "Florist" })),
    );
    expect(v.get("189")!.blockers.length).toBeGreaterThan(0);
    expect(v.get("189")!.status).toBe("not_eligible");
    expect(v.get("190")!.blockers).toHaveLength(0);
  });
});

describe("189 competitiveness dampener", () => {
  it("scores a marginal points profile below a strong one, beyond the raw criteria delta", () => {
    // Marginal: ~65 estimated points. Strong: 85+ (younger band irrelevant;
    // superior English + inside-AU experience push it over the cutoff).
    const marginal = byId(checkEligibility(baseSituation()));
    const strong = byId(
      checkEligibility(
        baseSituation({
          age: 30,
          englishLevel: "superior",
          highestQualification: "masters",
          currentLocation: "inside_australia",
          yearsRelevantExperience: 8,
          australianStudyCompleted: true,
        }),
      ),
    );
    expect(strong.get("189")!.score).toBeGreaterThan(marginal.get("189")!.score);
    expect(
      marginal.get("189")!.missingCriteria.join(" "),
    ).toMatch(/85\+/);
  });

  it("does not rank 189 first for a regional-willing tradesperson with marginal points", () => {
    const verdicts = checkEligibility(
      baseSituation({
        nationality: "Ireland",
        age: 30,
        occupationCodeOrName: "Electrician (General)",
        englishLevel: "superior",
        highestQualification: "certificate",
        yearsRelevantExperience: 8,
        willingToLiveRegional: true,
        goal: "pr",
      }),
    );
    expect(verdicts[0].subclassId).not.toBe("189");
  });
});

describe("optional enrichment fields", () => {
  it("skills assessment 'yes' scores higher than 'no' and 'no' surfaces a missing criterion", () => {
    const withSA = byId(
      checkEligibility(baseSituation({ skillsAssessment: "yes" })),
    );
    const withoutSA = byId(
      checkEligibility(baseSituation({ skillsAssessment: "no" })),
    );
    expect(withSA.get("189")!.score).toBeGreaterThan(withoutSA.get("189")!.score);
    expect(
      withoutSA.get("189")!.missingCriteria.some((m) => /skills assessment/i.test(m)),
    ).toBe(true);
  });

  it("salary below the CSIT hard-blocks 482", () => {
    const v = byId(
      checkEligibility(
        baseSituation({
          hasEligibleEmployerSponsor: true,
          salaryBand: "under_76k",
          goal: "work",
        }),
      ),
    );
    expect(v.get("482")!.status).toBe("not_eligible");
    expect(
      v.get("482")!.blockers.some((b) => /Income Threshold/i.test(b)),
    ).toBe(true);
  });

  it("unknown salary adds a missing criterion for 482 instead of blocking", () => {
    const v = byId(
      checkEligibility(
        baseSituation({
          hasEligibleEmployerSponsor: true,
          salaryBand: "unknown",
          goal: "work",
        }),
      ),
    );
    expect(v.get("482")!.blockers).toHaveLength(0);
    expect(
      v.get("482")!.missingCriteria.some((m) => /Income Threshold/i.test(m)),
    ).toBe(true);
  });

  it("omitting the optional fields leaves verdicts unchanged", () => {
    const a = checkEligibility(baseSituation());
    const b = checkEligibility(baseSituation({ skillsAssessment: undefined }));
    expect(a.map((v) => `${v.subclassId}:${v.score}:${v.status}`)).toEqual(
      b.map((v) => `${v.subclassId}:${v.score}:${v.status}`),
    );
  });
});

describe("485 recency priority", () => {
  it("ranks the time-limited 485 above a marginal 189 for a fresh graduate on a 500", () => {
    const verdicts = checkEligibility(
      baseSituation({
        nationality: "South Korea",
        age: 25,
        currentLocation: "inside_australia",
        currentVisaSubclass: "500",
        occupationCodeOrName: "ICT Business Analyst",
        englishLevel: "proficient",
        australianStudyCompleted: true,
        yearsRelevantExperience: 1,
        partnerStatus: "single",
        skillsAssessment: "in_progress",
        goal: "pr",
      }),
    );
    const rank485 = verdicts.findIndex((v) => v.subclassId === "485");
    const rank189 = verdicts.findIndex((v) => v.subclassId === "189");
    expect(rank485).toBeLessThan(rank189);
  });
});

describe("417 age-35 cap (1 Jul 2026, LIN 26/048)", () => {
  it("grants the higher 35 cap to a 33-year-old German (added 2026-07-02)", () => {
    const v = byId(checkEligibility(baseSituation({ nationality: "Germany", age: 33 })));
    const whv = v.get("417")!;
    expect(whv.blockers).toHaveLength(0);
    expect(whv.matchedCriteria.some((m) => m.includes("35 age cap"))).toBe(true);
  });

  it("still caps a 33-year-old Dutch applicant at 30 (no higher-cap agreement)", () => {
    const v = byId(checkEligibility(baseSituation({ nationality: "Netherlands", age: 33 })));
    const whv = v.get("417")!;
    expect(whv.matchedCriteria.some((m) => m.includes("35 age cap"))).toBe(false);
  });
});
