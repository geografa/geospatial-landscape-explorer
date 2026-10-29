import type { Core } from "cytoscape";
import Fuse from "fuse.js";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { GraphIndex } from "../data/load";
import type { GeoNode } from "../data/schema";
import { shortestPath } from "../graph/queries";
import { KIND_STYLE } from "../graph/styles";
import { useStore } from "../store";
import { KindSwatch } from "./KindFilter";

const MAX_RESULTS = 12;

export function SearchPalette({ index, cy }: { index: GraphIndex; cy: Core | null }) {
  const open = useStore((s) => s.paletteOpen);
  const pathFrom = useStore((s) => s.pathFrom);
  const setOpen = useStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const listId = useId();

  const fuse = useMemo(
    () =>
      new Fuse(index.nodes, {
        keys: [
          { name: "label", weight: 3 },
          { name: "id", weight: 2 },
          { name: "tags", weight: 1.5 },
          { name: "kind", weight: 1 },
          { name: "description", weight: 1 },
        ],
        threshold: 0.38,
        ignoreLocation: true,
        includeMatches: false,
      }),
    [index],
  );

  const results: GeoNode[] = useMemo(() => {
    const pool = query.trim()
      ? fuse.search(query.trim(), { limit: MAX_RESULTS }).map((r) => r.item)
      : [...index.nodes].sort((a, b) => (index.degree.get(b.id) ?? 0) - (index.degree.get(a.id) ?? 0)).slice(0, MAX_RESULTS);
    return pool.filter((n) => n.id !== pathFrom);
  }, [fuse, query, index, pathFrom]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useStore.getState().paletteOpen);
      } else if (e.key === "/" && !open && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      restoreFocus.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      restoreFocus.current?.focus?.();
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const choose = (n: GeoNode) => {
    const s = useStore.getState();
    if (s.hiddenKinds.includes(n.kind)) s.toggleKind(n.kind);
    if (s.pathFrom && cy) {
      s.setHighlight(shortestPath(cy, s.pathFrom, n.id));
      s.setPathFrom(null);
    } else {
      s.select(n.id);
    }
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (useStore.getState().pathFrom) useStore.getState().setPathFrom(null);
      setOpen(false);
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  const source = pathFrom ? index.byId.get(pathFrom) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-4 pt-[10vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={source ? `Choose path target from ${source.label}` : "Search nodes"}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {source && (
          <div className="border-b border-slate-200 bg-rose-50 px-4 py-2 text-sm text-rose-900 dark:border-slate-700 dark:bg-rose-950/50 dark:text-rose-200">
            Shortest path from <strong>{source.label}</strong> to…
          </div>
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools, formats, tags… (e.g. vector tiles, python raster)"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          aria-autocomplete="list"
          className="w-full border-b border-slate-200 bg-transparent px-4 py-3 text-base outline-none placeholder:text-slate-400 dark:border-slate-700"
        />
        <ul id={listId} role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-1">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">No matches</li>}
          {results.map((n, i) => (
            <li
              key={n.id}
              id={`${listId}-${n.id}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => choose(n)}
              className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 ${i === active ? "bg-slate-100 dark:bg-slate-800" : ""}`}
            >
              <span className="mt-1">
                <KindSwatch kind={n.kind} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="font-medium">{n.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{KIND_STYLE[n.kind].label}</span>
                </span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{n.description}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-3 border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <span><kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> navigate</span>
          <span><kbd className="kbd">Enter</kbd> select</span>
          <span><kbd className="kbd">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
