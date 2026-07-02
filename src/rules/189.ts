import type {
  SubclassEvaluation,
  SubclassEvaluator,
  UserSituation,
  VisaSubclassRule,
} from "@/types";
import {
  ENGLISH_RANK,
  LAST_CHECKED,
  QUAL_RANK,
  estimatePoints,
  occupationOnLists,
  applySkillsAssessment,
} from "./_shared";

export const rule: VisaSubclassRule = {
  subclassId: "189",
  displayName: "Skilled Independent (subclass 189)",
  shortDescription:
    "Points-tested permanent visa for skilled workers not sponsored by an employer, state, territory, or family member.",
  category: "skilled",
  temporaryOrPermanent: "permanent",
  keyRequirements: [
    "Under 45 years of age at time of invitation",
    "Nominated occupation on a relevant skilled occupation list",
    "Suitable skills assessment for the nominated occupation",
    "At least Competent English",
    "Score at or above the points test pass mark (currently 65)",
    "Receive an invitation to apply via SkillSelect",
  ],
  simplifiedChecks: [
    "Age strictly under 45",
    "English at competent or above",
    "Occupation present on simplified points-tested occupation list",
    "Bachelor degree or higher",
    "3+ years relevant work experience",
  ],
  commonBlockers: [
    "Aged 45 or over",
    "Occupation not on a points-tested skilled occupation list",
    "Insufficient English (below Competent)",
    "Cannot reach minimum points score",
  ],
  sources: [
    {
      title: "Skilled Independent visa (subclass 189) — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189",
      lastChecked: LAST_CHECKED,
    },
    {
      title: "Skilled Independent (189) points-tested overview — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189/points-tested",
      lastChecked: LAST_CHECKED,
    },
  ],
  lastCheckedDate: LAST_CHECKED,
  caveat:
    "Rules are simplified for portfolio/demo use. Real 189 assessment depends on the current skilled occupation lists, points test, invitation rounds, and skills assessment outcomes.",
};

export const evaluator: SubclassEvaluator = (s: UserSituation): SubclassEvaluation => {
  const matched: string[] = [];
  const missing: string[] = [];
  const blockers: string[] = [];
  let baseScore = 40;

  if (s.age < 45) {
    matched.push("Under the 45 age cap");
    baseScore += 10;
  } else {
    blockers.push("Age 45 or over — outside 189 age cap");
  }

  if (ENGLISH_RANK[s.englishLevel] >= ENGLISH_RANK.competent) {
    matched.push("At least Competent English");
    baseScore += 10;
    if (ENGLISH_RANK[s.englishLevel] >= ENGLISH_RANK.proficient) baseScore += 5;
  } else {
    missing.push("Competent English or higher");
  }

  // 189 is points-tested independent — MLTSSL membership only.
  if (occupationOnLists(s.occupationCodeOrName, ["MLTSSL"])) {
    matched.push("Occupation appears on a points-tested skilled list");
    baseScore += 15;
  } else if (
    !s.occupationCodeOrName ||
    s.occupationCodeOrName.trim().toLowerCase() === "unknown"
  ) {
    missing.push("A nominated occupation on a points-tested skilled list");
  } else {
    blockers.push("Nominated occupation not on a supported points-tested list");
  }

  if (QUAL_RANK[s.highestQualification] >= QUAL_RANK.bachelor) {
    matched.push("Bachelor degree or higher supports points score");
    baseScore += 5;
  } else {
    missing.push("Higher qualification helps reach the points pass mark");
  }

  if (s.yearsRelevantExperience >= 3) {
    matched.push("3+ years relevant experience contributes to points");
    baseScore += 5;
  } else {
    missing.push("More relevant work experience would improve points score");
  }

  const pts = estimatePoints(s);
  if (pts < 65) {
    missing.push(
      `Estimated points ${pts} below the 65-point invitation floor — most invited 189 profiles score 85+`,
    );
  } else if (pts < 85) {
    missing.push(
      `Estimated points ${pts} reach the 65 minimum but most invitation rounds clear at 85+`,
    );
  } else {
    matched.push(`Estimated points ${pts} (above the typical 85-point invitation cutoff)`);
  }

  // Competitiveness dampener: 65 points makes you eligible, not invited.
  // 2025-26 rounds cleared at ~85-95 for general/ICT occupations, so a
  // profile short of 85 shouldn't outrank realistic sponsored/WHV options.
  if (pts < 85) {
    baseScore -= Math.min(20, (85 - pts) / 2);
  }

  baseScore += applySkillsAssessment(s, matched, missing);

  let statusHint: SubclassEvaluation["statusHint"] = "potentially_eligible";
  if (blockers.length > 0) statusHint = "not_eligible";
  else if (matched.length >= 4 && missing.length === 0 && pts >= 65) statusHint = "likely_eligible";
  else if (matched.length <= 1) statusHint = "insufficient_evidence";

  return {
    matched,
    missing,
    blockers,
    baseScore: Math.max(0, Math.min(100, baseScore)),
    statusHint,
  };
};
