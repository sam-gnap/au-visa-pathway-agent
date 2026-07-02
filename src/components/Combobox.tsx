"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export interface ComboboxOption {
  /**
   * Value written into the bound input when this option is selected.
   * For occupations this is the human name; for countries the country name.
   */
  value: string;
  /** Primary text shown to the user (e.g. "Software Engineer"). */
  primary: string;
  /** Optional secondary text (e.g. ANZSCO code, ISO alpha-2). */
  secondary?: string;
  /** Optional tag rendered as a chip (e.g. "MLTSSL"). */
  tags?: string[];
  /** Lower-case haystack used by the default filter. */
  searchKey: string;
}

interface ComboboxProps {
  id: string;
  value: string;
  onChange: (next: string) => void;
  options: ReadonlyArray<ComboboxOption>;
  placeholder?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  /** Max items rendered in the popup; defaults to 50. */
  maxResults?: number;
  /** Empty-state message when no options match. */
  emptyMessage?: string;
}

const DEFAULT_MAX = 50;

function filterOptions(
  query: string,
  options: ReadonlyArray<ComboboxOption>,
  max: number,
): ComboboxOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, max);

  const exact: ComboboxOption[] = [];
  const prefix: ComboboxOption[] = [];
  const contains: ComboboxOption[] = [];
  for (const o of options) {
    const pLower = o.primary.toLowerCase();
    const sLower = (o.secondary ?? "").toLowerCase();
    if (pLower === q || sLower === q) exact.push(o);
    else if (pLower.startsWith(q) || sLower.startsWith(q)) prefix.push(o);
    else if (o.searchKey.includes(q)) contains.push(o);
    if (exact.length + prefix.length + contains.length >= max * 3) break;
  }
  return [...exact, ...prefix, ...contains].slice(0, max);
}

export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  ariaInvalid,
  ariaDescribedBy,
  maxResults = DEFAULT_MAX,
  emptyMessage = "No matches — keep typing or use what you have.",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const filtered = useMemo(
    () => filterOptions(value, options, maxResults),
    [value, options, maxResults],
  );

  // Clamp highlight inside filtered range.
  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(Math.max(0, filtered.length - 1));
  }, [filtered.length, highlight]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const commit = useCallback(
    (opt: ComboboxOption) => {
      onChange(opt.value);
      setOpen(false);
    },
    [onChange],
  );

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlight]) {
        e.preventDefault();
        commit(filtered[highlight]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Home") {
      if (open) {
        e.preventDefault();
        setHighlight(0);
      }
    } else if (e.key === "End") {
      if (open) {
        e.preventDefault();
        setHighlight(filtered.length - 1);
      }
    }
  }

  const activeId = open && filtered[highlight] ? `${listboxId}-opt-${highlight}` : undefined;

  return (
    <div className="combobox" ref={wrapRef}>
      <input
        id={id}
        type="text"
        className="combobox__input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
      />
      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          className="combobox__listbox"
        >
          {filtered.length === 0 ? (
            <li className="combobox__empty" aria-disabled>
              {emptyMessage}
            </li>
          ) : (
            filtered.map((opt, i) => (
              <li
                id={`${listboxId}-opt-${i}`}
                key={`${opt.value}-${opt.secondary ?? i}`}
                role="option"
                aria-selected={i === highlight}
                className={`combobox__option${i === highlight ? " combobox__option--active" : ""}`}
                onMouseDown={(e) => {
                  // mousedown so input blur doesn't close before click fires
                  e.preventDefault();
                  commit(opt);
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                <div className="combobox__option-primary">{opt.primary}</div>
                <div className="combobox__option-meta">
                  {opt.secondary ? (
                    <span className="combobox__option-secondary">{opt.secondary}</span>
                  ) : null}
                  {opt.tags && opt.tags.length > 0 ? (
                    <span className="combobox__option-tags">
                      {opt.tags.map((t) => (
                        <span key={t} className={`combobox__tag combobox__tag--${t.toLowerCase()}`}>
                          {t}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
