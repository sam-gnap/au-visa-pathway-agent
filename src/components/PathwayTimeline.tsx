import type { PathwayEdge, VisaPathway, VisaSubclassId } from "@/types";
import { rulesById } from "@/rules";
import { SourceList } from "./SourceLink";

function nodeLabel(node: VisaSubclassId | "191" | "PR"): string {
  if (node === "PR") return "PR";
  if (node === "191") return "191 (Permanent Regional)";
  const rule = rulesById[node];
  return rule ? `${node} (${rule.displayName.split(" (")[0]})` : node;
}

function stepTitle(edge: PathwayEdge): string {
  return `${nodeLabel(edge.from)} → ${nodeLabel(edge.to)}`;
}

export function PathwayTimeline({ pathway }: { pathway: VisaPathway }) {
  return (
    <section className="pathway">
      <div className="pathway__summary">{pathway.summary}</div>
      <div className="pathway__timeframe">
        Indicative timeframe: {pathway.totalIndicativeTimeframe}
      </div>

      <div className="pathway__steps">
        {pathway.edges.map((edge, idx) => (
          <div className="pathway-step" key={idx}>
            <div className="pathway-step__title">{stepTitle(edge)}</div>
            <div className="pathway-step__meta">
              Indicative timeframe: {edge.indicativeTimeframe}
            </div>

            {edge.conditions.length > 0 ? (
              <>
                <div className="pathway-step__list-label">Conditions</div>
                <ul>
                  {edge.conditions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {edge.risks.length > 0 ? (
              <>
                <div className="pathway-step__list-label">Risks / caveats</div>
                <ul>
                  {edge.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </>
            ) : null}

            {edge.sources.length > 0 ? (
              <div style={{ marginTop: "0.4rem" }}>
                <SourceList sources={edge.sources} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
