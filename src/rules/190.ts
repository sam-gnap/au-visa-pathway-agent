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
  subclassId: "190",
  displayName: "Skilled Nominated (subclass 190)",
  shortDescription:
    "Points-tested permanent visa for skilled workers nominated by an Australian state or territory government.",
  category: "skilled",
  temporaryOrPermanent: "permanent",
  keyRequirements: [
    "Under 45 years of age at time of invitation",
    "Nominated by an Australian state or territory government",
    "Nominated occupation on the state/territory's skilled occupation list",
    "Suitable skills assessment",
    "At least Competent English",
    "Score at or above the points test pass mark (currently 65)",
  ],
  simplifiedChecks: [
    "Age strictly under 45",
    "English at competent or above",
    "Occupation present on simplified state-nomination occupation list",
    "Holds a state/territory nomination",
    "Bachelor degree or higher",
    "3+ years relevant work experience",
  ],
  commonBlockers: [
    "No state or territory nomination",
    "Aged 45 or over",
    "Occupation not on the nominating state's list",
    "Insufficient English (below Competent)",
  ],
  sources: [
    {
      title: "Skilled Nominated visa (subclass 190) — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190",
      lastChecked: LAST_CHECKED,
    },
    {
      title: "Skilled Nominated visa (190) — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190",
      lastChecked: LAST_CHECKED,
    },
  ],
  lastCheckedDate: LAST_CHECKED,
  caveat:
    "Rules are simplified for portfolio/demo use. Each state and territory publishes its own occupation list, points threshold, and residency requirements that change over time.",
};

export const evaluator: SubclassEvaluator = (s: UserSituation): SubclassEvaluation => {
  const matched: string[] = [];
  const missing: string[] = [];
  const blockers: string[] = [];
  let baseScore = 35;

  if (s.age < 45) {
    matched.push("Under the 45 age cap");
    baseScore += 10;
  } else {
    blockers.push("Age 45 or over — outside 190 age cap");
  }

  if (ENGLISH_RANK[s.englishLevel] >= ENGLISH_RANK.competent) {
    matched.push("At least Competent English");
    baseScore += 10;
  } else {
    missing.push("Competent English or higher");
  }

  if (occupationOnLists(s.occupationCodeOrName, ["MLTSSL", "STSOL"])) {
    matched.push("Occupation likely on a state nomination list");
    baseScore += 10;
  } else if (
    !s.occupationCodeOrName ||
    s.occupationCodeOrName.trim().toLowerCase() === "unknown"
  ) {
    missing.push("A nominated occupation on a state/territory list");
  } else {
    blockers.push("Nominated occupation not on a supported state list");
  }

  if (s.hasStateNomination) {
    matched.push("Already has a state/territory nomination");
    baseScore += 20;
  } else {
    missing.push("State or territory nomination");
  }

  if (QUAL_RANK[s.highestQualification] >= QUAL_RANK.bachelor) {
    matched.push("Bachelor degree or higher supports points score");
    baseScore += 5;
  } else {
    missing.push("Higher qualification would help reach the points pass mark");
  }

  if (s.yearsRelevantExperience >= 3) {
    matched.push("3+ years relevant work experience contributes to points");
    baseScore += 5;
  } else {
    missing.push("More relevant work experience would improve points score");
  }

  const pts = estimatePoints(s, { stateNominationBonus: 5 });
  if (pts < 65) {
    missing.push(
      `Estimated points ${pts} below the 65-point invitation floor (state nomination already includes +5)`,
    );
  } else {
    matched.push(`Estimated points ${pts} (including +5 state nomination)`);
  }

  baseScore += applySkillsAssessment(s, matched, missing);

  let statusHint: SubclassEvaluation["statusHint"] = "potentially_eligible";
  if (blockers.length > 0) statusHint = "not_eligible";
  else if (
    s.hasStateNomination &&
    matched.length >= 4 &&
    missing.length === 0 &&
    pts >= 65
  )
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
