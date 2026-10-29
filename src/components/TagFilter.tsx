import { useMemo } from "react";
import type { GraphIndex } from "../data/load";
import { TAGS } from "../data/schema";
import { matchesTags } from "../graph/queries";
import { useStore } from "../store";
import { TagChip } from "./DetailPanel";

export function TagFilter({ index }: { index: GraphIndex }) {
  const tags = useStore((s) => s.tags);
  const tagMode = useStore((s) => s.tagMode);
  const { toggleTag, clearTags, setTagMode } = useStore.getState();

  const sorted = useMemo(
    () => [...TAGS].filter((t) => index.tagCounts.has(t)).sort((a, b) => (index.tagCounts.get(b) ?? 0) - (index.tagCounts.get(a) ?? 0)),
    [index],
  );
  const matching = useMemo(
    () => (tags.length ? index.nodes.filter((n) => matchesTags(n, tags, tagMode)).length : null),
    [index, tags, tagMode],
  );

  return (
    <div role="group" aria-label="Filter by tag" className="flex items-center gap-2">
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tags</span>
        <div role="radiogroup" aria-label="Tag match mode" className="flex overflow-hidden rounded-md border border-slate-300 text-xs dark:border-slate-700">
          {(["or", "and"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={tagMode === m}
              onClick={() => setTagMode(m)}
              className={`px-2 py-0.5 font-medium uppercase ${tagMode === m ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              {m}
            </button>
          ))}
        </div>
        {matching !== null && (
          <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            {matching} match{matching === 1 ? "" : "es"}
          </span>
        )}
        {tags.length > 0 && (
          <button type="button" onClick={clearTags} className="text-xs text-slate-500 underline hover:text-slate-900 dark:hover:text-white">
            clear
          </button>
        )}
      </div>
      <div className="scrollbar-thin flex gap-1 overflow-x-auto py-1">
        {sorted.map((t) => (
          <TagChip key={t} tag={t} count={index.tagCounts.get(t)} active={tags.includes(t)} onClick={() => toggleTag(t)} />
        ))}
      </div>
    </div>
  );
}
