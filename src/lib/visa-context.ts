import type { VisaSubclassId } from "@/types";

export type Difficulty = "easy" | "moderate" | "hard" | "very_hard";

export interface VisaSubclassContext {
  /**
   * Base difficulty rating, before situation-specific modifiers.
   * Reflects competition, eligibility breadth, and grant-rate signals.
   */
  baseDifficulty: Difficulty;
  /** One-sentence explanation users see next to the rating. */
  difficultyBlurb: string;
  /**
   * Quantitative context. Populated from data/visa-context.json when available;
   * fields are optional so the card hides missing data rather than faking it.
   */
  annualCap?: number;
  annualCapProgramYear?: string;
  recentCutoff?: { score: number; asOf: string; round?: string; notes?: string };
  processingTime?: { p50?: string; p90?: string };
  notes?: string[];
}

/**
 * Static qualitative context per subclass. Quantitative fields are intentionally
 * absent here and merged in from the agent-sourced JSON file at runtime.
 */
const BASE: Record<VisaSubclassId, VisaSubclassContext> = {
  "189": {
    baseDifficulty: "very_hard",
    difficultyBlurb:
      "Points-tested. Recent invitation rounds have cleared only at very high scores and only for a narrow set of high-demand occupations.",
  },
  "190": {
    baseDifficulty: "hard",
    difficultyBlurb:
      "Requires state/territory nomination — each state runs its own occupation list and selection. Strong fit for in-demand skills.",
  },
  "491": {
    baseDifficulty: "moderate",
    difficultyBlurb:
      "Regional Provisional. State or family nomination plus willingness to live regionally for 3+ years. Lower competition than 189/190.",
  },
  "482": {
    baseDifficulty: "moderate",
    difficultyBlurb:
      "Employer-driven. The hard part is finding a sponsoring employer on an approved list; eligibility itself is comparatively practical.",
  },
  "186": {
    baseDifficulty: "hard",
    difficultyBlurb:
      "Employer Nomination Scheme — permanent. Requires employer nomination plus skills assessment and (usually) 3 years' relevant experience.",
  },
  "417": {
    baseDifficulty: "easy",
    difficultyBlurb:
      "Working Holiday for partner-country passport holders, 18–30. Application itself is straightforward when eligibility is met.",
  },
  "462": {
    baseDifficulty: "moderate",
    difficultyBlurb:
      "Work and Holiday. Some countries have annual quotas that fill quickly, and additional study/English requirements apply.",
  },
  "485": {
    baseDifficulty: "moderate",
    difficultyBlurb:
      "Temporary Graduate. Requires a recently completed Australian qualification meeting the Australian study requirement.",
  },
  "500": {
    baseDifficulty: "moderate",
    difficultyBlurb:
      "Student visa. Genuine Student requirement and financial capacity drive most refusals; otherwise widely available.",
  },
};

/**
 * Load merged context: static base + agent-sourced JSON if present.
 */
function loadMerged(): Record<VisaSubclassId, VisaSubclassContext> {
  const merged: Record<VisaSubclassId, VisaSubclassContext> = { ...BASE };
  try {

    const raw = require("../../data/visa-context.json") as
      | { subclasses?: Record<string, Partial<VisaSubclassContext>> }
      | undefined;
    if (raw?.subclasses) {
      for (const [id, ctx] of Object.entries(raw.subclasses)) {
        if (id in merged && ctx) {
          merged[id as VisaSubclassId] = {
            ...merged[id as VisaSubclassId],
            ...ctx,
          };
        }
      }
    }
  } catch {
    // No data file yet — base only.
  }
  return merged;
}

export const VISA_CONTEXT = loadMerged();

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  easy: 0,
  moderate: 1,
  hard: 2,
  very_hard: 3,
};

const RANK_DIFFICULTY: Difficulty[] = ["easy", "moderate", "hard", "very_hard"];

export function difficultyLabel(d: Difficulty): string {
  switch (d) {
    case "easy":
      return "Easy";
    case "moderate":
      return "Moderate";
    case "hard":
      return "Hard";
    case "very_hard":
      return "Very hard";
  }
}

/**
 * Compute effective difficulty for a verdict by bumping the base when the
 * applicant has blockers or significant missing criteria.
 */
export function effectiveDifficulty(
  subclassId: VisaSubclassId,
  blockers: number,
  missing: number,
): Difficulty {
  const base = VISA_CONTEXT[subclassId]?.baseDifficulty ?? "moderate";
  let rank = DIFFICULTY_RANK[base];
  if (blockers > 0) rank += 2;
  else if (missing >= 2) rank += 1;
  if (rank > 3) rank = 3;
  return RANK_DIFFICULTY[rank];
}

/**
 * One-line score explainer. Anchors the 0–100 number to plain language.
 * Thresholds match how the eligibility scorer awards points in the rule files.
 */
export function scoreExplainer(score: number, blockers: number): string {
  if (blockers > 0) return "Hard blocker present — score is informational only.";
  if (score >= 85) return "Very strong profile fit for this subclass.";
  if (score >= 70) return "Strong fit — most prerequisites already in place.";
  if (score >= 55) return "Workable fit, but several items need attention.";
  if (score >= 40) return "Borderline — significant gaps to close before this becomes viable.";
  return "Weak fit on the current rule set.";
}
