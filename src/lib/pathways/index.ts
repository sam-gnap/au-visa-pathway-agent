import type {
  Goal,
  PathwayEdge,
  UserSituation,
  VisaPathway,
  VisaSubclassId,
} from "@/types";
import { pathwayEdges } from "./edges";
import { evaluators } from "@/rules";

export { pathwayEdges } from "./edges";

const MAX_HOPS = 4;

const SUPPORTED_SUBCLASSES: VisaSubclassId[] = [
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

type GraphNode = VisaSubclassId | "191" | "PR";

/**
 * Goal-specific terminal nodes. Used to decide which destinations count as a
 * successful path for `findPathways`.
 */
function isTerminalForGoal(goal: Goal, node: GraphNode): boolean {
  switch (goal) {
    case "pr":
      return node === "PR";
    case "work":
      return node === "482" || node === "186";
    case "study":
      return node === "500";
    case "temporary":
      return node === "417" || node === "462" || node === "500";
  }
}

/**
 * Pick a sensible entry node when the user has no recognised current visa.
 * Outside-AU users typically start at a study or mobility entry; inside-AU
 * users without a known subclass fall back to a generic entry per goal.
 *
 * Candidate entries are filtered against the rule evaluators: a subclass the
 * user is hard-blocked from (wrong nationality, over an age cap, no sponsor)
 * is not a real entry point, so proposing it would be misleading. The visa
 * the user already holds is never filtered — they hold it.
 */
function chooseEntryNodes(situation: UserSituation): GraphNode[] {
  const current = situation.currentVisaSubclass;
  if (current && (SUPPORTED_SUBCLASSES as string[]).includes(current)) {
    return [current as VisaSubclassId];
  }

  // No recognised current subclass — propose plausible entry nodes by goal.
  const entries: VisaSubclassId[] = [];
  switch (situation.goal) {
    case "study":
      entries.push("500");
      break;
    case "temporary":
      entries.push("417", "462", "500");
      break;
    case "work":
      // WHV -> sponsored 482 is the most common route into skilled work for
      // partner-country nationals; 500 covers the study-first route.
      entries.push("482", "417", "462", "500");
      break;
    case "pr":
      entries.push("189", "190", "491", "417", "462", "500");
      // Direct employer-sponsored entries only make sense with a sponsor.
      if (situation.hasEligibleEmployerSponsor) {
        entries.push("482", "186");
      }
      break;
  }

  return entries.filter(
    (id) => evaluators[id](situation).blockers.length === 0,
  );
}

/**
 * Rough indicative-time parser used only to sort pathways. Parses ranges so
 * that "1-2 years" averages to 1.5 and "2+ years" stays at 2. Unparseable
 * strings get a small default weight so they still sort sensibly.
 */
function edgeWeight(edge: PathwayEdge): number {
  // Match one number, optionally followed by a separator and a second number.
  // Treat any non-alphanumeric run (including en/em dashes) as a separator.
  const m = edge.indicativeTimeframe.match(
    /(\d+(?:\.\d+)?)\s*[^a-z0-9]+\s*(\d+(?:\.\d+)?)/i,
  );
  if (m) {
    const lo = parseFloat(m[1]!);
    const hi = parseFloat(m[2]!);
    return (lo + hi) / 2;
  }
  const single = edge.indicativeTimeframe.match(/(\d+(?:\.\d+)?)/);
  if (single) return parseFloat(single[1]!);
  return 1;
}

function totalWeight(edges: PathwayEdge[]): number {
  return edges.reduce((acc, e) => acc + edgeWeight(e), 0);
}

function pathwaySummary(nodes: GraphNode[]): string {
  return nodes.join(" -> ");
}

function totalTimeframeText(edges: PathwayEdge[]): string {
  if (edges.length === 0) return "Immediate";
  if (edges.length === 1) return edges[0].indicativeTimeframe;
  return edges.map((e) => e.indicativeTimeframe).join(" then ");
}

/**
 * Depth-first search over the pathway graph up to `MAX_HOPS` edges, collecting
 * every path that ends at a goal-terminal node. We treat any 491 -> PR edge
 * (which conceptually goes via subclass 191) as collapsing to PR for the
 * goal check, per the MVP spec.
 */
function searchPaths(
  entry: GraphNode,
  goal: Goal,
  edges: PathwayEdge[],
): { nodes: GraphNode[]; edges: PathwayEdge[] }[] {
  const results: { nodes: GraphNode[]; edges: PathwayEdge[] }[] = [];

  const dfs = (
    current: GraphNode,
    pathNodes: GraphNode[],
    pathEdges: PathwayEdge[],
    visited: Set<GraphNode>,
  ) => {
    if (isTerminalForGoal(goal, current) && pathEdges.length > 0) {
      results.push({ nodes: [...pathNodes], edges: [...pathEdges] });
      // PR is a sink — nothing extends past it.
      if (current === "PR") return;
    }

    if (pathEdges.length >= MAX_HOPS) return;

    const outgoing = edges.filter((e) => e.from === current);
    for (const edge of outgoing) {
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      pathNodes.push(edge.to);
      pathEdges.push(edge);
      dfs(edge.to, pathNodes, pathEdges, visited);
      pathNodes.pop();
      pathEdges.pop();
      visited.delete(edge.to);
    }
  };

  const visited = new Set<GraphNode>([entry]);
  dfs(entry, [entry], [], visited);
  return results;
}

/**
 * Find plausible visa pathways for the user's situation toward their chosen
 * goal. Returns up to 5 pathways sorted by total indicative timeframe
 * (shortest first). Empty array is a legitimate "no pathway found" signal —
 * callers should treat it as insufficient evidence.
 */
export function findPathways(situation: UserSituation, goal: Goal): VisaPathway[] {
  // If the user already holds a goal-terminal-ish visa, surface trivial paths.
  const entries = chooseEntryNodes(situation);

  const allPaths: { nodes: GraphNode[]; edges: PathwayEdge[] }[] = [];
  for (const entry of entries) {
    // Special case: user already on a permanent subclass and goal is PR.
    if (goal === "pr" && (entry === "189" || entry === "190" || entry === "186")) {
      const edge = pathwayEdges.find((e) => e.from === entry && e.to === "PR");
      if (edge) {
        allPaths.push({ nodes: [entry, "PR"], edges: [edge] });
        continue;
      }
    }

    // Self-pathway: if the entry node is already a goal-terminal, surface a
    // single-node pathway so the user sees "apply directly for this visa"
    // rather than an empty result (e.g. goal=study + entry=500).
    if (isTerminalForGoal(goal, entry)) {
      allPaths.push({ nodes: [entry], edges: [] });
    }

    const found = searchPaths(entry, goal, pathwayEdges);
    allPaths.push(...found);
  }

  // De-duplicate by node sequence string.
  const seen = new Set<string>();
  const unique = allPaths.filter((p) => {
    const key = p.nodes.join("->");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Shortest first; ties broken by how well the entry visa fits the user
  // (so e.g. a state-nominated applicant sees 190 -> PR before 189 -> PR).
  const entryFit = (p: { nodes: GraphNode[] }): number => {
    const entry = p.nodes[0];
    if (!(SUPPORTED_SUBCLASSES as string[]).includes(entry as string)) return 0;
    return evaluators[entry as VisaSubclassId](situation).baseScore;
  };
  unique.sort((a, b) => {
    const w = totalWeight(a.edges) - totalWeight(b.edges);
    if (w !== 0) return w;
    return entryFit(b) - entryFit(a);
  });

  return unique.slice(0, 5).map<VisaPathway>((p) => ({
    nodes: p.nodes,
    edges: p.edges,
    summary: pathwaySummary(p.nodes),
    totalIndicativeTimeframe: totalTimeframeText(p.edges),
  }));
}
