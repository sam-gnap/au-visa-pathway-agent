import type { Source } from "./source";
import type { VisaSubclassId } from "./subclass";

export type VerdictStatus =
  | "likely_eligible"
  | "potentially_eligible"
  | "not_eligible"
  | "insufficient_evidence";

/**
 * The shape returned by `checkEligibility` for each visa subclass.
 * Field set matches MVP_REQUIREMENTS.md §"Eligibility engine requirements".
 */
export interface VisaVerdict {
  subclassId: VisaSubclassId;
  status: VerdictStatus;
  /** Numeric score used for ranking. Higher = better fit. */
  score: number;
  summary: string;
  matchedCriteria: string[];
  missingCriteria: string[];
  blockers: string[];
  nextSteps: string[];
  sources: Source[];
}
