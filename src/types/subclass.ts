import type { Source } from "./source";

/**
 * The nine visa subclasses supported by the MVP.
 */
export type VisaSubclassId =
  | "189"
  | "190"
  | "491"
  | "482"
  | "186"
  | "417"
  | "462"
  | "485"
  | "500";

export type VisaCategory = "skilled" | "mobility" | "study" | "sponsored";

export type TemporaryOrPermanent = "temporary" | "permanent" | "provisional";

/**
 * Hand-encoded rule record describing a single visa subclass.
 * Stored in `src/rules/` and consumed by the eligibility engine.
 */
export interface VisaSubclassRule {
  subclassId: VisaSubclassId;
  displayName: string;
  shortDescription: string;
  category: VisaCategory;
  temporaryOrPermanent: TemporaryOrPermanent;
  keyRequirements: string[];
  /**
   * Human-readable summary of what the paired `evaluator` function tests
   * against a `UserSituation`. The evaluator function is the executable form;
   * this list documents the simplified checks for the spec/UI.
   */
  simplifiedChecks: string[];
  commonBlockers: string[];
  sources: Source[];
  /** ISO date string for when these rules were last verified against Home Affairs. */
  lastCheckedDate: string;
  /** Plain-language disclaimer that the rules are simplified for portfolio/demo use. */
  caveat: string;
}
