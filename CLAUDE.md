# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# AU Visa Pathway Agent

Locally runnable Next.js + TypeScript MVP that takes structured wizard answers and returns ranked Australian visa verdicts (9 subclasses) plus multi-step pathway routes (e.g. 500 → 485 → 482 → 186). Portfolio project; the thesis is that visa recommendations should come from hand-encoded rules and a pathway graph, **not** an LLM.

**Hard MVP constraints (from `MVP_REQUIREMENTS.md` — do not re-litigate):** no LLM calls anywhere in scoring or explanations, no embeddings/vector DB, no runtime Home Affairs scraping, no database, no auth/analytics/deployment, no freeform text input. Everything is deterministic and local. The "not migration advice" disclaimer stays. `PLAN.md` describes a larger post-MVP vision (RAG, trust zones, injection evals) — that is future scope, not current.

## Commands

```
npm run dev                        # localhost:3000
npm test                           # vitest run (all tests)
npx vitest run tests/rules.test.ts # single test file
npx vitest run -t "pattern"        # single test by name
npm run eval                       # scripted evals over data/eval/fixtures.json; exits non-zero on failure
npm run build                      # production build
```

When changing rule/eligibility/pathway logic, run both `npm test` and `npm run eval` — the eval fixtures catch ranking regressions the unit tests don't.

## Architecture

Data flow: wizard (`src/components/WizardForm.tsx`) → `validateSituation` (`src/lib/validation`) → `checkEligibility` (`src/lib/eligibility`) → `findPathways` (`src/lib/pathways`) → results UI. Keyword search (`src/lib/search`) feeds "learn more" panels only — it never decides eligibility. UI components must not contain visa-rule logic.

`@/` aliases to `src/` (configured in both `tsconfig.json` and `vitest.config.ts`).

### Rules layer (`src/rules/`)

One module per subclass (`189.ts`, `190.ts`, `491.ts`, `482.ts`, `186.ts`, `417.ts`, `462.ts`, `485.ts`, `500.ts`), each exporting:

- `rule: VisaSubclassRule` — display metadata, key requirements, common blockers, and `sources` (Home Affairs URLs with a `lastChecked` date; `LAST_CHECKED` constant lives in `_shared.ts`).
- `evaluator: SubclassEvaluator` — pure function `UserSituation → SubclassEvaluation` producing `matched` / `missing` / `blockers` string arrays, a `baseScore`, and a `statusHint`.

Both are registered in `src/rules/index.ts` in three parallel registries (`allRules`, `evaluators`, `rulesById`). `_shared.ts` holds `ENGLISH_RANK`, `QUAL_RANK`, `estimatePoints` (simplified SkillSelect points), WHV country lists, and `occupationOnLists`.

### Eligibility (`src/lib/eligibility/index.ts`)

Runs all 9 evaluators, adds a goal-based score boost, then caps any verdict with blockers at score ≤ 20 so a blocked subclass never outranks an unblocked one. Sort order is: unblocked first, then status quality (`likely_eligible` > `potentially_eligible` > `insufficient_evidence` > `not_eligible`), then score. Always returns all 9 verdicts.

### Pathways (`src/lib/pathways/`)

`edges.ts` is the hand-encoded directed graph (transition conditions, indicative timeframes, risks, sources). `findPathways` does a DFS up to 4 hops from either the user's current visa or goal-based entry nodes, dedupes by node sequence, sorts by total timeframe parsed from the indicative strings, returns top 5. `"191"` and `"PR"` are graph nodes but not evaluated subclasses.

### Data (`data/`)

- `data/occupations.json` — occupation list with `skilledLists` membership (MLTSSL/STSOL/ROL/CSOL); loaded by `src/lib/occupations.ts`, which has a small hand-coded fallback if the file is absent.
- `data/visa-context.json` — quantitative context (caps, cutoffs, processing times) merged over the qualitative base in `src/lib/visa-context.ts`. Optional fields are hidden in the UI rather than faked.
- `data/docs/*.txt` + `*.meta.json` pairs — curated explainer corpus for the keyword search. Meta files carry title, source URL, lastChecked, related subclasses.
- `data/eval/fixtures.json` — eval scenarios with expectations (`verdicts`, `topRanked`, `mustBeBlocked`, pathway presence).

### Adding or changing a subclass

The subclass list is duplicated in several places that must stay in sync: `src/types/subclass.ts`, the three registries in `src/rules/index.ts`, `ALL_SUBCLASSES` in both `src/lib/eligibility/index.ts` and `scripts/eval.ts`, the goal-boost lists in eligibility, `src/lib/visa-context.ts`, pathway edges, and eval fixtures (every subclass must be covered at least once).

## Conventions

- Rule checks are deliberately simplified — each `rule` carries a `caveat` saying so. Keep sources and `lastChecked` dates honest when touching rule content.
- Unknown/unsupported input resolves to explicit `insufficient_evidence`, never silent failure or rejection.
- Evaluators are pure functions; no I/O, no shared mutable state.

## Working relationship

- No sycophancy. Be direct, matter-of-fact, and concise.
- Be critical; challenge my reasoning.
- Don't include timeline estimates in plans.
- Don't add yourself as a co-author to git commits.
- **Take the correct approach, not the easy one.** Technical debt compounds.
- **Never assume, always verify.** Don't trust plans, comments, or variable names. Read the code. Document what you find with file:line references.
- **The user makes the decisions.** When there's a tradeoff, present the options with evidence and let the user decide.
- No emojis in generated files or documentation.
