import type {
  SubclassEvaluator,
  VisaSubclassId,
  VisaSubclassRule,
} from "@/types";

import * as r189 from "./189";
import * as r190 from "./190";
import * as r491 from "./491";
import * as r482 from "./482";
import * as r186 from "./186";
import * as r417 from "./417";
import * as r462 from "./462";
import * as r485 from "./485";
import * as r500 from "./500";

export const allRules: VisaSubclassRule[] = [
  r189.rule,
  r190.rule,
  r491.rule,
  r482.rule,
  r186.rule,
  r417.rule,
  r462.rule,
  r485.rule,
  r500.rule,
];

export const evaluators: Record<VisaSubclassId, SubclassEvaluator> = {
  "189": r189.evaluator,
  "190": r190.evaluator,
  "491": r491.evaluator,
  "482": r482.evaluator,
  "186": r186.evaluator,
  "417": r417.evaluator,
  "462": r462.evaluator,
  "485": r485.evaluator,
  "500": r500.evaluator,
};

export const rulesById: Record<VisaSubclassId, VisaSubclassRule> = {
  "189": r189.rule,
  "190": r190.rule,
  "491": r491.rule,
  "482": r482.rule,
  "186": r186.rule,
  "417": r417.rule,
  "462": r462.rule,
  "485": r485.rule,
  "500": r500.rule,
};
