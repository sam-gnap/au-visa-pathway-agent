/**
 * A citation pointing to an authoritative or explanatory page.
 * `lastChecked` is an ISO date string (e.g. "2025-09-12").
 */
export interface Source {
  title: string;
  url: string;
  lastChecked: string;
}
