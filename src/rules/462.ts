import type {
  SubclassEvaluation,
  SubclassEvaluator,
  UserSituation,
  VisaSubclassRule,
} from "@/types";
import { LAST_CHECKED, QUAL_RANK, isWhv462Country } from "./_shared";

export const rule: VisaSubclassRule = {
  subclassId: "462",
  displayName: "Work and Holiday visa (subclass 462)",
  shortDescription:
    "Short-term visa for young adults from partner countries (with additional education and language requirements) to travel, work, and study in Australia for up to 12 months.",
  category: "mobility",
  temporaryOrPermanent: "temporary",
  keyRequirements: [
    "Hold a passport from an eligible 462 partner country",
    "Aged 18–30 inclusive at time of application (35 for select countries)",
    "Tertiary qualifications or completed at least two years of undergraduate study (most countries)",
    "Functional English",
    "Sufficient funds to support initial stay (around AUD 5,000)",
    "Letter of government support where required",
  ],
  simplifiedChecks: [
    "Passport from a simplified 462 partner country list",
    "Age within 18-30 inclusive (or 18-35 for some countries)",
    "Tertiary qualification at diploma level or higher",
    "Initial funds at least in the 5k-20k band",
  ],
  commonBlockers: [
    "Passport country not on the 462 partner list",
    "Aged over 30 (or 35 for select countries)",
    "No tertiary qualifications when required",
    "Insufficient English",
  ],
  sources: [
    {
      title: "Work and Holiday visa (subclass 462) — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-462",
      lastChecked: LAST_CHECKED,
    },
    {
      title: "Working Holiday Maker program — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/what-we-do/whm-program",
      lastChecked: LAST_CHECKED,
    },
  ],
  lastCheckedDate: LAST_CHECKED,
  caveat:
    "Rules are simplified for portfolio/demo use. The 462 has country-specific quotas, study requirements, and English requirements that vary.",
};

export const evaluator: SubclassEvaluator = (s: UserSituation): SubclassEvaluation => {
  const matched: string[] = [];
  const missing: string[] = [];
  const blockers: string[] = [];
  let baseScore = 28;

  if (isWhv462Country(s.nationality)) {
    matched.push("Passport from a 462 partner country");
    baseScore += 25;
  } else {
    blockers.push("Passport country not on the 462 partner list");
  }

  if (s.age >= 18 && s.age <= 30) {
    matched.push("Within the 18–30 age range");
    baseScore += 15;
  } else if (s.age >= 18 && s.age <= 35) {
    matched.push("Within extended age range (35) available for some 462 countries");
    baseScore += 8;
    missing.push("Confirm your country qualifies for the higher age cap");
  } else {
    blockers.push("Outside the 462 age range");
  }

  if (QUAL_RANK[s.highestQualification] >= QUAL_RANK.diploma) {
    matched.push("Tertiary study satisfies the 462 education requirement");
    baseScore += 10;
  } else {
    missing.push("Tertiary study (diploma or higher) is required for most 462 countries");
  }

  if (s.fundsBand === "20k_50k" || s.fundsBand === "over_50k" || s.fundsBand === "5k_20k") {
    matched.push("Sufficient initial funds for arrival");
    baseScore += 7;
  } else {
    missing.push("Around AUD 5,000 of initial funds at arrival");
  }

  let statusHint: SubclassEvaluation["statusHint"] = "potentially_eligible";
  if (blockers.length > 0) statusHint = "not_eligible";
  else if (matched.length >= 3 && missing.length === 0) statusHint = "likely_eligible";
  else if (matched.length === 0) statusHint = "insufficient_evidence";

  return {
    matched,
    missing,
    blockers,
    baseScore: Math.max(0, Math.min(100, baseScore)),
    statusHint,
  };
};
