import type { UserSituation } from "./situation";
import type { VerdictStatus } from "./verdict";

/**
 * The raw output of a single subclass's pure evaluator. The eligibility engine
 * combines a `SubclassEvaluation` with the corresponding `VisaSubclassRule` to
 * produce a final `VisaVerdict`.
 */
export interface SubclassEvaluation {
  matched: string[];
  missing: string[];
  blockers: string[];
  baseScore: number;
  statusHint: VerdictStatus;
}

export type SubclassEvaluator = (s: UserSituation) => SubclassEvaluation;
