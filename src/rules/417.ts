import type {
  SubclassEvaluation,
  SubclassEvaluator,
  UserSituation,
  VisaSubclassRule,
} from "@/types";
import { has417HigherAgeCap, isWhv417Country } from "./_shared";

// 417 rule re-verified 2026-07-02 for the 1 Jul 2026 age-cap change
// (Cyprus, Finland, Germany, South Korea → 35; LIN 26/048). Kept local
// rather than bumping the shared LAST_CHECKED, which would imply every
// subclass was re-checked on this date.
const CHECKED_417 = "2026-07-02";

export const rule: VisaSubclassRule = {
  subclassId: "417",
  displayName: "Working Holiday visa (subclass 417)",
  shortDescription:
    "Short-term visa for young adults from partner countries to travel, work, and study in Australia for up to 12 months (extendable).",
  category: "mobility",
  temporaryOrPermanent: "temporary",
  keyRequirements: [
    "Hold a passport from an eligible 417 partner country",
    "Aged 18–30 inclusive at time of application (35 for some countries)",
    "Sufficient funds to support initial stay (around AUD 5,000)",
    "No accompanying dependent children",
    "Have not previously held a 417 unless eligible for an extension",
  ],
  simplifiedChecks: [
    "Passport from a simplified 417 partner country list",
    "Age within 18-30 inclusive (or 18-35 for some countries)",
    "Initial funds at least in the 5k-20k band",
  ],
  commonBlockers: [
    "Passport country not on the 417 partner list",
    "Aged over 30 (or 35 for select countries)",
    "Insufficient initial funds",
  ],
  sources: [
    {
      title: "Working Holiday visa (subclass 417) — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417",
      lastChecked: CHECKED_417,
    },
    {
      title: "Working Holiday Maker program — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/what-we-do/whm-program",
      lastChecked: CHECKED_417,
    },
  ],
  lastCheckedDate: CHECKED_417,
  caveat:
    "Rules are simplified for portfolio/demo use. Partner country list and age caps are determined by bilateral agreements and change. Some countries have higher age limits (e.g. 35).",
};

export const evaluator: SubclassEvaluator = (s: UserSituation): SubclassEvaluation => {
  const matched: string[] = [];
  const missing: string[] = [];
  const blockers: string[] = [];
  let baseScore = 30;

  if (isWhv417Country(s.nationality)) {
    matched.push("Passport from a 417 partner country");
    baseScore += 25;
  } else {
    blockers.push("Passport country not on the 417 partner list");
  }

  if (s.age >= 18 && s.age <= 30) {
    matched.push("Within the 18–30 age range");
    baseScore += 20;
  } else if (s.age >= 31 && s.age <= 35) {
    if (has417HigherAgeCap(s.nationality)) {
      matched.push(
        `${s.nationality} qualifies for the higher 35 age cap (FTA / bilateral)`,
      );
      baseScore += 15;
    } else if (isWhv417Country(s.nationality)) {
      missing.push(
        "Your country grants the standard 30 cap, not the higher 35 cap — usually a blocker at this age",
      );
      baseScore += 2;
    } else {
      missing.push("Confirm your country qualifies for the higher 35 age cap");
      baseScore += 5;
    }
  } else {
    blockers.push("Outside the 417 age range");
  }

  if (s.fundsBand === "20k_50k" || s.fundsBand === "over_50k" || s.fundsBand === "5k_20k") {
    matched.push("Sufficient initial funds for arrival");
    baseScore += 10;
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
