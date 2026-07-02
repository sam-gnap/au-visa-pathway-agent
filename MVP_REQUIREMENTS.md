# MVP Requirements - AU Visa Pathway Agent

## Goal

Build a locally runnable MVP of the AU Visa Pathway Agent: a Next.js + TypeScript web app that asks structured questions about a user's situation and returns ranked Australian visa pathway results with rule-based reasons, source links, and simple supporting document lookup.

The MVP should prove the core thesis: visa recommendations should come from structured rules and pathway graph logic, not from an unconstrained chatbot.

## Product scope

### Must have

- End-to-end web wizard with structured inputs.
- Ranked results across all 9 planned visa subclasses:
  - 189 Skilled Independent
  - 190 Skilled Nominated
  - 491 Skilled Work Regional Provisional
  - 482 Skills in Demand / Temporary Skill Shortage equivalent pathway
  - 186 Employer Nomination Scheme
  - 417 Working Holiday
  - 462 Work and Holiday
  - 485 Temporary Graduate
  - 500 Student
- Hand-encoded, versioned rules dataset committed to the repo, with source URLs and "last checked" dates.
- Pure rule-engine eligibility checks.
- Pathway graph for common transitions.
- Deterministic/template explanations; no LLM required for MVP.
- Minimal local keyword search over curated regulatory/explainer text files.
- Local scripted evals and unit tests.
- Clear "not migration advice" disclaimer.

### Must not have in MVP

- No runtime Home Affairs scraping/fetching.
- No production deployment requirement.
- No user accounts, persistence, payments, or analytics.
- No partner/family, business/investor, humanitarian, bridging, multi-passport, or multi-country support.
- No migration-agent-grade advice.
- No freeform work-experience parsing.
- No embeddings/vector DB.
- No Braintrust/Langfuse requirement.
- No LLM dependency for scoring or explanations.

## Target user flow

1. User opens local web app.
2. User completes a structured wizard.
3. App validates inputs.
4. App runs rule-based eligibility checks for all 9 subclasses.
5. App ranks subclasses by fit.
6. App finds plausible pathways toward PR where applicable.
7. App displays:
   - ranked visa cards;
   - status per subclass;
   - key reasons;
   - missing requirements or blockers;
   - source links;
   - pathway timeline where relevant;
   - disclaimer that this is information, not migration advice.

## Wizard requirements

The wizard must be fully structured for MVP. Do not include a freeform text field.

Required inputs:

- Nationality/country of passport.
- Age.
- Current location: inside Australia / outside Australia.
- Current Australian visa subclass, if any.
- Occupation code or occupation name.
- English level.
- Highest qualification.
- Australian study completed: yes/no.
- Years of relevant work experience.
- Has eligible employer sponsor: yes/no.
- Has state/territory nomination: yes/no.
- Willing to live/work in regional Australia: yes/no.
- Study intent: yes/no.
- Estimated available funds/savings band.
- Goal: temporary stay / study / work / PR pathway.

Validation:

- Age must be a number from 16 to 100.
- Occupation must resolve to either a supported ANZSCO-like code/name or "unknown".
- Required fields must block submission with visible validation errors.
- Unknown or unsupported values must produce explicit "insufficient evidence" results, not silent failure.

## Rules dataset requirements

Create a committed rules dataset, preferably under `src/rules/` or `data/rules/`.

Each subclass record must include:

- `subclassId` enum value.
- Display name.
- Short description.
- Visa category.
- Temporary/permanent classification.
- Key eligibility requirements.
- Simplified rule checks used by MVP.
- Common blockers.
- Source URLs.
- Last checked date.
- Caveat explaining that rules are simplified for portfolio/demo use.

The dataset must be machine-readable TypeScript or JSON. TypeScript is preferred if it improves type safety.

Rules do not need to encode every legal criterion. They must encode enough to create credible MVP results and avoid obviously wrong recommendations.

## Eligibility engine requirements

Implement eligibility as pure TypeScript functions. The UI must not contain visa-rule logic.

Required API shape:

```ts
checkEligibility(situation: UserSituation): VisaVerdict[]
```

Each verdict must include:

- `subclassId`
- `status`: `likely_eligible`, `potentially_eligible`, `not_eligible`, or `insufficient_evidence`
- numeric `score` used for ranking
- `summary`
- `matchedCriteria`
- `missingCriteria`
- `blockers`
- `nextSteps`
- `sources`

Ranking requirements:

- Always return all 9 subclasses.
- Sort strongest fit first.
- Permanent/skilled pathways should rank higher when the user's stated goal is PR.
- Study and temporary mobility options should rank higher when the user's stated goal matches them.
- A subclass with hard blockers must not rank above a subclass with no hard blockers unless its score clearly reflects that it is not currently available.

Correctness requirements:

- Rule checks must be deterministic.
- No LLM may decide eligibility.
- Source-linked reasons must come from the rules dataset, not generated guesses.
- Invalid input must be surfaced as validation errors or `insufficient_evidence`.

## Pathway graph requirements

Implement pathway finding as pure TypeScript graph logic.

Required API shape:

```ts
findPathways(situation: UserSituation, goal: "pr" | "work" | "study" | "temporary"): VisaPathway[]
```

MVP should include at least these common edges:

- 500 -> 485
- 485 -> 482
- 482 -> 186
- 491 -> 191
- 190 -> PR outcome
- 189 -> PR outcome
- 417 -> 500
- 462 -> 500
- 500 -> 482

Each edge must include:

- from subclass
- to subclass or outcome
- simplified transition conditions
- indicative timeframe
- risks/caveats
- source links

Pathways must be displayed as plausible informational sketches, not guaranteed routes.

## Minimal local RAG requirements

Include a small local document lookup layer for supporting explanations only. It must not determine eligibility.

Implementation:

- Store curated text files under `data/docs/` or similar.
- Include metadata for each document:
  - title
  - source URL
  - last checked date
  - related subclasses
- Implement simple local keyword search or BM25-style scoring.
- Return top matching snippets with source links.
- Use retrieved snippets only in "learn more" or supporting context areas.

Do not add embeddings, vector search, Postgres, external search services, or rerankers in MVP.

## UI requirements

Use Next.js + TypeScript.

Required screens/components:

- Landing page with short explanation and disclaimer.
- Structured wizard.
- Results page or results panel.
- Ranked visa result cards.
- Pathway timeline component.
- Source/citation display.
- Empty/error states.

Result cards must show:

- subclass number and name;
- status;
- ranking score or qualitative fit label;
- why this matched;
- blockers or missing evidence;
- suggested next steps;
- source links.

The UI should be simple, readable, and locally demoable. Styling can be minimal.

## Safety and advice-boundary requirements

The MVP must clearly state:

- It is not migration advice.
- It is a portfolio/demo tool.
- Users should verify rules with Home Affairs or a MARN-registered migration agent.

The app must not:

- tell users to lie, overstay, misrepresent work experience, or evade visa conditions;
- present results as guaranteed;
- hide uncertainty.

If any advice-like prompt surface is later added, it must refuse illegal or deceptive requests. For this MVP, avoid freeform prompt surfaces entirely.

## Tests and evals

Use whatever test runner is standard for the selected Next.js scaffold, preferably Vitest if no runner exists yet.

Required tests:

- Unit tests for input validation.
- Unit tests for eligibility checks.
- Unit tests for pathway graph traversal.
- Unit tests for document keyword search.

Required scripted evals:

- Create fixture situations under `data/eval/`.
- Include at least 20 MVP eval situations.
- Cover all 9 subclasses at least once.
- Include edge cases:
  - age just over a cap;
  - missing occupation;
  - PR goal with no sponsor/nomination;
  - student pathway;
  - working holiday/work-and-holiday nationality mismatch;
  - regional willingness affecting 491;
  - employer sponsor affecting 482/186.
- Provide a script that prints pass/fail summary.

Minimum acceptance:

- `npm test` passes.
- `npm run eval` runs locally and reports expected verdict coverage.
- `npm run dev` starts the app locally.
- A user can complete the wizard and see ranked results without external services.

## Suggested repo structure

```text
.
|-- data/
|   |-- docs/
|   `-- eval/
|-- src/
|   |-- app/
|   |-- components/
|   |-- lib/
|   |   |-- validation/
|   |   |-- eligibility/
|   |   |-- pathways/
|   |   `-- search/
|   |-- rules/
|   `-- types/
|-- tests/
|-- PLAN.md
|-- MVP_REQUIREMENTS.md
|-- package.json
`-- README.md
```

Alternative structure is acceptable if it remains clear and type-safe.

## Implementation order for a build agent

1. Scaffold a Next.js + TypeScript app in the existing repo.
2. Add shared TypeScript types for user situation, subclass rules, verdicts, pathways, and sources.
3. Add the hand-encoded rules dataset for all 9 subclasses.
4. Implement input validation.
5. Implement `checkEligibility`.
6. Implement pathway graph and `findPathways`.
7. Add local document files and keyword search.
8. Build wizard UI.
9. Build results UI.
10. Add tests.
11. Add eval fixtures and `npm run eval`.
12. Update README with setup, scripts, scope, and disclaimer.
13. Run tests/evals and fix failures.

## Definition of done

The MVP is done when:

- The app runs locally with one command after installing dependencies.
- The wizard accepts structured inputs and produces ranked results for all 9 subclasses.
- Eligibility and pathway results are deterministic and source-linked.
- Minimal local document lookup works.
- Tests and scripted evals pass.
- README explains setup, scope, limitations, and non-advice disclaimer.
- No external API keys, database, hosted service, or LLM provider is required.
