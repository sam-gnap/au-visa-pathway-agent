import type { VisaSubclassId } from "./subclass";

export type Location = "inside_australia" | "outside_australia";

export type EnglishLevel =
  | "none"
  | "functional"
  | "vocational"
  | "competent"
  | "proficient"
  | "superior";

export type Qualification =
  | "none"
  | "secondary"
  | "certificate"
  | "diploma"
  | "bachelor"
  | "masters"
  | "doctorate";

export type FundsBand = "under_5k" | "5k_20k" | "20k_50k" | "over_50k";

export type Goal = "temporary" | "study" | "work" | "pr";

export type SkillsAssessmentStatus = "yes" | "in_progress" | "no";

/**
 * Simplified partner situation for points estimation. "partner_skilled"
 * means the partner would also meet age/English/skills-assessment criteria
 * (worth the same 10 points as being single); "partner_not_skilled" scores 0.
 */
export type PartnerStatus = "single" | "partner_skilled" | "partner_not_skilled";

/**
 * Expected annual salary in an Australian role, banded around the 2025-26
 * employer-sponsored thresholds: Core Skills Income Threshold AUD 76,515 and
 * Specialist Skills Income Threshold AUD 141,210.
 */
export type SalaryBand = "under_76k" | "76k_to_141k" | "over_141k" | "unknown";

/**
 * Structured wizard output. Every field corresponds to a required input from
 * MVP_REQUIREMENTS.md §"Wizard requirements".
 *
 * `currentVisaSubclass` accepts a known `VisaSubclassId` or a free string for
 * subclasses outside the MVP's nine supported subclasses (e.g. "457", "subclass 408").
 */
export interface UserSituation {
  nationality: string;
  age: number;
  currentLocation: Location;
  currentVisaSubclass?: VisaSubclassId | string;
  occupationCodeOrName: string;
  englishLevel: EnglishLevel;
  highestQualification: Qualification;
  australianStudyCompleted: boolean;
  yearsRelevantExperience: number;
  hasEligibleEmployerSponsor: boolean;
  hasStateNomination: boolean;
  willingToLiveRegional: boolean;
  studyIntent: boolean;
  fundsBand: FundsBand;
  goal: Goal;
  /** Optional: skills assessment for the nominated occupation. Undefined = not asked/unknown. */
  skillsAssessment?: SkillsAssessmentStatus;
  /** Optional: partner situation for points estimation. Undefined = not asked/unknown. */
  partnerStatus?: PartnerStatus;
  /** Optional: expected salary band if employer-sponsored. Undefined = not asked/unknown. */
  salaryBand?: SalaryBand;
}
