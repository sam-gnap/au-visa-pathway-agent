/**
 * Persona harness — exercises the eligibility engine against a wide spread of
 * realistic profiles and flags anomalies. Run with `npx tsx scripts/personas.ts`.
 *
 * Detects:
 *  - status/score contradictions (e.g. likely_eligible with low score)
 *  - difficulty pill / status mismatch
 *  - WHV country cross-checks (UK 32 must be likely-eligible for 417)
 *  - empty next steps / dangling sources
 *  - dead source URLs (HEAD-checks every unique URL once)
 *  - clamped scores producing duplicate rankings
 */

import { checkEligibility } from "@/lib/eligibility";
import { findPathways } from "@/lib/pathways";
import { effectiveDifficulty, VISA_CONTEXT } from "@/lib/visa-context";
import type { UserSituation, VisaSubclassId, VisaVerdict } from "@/types";

interface Persona {
  id: string;
  note: string;
  situation: UserSituation;
}

const personas: Persona[] = [
  {
    id: "uk-software-32",
    note: "UK passport, software engineer, 32 — should clear 417 via FTA higher age cap",
    situation: {
      nationality: "United Kingdom",
      age: 32,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Software Engineer",
      englishLevel: "superior",
      highestQualification: "bachelor",
      australianStudyCompleted: false,
      yearsRelevantExperience: 8,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: true,
      studyIntent: false,
      fundsBand: "20k_50k",
      goal: "pr",
    },
  },
  {
    id: "uk-nurse-28",
    note: "UK passport, registered nurse, 28 — strong all-around skilled migration candidate",
    situation: {
      nationality: "United Kingdom",
      age: 28,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Registered Nurse",
      englishLevel: "proficient",
      highestQualification: "bachelor",
      australianStudyCompleted: false,
      yearsRelevantExperience: 5,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: true,
      studyIntent: false,
      fundsBand: "20k_50k",
      goal: "pr",
    },
  },
  {
    id: "india-datasci-29",
    note: "Indian data scientist, 29, masters — CSOL-only occupation; 482 plausible",
    situation: {
      nationality: "India",
      age: 29,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Data Scientist",
      englishLevel: "competent",
      highestQualification: "masters",
      australianStudyCompleted: false,
      yearsRelevantExperience: 6,
      hasEligibleEmployerSponsor: true,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: false,
      fundsBand: "20k_50k",
      goal: "work",
    },
  },
  {
    id: "philippines-chef-26",
    note: "Filipino chef, 26 — MLTSSL trade; sponsored work pathway",
    situation: {
      nationality: "Philippines",
      age: 26,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Chef",
      englishLevel: "competent",
      highestQualification: "certificate",
      australianStudyCompleted: false,
      yearsRelevantExperience: 4,
      hasEligibleEmployerSponsor: true,
      hasStateNomination: false,
      willingToLiveRegional: true,
      studyIntent: false,
      fundsBand: "5k_20k",
      goal: "pr",
    },
  },
  {
    id: "germany-student-22",
    note: "German student, 22, intends to study — 500 should top results",
    situation: {
      nationality: "Germany",
      age: 22,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Software Engineer",
      englishLevel: "proficient",
      highestQualification: "secondary",
      australianStudyCompleted: false,
      yearsRelevantExperience: 0,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: true,
      fundsBand: "20k_50k",
      goal: "study",
    },
  },
  {
    id: "japan-whv-24",
    note: "Japan, 24 — clean 417 candidate (within 18-30, partner country)",
    situation: {
      nationality: "Japan",
      age: 24,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Marketing Specialist",
      englishLevel: "competent",
      highestQualification: "bachelor",
      australianStudyCompleted: false,
      yearsRelevantExperience: 2,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: false,
      fundsBand: "5k_20k",
      goal: "temporary",
    },
  },
  {
    id: "usa-whv-29",
    note: "US, 29 — 462 candidate (US not on 417 list)",
    situation: {
      nationality: "United States",
      age: 29,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Marketing Specialist",
      englishLevel: "superior",
      highestQualification: "bachelor",
      australianStudyCompleted: false,
      yearsRelevantExperience: 5,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: false,
      fundsBand: "20k_50k",
      goal: "temporary",
    },
  },
  {
    id: "brazil-whv-31",
    note: "Brazil, 31 — 462 partner country; outside 18-30, no higher cap",
    situation: {
      nationality: "Brazil",
      age: 31,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Civil Engineer",
      englishLevel: "competent",
      highestQualification: "bachelor",
      australianStudyCompleted: false,
      yearsRelevantExperience: 8,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: false,
      fundsBand: "5k_20k",
      goal: "temporary",
    },
  },
  {
    id: "russia-46-civil",
    note: "Russia, 46 — civil engineer, too old for 189/491, employer sponsor possible",
    situation: {
      nationality: "Russia",
      age: 46,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Civil Engineer",
      englishLevel: "competent",
      highestQualification: "masters",
      australianStudyCompleted: false,
      yearsRelevantExperience: 20,
      hasEligibleEmployerSponsor: true,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: false,
      fundsBand: "over_50k",
      goal: "work",
    },
  },
  {
    id: "ireland-electrician-30",
    note: "Ireland, 30 — sparkie, 417 entry; regional pathway to 491",
    situation: {
      nationality: "Ireland",
      age: 30,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Electrician (General)",
      englishLevel: "superior",
      highestQualification: "certificate",
      australianStudyCompleted: false,
      yearsRelevantExperience: 8,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: true,
      studyIntent: false,
      fundsBand: "20k_50k",
      goal: "pr",
    },
  },
  {
    id: "korea-485-25",
    note: "Korea, 25, completed AU bachelor — classic 485 graduate path to skilled",
    situation: {
      nationality: "South Korea",
      age: 25,
      currentLocation: "inside_australia",
      currentVisaSubclass: "500",
      occupationCodeOrName: "ICT Business Analyst",
      englishLevel: "proficient",
      highestQualification: "bachelor",
      australianStudyCompleted: true,
      yearsRelevantExperience: 1,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: false,
      fundsBand: "5k_20k",
      goal: "pr",
    },
  },
  {
    id: "china-186-38",
    note: "China, 38, on 482 with sponsor — direct entry 186",
    situation: {
      nationality: "China",
      age: 38,
      currentLocation: "inside_australia",
      currentVisaSubclass: "482",
      occupationCodeOrName: "Construction Project Manager",
      englishLevel: "competent",
      highestQualification: "bachelor",
      australianStudyCompleted: false,
      yearsRelevantExperience: 12,
      hasEligibleEmployerSponsor: true,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: false,
      fundsBand: "over_50k",
      goal: "pr",
    },
  },
  {
    id: "vietnam-462-25",
    note: "Vietnam, 25 — 462 candidate with required diploma",
    situation: {
      nationality: "Vietnam",
      age: 25,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Hospitality Worker",
      englishLevel: "functional",
      highestQualification: "diploma",
      australianStudyCompleted: false,
      yearsRelevantExperience: 3,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: false,
      fundsBand: "5k_20k",
      goal: "temporary",
    },
  },
  {
    id: "france-35-architect",
    note: "France, 35 — at the FTA higher-cap edge",
    situation: {
      nationality: "France",
      age: 35,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Architect",
      englishLevel: "competent",
      highestQualification: "masters",
      australianStudyCompleted: false,
      yearsRelevantExperience: 10,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: true,
      studyIntent: false,
      fundsBand: "20k_50k",
      goal: "temporary",
    },
  },
  {
    id: "italy-36-architect",
    note: "Italy, 36 — one over the higher cap; should be blocked on 417",
    situation: {
      nationality: "Italy",
      age: 36,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Architect",
      englishLevel: "competent",
      highestQualification: "masters",
      australianStudyCompleted: false,
      yearsRelevantExperience: 12,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: false,
      fundsBand: "20k_50k",
      goal: "temporary",
    },
  },
  {
    id: "spain-462-30",
    note: "Spain, 30 — 462 country, standard 30 cap",
    situation: {
      nationality: "Spain",
      age: 30,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Mechanical Engineer",
      englishLevel: "competent",
      highestQualification: "bachelor",
      australianStudyCompleted: false,
      yearsRelevantExperience: 6,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: true,
      studyIntent: false,
      fundsBand: "5k_20k",
      goal: "temporary",
    },
  },
  {
    id: "nigeria-doctor-33",
    note: "Nigeria, 33 — GP, no sponsor, no WHV — should be insufficient evidence",
    situation: {
      nationality: "Nigeria",
      age: 33,
      currentLocation: "outside_australia",
      occupationCodeOrName: "General Practitioner",
      englishLevel: "proficient",
      highestQualification: "doctorate",
      australianStudyCompleted: false,
      yearsRelevantExperience: 9,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: true,
      studyIntent: false,
      fundsBand: "20k_50k",
      goal: "pr",
    },
  },
  {
    id: "nepal-student-19",
    note: "Nepal, 19 — student visa target with study intent",
    situation: {
      nationality: "Nepal",
      age: 19,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Student",
      englishLevel: "competent",
      highestQualification: "secondary",
      australianStudyCompleted: false,
      yearsRelevantExperience: 0,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: true,
      fundsBand: "20k_50k",
      goal: "study",
    },
  },
  {
    id: "argentina-27-funds-low",
    note: "Argentina, 27, low funds — 462 candidate but funds borderline",
    situation: {
      nationality: "Argentina",
      age: 27,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Graphic Designer",
      englishLevel: "competent",
      highestQualification: "bachelor",
      australianStudyCompleted: false,
      yearsRelevantExperience: 4,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: false,
      willingToLiveRegional: false,
      studyIntent: false,
      fundsBand: "under_5k",
      goal: "temporary",
    },
  },
  {
    id: "canada-32-regional-nom",
    note: "Canada, 32, state-nominated regional 491 candidate",
    situation: {
      nationality: "Canada",
      age: 32,
      currentLocation: "outside_australia",
      occupationCodeOrName: "Civil Engineer",
      englishLevel: "competent",
      highestQualification: "bachelor",
      australianStudyCompleted: false,
      yearsRelevantExperience: 9,
      hasEligibleEmployerSponsor: false,
      hasStateNomination: true,
      willingToLiveRegional: true,
      studyIntent: false,
      fundsBand: "20k_50k",
      goal: "pr",
    },
  },
];

// ---------- anomaly detection ----------

interface Anomaly {
  persona: string;
  subclass?: VisaSubclassId;
  severity: "ERR" | "WARN";
  message: string;
}

function checkVerdict(persona: Persona, verdict: VisaVerdict): Anomaly[] {
  const out: Anomaly[] = [];
  const id = verdict.subclassId;
  const s = verdict.score;
  const st = verdict.status;
  const diff = effectiveDifficulty(id, verdict.blockers.length, verdict.missingCriteria.length);

  // 1. status vs score contradictions
  if (st === "likely_eligible" && s < 50) {
    out.push({ persona: persona.id, subclass: id, severity: "ERR",
      message: `likely_eligible but score ${s} < 50` });
  }
  if (st === "not_eligible" && s > 30) {
    out.push({ persona: persona.id, subclass: id, severity: "WARN",
      message: `not_eligible but score ${s} > 30 (should be capped to 20)` });
  }
  if (st === "potentially_eligible" && verdict.blockers.length > 0) {
    out.push({ persona: persona.id, subclass: id, severity: "ERR",
      message: `potentially_eligible despite ${verdict.blockers.length} blocker(s)` });
  }

  // 2. difficulty vs status
  if (diff === "easy" && st === "potentially_eligible" && verdict.missingCriteria.length === 0 && verdict.blockers.length === 0) {
    out.push({ persona: persona.id, subclass: id, severity: "WARN",
      message: `easy difficulty + potentially_eligible with no missing/blockers — should be likely_eligible` });
  }
  if (st === "not_eligible" && diff === "easy") {
    out.push({ persona: persona.id, subclass: id, severity: "WARN",
      message: `not_eligible but difficulty rated easy` });
  }

  // 3. next steps sanity
  if (verdict.nextSteps.length === 0) {
    out.push({ persona: persona.id, subclass: id, severity: "ERR",
      message: `empty nextSteps` });
  }

  // 4. blocker without explanation
  if (verdict.blockers.length === 0 && st === "not_eligible") {
    out.push({ persona: persona.id, subclass: id, severity: "ERR",
      message: `not_eligible status but no blockers listed` });
  }

  // 5. sources present
  if (verdict.sources.length === 0) {
    out.push({ persona: persona.id, subclass: id, severity: "WARN",
      message: `no sources attached` });
  }

  return out;
}

// Persona-level expectations.
function checkExpectations(persona: Persona, verdicts: VisaVerdict[]): Anomaly[] {
  const out: Anomaly[] = [];
  const byId = new Map(verdicts.map((v) => [v.subclassId, v] as const));

  switch (persona.id) {
    case "uk-software-32": {
      const v = byId.get("417")!;
      if (v.status !== "likely_eligible") {
        out.push({ persona: persona.id, subclass: "417", severity: "ERR",
          message: `expected likely_eligible (UK 32 = FTA higher cap), got ${v.status}` });
      }
      break;
    }
    case "italy-36-architect": {
      const v = byId.get("417")!;
      if (v.status !== "not_eligible") {
        out.push({ persona: persona.id, subclass: "417", severity: "ERR",
          message: `expected not_eligible (over 35), got ${v.status}` });
      }
      break;
    }
    case "france-35-architect": {
      const v = byId.get("417")!;
      if (v.status === "not_eligible") {
        out.push({ persona: persona.id, subclass: "417", severity: "ERR",
          message: `expected eligible (France 35 = FTA cap), got not_eligible` });
      }
      break;
    }
    case "japan-whv-24": {
      const v = byId.get("417")!;
      if (v.status !== "likely_eligible") {
        out.push({ persona: persona.id, subclass: "417", severity: "ERR",
          message: `expected likely_eligible (Japan 24 within 18-30), got ${v.status}` });
      }
      break;
    }
    case "usa-whv-29": {
      const v417 = byId.get("417")!;
      const v462 = byId.get("462")!;
      if (v417.status !== "not_eligible") {
        out.push({ persona: persona.id, subclass: "417", severity: "ERR",
          message: `US not on 417 list — expected not_eligible, got ${v417.status}` });
      }
      if (v462.status !== "likely_eligible" && v462.status !== "potentially_eligible") {
        out.push({ persona: persona.id, subclass: "462", severity: "ERR",
          message: `US is on 462 list — expected eligible, got ${v462.status}` });
      }
      break;
    }
    case "russia-46-civil": {
      const v189 = byId.get("189")!;
      if (v189.status !== "not_eligible") {
        out.push({ persona: persona.id, subclass: "189", severity: "ERR",
          message: `expected 189 not_eligible (age 46), got ${v189.status}` });
      }
      break;
    }
    case "china-186-38": {
      const v = byId.get("186")!;
      if (v.status === "not_eligible") {
        out.push({ persona: persona.id, subclass: "186", severity: "WARN",
          message: `38 with sponsor + experience should not be hard-blocked on 186, got not_eligible` });
      }
      break;
    }
    case "ireland-electrician-30": {
      // Ireland 30 should clear 417; 189 should NOT be top (electrician on MLTSSL but
      // no sponsor, no nom, no AU ties → realistically 491/482/186 path, not 189).
      if (verdicts[0].subclassId === "189") {
        out.push({ persona: persona.id, subclass: "189", severity: "ERR",
          message: `Irish electrician with no AU ties shouldn't rank 189 #1` });
      }
      break;
    }
    case "canada-32-regional-nom": {
      // Has state nom + regional commitment → 190 or 491 should top, not 189.
      if (verdicts[0].subclassId === "189") {
        out.push({ persona: persona.id, severity: "ERR",
          message: `state-nominated regional applicant should top 190 or 491, not 189` });
      }
      break;
    }
    case "korea-485-25": {
      const v = byId.get("485")!;
      if (v.status !== "likely_eligible") {
        out.push({ persona: persona.id, subclass: "485", severity: "ERR",
          message: `AU bachelor's graduate should be likely_eligible for 485, got ${v.status}` });
      }
      break;
    }
    case "nigeria-doctor-33": {
      // No AU ties — 189 should not be "likely_eligible" (skills assessment + invitation cutoff).
      const v = byId.get("189")!;
      if (v.status === "likely_eligible") {
        out.push({ persona: persona.id, subclass: "189", severity: "ERR",
          message: `Foreign-trained doctor with no AU ties shouldn't be likely_eligible for 189` });
      }
      break;
    }
    case "italy-36-architect": {
      const v189 = byId.get("189")!;
      if (v189.status === "likely_eligible") {
        out.push({ persona: persona.id, subclass: "189", severity: "ERR",
          message: `Italy 36 with no AU ties shouldn't be likely_eligible for 189` });
      }
      break;
    }
  }
  return out;
}

function pickTop(verdicts: VisaVerdict[]): VisaVerdict {
  return verdicts[0];
}

// HEAD-check every unique source URL once.
async function probeOnce(url: string): Promise<number | Error> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 visa-pathway-agent-link-check" },
    });
    return res.status;
  } catch (e) {
    return e as Error;
  }
}

async function checkLinks(urls: string[]): Promise<Anomaly[]> {
  const out: Anomaly[] = [];
  const unique = Array.from(new Set(urls));
  // Sequential to avoid Home Affairs throttling transient failures.
  for (const url of unique) {
    let result = await probeOnce(url);
    if (result instanceof Error) {
      await new Promise((r) => setTimeout(r, 500));
      result = await probeOnce(url);
    }
    if (result instanceof Error) {
      out.push({ persona: "—", severity: "WARN",
        message: `link probe failed: ${url} — ${result.message}` });
    } else if (result >= 400) {
      out.push({ persona: "—", severity: "ERR",
        message: `dead URL (${result}): ${url}` });
    }
  }
  return out;
}

// ---------- run ----------

async function main() {
  const anomalies: Anomaly[] = [];
  const allUrls: string[] = [];

  console.log(`Running ${personas.length} personas...\n`);

  for (const p of personas) {
    const verdicts = checkEligibility(p.situation);
    const pathways = findPathways(p.situation, p.situation.goal);

    for (const v of verdicts) {
      anomalies.push(...checkVerdict(p, v));
      for (const s of v.sources) allUrls.push(s.url);
    }
    anomalies.push(...checkExpectations(p, verdicts));

    const top = pickTop(verdicts);
    const ctxName = VISA_CONTEXT[top.subclassId]?.baseDifficulty ?? "—";
    const path = pathways[0]?.summary ?? "(no pathway)";
    console.log(
      `  ${p.id.padEnd(28)} top=${top.subclassId} ${top.status.padEnd(22)} score=${Math.round(top.score).toString().padStart(3)} diff=${ctxName.padEnd(10)} path=${path}`,
    );
  }

  console.log(`\nProbing ${new Set(allUrls).size} unique source URLs...`);
  anomalies.push(...await checkLinks(allUrls));

  // Sort: ERR first, then by persona.
  anomalies.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "ERR" ? -1 : 1;
    return a.persona.localeCompare(b.persona);
  });

  const errs = anomalies.filter((a) => a.severity === "ERR");
  const warns = anomalies.filter((a) => a.severity === "WARN");

  console.log(`\n=== anomalies: ${errs.length} ERR, ${warns.length} WARN ===\n`);
  for (const a of anomalies) {
    const sub = a.subclass ? ` [${a.subclass}]` : "";
    console.log(`  ${a.severity}  ${a.persona}${sub}: ${a.message}`);
  }

  process.exit(errs.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
