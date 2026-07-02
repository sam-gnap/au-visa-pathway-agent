import type { EnglishLevel, Qualification } from "@/types";
import { isOccupationOnList, type SkilledList } from "@/lib/occupations";

export const LAST_CHECKED = "2026-06-23";

export const ENGLISH_RANK: Record<EnglishLevel, number> = {
  none: 0,
  functional: 1,
  vocational: 2,
  competent: 3,
  proficient: 4,
  superior: 5,
};

export const QUAL_RANK: Record<Qualification, number> = {
  none: 0,
  secondary: 1,
  certificate: 2,
  diploma: 3,
  bachelor: 4,
  masters: 5,
  doctorate: 6,
};

/**
 * Simplified subset of the 417 Working Holiday partner country list.
 */
export const WHV_417_COUNTRIES = [
  "united kingdom",
  "uk",
  "germany",
  "france",
  "ireland",
  "italy",
  "japan",
  "south korea",
  "korea",
  "canada",
  "netherlands",
  "belgium",
  "sweden",
  "denmark",
  "norway",
  "finland",
  "taiwan",
  "hong kong",
];

/**
 * 417 partner countries with the age cap raised to 35 via bilateral
 * agreements / FTAs. Names match `WHV_417_COUNTRIES` entries for substring
 * matching. Sources:
 *  - UK: AU-UK FTA, age raised 1 Jul 2023.
 *  - Ireland, Canada, Denmark: long-standing 35 cap.
 *  - France, Italy: raised in 2024 bilateral updates.
 */
export const WHV_417_HIGHER_AGE_CAP_COUNTRIES = [
  "united kingdom",
  "uk",
  "ireland",
  "canada",
  "denmark",
  "france",
  "italy",
];

export function has417HigherAgeCap(nationality: string): boolean {
  const v = normalize(nationality);
  if (!v) return false;
  return WHV_417_HIGHER_AGE_CAP_COUNTRIES.some((c) => v === c || v.includes(c));
}

/**
 * Simplified subset of the 462 Work and Holiday partner country list.
 */
export const WHV_462_COUNTRIES = [
  "united states",
  "usa",
  "us",
  "china",
  "spain",
  "thailand",
  "argentina",
  "chile",
  "indonesia",
  "malaysia",
  "vietnam",
  "philippines",
  "portugal",
  "poland",
  "turkey",
  "uruguay",
  "brazil",
  "ecuador",
  "israel",
  "singapore",
];

export function normalize(s: string): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Returns true if the occupation appears on any of the given skilled lists in
 * the ANZSCO + Home Affairs combined dataset. Defaults to the "skilled
 * migration" subset (MLTSSL + STSOL + ROL + CSOL — any list).
 *
 * Per-visa rules should call with the specific list(s) that matter for that
 * subclass (e.g. 189 → MLTSSL only, 482 → CSOL).
 */
export function occupationOnLists(
  input: string,
  lists: ReadonlyArray<SkilledList> = ["MLTSSL", "STSOL", "ROL", "CSOL"],
): boolean {
  if (!input || normalize(input) === "unknown") return false;
  return isOccupationOnList(input, lists);
}

/**
 * Back-compat wrapper used by older rule code paths. Treats any skilled-list
 * presence as eligible. Prefer `occupationOnLists` with explicit lists for
 * new code.
 */
export function occupationLooksEligible(input: string): boolean {
  return occupationOnLists(input);
}

export function isWhv417Country(nationality: string): boolean {
  const v = normalize(nationality);
  if (!v) return false;
  return WHV_417_COUNTRIES.some((c) => v === c || v.includes(c));
}

/**
 * Rough estimate of SkillSelect points based on Home Affairs points table.
 * Deliberately conservative — we don't know partner status, AU vs overseas
 * experience split, STEM-specialist masters, professional-year, community
 * language, or regional study. Used to gate "likely_eligible" for points-
 * tested visas (189/190/491) at the typical 65-point invitation floor.
 *
 * Reference: 189 points table on Home Affairs (linked in rule sources).
 */
import type { UserSituation } from "@/types";

export function estimatePoints(
  s: UserSituation,
  opts: { stateNominationBonus?: number; regionalBonus?: number } = {},
): number {
  let pts = 0;
  // Age
  if (s.age >= 18 && s.age <= 24) pts += 25;
  else if (s.age >= 25 && s.age <= 32) pts += 30;
  else if (s.age >= 33 && s.age <= 39) pts += 25;
  else if (s.age >= 40 && s.age <= 44) pts += 15;
  // English
  if (s.englishLevel === "proficient") pts += 10;
  else if (s.englishLevel === "superior") pts += 20;
  // Qualification
  if (s.highestQualification === "doctorate") pts += 20;
  else if (s.highestQualification === "masters" || s.highestQualification === "bachelor") pts += 15;
  else if (s.highestQualification === "diploma") pts += 10;
  // Experience — treat as overseas unless user is inside AU.
  const yrs = s.yearsRelevantExperience;
  if (s.currentLocation === "inside_australia") {
    if (yrs >= 8) pts += 20;
    else if (yrs >= 5) pts += 15;
    else if (yrs >= 3) pts += 10;
    else if (yrs >= 1) pts += 5;
  } else {
    if (yrs >= 8) pts += 15;
    else if (yrs >= 5) pts += 10;
    else if (yrs >= 3) pts += 5;
  }
  // Australian study (proxy for AU qualification points)
  if (s.australianStudyCompleted) pts += 5;
  // Partner: single and skilled-partner both score 10; a partner who doesn't
  // meet skill/English criteria scores 0. Unknown stays 0 (conservative).
  if (s.partnerStatus === "single" || s.partnerStatus === "partner_skilled") {
    pts += 10;
  }
  // State nomination / regional nomination
  if (s.hasStateNomination) pts += opts.stateNominationBonus ?? 0;
  if (s.willingToLiveRegional && s.hasStateNomination) {
    pts += opts.regionalBonus ?? 0;
  }
  return pts;
}

/**
 * Shared skills-assessment check for the skilled visas (189/190/491/186).
 * A suitable skills assessment is mandatory for all of them, but it is
 * obtainable — so an absent one is a missing criterion, never a blocker.
 * Returns the base-score delta. Undefined (not asked) changes nothing so
 * pre-existing fixtures and personas keep their behaviour.
 */
export function applySkillsAssessment(
  s: UserSituation,
  matched: string[],
  missing: string[],
): number {
  switch (s.skillsAssessment) {
    case "yes":
      matched.push("Suitable skills assessment already held");
      return 5;
    case "in_progress":
      missing.push("Skills assessment still in progress — needed before applying");
      return 0;
    case "no":
      missing.push("A suitable skills assessment for the nominated occupation");
      return 0;
    default:
      return 0;
  }
}

export function isWhv462Country(nationality: string): boolean {
  const v = normalize(nationality);
  if (!v) return false;
  return WHV_462_COUNTRIES.some((c) => v === c || v.includes(c));
}
