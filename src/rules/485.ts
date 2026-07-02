import type {
  SubclassEvaluation,
  SubclassEvaluator,
  UserSituation,
  VisaSubclassRule,
} from "@/types";
import { ENGLISH_RANK, LAST_CHECKED, QUAL_RANK } from "./_shared";

export const rule: VisaSubclassRule = {
  subclassId: "485",
  displayName: "Temporary Graduate visa (subclass 485)",
  shortDescription:
    "Post-study work visa for recent international graduates of Australian institutions, allowing temporary work and stay after course completion.",
  category: "study",
  temporaryOrPermanent: "temporary",
  keyRequirements: [
    "Recently completed a CRICOS-registered Australian course (typically within 6 months)",
    "Held a valid student visa during study",
    "Under 35 years of age at time of application (some exemptions for masters/PhD)",
    "At least Competent English",
    "Hold required health insurance",
  ],
  simplifiedChecks: [
    "Has completed eligible Australian study",
    "Age strictly under 35",
    "English at competent or above",
    "Qualification at diploma level or higher",
  ],
  commonBlockers: [
    "No completed Australian study",
    "Aged 35 or over without an exemption",
    "Insufficient English (below Competent)",
    "Course not on CRICOS or below the minimum duration",
  ],
  sources: [
    {
      title: "Temporary Graduate visa (subclass 485) — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485",
      lastChecked: LAST_CHECKED,
    },
    {
      title: "Post-Higher Education Work stream — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485/post-higher-education-work",
      lastChecked: LAST_CHECKED,
    },
  ],
  lastCheckedDate: LAST_CHECKED,
  caveat:
    "Rules are simplified for portfolio/demo use. The 485 has Post-Vocational Education Work and Post-Higher Education Work streams with different durations and field-of-study rules.",
};

export const evaluator: SubclassEvaluator = (s: UserSituation): SubclassEvaluation => {
  const matched: string[] = [];
  const missing: string[] = [];
  const blockers: string[] = [];
  let baseScore = 30;

  if (s.australianStudyCompleted) {
    matched.push("Has completed eligible Australian study");
    baseScore += 25;
  } else {
    blockers.push("485 requires a recently completed CRICOS Australian course");
  }

  if (s.age < 35) {
    matched.push("Under the 35 age cap");
    baseScore += 15;
  } else {
    blockers.push("Aged 35 or over — outside the 485 age cap (limited exemptions)");
  }

  if (ENGLISH_RANK[s.englishLevel] >= ENGLISH_RANK.competent) {
    matched.push("At least Competent English");
    baseScore += 10;
  } else {
    missing.push("Competent English or higher");
  }

  if (QUAL_RANK[s.highestQualification] >= QUAL_RANK.diploma) {
    matched.push("Qualification level consistent with 485 streams");
    baseScore += 10;
  } else {
    missing.push("Australian diploma or higher consistent with 485 streams");
  }

  // Recency priority: the 485 must be applied for within 6 months of course
  // completion — a use-it-or-lose-it window. For someone still on a student
  // visa with completed AU study, it is the natural (and time-critical) next
  // step, so it should outrank slower speculative options.
  if (s.currentVisaSubclass === "500" && s.australianStudyCompleted) {
    matched.push(
      "Currently on a student visa with completed study — the 485 application window (6 months from course completion) is time-limited",
    );
    baseScore += 15;
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
