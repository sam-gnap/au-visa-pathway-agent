import type {
  SubclassEvaluation,
  SubclassEvaluator,
  UserSituation,
  VisaSubclassRule,
} from "@/types";
import { ENGLISH_RANK, LAST_CHECKED } from "./_shared";

export const rule: VisaSubclassRule = {
  subclassId: "500",
  displayName: "Student visa (subclass 500)",
  shortDescription:
    "Temporary visa allowing the holder to study full-time in a CRICOS-registered course in Australia.",
  category: "study",
  temporaryOrPermanent: "temporary",
  keyRequirements: [
    "Confirmation of Enrolment (CoE) in a CRICOS-registered course",
    "Genuine Student requirement (intends to stay temporarily for study)",
    "Sufficient funds for tuition, travel, and living costs",
    "Acceptable level of English",
    "Overseas Student Health Cover (OSHC)",
  ],
  simplifiedChecks: [
    "Stated intention to study in Australia",
    "English at functional or above",
    "Funds at least in the 5k-20k band (20k+ preferred)",
    "Age within the typical adult student range (16-50)",
  ],
  commonBlockers: [
    "No genuine study intent",
    "Insufficient funds for course and living costs",
    "Insufficient English",
    "No CRICOS course enrolment",
  ],
  sources: [
    {
      title: "Student visa (subclass 500) — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
      lastChecked: LAST_CHECKED,
    },
    {
      title: "Genuine Student requirement — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/genuine-student-requirement",
      lastChecked: LAST_CHECKED,
    },
  ],
  lastCheckedDate: LAST_CHECKED,
  caveat:
    "Rules are simplified for portfolio/demo use. Funds thresholds, English test scores, and Genuine Student assessments change and depend on country of passport and course type.",
};

export const evaluator: SubclassEvaluator = (s: UserSituation): SubclassEvaluation => {
  const matched: string[] = [];
  const missing: string[] = [];
  const blockers: string[] = [];
  let baseScore = 30;

  if (s.studyIntent) {
    matched.push("Stated intent to study in Australia");
    baseScore += 25;
  } else {
    blockers.push("500 requires a stated intention to study in Australia");
  }

  if (ENGLISH_RANK[s.englishLevel] >= ENGLISH_RANK.functional) {
    matched.push("At least Functional English");
    baseScore += 10;
    if (ENGLISH_RANK[s.englishLevel] >= ENGLISH_RANK.competent) baseScore += 5;
  } else {
    missing.push("At least Functional English");
  }

  if (s.fundsBand === "20k_50k" || s.fundsBand === "over_50k") {
    matched.push("Funds in the range typically expected for tuition and living costs");
    baseScore += 15;
  } else if (s.fundsBand === "5k_20k") {
    matched.push("Some funds available — may be tight depending on course");
    baseScore += 5;
    missing.push("Confirm funds meet the financial capacity requirement for your course");
  } else {
    missing.push("Sufficient funds for tuition and living costs (typically AUD 24k+/year)");
  }

  if (s.age >= 16 && s.age <= 50) {
    matched.push("Within typical adult student age range");
    baseScore += 5;
  } else if (s.age > 50) {
    missing.push("Older applicants face a higher Genuine Student bar");
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
