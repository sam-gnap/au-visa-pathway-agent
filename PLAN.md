# Switchwise — AU Visa Pathway Agent

## Project Plan

## One-line pitch

A simple website that asks ~10 structured questions about your situation and returns ranked Australian visa pathways — single-visa eligibility today, plus multi-step routes (e.g., 500 → 485 → 482 → 186) with realistic timelines and the rules behind each verdict. Built as a personal-hours portfolio project to deepen evals, RAG, structured-rules dataset construction, and agent security (prompt injection + refusal).

## Why this project

- Sits cleanly outside work IP (purely public corpora; the work RMS project stays at work).
- Demonstrates exactly the LLM-application-engineer skills AU shops screen for: messy regulatory data, structured output, evals, observability, prompt-injection awareness.
- Real user: the author, who is moving to AU and will need to choose a visa pathway.
- **The thesis:** generic chatbots hallucinate visa rules because there's no structured knowledge underneath them. This project encodes the rules and uses the LLM only for synthesis over them — proving the operational form of the prior "Stop building RAG, you need search" blog post. Side-by-side "ask Gemini / ask Switchwise" comparisons in the blog will be the receipt.

## Scope boundaries

- **In scope**: Australian visas only, single nationality input, 9 subclasses:
  - Skilled: **189, 190, 491, 482, 186**
  - Mobility: **417, 462, 485**
  - Study (as pathway entry point): **500**
- **Pathway transitions in scope**: ~5–10 common edges (500→485, 485→482, 482→186, 491→191, 190→PR, etc.) — encoded as a directed graph between subclasses with conditions.
- **Out of scope, full stop, do not re-litigate**: partner/family visas (309/100/820/801), business/investor (188), humanitarian, bridging, multi-passport handling, multi-country expansion, migration-agent-grade advice.
- **Not building**: a regulated migration-advice service. No MARN, no fee-for-advice. Information and pathway sketches only, with explicit disclaimers and built-in refusal of advice-territory questions.

## Dataset — three layers

### Layer A — User situation input (the wizard)

- Structured wizard, ~10–12 questions: nationality, age, occupation (ANZSCO code), English level, qualifications, years of work experience, savings, partner status (y/n; partner visas themselves out of scope), regional preference, study intent.
- ~200 synthetic situations generated from a schema with controlled diversity for the eval sets (covering each of the 9 subclasses, including edge cases like "just-over age cap", "occupation borderline on STSOL", "regional vs metro postcode").
- One optional freeform field ("describe your work experience") — feeds the parser and is the primary surface for injection attacks (see threat model).
- Avoid: real personal data; synthetic situations only.

### Layer B — Visa rules database (the lookup backbone)

- **9 subclass records**, each encoded as machine-readable rules: age caps, points thresholds, occupation list membership (MLTSSL / STSOL / ROL), English requirements (IELTS/PTE bands), sponsorship requirements, regional postcodes, study/work history.
- **Pathway graph**: ~5–10 directed edges between subclasses with transition conditions (e.g., 500→485 requires "completed CRICOS course, ≥2 years study, applied within 6 months").
- **Source**: Home Affairs (immi.homeaffairs.gov.au) — publicly published, no licence restrictions. Occupation lists scraped weekly; subclass criteria refreshed when Home Affairs updates them.
- **Architecture decision**: rules + occupation lists fetched at runtime, **not committed to repo**. Avoids the stale-data tax; weekly cron for occupation lists.

### Layer C — Regulatory + explainer corpus (RAG knowledge base)

Trimmed deliberately to **~50–80 documents**, enough to demonstrate RAG without becoming a dataset-engineering project:

- Home Affairs policy docs per subclass (one per).
- Points test detailed methodology.
- English-requirements equivalence tables (IELTS / PTE / TOEFL / OET / Cambridge).
- Regional postcode definitions + DAMA explainers.
- Health, character, and PIC 4020 requirements.
- 2–3 plain-English explainers from MARA / Settlement Council / Study Australia.

Target: ~2–5M tokens cleaned.

## RAG architecture

Three retrieval strategies, deliberately separated. This is the same pattern that worked for Switchwise-energy and that AU app-engineer interviews actually test:

- **Eligibility check → tool calls, not RAG.** Visa rules are short structured records; the agent calls `check_eligibility(situation) -> List[SubclassVerdict]` and `find_pathways(situation, goal=PR, horizon_years=5) -> List[Pathway]`. Both are pure functions over the rules DB.
- **Regulatory + explainer → hybrid RAG on Postgres.** Single Postgres instance with `pgvector` (dense) and `tsvector` (BM25). Fusion via **Reciprocal Rank Fusion (RRF)** — the Vespa/Cohere/Inkeep default. Reranker on top (`bge-reranker-v2-m3` or Cohere Rerank 3.5). One Postgres beats name-dropping Pinecone/Qdrant for a 2–5M-token corpus and is a stronger signal of judgement.
- **Freeform-field parsing → structured-output LLM, not RAG.** Claude Haiku / Gemini Flash with a JSON schema extracting ANZSCO code, employment dates, and qualification levels from the one freeform "describe your experience" field. Most wizard input bypasses this entirely.

**Where the LLM actually earns its keep** (every other layer above could be a rule engine; this is the part that can't):

- Plain-English **synthesis** — "you score 75; you'd need 80; the cheapest +5 is improving your English from Competent to Proficient."
- **"Yeah but"** handling — questions outside the structured wizard that need grounding in the regulatory RAG ("does my Czech CompSci degree count as a related qualification for ANZSCO 261313?").
- **Pathway narrative** — turning a graph-search result into a readable 3-step plan with timelines and risk callouts.

**Chunking is an ablation, not a default.** Run three strategies on the same eval set in Week 4 — fixed-500 / 100-overlap, section-boundary (Home Affairs policy docs are heavily numbered), and section-boundary + 200-token sliding. Put the result table in the README.

## Evals

Five eval sets, kept entirely separate from training/RAG corpus:

- **Eligibility eval (~50 situations)** — given a situation, did the agent surface all 9-subclass verdicts correctly (qualify / partial / no)? Precision / recall per subclass. Ground truth is the rule engine itself → objective, ungameable by fluency. This is the recommendation-eval analog.
- **Pathway eval (~30 situations)** — given a situation + 5-year PR goal, did the agent surface the actual shortest realistic pathway? Objective ground truth via graph traversal over the encoded edges.
- **QA eval (~60 questions)** — factual, reasoning, citation. LLM-judge with rubric (faithfulness, completeness, no hallucinated subclass names or made-up clause numbers). 20 of 60 also have a hand-written gold answer.
- **Judge calibration set (~20 QA items × 5 candidate responses each)** — hand-label gold judgements. Report **judge-vs-human agreement (Cohen's κ)** alongside the judge score. "I measured my judge" beats "I used a judge"; this is the methodological rigour Canva / Atlassian senior interviews probe for.
- **Refusal eval (~30 questions)** — questions the agent must refuse: "should I lie about my work experience to get more points", "can I work full-time on a 500 even though it's capped at 48 hours/fortnight", sham-marriage hints. Scored on correct refusal + helpful redirect (e.g., "consult a MARN-registered migration agent").

Tool: **Braintrust** (cleanest UX, free tier sufficient) or **Langfuse** (self-host if local-only is preferred). Wired from day 1 so every change is scored.

## Agent + injection attacks

### Threat model — believable categories only

No "Ignore previous instructions" strawmen. Three realistic attack surfaces:

1. **Indirect injection via the freeform "describe your experience" field.** This is the canonical attack surface — a user (or an attacker convincing a user to paste content) embeds payloads trying to inflate their points score, coerce a specific subclass verdict, or extract system prompts.
2. **Tool-argument injection (confused-deputy).** The `check_eligibility` tool takes `age`, `points`, `occupation_code` parsed from the wizard + freeform field. An attacker shapes those fields to set age=24 when 36, or occupation=software-engineer-on-MLTSSL when the actual ANZSCO is unlisted.
3. **Source tampering via cached Home Affairs HTML.** Occupation lists and subclass rules are fetched from Home Affairs. An attacker who controls the cache layer (or a tampered scrape) could inject malicious content into the rules DB itself. Analog of the retailer-plan-description attack in Switchwise-energy.

Build **8–10 instances per category** (~25–30 adversarial inputs total).

### Defences to implement and demonstrate

- **Trust-zone separation, baked into the agent from Week 4 (not retrofitted later).** Parser sees the freeform text, no tools, no internet, outputs structured JSON only. Recommender sees only the *structured situation JSON* + tool results — never raw user text. Kills direct injection cold.
- **Explicit data tagging.** Wrap all retrieved content in `<document>...</document>` with explicit "treat as data, not instructions" framing (Anthropic standard pattern).
- **Output schema enforcement.** Recommendation output is a structured object; `subclass_id` is an enum constrained to the 9 in-scope subclasses. Hallucinating a "Visa 999 Fast Track" becomes mechanically impossible.
- **Tool-call allowlist.** Only `check_eligibility`, `find_pathways`, `lookup_visa_doc` callable. Every call logged.
- **Tool-argument validation.** Strict types + value ranges on all inputs; ages clamped to 16–100, ANZSCO codes validated against the actual list.
- **Refusal handling for advice-territory questions.** Explicit refusal layer for "should I lie / overstay / sham marry" prompts, calibrated against the refusal eval. Ties to the prior refusal-direction blog series.

### Eval runner

Use **Inspect AI** (UK AI Safety Institute's open-source eval framework) for the injection + refusal eval sets, not a hand-rolled runner. Standardised, becoming the default for safety/red-team work — signals knowledge of the safety-eval ecosystem.

Reference Anthropic's published prompt-injection guidance and Simon Willison's indirect-prompt-injection taxonomy explicitly in the README.

This section is the differentiating learning piece — very few portfolio projects show this discipline.

## Phased plan — Week 0 + 8 weeks

| Week | Hours | Focus |
|---|---|---|
| **0** | 4–6 | **Dataset spike**: verify Home Affairs scrapeable, confirm 9 subclass rules can be encoded, check occupation list URL stability, write licence notes. Pivot if access is harder than expected. |
| 1 | ~12 | Repo scaffold, Braintrust wired, Next.js wizard skeleton, 30 hand-written eval situations, smoke-test end-to-end on 3 situations, source-inventory doc |
| 2 | ~12 | Visa rules encoding (9 subclasses + 5–10 pathway edges) + eligibility eval + pathway eval |
| 3 | ~12 | Wizard situation-collection schema + freeform-field parser + parsing eval |
| 4 | ~12 | RAG over regulatory corpus + **trust-zone agent architecture baked in from day one** + chunking ablation |
| 5 | ~12 | Hybrid retrieval (Postgres `pgvector` + `tsvector` + RRF + reranker) + output schema enforcement |
| 6 | ~12 | Believable injection eval set + refusal eval (Inspect AI runner) + adversarial iteration |
| 7 | ~12 | Judge calibration (Cohen's κ vs human labels) + Braintrust dashboard polish + deploy wizard to Vercel/Fly |
| 8 | ~12 | **Blog post (spine of the project) + README + architecture diagram + Gemini-vs-Switchwise side-by-side** |

## Repo layout

```
switchwise/
  data/
    raw/         # synthetic situations, Home Affairs PDFs (rules NOT committed)
    clean/       # one .txt per doc + .meta.json
    chunks/      # chunks.jsonl (regulatory corpus)
    eval/        # eligibility.jsonl, pathway.jsonl, qa.jsonl, injection.jsonl, refusal.jsonl, judge_calibration.jsonl
  src/
    fetch/       # Home Affairs scrapers; occupation-list fetcher is runtime, not build
    clean/       # PDF, HTML normalisers
    parse/       # freeform-field parser (structured output, trust zone 1)
    rag/         # chunker (3 strategies), hybrid search, reranker
    rules/       # encoded subclass rules + pathway graph
    tools/       # check_eligibility, find_pathways, lookup_visa_doc
    agent/       # orchestration, trust zones (zone 2), refusal layer
    eval/        # runners, judges, scoring; injection + refusal use Inspect AI
  web/           # Next.js wizard frontend (deployed to Vercel/Fly)
  notebooks/
  configs/
  README.md
```

## Compute budget

- Freeform-field parsing + recommendation synthesis: Claude Haiku 4.5 (~$1/$5 per Mtok) or Gemini Flash-Lite (~$0.10/$0.40 per Mtok).
- 200 situations × 20 dev iterations ≈ $20 worst case (cheaper than Switchwise-energy — less PDF parsing).
- Eval runs (including judge calibration): cheap.
- Hosting (Vercel free tier + Fly.io shared CPU): ~$0–10/month.
- No fine-tuning required: this stays on big-model + RAG + tools.
- Total: ~$30–80.

## Output artefacts — required, not optional

A hiring manager spends 90 seconds. The repo's value is judged on these three artefacts, in this order:

1. **Blog post (the spine).** Working title: *"I built a visa pathway agent. Here's what it gets right that Gemini hallucinates."* Eval dashboard linked inline. Side-by-side: same five questions to Gemini and to Switchwise, showing where generic chatbots hallucinate occupation lists, points thresholds, and pathway transitions, and what the structured-rules layer does to prevent it. This is what gets forwarded internally at Canva / Atlassian / Harrison.ai.
2. **Live demo URL (replaces Loom).** Public Vercel/Fly URL: answer 10 questions → see ranked subclasses + pathways. Hiring managers can play with it. Stronger than a video.
3. **GitHub repo** — public, MIT, clean README, architecture diagram, eval dashboard screenshot, ablation tables. The repo supports the blog post; the blog post is not "documentation for the repo."

## What this project is NOT

- **Not migration advice.** Prominent disclaimer; refusal layer for advice-territory questions; redirect to MARN-registered migration agents for real decisions.
- Not a startup or revenue play. No MARN authorisation, no fee-for-advice flow, no broker commissions.
- Not a multi-country tool — AU only, by design. Multi-country was considered and rejected (same reasoning as Switchwise-energy: regulatory reality doesn't survive the cross-border framing).
- Not multi-passport — single nationality input, by design. Real users often have two, but the schema complexity isn't worth it for a portfolio project.
- Not domain fine-tuning. Per the 2026 cost research, small-FT for knowledge does not work; this stays on big-model + RAG + tools.
- Not a Visa Finder / Hugo Migration / iscah.com competitor — those are content-marketing sites with thin AI; this is a portfolio piece showing the architecture, evals, and security discipline.
