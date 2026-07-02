import type { VerdictStatus } from "@/types";

const LABELS: Record<VerdictStatus, string> = {
  likely_eligible: "Likely eligible",
  potentially_eligible: "Potentially eligible",
  not_eligible: "Not eligible",
  insufficient_evidence: "Insufficient evidence",
};

export function StatusBadge({ status }: { status: VerdictStatus }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {LABELS[status]}
    </span>
  );
}
