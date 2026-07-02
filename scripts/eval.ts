/**
 * Scripted eval runner for the AU Visa Pathway Agent MVP.
 *
 * Reads `data/eval/fixtures.json`, runs every fixture's UserSituation through
 * `checkEligibility` (and optionally `findPathways`), checks the declared
 * expectations, and prints a terminal-readable pass/fail summary.
 *
 * Exit code: 0 if every fixture passed, 1 if any failed.
 *
 * Designed to be deterministic, dependency-free, and ASCII-only so it's
 * comfortable to read in CI logs.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { checkEligibility } from "@/lib/eligibility";
import { findPathways } from "@/lib/pathways";
import type {
  UserSituation,
  VerdictStatus,
  VisaPathway,
  VisaSubclassId,
  VisaVerdict,
} from "@/types";

// ---------- Fixture types ----------

interface VerdictExpectation {
  status?: VerdictStatus | VerdictStatus[];
  mustNotBeBlocked?: boolean;
  mustBeBlocked?: boolean;
}

interface FixtureExpectations {
  verdicts?: Partial<Record<VisaSubclassId, VerdictExpectation>>;
  topRanked?: VisaSubclassId[];
  notTopRanked?: VisaSubclassId[];
  expectsAnyPathway?: boolean;
  expectsNoPathway?: boolean;
}

interface Fixture {
  id: string;
  description: string;
  situation: UserSituation;
  expectations: FixtureExpectations;
}

interface FixtureFile {
  fixtures: Fixture[];
}

// ---------- Helpers ----------

const ALL_SUBCLASSES: VisaSubclassId[] = [
  "189",
  "190",
  "491",
  "482",
  "186",
  "417",
  "462",
  "485",
  "500",
];

function loadFixtures(): Fixture[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, "..", "data", "eval", "fixtures.json");
  const raw = readFileSync(path, "utf-8");
  const parsed = JSON.parse(raw) as FixtureFile;
  if (!parsed.fixtures || !Array.isArray(parsed.fixtures)) {
    throw new Error("fixtures.json must contain a 'fixtures' array");
  }
  return parsed.fixtures;
}

function findVerdict(
  verdicts: VisaVerdict[],
  id: VisaSubclassId,
): VisaVerdict | undefined {
  return verdicts.find((v) => v.subclassId === id);
}

function normalizeStatus(
  status: VerdictStatus | VerdictStatus[] | undefined,
): VerdictStatus[] | undefined {
  if (status === undefined) return undefined;
  return Array.isArray(status) ? status : [status];
}

// ---------- Assertion runner ----------

interface FixtureResult {
  id: string;
  description: string;
  passed: boolean;
  failures: string[];
}

function evaluateFixture(fixture: Fixture): FixtureResult {
  const failures: string[] = [];

  let verdicts: VisaVerdict[];
  try {
    verdicts = checkEligibility(fixture.situation);
  } catch (err) {
    return {
      id: fixture.id,
      description: fixture.description,
      passed: false,
      failures: [`checkEligibility threw: ${(err as Error).message}`],
    };
  }

  if (verdicts.length !== ALL_SUBCLASSES.length) {
    failures.push(
      `Expected ${ALL_SUBCLASSES.length} verdicts, got ${verdicts.length}`,
    );
  }

  // Per-subclass verdict expectations
  const verdictExpectations = fixture.expectations.verdicts ?? {};
  for (const [rawId, expectation] of Object.entries(verdictExpectations)) {
    const id = rawId as VisaSubclassId;
    if (!expectation) continue;
    const verdict = findVerdict(verdicts, id);
    if (!verdict) {
      failures.push(`Subclass ${id}: no verdict returned`);
      continue;
    }

    const allowed = normalizeStatus(expectation.status);
    if (allowed && !allowed.includes(verdict.status)) {
      failures.push(
        `Subclass ${id}: expected status in [${allowed.join(", ")}], got '${verdict.status}'`,
      );
    }

    if (expectation.mustBeBlocked && verdict.blockers.length === 0) {
      failures.push(
        `Subclass ${id}: expected at least one blocker, got none`,
      );
    }

    if (expectation.mustNotBeBlocked && verdict.blockers.length > 0) {
      failures.push(
        `Subclass ${id}: expected no blockers, got [${verdict.blockers.join(" | ")}]`,
      );
    }
  }

  // Ranking expectations
  const topVerdict = verdicts[0];
  if (fixture.expectations.topRanked && fixture.expectations.topRanked.length > 0) {
    const allowed = fixture.expectations.topRanked;
    if (!topVerdict || !allowed.includes(topVerdict.subclassId)) {
      failures.push(
        `Top-ranked: expected one of [${allowed.join(", ")}], got '${topVerdict?.subclassId ?? "none"}'`,
      );
    }
  }
  if (fixture.expectations.notTopRanked && fixture.expectations.notTopRanked.length > 0) {
    const disallowed = fixture.expectations.notTopRanked;
    if (topVerdict && disallowed.includes(topVerdict.subclassId)) {
      failures.push(
        `Top-ranked: expected NOT one of [${disallowed.join(", ")}], got '${topVerdict.subclassId}'`,
      );
    }
  }

  // Pathway expectations
  if (
    fixture.expectations.expectsAnyPathway !== undefined ||
    fixture.expectations.expectsNoPathway !== undefined
  ) {
    let pathways: VisaPathway[] = [];
    try {
      pathways = findPathways(fixture.situation, fixture.situation.goal);
    } catch (err) {
      failures.push(`findPathways threw: ${(err as Error).message}`);
    }

    if (fixture.expectations.expectsAnyPathway && pathways.length === 0) {
      failures.push("Pathways: expected at least one pathway, got none");
    }
    if (fixture.expectations.expectsNoPathway && pathways.length > 0) {
      failures.push(
        `Pathways: expected zero pathways, got ${pathways.length} (e.g. '${pathways[0]?.summary ?? ""}')`,
      );
    }
  }

  return {
    id: fixture.id,
    description: fixture.description,
    passed: failures.length === 0,
    failures,
  };
}

// ---------- Coverage stats ----------

function buildCoverageStats(fixtures: Fixture[]): Record<VisaSubclassId, number> {
  const coverage = Object.fromEntries(
    ALL_SUBCLASSES.map((id) => [id, 0]),
  ) as Record<VisaSubclassId, number>;

  for (const fixture of fixtures) {
    const ids = new Set<VisaSubclassId>();
    for (const id of Object.keys(fixture.expectations.verdicts ?? {})) {
      ids.add(id as VisaSubclassId);
    }
    for (const id of fixture.expectations.topRanked ?? []) ids.add(id);
    for (const id of fixture.expectations.notTopRanked ?? []) ids.add(id);
    for (const id of ids) coverage[id] += 1;
  }

  return coverage;
}

// ---------- Output ----------

function printSummary(results: FixtureResult[], fixtures: Fixture[]): void {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log("=".repeat(72));
  console.log("AU Visa Pathway Agent — Eval Results");
  console.log("=".repeat(72));
  console.log("");

  // Per-fixture status lines
  console.log("Fixture results:");
  for (const r of results) {
    const tag = r.passed ? "PASS" : "FAIL";
    console.log(`  [${tag}] ${r.id} — ${r.description}`);
  }
  console.log("");

  // Failure details
  if (failed > 0) {
    console.log("Failure details:");
    console.log("-".repeat(72));
    for (const r of results) {
      if (r.passed) continue;
      console.log(`Fixture: ${r.id}`);
      for (const f of r.failures) {
        console.log(`  - ${f}`);
      }
      console.log("");
    }
  }

  // Coverage matrix
  console.log("Subclass coverage (fixtures referencing each subclass):");
  const coverage = buildCoverageStats(fixtures);
  for (const id of ALL_SUBCLASSES) {
    console.log(`  Subclass ${id} tested in ${coverage[id]} fixtures`);
  }
  console.log("");

  // Final tallies
  console.log("-".repeat(72));
  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("=".repeat(72));
}

// ---------- Main ----------

function main(): number {
  let fixtures: Fixture[];
  try {
    fixtures = loadFixtures();
  } catch (err) {
    console.error("Failed to load fixtures:", (err as Error).message);
    return 1;
  }

  if (fixtures.length < 20) {
    console.error(
      `Fixture count is ${fixtures.length}; MVP requires at least 20.`,
    );
  }

  const results = fixtures.map(evaluateFixture);
  printSummary(results, fixtures);

  return results.every((r) => r.passed) ? 0 : 1;
}

process.exit(main());
