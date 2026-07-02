"use client";

import { useMemo, useState } from "react";
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
import {
  isSupportedOccupation,
  validateSituation,
  type ValidationError,
} from "@/lib/validation";
import { Combobox, type ComboboxOption } from "./Combobox";
import { COUNTRIES } from "@/lib/countries";
import { OCCUPATIONS } from "@/lib/occupations";

interface WizardFormProps {
  onSubmit: (situation: UserSituation) => void;
}

interface FormState {
  nationality: string;
  age: string;
  currentLocation: Location | "";
  currentVisaSubclass: string;
  occupationCodeOrName: string;
  englishLevel: EnglishLevel | "";
  highestQualification: Qualification | "";
  australianStudyCompleted: "" | "yes" | "no";
  yearsRelevantExperience: string;
  hasEligibleEmployerSponsor: "" | "yes" | "no";
  hasStateNomination: "" | "yes" | "no";
  willingToLiveRegional: "" | "yes" | "no";
  studyIntent: "" | "yes" | "no";
  fundsBand: FundsBand | "";
  goal: Goal | "";
  skillsAssessment: SkillsAssessmentStatus | "";
  partnerStatus: PartnerStatus | "";
  salaryBand: SalaryBand | "";
}

const INITIAL_STATE: FormState = {
  nationality: "",
  age: "",
  currentLocation: "",
  currentVisaSubclass: "",
  occupationCodeOrName: "",
  englishLevel: "",
  highestQualification: "",
  australianStudyCompleted: "",
  yearsRelevantExperience: "",
  hasEligibleEmployerSponsor: "",
  hasStateNomination: "",
  willingToLiveRegional: "",
  studyIntent: "",
  fundsBand: "",
  goal: "",
  skillsAssessment: "",
  partnerStatus: "",
  salaryBand: "",
};

const VISA_SUBCLASS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "None / not currently on an AU visa" },
  { value: "189", label: "189 — Skilled Independent" },
  { value: "190", label: "190 — Skilled Nominated" },
  { value: "491", label: "491 — Skilled Work Regional (Provisional)" },
  { value: "482", label: "482 — Skills in Demand" },
  { value: "186", label: "186 — Employer Nomination Scheme" },
  { value: "417", label: "417 — Working Holiday" },
  { value: "462", label: "462 — Work and Holiday" },
  { value: "485", label: "485 — Temporary Graduate" },
  { value: "500", label: "500 — Student" },
  { value: "other", label: "Other / not listed" },
];

function boolFrom(v: "" | "yes" | "no"): boolean | undefined {
  if (v === "yes") return true;
  if (v === "no") return false;
  return undefined;
}

function toPayload(s: FormState): unknown {
  const ageNum = s.age.trim() === "" ? NaN : Number(s.age);
  const expNum =
    s.yearsRelevantExperience.trim() === ""
      ? NaN
      : Number(s.yearsRelevantExperience);

  let currentVisaSubclass: string | undefined;
  if (s.currentVisaSubclass && s.currentVisaSubclass !== "other") {
    currentVisaSubclass = s.currentVisaSubclass;
  } else if (s.currentVisaSubclass === "other") {
    currentVisaSubclass = "other";
  }

  return {
    nationality: s.nationality,
    age: Number.isNaN(ageNum) ? s.age : ageNum,
    currentLocation: s.currentLocation || undefined,
    currentVisaSubclass,
    occupationCodeOrName: s.occupationCodeOrName,
    englishLevel: s.englishLevel || undefined,
    highestQualification: s.highestQualification || undefined,
    australianStudyCompleted: boolFrom(s.australianStudyCompleted),
    yearsRelevantExperience: Number.isNaN(expNum)
      ? s.yearsRelevantExperience
      : expNum,
    hasEligibleEmployerSponsor: boolFrom(s.hasEligibleEmployerSponsor),
    hasStateNomination: boolFrom(s.hasStateNomination),
    willingToLiveRegional: boolFrom(s.willingToLiveRegional),
    studyIntent: boolFrom(s.studyIntent),
    fundsBand: s.fundsBand || undefined,
    goal: s.goal || undefined,
    skillsAssessment: s.skillsAssessment || undefined,
    partnerStatus: s.partnerStatus || undefined,
    salaryBand: s.salaryBand || undefined,
  };
}

function errorsByField(errors: ValidationError[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const e of errors) {
    if (!map[e.field]) map[e.field] = e.message;
  }
  return map;
}

function errId(field: string): string {
  return `f-${field}-err`;
}

const COUNTRY_OPTIONS: ComboboxOption[] = COUNTRIES.map((c) => ({
  value: c.name,
  primary: c.name,
  secondary: c.alpha2,
  searchKey: `${c.name.toLowerCase()} ${c.alpha2.toLowerCase()}`,
}));

const OCCUPATION_OPTIONS: ComboboxOption[] = OCCUPATIONS.map((o) => ({
  value: o.name,
  primary: o.name,
  secondary: o.code,
  tags: o.skilledLists,
  searchKey: `${o.name.toLowerCase()} ${o.code}`,
}));

export function WizardForm({ onSubmit }: WizardFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const occupationKnown = useMemo(() => {
    const o = form.occupationCodeOrName.trim();
    if (!o) return null;
    return isSupportedOccupation(o);
  }, [form.occupationCodeOrName]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    const payload = toPayload(form);
    const result = validateSituation(payload);
    if (!result.ok) {
      setErrors(errorsByField(result.errors));
      return;
    }
    setErrors({});
    onSubmit(result.value);
  }

  const fieldClass = (name: string) =>
    `field${errors[name] ? " field--invalid" : ""}`;

  return (
    <form className="wizard" onSubmit={handleSubmit} noValidate>
      <h2 className="wizard__title">Your situation</h2>
      <p className="wizard__intro">
        Fill in the structured questions below. All fields are required unless
        marked optional. Results are computed locally — nothing is sent to a
        server.
      </p>

      <div className="wizard__grid">
        {/* Nationality */}
        <div className={fieldClass("nationality")}>
          <label className="field__label" htmlFor="f-nationality">
            Nationality / passport country
          </label>
          <Combobox
            id="f-nationality"
            value={form.nationality}
            onChange={(v) => update("nationality", v)}
            options={COUNTRY_OPTIONS}
            placeholder="Type to search e.g. United Kingdom"
            ariaInvalid={!!errors.nationality}
            ariaDescribedBy={errors.nationality ? errId("nationality") : undefined}
            emptyMessage="No country found — check spelling."
          />
          {errors.nationality ? (
            <div className="field__error" id={errId("nationality")}>
              {errors.nationality}
            </div>
          ) : null}
        </div>

        {/* Age */}
        <div className={fieldClass("age")}>
          <label className="field__label" htmlFor="f-age">
            Age
          </label>
          <input
            id="f-age"
            type="number"
            min={16}
            max={100}
            value={form.age}
            onChange={(e) => update("age", e.target.value)}
            placeholder="16 – 100"
            aria-invalid={!!errors.age}
            aria-describedby={errors.age ? errId("age") : undefined}
          />
          {errors.age ? (
            <div className="field__error" id={errId("age")}>
              {errors.age}
            </div>
          ) : null}
        </div>

        {/* Current location */}
        <fieldset className={fieldClass("currentLocation")}>
          <legend className="field__label">Current location</legend>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="currentLocation"
                value="inside_australia"
                checked={form.currentLocation === "inside_australia"}
                onChange={() => update("currentLocation", "inside_australia")}
                aria-invalid={!!errors.currentLocation}
                aria-describedby={
                  errors.currentLocation ? errId("currentLocation") : undefined
                }
              />
              Inside Australia
            </label>
            <label>
              <input
                type="radio"
                name="currentLocation"
                value="outside_australia"
                checked={form.currentLocation === "outside_australia"}
                onChange={() => update("currentLocation", "outside_australia")}
                aria-invalid={!!errors.currentLocation}
                aria-describedby={
                  errors.currentLocation ? errId("currentLocation") : undefined
                }
              />
              Outside Australia
            </label>
          </div>
          {errors.currentLocation ? (
            <div className="field__error" id={errId("currentLocation")}>
              {errors.currentLocation}
            </div>
          ) : null}
        </fieldset>

        {/* Current visa */}
        <div className={fieldClass("currentVisaSubclass")}>
          <label className="field__label" htmlFor="f-currentVisa">
            Current Australian visa subclass{" "}
            <span className="field__hint">(optional)</span>
          </label>
          <select
            id="f-currentVisa"
            value={form.currentVisaSubclass}
            onChange={(e) => update("currentVisaSubclass", e.target.value)}
            aria-invalid={!!errors.currentVisaSubclass}
            aria-describedby={
              errors.currentVisaSubclass
                ? errId("currentVisaSubclass")
                : undefined
            }
          >
            {VISA_SUBCLASS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.currentVisaSubclass ? (
            <div className="field__error" id={errId("currentVisaSubclass")}>
              {errors.currentVisaSubclass}
            </div>
          ) : null}
        </div>

        {/* Occupation */}
        <div className={`${fieldClass("occupationCodeOrName")} field--full`}>
          <label className="field__label" htmlFor="f-occupation">
            Occupation
            <span className="field__hint">
              {" "}
              — search by name or ANZSCO code. Tags show which skilled list it&apos;s on.
            </span>
          </label>
          <Combobox
            id="f-occupation"
            value={form.occupationCodeOrName}
            onChange={(v) => update("occupationCodeOrName", v)}
            options={OCCUPATION_OPTIONS}
            placeholder="e.g. Data Scientist or 261313"
            ariaInvalid={!!errors.occupationCodeOrName}
            ariaDescribedBy={
              errors.occupationCodeOrName
                ? errId("occupationCodeOrName")
                : undefined
            }
            emptyMessage="Not in our list — you can still type a free-form occupation and proceed; some subclasses will return insufficient evidence."
          />
          {errors.occupationCodeOrName ? (
            <div className="field__error" id={errId("occupationCodeOrName")}>
              {errors.occupationCodeOrName}
            </div>
          ) : null}
          {occupationKnown === false ? (
            <div className="field__note">
              This occupation isn&apos;t in our supported list — results may
              show &ldquo;insufficient evidence&rdquo; for some subclasses. You
              can still proceed.
            </div>
          ) : null}
        </div>

        {/* Skills assessment */}
        <fieldset className={fieldClass("skillsAssessment")}>
          <legend className="field__label">
            Skills assessment for this occupation?
            <span className="field__hint"> — optional</span>
          </legend>
          <p className="field__help">
            A suitable skills assessment from the relevant assessing authority
            is mandatory for the skilled visas (189, 190, 491, 186).
          </p>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="skillsAssessment"
                checked={form.skillsAssessment === "yes"}
                onChange={() => update("skillsAssessment", "yes")}
              />
              Yes, I have one
            </label>
            <label>
              <input
                type="radio"
                name="skillsAssessment"
                checked={form.skillsAssessment === "in_progress"}
                onChange={() => update("skillsAssessment", "in_progress")}
              />
              In progress
            </label>
            <label>
              <input
                type="radio"
                name="skillsAssessment"
                checked={form.skillsAssessment === "no"}
                onChange={() => update("skillsAssessment", "no")}
              />
              Not yet
            </label>
          </div>
        </fieldset>

        {/* English */}
        <div className={fieldClass("englishLevel")}>
          <label className="field__label" htmlFor="f-english">
            English level
          </label>
          <p className="field__help">
            Roughly: Functional ≈ IELTS 4.5, Vocational ≈ IELTS 5, Competent ≈ IELTS 6,
            Proficient ≈ IELTS 7, Superior ≈ IELTS 8. Competent is the floor for most skilled visas.
          </p>
          <select
            id="f-english"
            value={form.englishLevel}
            onChange={(e) =>
              update("englishLevel", e.target.value as EnglishLevel | "")
            }
            aria-invalid={!!errors.englishLevel}
            aria-describedby={
              errors.englishLevel ? errId("englishLevel") : undefined
            }
          >
            <option value="">Select…</option>
            <option value="none">None</option>
            <option value="functional">Functional</option>
            <option value="vocational">Vocational</option>
            <option value="competent">Competent</option>
            <option value="proficient">Proficient</option>
            <option value="superior">Superior</option>
          </select>
          {errors.englishLevel ? (
            <div className="field__error" id={errId("englishLevel")}>
              {errors.englishLevel}
            </div>
          ) : null}
        </div>

        {/* Qualification */}
        <div className={fieldClass("highestQualification")}>
          <label className="field__label" htmlFor="f-qual">
            Highest qualification
          </label>
          <select
            id="f-qual"
            value={form.highestQualification}
            onChange={(e) =>
              update(
                "highestQualification",
                e.target.value as Qualification | "",
              )
            }
            aria-invalid={!!errors.highestQualification}
            aria-describedby={
              errors.highestQualification
                ? errId("highestQualification")
                : undefined
            }
          >
            <option value="">Select…</option>
            <option value="none">None</option>
            <option value="secondary">Secondary school</option>
            <option value="certificate">Certificate</option>
            <option value="diploma">Diploma</option>
            <option value="bachelor">Bachelor</option>
            <option value="masters">Masters</option>
            <option value="doctorate">Doctorate</option>
          </select>
          {errors.highestQualification ? (
            <div className="field__error" id={errId("highestQualification")}>
              {errors.highestQualification}
            </div>
          ) : null}
        </div>

        {/* Australian study */}
        <fieldset className={fieldClass("australianStudyCompleted")}>
          <legend className="field__label">Completed study in Australia?</legend>
          <p className="field__help">
            Yes only if you completed a CRICOS-registered qualification of 92+ weeks in Australia
            (the Australian Study Requirement). Short courses and language schools don&apos;t count.
          </p>
          <div className="bool-group">
            <label>
              <input
                type="radio"
                name="australianStudyCompleted"
                checked={form.australianStudyCompleted === "yes"}
                onChange={() => update("australianStudyCompleted", "yes")}
                aria-invalid={!!errors.australianStudyCompleted}
                aria-describedby={
                  errors.australianStudyCompleted
                    ? errId("australianStudyCompleted")
                    : undefined
                }
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="australianStudyCompleted"
                checked={form.australianStudyCompleted === "no"}
                onChange={() => update("australianStudyCompleted", "no")}
                aria-invalid={!!errors.australianStudyCompleted}
                aria-describedby={
                  errors.australianStudyCompleted
                    ? errId("australianStudyCompleted")
                    : undefined
                }
              />
              No
            </label>
          </div>
          {errors.australianStudyCompleted ? (
            <div
              className="field__error"
              id={errId("australianStudyCompleted")}
            >
              {errors.australianStudyCompleted}
            </div>
          ) : null}
        </fieldset>

        {/* Years experience */}
        <div className={fieldClass("yearsRelevantExperience")}>
          <label className="field__label" htmlFor="f-exp">
            Years of relevant work experience
          </label>
          <p className="field__help">
            Skilled, paid work in your nominated occupation (or closely related), usually after
            qualifying. Self-employment counts if documented.
          </p>
          <input
            id="f-exp"
            type="number"
            min={0}
            step={0.5}
            value={form.yearsRelevantExperience}
            onChange={(e) =>
              update("yearsRelevantExperience", e.target.value)
            }
            placeholder="0"
            aria-invalid={!!errors.yearsRelevantExperience}
            aria-describedby={
              errors.yearsRelevantExperience
                ? errId("yearsRelevantExperience")
                : undefined
            }
          />
          {errors.yearsRelevantExperience ? (
            <div
              className="field__error"
              id={errId("yearsRelevantExperience")}
            >
              {errors.yearsRelevantExperience}
            </div>
          ) : null}
        </div>

        {/* Employer sponsor */}
        <fieldset className={fieldClass("hasEligibleEmployerSponsor")}>
          <legend className="field__label">Eligible employer sponsor?</legend>
          <p className="field__help">
            Yes only if you already have an Australian employer who is an approved sponsor (e.g.
            Standard Business Sponsor) ready to nominate you for a 482 or 186 visa.
          </p>
          <div className="bool-group">
            <label>
              <input
                type="radio"
                name="hasEligibleEmployerSponsor"
                checked={form.hasEligibleEmployerSponsor === "yes"}
                onChange={() => update("hasEligibleEmployerSponsor", "yes")}
                aria-invalid={!!errors.hasEligibleEmployerSponsor}
                aria-describedby={
                  errors.hasEligibleEmployerSponsor
                    ? errId("hasEligibleEmployerSponsor")
                    : undefined
                }
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="hasEligibleEmployerSponsor"
                checked={form.hasEligibleEmployerSponsor === "no"}
                onChange={() => update("hasEligibleEmployerSponsor", "no")}
                aria-invalid={!!errors.hasEligibleEmployerSponsor}
                aria-describedby={
                  errors.hasEligibleEmployerSponsor
                    ? errId("hasEligibleEmployerSponsor")
                    : undefined
                }
              />
              No
            </label>
          </div>
          {errors.hasEligibleEmployerSponsor ? (
            <div
              className="field__error"
              id={errId("hasEligibleEmployerSponsor")}
            >
              {errors.hasEligibleEmployerSponsor}
            </div>
          ) : null}
        </fieldset>

        {/* Salary band */}
        <fieldset className={fieldClass("salaryBand")}>
          <legend className="field__label">
            Expected salary in an Australian role?
            <span className="field__hint"> — optional</span>
          </legend>
          <p className="field__help">
            Employer-sponsored roles (482) must pay at least AUD 76,515
            (2025-26 Core Skills Income Threshold).
          </p>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="salaryBand"
                checked={form.salaryBand === "under_76k"}
                onChange={() => update("salaryBand", "under_76k")}
              />
              Under $76k
            </label>
            <label>
              <input
                type="radio"
                name="salaryBand"
                checked={form.salaryBand === "76k_to_141k"}
                onChange={() => update("salaryBand", "76k_to_141k")}
              />
              $76k&ndash;$141k
            </label>
            <label>
              <input
                type="radio"
                name="salaryBand"
                checked={form.salaryBand === "over_141k"}
                onChange={() => update("salaryBand", "over_141k")}
              />
              Over $141k
            </label>
            <label>
              <input
                type="radio"
                name="salaryBand"
                checked={form.salaryBand === "unknown"}
                onChange={() => update("salaryBand", "unknown")}
              />
              Not sure yet
            </label>
          </div>
        </fieldset>

        {/* State nomination */}
        <fieldset className={fieldClass("hasStateNomination")}>
          <legend className="field__label">State/territory nomination?</legend>
          <p className="field__help">
            Required for 190 and (state-nominated) 491 visas. Each state runs its own occupation
            list and selection process. Yes only if a state/territory has already nominated you.
          </p>
          <div className="bool-group">
            <label>
              <input
                type="radio"
                name="hasStateNomination"
                checked={form.hasStateNomination === "yes"}
                onChange={() => update("hasStateNomination", "yes")}
                aria-invalid={!!errors.hasStateNomination}
                aria-describedby={
                  errors.hasStateNomination
                    ? errId("hasStateNomination")
                    : undefined
                }
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="hasStateNomination"
                checked={form.hasStateNomination === "no"}
                onChange={() => update("hasStateNomination", "no")}
                aria-invalid={!!errors.hasStateNomination}
                aria-describedby={
                  errors.hasStateNomination
                    ? errId("hasStateNomination")
                    : undefined
                }
              />
              No
            </label>
          </div>
          {errors.hasStateNomination ? (
            <div className="field__error" id={errId("hasStateNomination")}>
              {errors.hasStateNomination}
            </div>
          ) : null}
        </fieldset>

        {/* Regional */}
        <fieldset className={fieldClass("willingToLiveRegional")}>
          <legend className="field__label">Willing to live/work regional?</legend>
          <p className="field__help">
            &ldquo;Regional&rdquo; means anywhere outside greater Sydney, Melbourne, and Brisbane —
            so Adelaide, Perth, Hobart, Canberra, Darwin, Gold Coast and all rural areas. Yes
            unlocks the 491 Skilled Work Regional visa.
          </p>
          <div className="bool-group">
            <label>
              <input
                type="radio"
                name="willingToLiveRegional"
                checked={form.willingToLiveRegional === "yes"}
                onChange={() => update("willingToLiveRegional", "yes")}
                aria-invalid={!!errors.willingToLiveRegional}
                aria-describedby={
                  errors.willingToLiveRegional
                    ? errId("willingToLiveRegional")
                    : undefined
                }
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="willingToLiveRegional"
                checked={form.willingToLiveRegional === "no"}
                onChange={() => update("willingToLiveRegional", "no")}
                aria-invalid={!!errors.willingToLiveRegional}
                aria-describedby={
                  errors.willingToLiveRegional
                    ? errId("willingToLiveRegional")
                    : undefined
                }
              />
              No
            </label>
          </div>
          {errors.willingToLiveRegional ? (
            <div className="field__error" id={errId("willingToLiveRegional")}>
              {errors.willingToLiveRegional}
            </div>
          ) : null}
        </fieldset>

        {/* Study intent */}
        <fieldset className={fieldClass("studyIntent")}>
          <legend className="field__label">Intend to study in Australia?</legend>
          <div className="bool-group">
            <label>
              <input
                type="radio"
                name="studyIntent"
                checked={form.studyIntent === "yes"}
                onChange={() => update("studyIntent", "yes")}
                aria-invalid={!!errors.studyIntent}
                aria-describedby={
                  errors.studyIntent ? errId("studyIntent") : undefined
                }
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="studyIntent"
                checked={form.studyIntent === "no"}
                onChange={() => update("studyIntent", "no")}
                aria-invalid={!!errors.studyIntent}
                aria-describedby={
                  errors.studyIntent ? errId("studyIntent") : undefined
                }
              />
              No
            </label>
          </div>
          {errors.studyIntent ? (
            <div className="field__error" id={errId("studyIntent")}>
              {errors.studyIntent}
            </div>
          ) : null}
        </fieldset>

        {/* Partner status */}
        <fieldset className={fieldClass("partnerStatus")}>
          <legend className="field__label">
            Partner situation?
            <span className="field__hint"> — optional</span>
          </legend>
          <p className="field__help">
            Affects the skilled points estimate: single applicants and those
            whose partner also meets age/English/skills criteria score 10
            points; a partner who doesn&apos;t scores 0.
          </p>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="partnerStatus"
                checked={form.partnerStatus === "single"}
                onChange={() => update("partnerStatus", "single")}
              />
              Single
            </label>
            <label>
              <input
                type="radio"
                name="partnerStatus"
                checked={form.partnerStatus === "partner_skilled"}
                onChange={() => update("partnerStatus", "partner_skilled")}
              />
              Partner, meets skilled criteria
            </label>
            <label>
              <input
                type="radio"
                name="partnerStatus"
                checked={form.partnerStatus === "partner_not_skilled"}
                onChange={() => update("partnerStatus", "partner_not_skilled")}
              />
              Partner, doesn&apos;t meet them
            </label>
          </div>
        </fieldset>

        {/* Funds band */}
        <div className={fieldClass("fundsBand")}>
          <label className="field__label" htmlFor="f-funds">
            Available funds / savings
          </label>
          <select
            id="f-funds"
            value={form.fundsBand}
            onChange={(e) => update("fundsBand", e.target.value as FundsBand | "")}
            aria-invalid={!!errors.fundsBand}
            aria-describedby={errors.fundsBand ? errId("fundsBand") : undefined}
          >
            <option value="">Select…</option>
            <option value="under_5k">Under AUD 5,000</option>
            <option value="5k_20k">AUD 5,000 – 20,000</option>
            <option value="20k_50k">AUD 20,000 – 50,000</option>
            <option value="over_50k">Over AUD 50,000</option>
          </select>
          {errors.fundsBand ? (
            <div className="field__error" id={errId("fundsBand")}>
              {errors.fundsBand}
            </div>
          ) : null}
        </div>

        {/* Goal */}
        <fieldset className={`${fieldClass("goal")} field--full`}>
          <legend className="field__label">Your goal</legend>
          <p className="field__help">
            Temporary = short stay (months to a few years). Study = enrol in an Australian course.
            Work = take a job in Australia (usually employer-sponsored). PR = permanent residence.
          </p>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="goal"
                checked={form.goal === "temporary"}
                onChange={() => update("goal", "temporary")}
                aria-invalid={!!errors.goal}
                aria-describedby={errors.goal ? errId("goal") : undefined}
              />
              Temporary stay
            </label>
            <label>
              <input
                type="radio"
                name="goal"
                checked={form.goal === "study"}
                onChange={() => update("goal", "study")}
                aria-invalid={!!errors.goal}
                aria-describedby={errors.goal ? errId("goal") : undefined}
              />
              Study
            </label>
            <label>
              <input
                type="radio"
                name="goal"
                checked={form.goal === "work"}
                onChange={() => update("goal", "work")}
                aria-invalid={!!errors.goal}
                aria-describedby={errors.goal ? errId("goal") : undefined}
              />
              Work
            </label>
            <label>
              <input
                type="radio"
                name="goal"
                checked={form.goal === "pr"}
                onChange={() => update("goal", "pr")}
                aria-invalid={!!errors.goal}
                aria-describedby={errors.goal ? errId("goal") : undefined}
              />
              Permanent residence
            </label>
          </div>
          {errors.goal ? (
            <div className="field__error" id={errId("goal")}>
              {errors.goal}
            </div>
          ) : null}
        </fieldset>
      </div>

      {submitted && Object.keys(errors).length > 0 ? (
        <div className="wizard__error-summary" role="alert">
          Please fix the {Object.keys(errors).length} highlighted field
          {Object.keys(errors).length === 1 ? "" : "s"} above before continuing.
        </div>
      ) : null}

      <div className="wizard__actions">
        <button type="submit" className="btn btn--primary">
          See ranked visa results
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            setForm(INITIAL_STATE);
            setErrors({});
            setSubmitted(false);
          }}
        >
          Reset
        </button>
      </div>
    </form>
  );
}
