import type {
  SubclassEvaluation,
  SubclassEvaluator,
  UserSituation,
  VisaSubclassRule,
} from "@/types";
import {
  ENGLISH_RANK,
  LAST_CHECKED,
  occupationLooksEligible,
} from "./_shared";

export const rule: VisaSubclassRule = {
  subclassId: "482",
  displayName: "Skills in Demand visa (subclass 482)",
  shortDescription:
    "Employer-sponsored temporary work visa (formerly TSS) for occupations on the relevant skilled lists, with a clear pathway to permanent residence in some streams.",
  category: "sponsored",
  temporaryOrPermanent: "temporary",
  keyRequirements: [
    "Sponsorship by an approved Australian employer",
    "Nominated occupation on the relevant skilled occupation list",
    "Suitable skills assessment where required",
    "Demonstrated relevant work experience (typically 2+ years)",
    "Required English level (usually Vocational or higher)",
    "Genuine position with the sponsoring employer",
  ],
  simplifiedChecks: [
    "Has an eligible Australian employer sponsor",
    "Occupation present on simplified 482-eligible occupation list",
    "English at vocational or above",
    "2+ years of relevant work experience",
    "Age under 45 (informs later PR transition options)",
  ],
  commonBlockers: [
    "No eligible employer sponsor",
    "Occupation not on a 482-eligible list",
    "Insufficient relevant work experience",
    "Insufficient English",
  ],
  sources: [
    {
      title: "Skills in Demand visa (subclass 482) — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482",
      lastChecked: LAST_CHECKED,
    },
    {
      title: "Standard Business Sponsorship — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/employing-and-sponsoring-someone/sponsoring-workers/learn-about-sponsoring",
      lastChecked: LAST_CHECKED,
    },
  ],
  lastCheckedDate: LAST_CHECKED,
  caveat:
    "Rules are simplified for portfolio/demo use. The 482 has multiple streams (Specialist Skills, Core Skills, Essential Skills) with different salary thresholds, occupation lists, and PR pathways.",
};

export const evaluator: SubclassEvaluator = (s: UserSituation): SubclassEvaluation => {
  const matched: string[] = [];
  const missing: string[] = [];
  const blockers: string[] = [];
  let baseScore = 30;

  if (s.hasEligibleEmployerSponsor) {
    matched.push("Has an eligible Australian employer sponsor");
    baseScore += 25;
  } else {
    blockers.push("No eligible employer sponsor — 482 cannot proceed");
  }

  if (occupationLooksEligible(s.occupationCodeOrName)) {
    matched.push("Occupation likely on a 482-eligible list");
    baseScore += 15;
  } else if (
    !s.occupationCodeOrName ||
    s.occupationCodeOrName.trim().toLowerCase() === "unknown"
  ) {
    missing.push("A nominated occupation on a 482-eligible skilled list");
  } else {
    blockers.push("Nominated occupation not on a supported 482 list");
  }

  if (ENGLISH_RANK[s.englishLevel] >= ENGLISH_RANK.vocational) {
    matched.push("Meets at least Vocational English");
    baseScore += 10;
  } else {
    missing.push("Vocational English or higher");
  }

  if (s.yearsRelevantExperience >= 2) {
    matched.push("2+ years of relevant work experience");
    baseScore += 10;
  } else {
    missing.push("At least 2 years of relevant work experience");
  }

  if (s.age < 45) {
    matched.push("Under 45 (improves long-term PR transition options)");
    baseScore += 5;
  } else {
    missing.push("Age under 45 helps with later PR transition (e.g. 186)");
  }

  let statusHint: SubclassEvaluation["statusHint"] = "potentially_eligible";
  if (blockers.length > 0) statusHint = "not_eligible";
  else if (s.hasEligibleEmployerSponsor && matched.length >= 3 && missing.length === 0)
    statusHint = "likely_eligible";
  else if (matched.length <= 1) statusHint = "insufficient_evidence";

  return {
    matched,
    missing,
    blockers,
    baseScore: Math.max(0, Math.min(100, baseScore)),
    statusHint,
  };
};
