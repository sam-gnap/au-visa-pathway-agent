import type { Source } from "./source";
import type { VisaSubclassId } from "./subclass";

/**
 * A single transition in the visa pathway graph. The destination may be a
 * supported subclass, the out-of-MVP `"191"` regional-PR stepping stone, or
 * the terminal `"PR"` outcome.
 */
export interface PathwayEdge {
  from: VisaSubclassId | "191";
  to: VisaSubclassId | "191" | "PR";
  conditions: string[];
  indicativeTimeframe: string;
  risks: string[];
  sources: Source[];
}

export interface VisaPathway {
  nodes: (VisaSubclassId | "191" | "PR")[];
  edges: PathwayEdge[];
  summary: string;
  totalIndicativeTimeframe: string;
}
