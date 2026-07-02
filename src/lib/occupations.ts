export type SkilledList = "MLTSSL" | "STSOL" | "ROL" | "CSOL";

export interface Occupation {
  code: string;
  name: string;
  skilledLists: SkilledList[];
}

/**
 * Working occupation list. Populated from data/occupations.json when present,
 * with a small hand-coded fallback otherwise. The data file is fetched on
 * module load (server-side) via a static import in Next.js.
 */
let OCCUPATIONS_DATA: Occupation[] | null = null;

function loadFromDataFile(): Occupation[] | null {
  try {
    // Static import so Next bundler picks it up; falls back if file missing.

    const raw = require("../../data/occupations.json");
    if (raw && Array.isArray(raw.occupations)) {
      return raw.occupations
        .filter((o: unknown): o is Occupation => {
          if (typeof o !== "object" || o === null) return false;
          const r = o as Record<string, unknown>;
          return (
            typeof r.code === "string" &&
            typeof r.name === "string" &&
            Array.isArray(r.skilledLists)
          );
        })
        .map((o: Occupation) => ({
          code: o.code,
          name: o.name,
          skilledLists: o.skilledLists.filter(
            (l) => l === "MLTSSL" || l === "STSOL" || l === "ROL" || l === "CSOL",
          ),
        }));
    }
  } catch {
    // Data file not present yet — fall through to baseline.
  }
  return null;
}

const BASELINE: Occupation[] = [
  { code: "261313", name: "Software Engineer", skilledLists: ["MLTSSL"] },
  { code: "261312", name: "Developer Programmer", skilledLists: ["MLTSSL"] },
  { code: "261311", name: "Analyst Programmer", skilledLists: ["MLTSSL"] },
  { code: "261111", name: "ICT Business Analyst", skilledLists: ["MLTSSL"] },
  { code: "261112", name: "Systems Analyst", skilledLists: ["MLTSSL"] },
  { code: "224999", name: "Data Scientist", skilledLists: ["MLTSSL"] },
  { code: "261314", name: "Software Tester", skilledLists: ["STSOL"] },
  { code: "263111", name: "Computer Network and Systems Engineer", skilledLists: ["MLTSSL"] },
  { code: "262112", name: "ICT Security Specialist", skilledLists: ["MLTSSL"] },
  { code: "254499", name: "Registered Nurse", skilledLists: ["MLTSSL"] },
  { code: "254411", name: "Nurse Practitioner", skilledLists: ["MLTSSL"] },
  { code: "253111", name: "General Practitioner", skilledLists: ["MLTSSL"] },
  { code: "221111", name: "Accountant", skilledLists: ["MLTSSL"] },
  { code: "221213", name: "External Auditor", skilledLists: ["MLTSSL"] },
  { code: "233211", name: "Civil Engineer", skilledLists: ["MLTSSL"] },
  { code: "233311", name: "Electrical Engineer", skilledLists: ["MLTSSL"] },
  { code: "233512", name: "Mechanical Engineer", skilledLists: ["MLTSSL"] },
  { code: "241111", name: "Early Childhood (Pre-primary School) Teacher", skilledLists: ["MLTSSL"] },
  { code: "241411", name: "Secondary School Teacher", skilledLists: ["MLTSSL"] },
  { code: "241213", name: "Primary School Teacher", skilledLists: ["MLTSSL"] },
  { code: "133111", name: "Construction Project Manager", skilledLists: ["MLTSSL"] },
  { code: "351311", name: "Chef", skilledLists: ["MLTSSL"] },
  { code: "341111", name: "Electrician (General)", skilledLists: ["MLTSSL"] },
  { code: "334111", name: "Plumber (General)", skilledLists: ["MLTSSL"] },
  { code: "331212", name: "Carpenter", skilledLists: ["MLTSSL"] },
  { code: "311211", name: "Anaesthetic Technician", skilledLists: ["STSOL"] },
  { code: "321211", name: "Motor Mechanic (General)", skilledLists: ["MLTSSL"] },
  { code: "411711", name: "Community Worker", skilledLists: ["STSOL"] },
  { code: "234212", name: "Food Technologist", skilledLists: ["MLTSSL"] },
  { code: "234511", name: "Life Scientist (General)", skilledLists: ["MLTSSL"] },
  { code: "234711", name: "Veterinarian", skilledLists: ["MLTSSL"] },
];

function getOccupations(): Occupation[] {
  if (OCCUPATIONS_DATA) return OCCUPATIONS_DATA;
  OCCUPATIONS_DATA = loadFromDataFile() ?? BASELINE;
  return OCCUPATIONS_DATA;
}

export const OCCUPATIONS: ReadonlyArray<Occupation> = getOccupations();

export function findOccupation(input: string): Occupation | undefined {
  const v = input.trim().toLowerCase();
  if (!v) return undefined;
  // 1. Exact code match.
  for (const o of OCCUPATIONS) {
    if (o.code === input.trim()) return o;
  }
  // 2. Exact name match.
  for (const o of OCCUPATIONS) {
    if (o.name.toLowerCase() === v) return o;
  }
  // 3. User text contains the official name (e.g. "Senior Software Engineer" → "Software Engineer").
  // Require at least 4 chars to avoid spurious matches against short words.
  for (const o of OCCUPATIONS) {
    const n = o.name.toLowerCase();
    if (n.length >= 4 && v.includes(n)) return o;
  }
  // 4. Official name contains user text (e.g. "Project Manager" → "Construction Project Manager").
  if (v.length >= 4) {
    for (const o of OCCUPATIONS) {
      if (o.name.toLowerCase().includes(v)) return o;
    }
  }
  return undefined;
}

export function isOccupationOnList(
  input: string,
  lists: ReadonlyArray<SkilledList>,
): boolean {
  const o = findOccupation(input);
  if (!o) return false;
  return lists.some((l) => o.skilledLists.includes(l));
}
