import { evaluators, rulesById } from "@/rules";
import type {
  Goal,
  UserSituation,
  VisaSubclassId,
  VisaVerdict,
} from "@/types";

const ALL_SUBCLASSES: VisaSubclassId[] = [
  "189",
  "190",
  "491",
  "186",
  "482",
  "485",
  "500",
  "417",
  "462",
];

const PR_PATHWAY_SUBCLASSES: VisaSubclassId[] = ["189", "190", "491", "186"];
const WORK_SUBCLASSES: VisaSubclassId[] = ["482", "186"];
const STUDY_SUBCLASSES: VisaSubclassId[] = ["500", "485"];
const TEMP_SUBCLASSES: VisaSubclassId[] = ["417", "462", "500"];

function goalBoost(goal: Goal, id: VisaSubclassId): number {
  switch (goal) {
    case "pr":
      return PR_PATHWAY_SUBCLASSES.includes(id) ? 15 : 0;
    case "work":
      return WORK_SUBCLASSES.includes(id) ? 12 : 0;
    case "study":
      if (id === "500") return 18;
      if (STUDY_SUBCLASSES.includes(id)) return 10;
      return 0;
    case "temporary":
      if (id === "417" || id === "462") return 18;
      if (TEMP_SUBCLASSES.includes(id)) return 10;
      return 0;
  }
}

function buildSummary(
  id: VisaSubclassId,
  status: VisaVerdict["status"],
  goal: Goal,
): string {
  const rule = rulesById[id];
  const head = `${rule.displayName}: `;
  switch (status) {
    case "likely_eligible":
      return `${head}you appear to meet the headline criteria for this subclass based on your inputs. Goal '${goal}' aligns well.`;
    case "potentially_eligible":
      return `${head}you meet some criteria but a few items still need to be confirmed or improved. See missing requirements below.`;
    case "not_eligible":
      return `${head}one or more hard requirements are not currently met. See blockers below.`;
    case "insufficient_evidence":
    default:
      return `${head}there isn't enough information in your inputs to make a confident assessment.`;
  }
}

function buildNextSteps(
  status: VisaVerdict["status"],
  missing: string[],
  blockers: string[],
): string[] {
  const steps: string[] = [];

  if (status === "not_eligible" && blockers.length > 0) {
    steps.push(`Address the blocker: ${blockers[0]}`);
  }

  for (const m of missing.slice(0, 3)) {
    steps.push(`Work on: ${m}`);
  }

  if (status === "likely_eligible") {
    steps.push("Read the official requirements on the linked Home Affairs page.");
    steps.push("Consult a MARN-registered migration agent to confirm your specific situation.");
  } else if (status === "potentially_eligible") {
    steps.push("Review the official Home Affairs page to confirm exact requirements.");
  } else if (status === "insufficient_evidence") {
    steps.push("Provide more detail in the wizard (occupation, English, study history).");
  }

  if (steps.length < 3) {
    steps.push("Verify rules on the official Home Affairs page linked below.");
  }

  return steps.slice(0, 5);
}

/**
 * Pure rule-engine eligibility check. Returns a verdict for every supported
 * subclass — ranked strongest fit first.
 */
export function checkEligibility(situation: UserSituation): VisaVerdict[] {
  const verdicts: VisaVerdict[] = ALL_SUBCLASSES.map((id) => {
    const evaluation = evaluators[id](situation);
    const rule = rulesById[id];

    let score = evaluation.baseScore + goalBoost(situation.goal, id);

    if (evaluation.blockers.length > 0) {
      // Hard blockers cap the score so that any blocked subclass ranks below
      // any non-blocked one. We retain a small differential among blocked
      // subclasses so the underlying baseScore still informs ordering.
      score = Math.min(20, Math.max(0, score) / 5);
    } else {
      score = Math.min(100, Math.max(0, score));
    }

    const status = evaluation.statusHint;

    return {
      subclassId: id,
      status,
      score,
      summary: buildSummary(id, status, situation.goal),
      matchedCriteria: evaluation.matched,
      missingCriteria: evaluation.missing,
      blockers: evaluation.blockers,
      nextSteps: buildNextSteps(status, evaluation.missing, evaluation.blockers),
      sources: rule.sources,
    };
  });

  const STATUS_ORDER: Record<VisaVerdict["status"], number> = {
    likely_eligible: 0,
    potentially_eligible: 1,
    insufficient_evidence: 2,
    not_eligible: 3,
  };

  verdicts.sort((a, b) => {
    const aBlocked = a.blockers.length > 0 ? 1 : 0;
    const bBlocked = b.blockers.length > 0 ? 1 : 0;
    if (aBlocked !== bBlocked) return aBlocked - bBlocked; // unblocked first
    // Score first so the goal boost can rank a strong goal-aligned subclass
    // above an easier but goal-mismatched one (e.g. 189 over 417 when the
    // goal is PR). Status quality breaks score ties so equal-scored
    // "likely_eligible" results never get buried behind "potentially_eligible"
    // ones, and subclassId keeps the order deterministic.
    if (a.score !== b.score) return b.score - a.score;
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.subclassId.localeCompare(b.subclassId);
  });

  return verdicts;
}
