import type { PathwayEdge } from "@/types";

const LAST_CHECKED = "2026-06-23";

/**
 * MVP transition graph. Includes all edges required by MVP_REQUIREMENTS.md
 * §"Pathway graph requirements" plus a small number of related edges.
 *
 * Subclass 191 is the regional PR stepping stone for 491 holders. It is
 * represented explicitly as a graph node (`"191"`) with its own outgoing edge
 * to the terminal `"PR"` outcome, even though 191 itself is out of MVP scope
 * for rule evaluation.
 */
export const pathwayEdges: PathwayEdge[] = [
  {
    from: "500",
    to: "485",
    conditions: [
      "Completed a CRICOS-registered course of at least 2 academic years",
      "Applied within 6 months of course completion",
      "Under 35 years of age (with some exemptions for masters/PhD)",
    ],
    indicativeTimeframe: "Immediately after course completion (within 6 months)",
    risks: [
      "Course must meet the Australian Study Requirement",
      "Field of study may affect stream and duration",
    ],
    sources: [
      {
        title: "Temporary Graduate visa (subclass 485) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485",
        lastChecked: LAST_CHECKED,
      },
    ],
  },
  {
    from: "485",
    to: "482",
    conditions: [
      "Secure an eligible Australian employer sponsor",
      "Nominated occupation on a 482-eligible list",
      "Required English level and relevant work experience",
    ],
    indicativeTimeframe: "1–2 years on the 485 while gaining experience",
    risks: [
      "Occupation must remain on the relevant skilled list",
      "Sponsor must satisfy SBS / labour market testing requirements",
    ],
    sources: [
      {
        title: "Skills in Demand visa (subclass 482) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482",
        lastChecked: LAST_CHECKED,
      },
    ],
  },
  {
    from: "482",
    to: "186",
    conditions: [
      "Continued employer nomination by an approved sponsor",
      "Usually 2+ years working for the sponsor on the 482 (TRT stream)",
      "Under 45 at time of application (limited exemptions)",
      "Competent English",
    ],
    indicativeTimeframe: "2+ years after starting the 482",
    risks: [
      "Employer may not nominate for PR",
      "Occupation must remain on a 186-eligible list",
    ],
    sources: [
      {
        title: "Employer Nomination Scheme visa (subclass 186) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186",
        lastChecked: LAST_CHECKED,
      },
    ],
  },
  {
    from: "491",
    to: "191",
    conditions: [
      "Hold the 491 for at least 3 years",
      "Meet minimum income requirements during the qualifying period",
      "Comply with visa conditions (live, work, study in regional Australia)",
    ],
    indicativeTimeframe: "~3 years on the 491 before becoming eligible for the 191",
    risks: [
      "Failing to meet income or regional residency conditions disqualifies the 191",
      "Regional postcode definitions may change during the holding period",
    ],
    sources: [
      {
        title: "Skilled Work Regional (Provisional) visa (subclass 491) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491",
        lastChecked: LAST_CHECKED,
      },
      {
        title: "Permanent Residence (Skilled Regional) visa (subclass 191) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/permanent-residence-skilled-regional-191",
        lastChecked: LAST_CHECKED,
      },
    ],
  },
  {
    from: "191",
    to: "PR",
    conditions: [
      "Receive 191 grant — already a permanent visa",
      "Continue to meet character and health requirements at grant",
    ],
    indicativeTimeframe: "Permanent on grant",
    risks: [
      "Subclass 191 has its own evidentiary requirements (income, residency)",
    ],
    sources: [
      {
        title: "Permanent Residence (Skilled Regional) visa (subclass 191) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/permanent-residence-skilled-regional-191",
        lastChecked: LAST_CHECKED,
      },
    ],
  },
  {
    from: "190",
    to: "PR",
    conditions: [
      "Receive 190 grant — already a permanent visa",
      "Comply with any state nomination obligations (e.g. live in nominating state)",
    ],
    indicativeTimeframe: "Permanent on grant",
    risks: [
      "State nomination conditions are moral but inform future state nominations",
    ],
    sources: [
      {
        title: "Skilled Nominated visa (subclass 190) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190",
        lastChecked: LAST_CHECKED,
      },
    ],
  },
  {
    from: "189",
    to: "PR",
    conditions: [
      "Receive 189 grant — already a permanent visa",
    ],
    indicativeTimeframe: "Permanent on grant",
    risks: [
      "Invitation rounds depend on points and occupation ceiling",
    ],
    sources: [
      {
        title: "Skilled Independent visa (subclass 189) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189",
        lastChecked: LAST_CHECKED,
      },
    ],
  },
  {
    from: "186",
    to: "PR",
    conditions: ["Receive 186 grant — already a permanent visa"],
    indicativeTimeframe: "Permanent on grant",
    risks: ["Employer nomination must remain valid"],
    sources: [
      {
        title: "Employer Nomination Scheme visa (subclass 186) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186",
        lastChecked: LAST_CHECKED,
      },
    ],
  },
  {
    from: "417",
    to: "500",
    conditions: [
      "Enrol in a CRICOS-registered course",
      "Demonstrate Genuine Student intent",
      "Show sufficient funds",
    ],
    indicativeTimeframe: "During or at the end of the 417 stay",
    risks: [
      "Switching to a student visa requires meeting full 500 criteria",
      "Visa condition 8503 (no further stay) on some 417s blocks onshore changes",
    ],
    sources: [
      {
        title: "Student visa (subclass 500) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
        lastChecked: LAST_CHECKED,
      },
    ],
  },
  {
    from: "462",
    to: "500",
    conditions: [
      "Enrol in a CRICOS-registered course",
      "Demonstrate Genuine Student intent",
      "Show sufficient funds",
    ],
    indicativeTimeframe: "During or at the end of the 462 stay",
    risks: [
      "Switching to a student visa requires meeting full 500 criteria",
      "Visa condition 8503 (no further stay) on some 462s blocks onshore changes",
    ],
    sources: [
      {
        title: "Student visa (subclass 500) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
        lastChecked: LAST_CHECKED,
      },
    ],
  },
  {
    from: "500",
    to: "482",
    conditions: [
      "Secure an eligible Australian employer sponsor",
      "Nominated occupation on a 482-eligible list",
      "Sufficient post-study work experience or skills assessment",
    ],
    indicativeTimeframe: "After course completion (with or without intermediate 485)",
    risks: [
      "Most students transition via 485 first to build experience",
      "Occupation list changes may invalidate the path",
    ],
    sources: [
      {
        title: "Skills in Demand visa (subclass 482) — Home Affairs",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482",
        lastChecked: LAST_CHECKED,
      },
    ],
  },
];
