import type { Source } from "@/types";

export function SourceLink({ source }: { source: Source }) {
  return (
    <a
      className="source-link"
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${source.title} (opens in new tab)`}
    >
      <span>{source.title}</span>
      {source.lastChecked ? (
        <span className="source-link__date">[{source.lastChecked}]</span>
      ) : null}
    </a>
  );
}

export function SourceList({ sources }: { sources: Source[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div>
      {sources.map((s) => (
        <SourceLink key={s.url} source={s} />
      ))}
    </div>
  );
}
