"use client";

import { useState } from "react";
import type { DocSearchResult, VisaVerdict } from "@/types";
import { rulesById } from "@/rules";
import { StatusBadge } from "./StatusBadge";
import { SourceLink, SourceList } from "./SourceLink";
import {
  VISA_CONTEXT,
  difficultyLabel,
  effectiveDifficulty,
  scoreExplainer,
} from "@/lib/visa-context";

type LearnMoreState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; results: DocSearchResult[] }
  | { kind: "error"; message: string };

export function VerdictCard({
  verdict,
  rank,
}: {
  verdict: VisaVerdict;
  rank: number;
}) {
  const rule = rulesById[verdict.subclassId];
  const score = Math.round(verdict.score);
  const ctx = VISA_CONTEXT[verdict.subclassId];
  const difficulty = effectiveDifficulty(
    verdict.subclassId,
    verdict.blockers.length,
    verdict.missingCriteria.length,
  );
  const explainer = scoreExplainer(score, verdict.blockers.length);

  const [expanded, setExpanded] = useState(false);
  const [learnMore, setLearnMore] = useState<LearnMoreState>({ kind: "idle" });

  async function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && learnMore.kind === "idle") {
      setLearnMore({ kind: "loading" });
      try {
        const res = await fetch(
          `/api/search?subclass=${encodeURIComponent(verdict.subclassId)}`,
        );
        if (!res.ok) {
          setLearnMore({
            kind: "error",
            message: `Could not load related docs (status ${res.status}).`,
          });
          return;
        }
        const data = (await res.json()) as DocSearchResult[];
        setLearnMore({ kind: "loaded", results: data });
      } catch {
        setLearnMore({
          kind: "error",
          message: "Could not load related docs. Check your connection.",
        });
      }
    }
  }

  const panelId = `learn-more-${verdict.subclassId}`;

  return (
    <article className={`verdict-card verdict-card--${verdict.status}`}>
      <header className="verdict-card__header">
        <h3 className="verdict-card__title">
          #{rank} &middot; {rule.displayName}
        </h3>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <StatusBadge status={verdict.status} />
          <span className={`difficulty-pill difficulty-pill--${difficulty}`}>
            {difficultyLabel(difficulty)}
          </span>
          <span className="verdict-card__score">Score: {score}/100</span>
        </div>
      </header>

      <p className="verdict-card__score-explainer">{explainer}</p>
      <p className="verdict-card__summary">{verdict.summary}</p>

      {ctx ? (
        <div className="verdict-card__context">
          <div className="verdict-card__difficulty-blurb">{ctx.difficultyBlurb}</div>
          {(ctx.processingTime?.p50 ||
            ctx.processingTime?.p90 ||
            ctx.annualCap ||
            ctx.recentCutoff) ? (
            <ul className="verdict-card__stats">
              {ctx.processingTime?.p50 ? (
                <li>
                  <span className="verdict-card__stat-label">Processing (median)</span>
                  <span className="verdict-card__stat-value">{ctx.processingTime.p50}</span>
                </li>
              ) : null}
              {ctx.processingTime?.p90 ? (
                <li>
                  <span className="verdict-card__stat-label">Processing (90th %ile)</span>
                  <span className="verdict-card__stat-value">{ctx.processingTime.p90}</span>
                </li>
              ) : null}
              {ctx.annualCap ? (
                <li>
                  <span className="verdict-card__stat-label">
                    Annual cap{ctx.annualCapProgramYear ? ` (${ctx.annualCapProgramYear})` : ""}
                  </span>
                  <span className="verdict-card__stat-value">
                    {ctx.annualCap.toLocaleString()}
                  </span>
                </li>
              ) : null}
              {ctx.recentCutoff ? (
                <li>
                  <span className="verdict-card__stat-label">
                    Recent invitation cutoff ({ctx.recentCutoff.asOf})
                  </span>
                  <span className="verdict-card__stat-value">
                    {ctx.recentCutoff.score} pts
                  </span>
                </li>
              ) : null}
            </ul>
          ) : null}
          {ctx.notes && ctx.notes.length > 0 ? (
            <ul className="verdict-card__context-notes">
              {ctx.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {verdict.matchedCriteria.length > 0 ? (
        <div className="verdict-card__section">
          <h4>Why this matched</h4>
          <ul>
            {verdict.matchedCriteria.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {verdict.blockers.length > 0 || verdict.missingCriteria.length > 0 ? (
        <div className="verdict-card__section">
          <h4>What you still need</h4>
          <ul className="verdict-card__checklist">
            {verdict.blockers.map((b, i) => (
              <li key={`b-${i}`} className="verdict-card__checklist-item verdict-card__checklist-item--blocker">
                <span className="verdict-card__checklist-marker" aria-hidden>
                  ✗
                </span>
                <div>
                  <strong>Blocker</strong>
                  <div>{b}</div>
                </div>
              </li>
            ))}
            {verdict.missingCriteria.map((m, i) => (
              <li key={`m-${i}`} className="verdict-card__checklist-item verdict-card__checklist-item--missing">
                <span className="verdict-card__checklist-marker" aria-hidden>
                  ○
                </span>
                <div>{m}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {verdict.nextSteps.length > 0 ? (
        <div className="verdict-card__section">
          <h4>Suggested next steps</h4>
          <ol className="verdict-card__steps">
            {verdict.nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {verdict.sources.length > 0 ? (
        <div className="verdict-card__section">
          <h4>Sources</h4>
          <SourceList sources={verdict.sources} />
        </div>
      ) : null}

      <div className="verdict-card__section">
        <button
          type="button"
          className="btn btn--secondary verdict-card__learn-more-toggle"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
        >
          {expanded ? "Hide related docs" : "Learn more"}
        </button>
        {expanded ? (
          <div
            id={panelId}
            className="verdict-card__learn-more"
            role="region"
            aria-label={`Related docs for subclass ${verdict.subclassId}`}
          >
            {learnMore.kind === "loading" ? (
              <p className="verdict-card__learn-more-status">
                Loading related docs…
              </p>
            ) : null}
            {learnMore.kind === "error" ? (
              <p className="verdict-card__learn-more-status verdict-card__learn-more-status--error">
                {learnMore.message}
              </p>
            ) : null}
            {learnMore.kind === "loaded" ? (
              learnMore.results.length === 0 ? (
                <p className="verdict-card__learn-more-status">
                  No related documents found.
                </p>
              ) : (
                <ul className="verdict-card__learn-more-list">
                  {learnMore.results.map((doc) => (
                    <li
                      key={doc.docId}
                      className="verdict-card__learn-more-item"
                    >
                      <div className="verdict-card__learn-more-title">
                        {doc.title}
                      </div>
                      <p className="verdict-card__learn-more-snippet">
                        {doc.snippet}
                      </p>
                      <SourceLink
                        source={{
                          title: doc.title,
                          url: doc.sourceUrl,
                          lastChecked: "",
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
