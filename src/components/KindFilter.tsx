import { useMemo } from "react";
import type { GraphIndex } from "../data/load";
import { KINDS, type Kind } from "../data/schema";
import { KIND_STYLE } from "../graph/styles";
import { useStore } from "../store";

const SHAPE_CLIP: Partial<Record<Kind, string>> = {
  framework: "polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)",
  service: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)",
  saas: "polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)",
  server: "polygon(0 0, 100% 0, 85% 50%, 100% 100%, 0 100%, 15% 50%)",
  format: "polygon(0 0, 75% 0, 100% 50%, 75% 100%, 0 100%)",
  spec: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
  dataset: "polygon(25% 0, 100% 0, 75% 100%, 0 100%)",
  org: "polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
};

export function KindSwatch({ kind }: { kind: Kind }) {
  const radius = kind === "library" ? "9999px" : kind === "desktop-app" || kind === "database" ? "3px" : "0";
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 shrink-0"
      style={{ background: KIND_STYLE[kind].color, borderRadius: radius, clipPath: SHAPE_CLIP[kind] }}
    />
  );
}

export function KindFilter({ index }: { index: GraphIndex }) {
  const hiddenKinds = useStore((s) => s.hiddenKinds);
  const { toggleKind, showAllKinds } = useStore.getState();
  const counts = useMemo(() => {
    const m = new Map<Kind, number>();
    for (const n of index.nodes) m.set(n.kind, (m.get(n.kind) ?? 0) + 1);
    return m;
  }, [index]);

  return (
    <div role="group" aria-label="Show or hide kinds" className="flex items-center gap-2">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Kinds</span>
      <div className="scrollbar-thin flex gap-1 overflow-x-auto py-1">
        {KINDS.filter((k) => counts.has(k)).map((k) => {
          const visible = !hiddenKinds.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={visible}
              onClick={() => toggleKind(k)}
              title={`${visible ? "Hide" : "Show"} ${KIND_STYLE[k].label} nodes`}
              className={`chip gap-1.5 ${visible ? "" : "line-through opacity-50"}`}
            >
              <KindSwatch kind={k} />
              {KIND_STYLE[k].label}
              <span className="opacity-60">{counts.get(k)}</span>
            </button>
          );
        })}
      </div>
      {hiddenKinds.length > 0 && (
        <button type="button" onClick={showAllKinds} className="shrink-0 text-xs text-slate-500 underline hover:text-slate-900 dark:hover:text-white">
          show all
        </button>
      )}
    </div>
  );
}
