import type {
  EnglishLevel,
  FundsBand,
  Goal,
  Location,
  PartnerStatus,
  Qualification,
  SalaryBand,
  SkillsAssessmentStatus,
  UserSituation,
} from "@/types";
import { OCCUPATIONS, findOccupation } from "@/lib/occupations";

/**
 * Per-field validation error surfaced to the wizard UI.
 */
export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; value: UserSituation }
  | { ok: false; errors: ValidationError[] };

const LOCATIONS: readonly Location[] = [
  "inside_australia",
  "outside_australia",
] as const;

const ENGLISH_LEVELS: readonly EnglishLevel[] = [
  "none",
  "functional",
  "vocational",
  "competent",
  "proficient",
  "superior",
] as const;

const QUALIFICATIONS: readonly Qualification[] = [
  "none",
  "secondary",
  "certificate",
  "diploma",
  "bachelor",
  "masters",
  "doctorate",
] as const;

const FUNDS_BANDS: readonly FundsBand[] = [
  "under_5k",
  "5k_20k",
  "20k_50k",
  "over_50k",
] as const;

const GOALS: readonly Goal[] = ["temporary", "study", "work", "pr"] as const;

const SKILLS_ASSESSMENTS: readonly SkillsAssessmentStatus[] = [
  "yes",
  "in_progress",
  "no",
] as const;

const PARTNER_STATUSES: readonly PartnerStatus[] = [
  "single",
  "partner_skilled",
  "partner_not_skilled",
] as const;

const SALARY_BANDS: readonly SalaryBand[] = [
  "under_76k",
  "76k_to_141k",
  "over_141k",
  "unknown",
] as const;

/**
 * Occupations the MVP can reason about — the full ANZSCO + Home Affairs
 * dataset from `data/occupations.json` (via `@/lib/occupations`), not a
 * separate hand-coded subset. Anything outside this list is not silently
 * rejected: the eligibility engine should produce `insufficient_evidence`
 * (see MVP_REQUIREMENTS §Wizard validation).
 */
export const supportedOccupations: ReadonlyArray<{ code: string; name: string }> =
  OCCUPATIONS.map((o) => ({ code: o.code, name: o.name }));

/**
 * Returns true if `occupation` resolves against the occupation dataset —
 * same matching rules the rule engine uses (`findOccupation`), so the
 * wizard's "unsupported occupation" note can never disagree with the
 * verdicts.
 *
 * Caller should treat `false` as "unknown" and surface insufficient_evidence,
 * NOT as a validation failure.
 */
export function isSupportedOccupation(occupation: string): boolean {
  if (typeof occupation !== "string") return false;
  return findOccupation(occupation) !== undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  errors: ValidationError[],
): T | undefined {
  if (typeof value !== "string") {
    errors.push({ field, message: `${field} is required` });
    return undefined;
  }
  if (!(allowed as readonly string[]).includes(value)) {
    errors.push({
      field,
      message: `${field} must be one of: ${allowed.join(", ")}`,
    });
    return undefined;
  }
  return value as T;
}

function checkBoolean(
  value: unknown,
  field: string,
  errors: ValidationError[],
): boolean | undefined {
  if (typeof value !== "boolean") {
    errors.push({ field, message: `${field} must be true or false` });
    return undefined;
  }
  return value;
}

function checkNonEmptyString(
  value: unknown,
  field: string,
  errors: ValidationError[],
): string | undefined {
  if (typeof value !== "string") {
    errors.push({ field, message: `${field} is required` });
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    errors.push({ field, message: `${field} cannot be empty` });
    return undefined;
  }
  return trimmed;
}

/**
 * Validate a raw wizard payload against `UserSituation`. Returns either
 * a discriminated `{ ok: true, value }` or `{ ok: false, errors }`.
 *
 * Rules:
 * - All required fields present and correct type.
 * - `age`: number in [16, 100].
 * - `yearsRelevantExperience`: number >= 0.
 * - Enum fields restricted to their union values.
 * - `nationality`, `occupationCodeOrName`: non-empty strings.
 * - `currentVisaSubclass` is optional; if present, must be string.
 */
export function validateSituation(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [{ field: "_root", message: "Input must be an object" }],
    };
  }

  const nationality = checkNonEmptyString(input.nationality, "nationality", errors);

  // age: number in [16, 100]
  let age: number | undefined;
  if (typeof input.age !== "number" || Number.isNaN(input.age)) {
    errors.push({ field: "age", message: "age must be a number" });
  } else if (input.age < 16 || input.age > 100) {
    errors.push({
      field: "age",
      message: "age must be between 16 and 100 inclusive",
    });
  } else {
    age = input.age;
  }

  const currentLocation = checkEnum<Location>(
    input.currentLocation,
    LOCATIONS,
    "currentLocation",
    errors,
  );

  // currentVisaSubclass: optional string
  let currentVisaSubclass: string | undefined;
  if (input.currentVisaSubclass !== undefined && input.currentVisaSubclass !== null) {
    if (typeof input.currentVisaSubclass !== "string") {
      errors.push({
        field: "currentVisaSubclass",
        message: "currentVisaSubclass must be a string when provided",
      });
    } else {
      currentVisaSubclass = input.currentVisaSubclass;
    }
  }

  const occupationCodeOrName = checkNonEmptyString(
    input.occupationCodeOrName,
    "occupationCodeOrName",
    errors,
  );

  const englishLevel = checkEnum<EnglishLevel>(
    input.englishLevel,
    ENGLISH_LEVELS,
    "englishLevel",
    errors,
  );

  const highestQualification = checkEnum<Qualification>(
    input.highestQualification,
    QUALIFICATIONS,
    "highestQualification",
    errors,
  );

  const australianStudyCompleted = checkBoolean(
    input.australianStudyCompleted,
    "australianStudyCompleted",
    errors,
  );

  // yearsRelevantExperience: number >= 0
  let yearsRelevantExperience: number | undefined;
  if (
    typeof input.yearsRelevantExperience !== "number" ||
    Number.isNaN(input.yearsRelevantExperience)
  ) {
    errors.push({
      field: "yearsRelevantExperience",
      message: "yearsRelevantExperience must be a number",
    });
  } else if (input.yearsRelevantExperience < 0) {
    errors.push({
      field: "yearsRelevantExperience",
      message: "yearsRelevantExperience must be 0 or greater",
    });
  } else {
    yearsRelevantExperience = input.yearsRelevantExperience;
  }

  const hasEligibleEmployerSponsor = checkBoolean(
    input.hasEligibleEmployerSponsor,
    "hasEligibleEmployerSponsor",
    errors,
  );

  const hasStateNomination = checkBoolean(
    input.hasStateNomination,
    "hasStateNomination",
    errors,
  );

  const willingToLiveRegional = checkBoolean(
    input.willingToLiveRegional,
    "willingToLiveRegional",
    errors,
  );

  const studyIntent = checkBoolean(input.studyIntent, "studyIntent", errors);

  const fundsBand = checkEnum<FundsBand>(
    input.fundsBand,
    FUNDS_BANDS,
    "fundsBand",
    errors,
  );

  const goal = checkEnum<Goal>(input.goal, GOALS, "goal", errors);

  // Optional enrichment fields — validated only when present.
  const checkOptionalEnum = <T extends string>(
    value: unknown,
    allowed: readonly T[],
    field: string,
  ): T | undefined => {
    if (value === undefined || value === null || value === "") return undefined;
    return checkEnum<T>(value, allowed, field, errors);
  };

  const skillsAssessment = checkOptionalEnum<SkillsAssessmentStatus>(
    input.skillsAssessment,
    SKILLS_ASSESSMENTS,
    "skillsAssessment",
  );
  const partnerStatus = checkOptionalEnum<PartnerStatus>(
    input.partnerStatus,
    PARTNER_STATUSES,
    "partnerStatus",
  );
  const salaryBand = checkOptionalEnum<SalaryBand>(
    input.salaryBand,
    SALARY_BANDS,
    "salaryBand",
  );

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // All required fields are validated above; non-null assertions are safe.
  const value: UserSituation = {
    nationality: nationality!,
    age: age!,
    currentLocation: currentLocation!,
    occupationCodeOrName: occupationCodeOrName!,
    englishLevel: englishLevel!,
    highestQualification: highestQualification!,
    australianStudyCompleted: australianStudyCompleted!,
    yearsRelevantExperience: yearsRelevantExperience!,
    hasEligibleEmployerSponsor: hasEligibleEmployerSponsor!,
    hasStateNomination: hasStateNomination!,
    willingToLiveRegional: willingToLiveRegional!,
    studyIntent: studyIntent!,
    fundsBand: fundsBand!,
    goal: goal!,
  };
  if (currentVisaSubclass !== undefined) {
    value.currentVisaSubclass = currentVisaSubclass;
  }
  if (skillsAssessment !== undefined) value.skillsAssessment = skillsAssessment;
  if (partnerStatus !== undefined) value.partnerStatus = partnerStatus;
  if (salaryBand !== undefined) value.salaryBand = salaryBand;
  return { ok: true, value };
}
