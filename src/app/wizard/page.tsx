"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Goal, UserSituation, VisaPathway, VisaVerdict } from "@/types";
import { WizardForm } from "@/components/WizardForm";
import { VerdictCard } from "@/components/VerdictCard";
import { PathwayTimeline } from "@/components/PathwayTimeline";
import { checkEligibility } from "@/lib/eligibility";
import { findPathways } from "@/lib/pathways";

interface Results {
  situation: UserSituation;
  verdicts: VisaVerdict[];
  pathways: VisaPathway[];
}

export default function WizardPage() {
  const [results, setResults] = useState<Results | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  function handleSubmit(situation: UserSituation) {
    const verdicts = checkEligibility(situation);
    const pathways = findPathways(situation, situation.goal);
    setResults({ situation, verdicts, pathways });
    // Scroll into view after render.
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <section>
      <p style={{ marginBottom: "0.5rem" }}>
        <Link href="/">&larr; Back to landing</Link>
      </p>
      <h1 style={{ marginTop: "0.25rem" }}>Visa pathway wizard</h1>

      <WizardForm onSubmit={handleSubmit} />

      <div ref={resultsRef}>
        {results ? (
          <ResultsPanel
            verdicts={results.verdicts}
            pathways={results.pathways}
            goal={results.situation.goal}
          />
        ) : null}
      </div>
    </section>
  );
}

function ResultsPanel({
  verdicts,
  pathways,
  goal,
}: {
  verdicts: VisaVerdict[];
  pathways: VisaPathway[];
  goal: Goal;
}) {
  return (
    <section className="results" aria-live="polite">
      <h2 className="results__heading">Ranked results</h2>
      <p className="results__subheading">
        Strongest fit first. These are rule-based informational sketches, not
        guarantees. Always verify with Home Affairs or a registered migration
        agent.
      </p>

      <div className="verdict-list">
        {verdicts.map((v, i) => (
          <VerdictCard key={v.subclassId} verdict={v} rank={i + 1} />
        ))}
      </div>

      <section className="pathways">
        <h2>Pathway sketches toward your goal ({goal})</h2>
        {pathways.length === 0 ? (
          <div className="empty-state">
            No clear pathway found for this combination — try adjusting your
            goal or sponsor/nomination status, or revisit your occupation and
            study fields.
          </div>
        ) : (
          pathways.map((p, i) => <PathwayTimeline key={i} pathway={p} />)
        )}
      </section>
    </section>
  );
}
