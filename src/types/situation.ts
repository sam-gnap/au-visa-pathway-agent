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
}
