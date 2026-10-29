import type { Core } from "cytoscape";
import { useMemo, useState } from "react";
import type { GraphIndex, IndexedEdge } from "../data/load";
import type { EdgeType, GeoNode, Tag } from "../data/schema";
import { alternatives, dependencies, dependents, neighborhood } from "../graph/queries";
import { EDGE_COLORS, KIND_STYLE } from "../graph/styles";
import { useStore, type Highlight } from "../store";

const INVERSE: Record<EdgeType, string> = {
  uses: "used by",
  implements: "implemented by",
  reads: "read by",
  writes: "written by",
  hosts: "hosted by",
  renders: "rendered by",
  "built-on": "foundation for",
  "alternative-to": "alternative to",
  "part-of": "includes",
  produces: "produced by",
  consumes: "consumed by",
};

interface Group {
  key: string;
  label: string;
  type: EdgeType;
  nodes: GeoNode[];
}

function groupRelations(index: GraphIndex, id: string): Group[] {
  const groups = new Map<string, Group>();
  const add = (key: string, label: string, type: EdgeType, other: string) => {
    const n = index.byId.get(other);
    if (!n) return;
    const g = groups.get(key) ?? groups.set(key, { key, label, type, nodes: [] }).get(key)!;
    if (!g.nodes.includes(n)) g.nodes.push(n);
  };
  const out: IndexedEdge[] = index.outgoing.get(id) ?? [];
  const inc: IndexedEdge[] = index.incoming.get(id) ?? [];
  for (const e of out) add(e.type === "alternative-to" ? "alt" : `out:${e.type}`, e.type.replace("-", " "), e.type, e.target);
  for (const e of inc) add(e.type === "alternative-to" ? "alt" : `in:${e.type}`, INVERSE[e.type], e.type, e.source);
  for (const g of groups.values()) g.nodes.sort((a, b) => a.label.localeCompare(b.label));
  const order = (g: Group) => (g.key === "alt" ? 2 : g.key.startsWith("out:") ? 0 : 1);
  return [...groups.values()].sort((a, b) => order(a) - order(b) || a.label.localeCompare(b.label));
}

function NodeLink({ node, onPick }: { node: GeoNode; onPick: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(node.id)}
      className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-sm hover:bg-slate-100 focus-visible:bg-slate-100 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
    >
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_STYLE[node.kind].color }} />
      {node.label}
    </button>
  );
}

export function TagChip({ tag, count, active, onClick }: { tag: Tag; count?: number; active?: boolean; onClick?: () => void }) {
  const setHoverTag = useStore((s) => s.setHoverTag);
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      onMouseEnter={() => setHoverTag(tag)}
      onMouseLeave={() => setHoverTag(null)}
      onFocus={() => setHoverTag(tag)}
      onBlur={() => setHoverTag(null)}
      className={`chip ${active ? "chip-active" : ""}`}
    >
      {tag}
      {count !== undefined && <span className="ml-1 opacity-60">{count}</span>}
    </button>
  );
}

interface Props {
  index: GraphIndex;
  cy: Core | null;
}

export function DetailPanel({ index, cy }: Props) {
  const selectedId = useStore((s) => s.selectedId);
  const highlight = useStore((s) => s.highlight);
  const pathFrom = useStore((s) => s.pathFrom);
  const activeTags = useStore((s) => s.tags);
  const hiddenKinds = useStore((s) => s.hiddenKinds);
  const { select, setHighlight, setPathFrom, toggleTag, toggleKind, setPaletteOpen } = useStore.getState();
  const [collapsed, setCollapsed] = useState(false);

  const node = selectedId ? index.byId.get(selectedId) : undefined;
  const groups = useMemo(() => (node ? groupRelations(index, node.id) : []), [index, node]);

  if (!node) {
    return (
      <div className="p-5 text-sm text-slate-600 dark:text-slate-400">
        <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">Explore the landscape</h2>
        <p className="mb-3">
          {index.nodes.length} tools, formats, specs and datasets connected by {index.edges.length} relationships.
          Click a node, or press <kbd className="kbd">⌘K</kbd> to search.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Filter by tags (AND / OR) and kinds above the graph.</li>
          <li>Hover a tag chip to light up every node that shares it.</li>
          <li>Use the query buttons to trace dependencies, dependents and paths.</li>
          <li>The URL updates as you go, so any view can be shared.</li>
        </ul>
      </div>
    );
  }

  const run = (fn: (cy: Core, id: string) => Highlight | null) => cy && setHighlight(fn(cy, node.id));
  const style = KIND_STYLE[node.kind];
  const queryButtons: [string, () => void, boolean][] = [
    ["Show neighborhood", () => run(neighborhood), false],
    ["Show dependencies", () => run(dependencies), false],
    ["Show dependents", () => run(dependents), false],
    ["Show alternatives", () => run(alternatives), !groups.some((g) => g.key === "alt")],
  ];

  return (
    <article aria-labelledby="detail-title" className="flex h-full flex-col">
      <header className="flex items-start gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <span
            className="mb-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-slate-900"
            style={{ background: style.color }}
          >
            {style.label}
          </span>
          <h2 id="detail-title" className="text-lg font-semibold leading-tight">
            {node.label}
          </h2>
        </div>
        <button
          type="button"
          className="icon-btn md:hidden"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls="detail-body"
          aria-label={collapsed ? "Expand details" : "Collapse details"}
        >
          {collapsed ? "▴" : "▾"}
        </button>
        <button type="button" className="icon-btn" onClick={() => select(null)} aria-label="Close details">
          ✕
        </button>
      </header>

      <div id="detail-body" className={`flex-1 space-y-5 overflow-y-auto p-4 ${collapsed ? "hidden md:block" : ""}`}>
        {hiddenKinds.includes(node.kind) && (
          <p className="rounded bg-amber-100 p-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            {style.label} nodes are hidden.{" "}
            <button type="button" className="underline" onClick={() => toggleKind(node.kind)}>
              Show them
            </button>
          </p>
        )}

        <div className="flex flex-wrap gap-1.5" aria-label="Tags">
          {node.tags.map((t) => (
            <TagChip key={t} tag={t} active={activeTags.includes(t)} onClick={() => toggleTag(t)} />
          ))}
        </div>

        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{node.description}</p>

        <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate-500 dark:text-slate-400">Website</dt>
          <dd className="truncate">
            <a href={node.url} target="_blank" rel="noreferrer" className="text-sky-700 underline dark:text-sky-400">
              {node.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
          </dd>
          {node.license && (
            <>
              <dt className="text-slate-500 dark:text-slate-400">License</dt>
              <dd>{node.license}</dd>
            </>
          )}
          {node.maintainer && (
            <>
              <dt className="text-slate-500 dark:text-slate-400">Maintainer</dt>
              <dd>{node.maintainer}</dd>
            </>
          )}
        </dl>

        <section aria-label="Queries">
          <div className="grid grid-cols-2 gap-1.5">
            {queryButtons.map(([label, fn, disabled]) => (
              <button key={label} type="button" className="btn" onClick={fn} disabled={disabled || !cy}>
                {label}
              </button>
            ))}
            <button
              type="button"
              className={`btn col-span-2 ${pathFrom === node.id ? "btn-active" : ""}`}
              onClick={() => {
                if (pathFrom === node.id) return setPathFrom(null);
                setHighlight(null);
                setPathFrom(node.id);
                setPaletteOpen(true);
              }}
            >
              {pathFrom === node.id ? "Picking target… (cancel)" : "Shortest path to…"}
            </button>
          </div>

          {highlight && (
            <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{highlight.label}</h3>
                <button type="button" className="text-xs text-slate-500 underline" onClick={() => setHighlight(null)}>
                  Clear
                </button>
              </div>
              {highlight.path ? (
                <ol className="flex flex-wrap items-center gap-1 text-sm">
                  {highlight.path.map((id, i) => (
                    <li key={id} className="flex items-center gap-1">
                      {i > 0 && <span aria-hidden className="text-slate-400">→</span>}
                      <NodeLink node={index.byId.get(id)!} onPick={select} />
                    </li>
                  ))}
                  {highlight.path.length === 0 && <li className="text-slate-500">No connection between these nodes.</li>}
                </ol>
              ) : (
                <ul className="flex max-h-40 flex-wrap gap-0.5 overflow-y-auto">
                  {highlight.nodeIds
                    .filter((id) => id !== node.id)
                    .map((id) => index.byId.get(id)!)
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map((n) => (
                      <li key={n.id}>
                        <NodeLink node={n} onPick={select} />
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section aria-label="Relationships" className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Relationships ({groups.reduce((n, g) => n + g.nodes.length, 0)})
          </h3>
          {groups.map((g) => (
            <div key={g.key}>
              <h4 className="mb-1 flex items-center gap-2 text-sm font-medium">
                <span
                  aria-hidden
                  className={`inline-block w-5 border-t-2 ${g.type === "alternative-to" ? "border-dashed" : ""}`}
                  style={{ borderColor: EDGE_COLORS[g.type] }}
                />
                {g.label}
                <span className="text-xs text-slate-400">{g.nodes.length}</span>
              </h4>
              <ul className="flex flex-wrap gap-0.5 pl-7">
                {g.nodes.map((n) => (
                  <li key={n.id}>
                    <NodeLink node={n} onPick={select} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </article>
  );
}
