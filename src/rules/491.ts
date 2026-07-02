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
  occupationLooksEligible,
} from "./_shared";

export const rule: VisaSubclassRule = {
  subclassId: "491",
  displayName: "Skilled Work Regional (Provisional) (subclass 491)",
  shortDescription:
    "Five-year provisional visa for skilled workers nominated by a state/territory or sponsored by an eligible family member living in regional Australia.",
  category: "skilled",
  temporaryOrPermanent: "provisional",
  keyRequirements: [
    "Under 45 years of age at time of invitation",
    "Nominated by a state/territory or sponsored by an eligible relative in regional Australia",
    "Nominated occupation on the relevant skilled list",
    "Suitable skills assessment",
    "At least Competent English",
    "Score at or above the points test pass mark (currently 65)",
    "Willing to live, work, and study in designated regional Australia",
  ],
  simplifiedChecks: [
    "Age strictly under 45",
    "English at competent or above",
    "Occupation present on simplified 491-eligible occupation list",
    "Has state nomination OR willingness to live regionally (family-sponsored stream)",
    "Committed to living, working, and studying in designated regional Australia",
    "Bachelor degree or higher and 3+ years relevant experience contribute to points",
  ],
  commonBlockers: [
    "Aged 45 or over",
    "No state nomination or eligible regional family sponsor",
    "Unwilling to commit to regional Australia",
    "Occupation not on a 491-eligible list",
  ],
  sources: [
    {
      title: "Skilled Work Regional (Provisional) visa (subclass 491) — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491",
      lastChecked: LAST_CHECKED,
    },
    {
      title: "Designated regional Australia — Home Affairs",
      url: "https://immi.homeaffairs.gov.au/visas/working-in-australia/regional-migration/eligible-regional-areas",
      lastChecked: LAST_CHECKED,
    },
  ],
  lastCheckedDate: LAST_CHECKED,
  caveat:
    "Rules are simplified for portfolio/demo use. The 491 has multiple streams (state-nominated and family-sponsored) with distinct nomination rules and regional postcodes that change.",
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
    blockers.push("Age 45 or over — outside 491 age cap");
  }

  if (ENGLISH_RANK[s.englishLevel] >= ENGLISH_RANK.competent) {
    matched.push("At least Competent English");
    baseScore += 10;
  } else {
    missing.push("Competent English or higher");
  }

  if (occupationLooksEligible(s.occupationCodeOrName)) {
    matched.push("Occupation likely on a 491-eligible list");
    baseScore += 10;
  } else if (
    !s.occupationCodeOrName ||
    s.occupationCodeOrName.trim().toLowerCase() === "unknown"
  ) {
    missing.push("A nominated occupation on a 491-eligible list");
  } else {
    blockers.push("Nominated occupation not on a supported 491 list");
  }

  // Sponsorship pathway: state nomination OR family-sponsored stream
  // (the latter requires willingness to live regionally).
  if (s.hasStateNomination) {
    matched.push("Has a state/territory nomination for 491");
    baseScore += 15;
  } else if (s.willingToLiveRegional) {
    // Family-sponsored stream is potentially open via the regional commitment;
    // the actual family sponsorship is still a missing requirement.
    baseScore += 5;
    missing.push("State/territory nomination or eligible regional family sponsor");
  } else {
    blockers.push("No state nomination and not willing to live regionally");
  }

  // Regional commitment is required for either stream. Record it exactly once
  // across both branches: a single `matched` entry when committed, or a
  // blocker when not (and a sponsorship path otherwise existed).
  if (s.willingToLiveRegional) {
    matched.push("Committed to regional Australia");
    baseScore += 5;
  } else if (s.hasStateNomination) {
    blockers.push("491 requires commitment to live and work in designated regional Australia");
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

  const pts = estimatePoints(s, { stateNominationBonus: 15, regionalBonus: 0 });
  if (pts < 65) {
    missing.push(
      `Estimated points ${pts} below 65 (491 nomination already includes +15)`,
    );
  } else {
    matched.push(`Estimated points ${pts} (including +15 491 nomination)`);
  }

  let statusHint: SubclassEvaluation["statusHint"] = "potentially_eligible";
  if (blockers.length > 0) statusHint = "not_eligible";
  else if (
    s.hasStateNomination &&
    s.willingToLiveRegional &&
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
