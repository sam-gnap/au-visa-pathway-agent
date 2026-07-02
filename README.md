# AU Visa Pathway Agent

A locally runnable Next.js + TypeScript MVP that takes structured answers about a person's situation and returns ranked Australian visa pathway results with rule-based reasons, source links, and a simple supporting-document lookup. The point of the MVP is to demonstrate that visa recommendations come out cleaner when they sit on top of a hand-encoded rules dataset and a pathway graph, rather than a freeform chatbot.

## Scope

The MVP reasons about nine visa subclasses:

- 189 Skilled Independent
- 190 Skilled Nominated
- 491 Skilled Work Regional (Provisional)
- 482 Skills in Demand
- 186 Employer Nomination Scheme
- 417 Working Holiday
- 462 Work and Holiday
- 485 Temporary Graduate
- 500 Student

### What it is

- Rule-based and deterministic — every verdict and pathway comes from code in `src/rules/` and `src/lib/pathways/`.
- Local-only — no external API keys, no database, no hosted service.
- Source-linked — every rule cites a Home Affairs page with a "last checked" date.
- Curated documents — a small local keyword search over text files under `data/docs/` provides supporting context only.

### What it is not

- Not an LLM-driven product. There is no model call anywhere in scoring or explanation.
- Not a vector database or embeddings pipeline. The local doc search is plain keyword matching.
- Not deployed. There is no production environment, no auth, no analytics.
- Not migration advice. It does not represent a registered migration agent.
- Not a complete encoding of Australian migration law. Occupation lists, country lists, and points logic are simplified for portfolio use.

## Quickstart

Requires Node 18+.

```
npm install
npm run dev       # localhost:3000
npm test          # vitest unit tests
npm run eval      # scripted evals; exits non-zero on failure
npm run build     # production build
```

## Architecture overview

- The wizard collects structured inputs for nationality, age, location, occupation, English, qualification, experience, sponsorship/nomination, regional willingness, study intent, funds, and goal.
- `validateSituation` checks types and ranges and surfaces field-level errors. Unknown occupations resolve to "unknown" rather than being silently rejected.
- `checkEligibility` runs every subclass's pure evaluator against the situation, applies a goal-based ranking boost, and returns nine verdicts sorted strongest fit first. Hard blockers cap the score so a blocked subclass never outranks a feasible one.
- `findPathways` walks a small directed pathway graph (e.g. 500 -> 485 -> 482 -> 186) and returns plausible multi-step routes for the user's goal.
- A simple BM25-style keyword search over `data/docs/` returns supporting snippets with source links in "learn more" panels. It never decides eligibility.

## Repo layout

```
.
|-- data/
|   |-- docs/             # curated explainer text files with source metadata
|   `-- eval/             # eval fixtures (fixtures.json)
|-- scripts/
|   `-- eval.ts           # `npm run eval` entry point
|-- src/
|   |-- app/              # Next.js app router (wizard + results)
|   |-- components/       # wizard, result cards, pathway timeline
|   |-- lib/
|   |   |-- validation/   # validateSituation, supported occupations
|   |   |-- eligibility/  # checkEligibility
|   |   |-- pathways/     # findPathways + pathway graph edges
|   |   `-- search/       # local keyword search over data/docs
|   |-- rules/            # one TS module per supported subclass
|   `-- types/            # shared TypeScript types
|-- tests/                # vitest unit tests
|-- MVP_REQUIREMENTS.md
|-- PLAN.md
|-- package.json
`-- README.md
```

## Evals

`npm run eval` reads `data/eval/fixtures.json`, runs each scenario through `checkEligibility` and `findPathways`, checks the declared expectations, and prints a per-fixture pass/fail summary plus per-subclass coverage. The script exits non-zero if any fixture fails, so it is safe to wire into CI.

Fixtures cover all nine subclasses and include edge cases like ages just over a cap, missing occupation, PR goal with no sponsor or nomination, working holiday nationality mismatch, regional willingness affecting 491, and employer sponsorship affecting 482 and 186.

## Limitations

- Occupation lists are a small representative subset of the real MLTSSL/STSOL/ROL lists.
- Working Holiday partner country lists (417 and 462) are abbreviated subsets.
- Points logic is approximated as a base score with categorical bumps; the real points test is more granular.
- "Last checked" dates on sources reflect when the rules were hand-encoded. The app does not poll Home Affairs for changes.
- Pathway timeframes are indicative ranges, not commitments.
- Some subclasses have multiple streams with distinct rules (e.g. 482 Specialist/Core/Essential, 186 Direct Entry/TRT). The MVP collapses these.

## Disclaimer

This project is a portfolio/demo tool. It is **not migration advice** and it is not produced by a registered migration agent. Outputs are informational sketches based on simplified rules. Verify everything with the official source — [Department of Home Affairs](https://immi.homeaffairs.gov.au/) — and consult a [MARN-registered migration agent](https://www.mara.gov.au/) before making decisions that affect your immigration status.

## Sources

Rules are encoded from publicly available Home Affairs pages under [immi.homeaffairs.gov.au](https://immi.homeaffairs.gov.au/). Each subclass record in `src/rules/` carries its own source URL list with a `lastChecked` date.
