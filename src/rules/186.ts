import type {
  SubclassEvaluation,
  SubclassEvaluator,
  UserSituation,
  VisaSubclassRule,
} from "@/types";
import {
  ENGLISH_RANK,
  LAST_CHECKED,
  occupationOnLists,
  applySkillsAssessment,
} from "./_shared";

export const rule: VisaSubclassRule = {
  subclassId: "186",
  displayName: "Employer Nomination Scheme (subclass 186)",
  shortDescription:
    "Permanent employer-sponsored visa. Often used after a 482 to transition skilled workers to permanent residence.",
  category: "sponsored",
  temporaryOrPermanent: "permanent",
  keyRequirements: [
    "Nomination by an approved Australian employer",
    "Nominated occupation on the relevant skilled occupation list",
    "Usually under 45 years of age (some exemptions apply)",
    "At least Competent English",
    "Suitable skills assessment where required",
    "Relevant work experience (usually 3 years)",
  ],
  simplifiedChecks: [
    "Age strictly under 45",
    "Has an eligible Australian employer nominator",
    "English at competent or above",
    "Occupation present on simplified 186-eligible occupation list",
    "3+ years of relevant work experience",
  ],
  commonBlockers: [
    "Aged 45 or over without an exemption",
    "No employer nomination",
    "Occupation not on a 186-eligible list",
    "Insufficient English (below Competent)",
  ],
  sources: [
    {
      title: "Employer Nomination Scheme visa (subclass 186) — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186",
      lastChecked: LAST_CHECKED,
    },
    {
      title: "Approved sponsors and nominations — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/employing-and-sponsoring-someone/sponsoring-workers/nominating-a-position",
      lastChecked: LAST_CHECKED,
    },
  ],
  lastCheckedDate: LAST_CHECKED,
  caveat:
    "Rules are simplified for portfolio/demo use. The 186 has Direct Entry, Temporary Residence Transition, and Labour Agreement streams with different requirements and age exemptions.",
};

export const evaluator: SubclassEvaluator = (s: UserSituation): SubclassEvaluation => {
  const matched: string[] = [];
  const missing: string[] = [];
  const blockers: string[] = [];
  let baseScore = 30;

  if (s.age < 45) {
    matched.push("Under the 45 age cap");
    baseScore += 10;
  } else {
    blockers.push("Age 45 or over — outside 186 age cap (limited exemptions apply)");
  }

  if (s.hasEligibleEmployerSponsor) {
    matched.push("Has an eligible Australian employer nominator");
    baseScore += 25;
  } else {
    blockers.push("No employer nominator — 186 cannot proceed");
  }

  if (ENGLISH_RANK[s.englishLevel] >= ENGLISH_RANK.competent) {
    matched.push("At least Competent English");
    baseScore += 10;
  } else {
    missing.push("Competent English or higher");
  }

  if (occupationOnLists(s.occupationCodeOrName, ["CSOL"])) {
    matched.push("Occupation likely on a 186-eligible list");
    baseScore += 15;
  } else if (
    !s.occupationCodeOrName ||
    s.occupationCodeOrName.trim().toLowerCase() === "unknown"
  ) {
    missing.push("A nominated occupation on a 186-eligible list");
  } else {
    blockers.push("Nominated occupation not on a supported 186 list");
  }

  if (s.yearsRelevantExperience >= 3) {
    matched.push("3+ years relevant work experience");
    baseScore += 10;
  } else {
    missing.push("Around 3 years of relevant work experience");
  }

  baseScore += applySkillsAssessment(s, matched, missing);

  let statusHint: SubclassEvaluation["statusHint"] = "potentially_eligible";
  if (blockers.length > 0) statusHint = "not_eligible";
  else if (matched.length >= 4 && missing.length === 0) statusHint = "likely_eligible";
  else if (matched.length <= 1) statusHint = "insufficient_evidence";

  return {
    matched,
    missing,
    blockers,
    baseScore: Math.max(0, Math.min(100, baseScore)),
    statusHint,
  };
};
