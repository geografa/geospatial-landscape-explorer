import type { Core, ElementDefinition } from "cytoscape";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GraphIndex } from "../data/load";
import { matchesTags, shortestPath } from "../graph/queries";
import { EDGE_COLORS, KIND_STYLE, buildStylesheet } from "../graph/styles";
import { useCytoscape, type Emphasis } from "../graph/useCytoscape";
import { useStore } from "../store";

interface Props {
  index: GraphIndex;
  onReady: (cy: Core | null) => void;
}

export function GraphCanvas({ index, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useStore((s) => s.theme);
  const layout = useStore((s) => s.layout);
  const tags = useStore((s) => s.tags);
  const tagMode = useStore((s) => s.tagMode);
  const hiddenKinds = useStore((s) => s.hiddenKinds);
  const highlight = useStore((s) => s.highlight);
  const hoverTag = useStore((s) => s.hoverTag);
  const selectedId = useStore((s) => s.selectedId);
  const pathFrom = useStore((s) => s.pathFrom);

  const elements = useMemo<ElementDefinition[]>(
    () => [
      ...index.nodes.map((n) => ({
        group: "nodes" as const,
        data: {
          id: n.id,
          label: n.label,
          kind: n.kind,
          color: KIND_STYLE[n.kind].color,
          shape: KIND_STYLE[n.kind].shape,
          size: Math.round(20 + Math.sqrt(index.degree.get(n.id) ?? 1) * 6),
        },
      })),
      ...index.edges.map((e) => ({
        group: "edges" as const,
        data: { id: e.id, source: e.source, target: e.target, type: e.type, color: EDGE_COLORS[e.type] },
      })),
    ],
    [index],
  );

  const stylesheet = useMemo(() => buildStylesheet(theme), [theme]);

  const hidden = useMemo(
    () => new Set(index.nodes.filter((n) => hiddenKinds.includes(n.kind)).map((n) => n.id)),
    [index, hiddenKinds],
  );

  const dimmed = useMemo(
    () => new Set(index.nodes.filter((n) => !matchesTags(n, tags, tagMode)).map((n) => n.id)),
    [index, tags, tagMode],
  );

  const emphasis = useMemo<Emphasis | null>(() => {
    if (hoverTag) {
      const nodes = new Set(index.nodes.filter((n) => n.tags.includes(hoverTag)).map((n) => n.id));
      const edges = new Set(index.edges.filter((e) => nodes.has(e.source) && nodes.has(e.target)).map((e) => e.id));
      return { nodes, edges };
    }
    if (highlight) return { nodes: new Set(highlight.nodeIds), edges: new Set(highlight.edgeIds) };
    return null;
  }, [index, hoverTag, highlight]);

  const onNodeTap = useCallback(
    (id: string) => {
      const s = useStore.getState();
      if (s.pathFrom && s.pathFrom !== id && cyRef.current) {
        s.setHighlight(shortestPath(cyRef.current, s.pathFrom, id));
        s.setPathFrom(null);
        return;
      }
      s.select(id);
    },
    [],
  );

  const onBackgroundTap = useCallback(() => {
    const s = useStore.getState();
    if (s.pathFrom) s.setPathFrom(null);
    else if (s.highlight) s.setHighlight(null);
    else s.select(null);
  }, []);

  const cyRef = useCytoscape(containerRef, {
    elements,
    stylesheet,
    layout,
    dimmed,
    hidden,
    emphasis,
    selectedId,
    pathSourceId: pathFrom,
    onNodeTap,
    onBackgroundTap,
  });

  useEffect(() => {
    onReady(cyRef.current);
    return () => onReady(null);
  }, [cyRef, onReady]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const cy = cyRef.current;
    if (!cy) return;
    const s = useStore.getState();
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const visible = index.nodes
        .filter((n) => !hidden.has(n.id) && !dimmed.has(n.id))
        .sort((a, b) => a.label.localeCompare(b.label));
      if (!visible.length) return;
      const i = visible.findIndex((n) => n.id === s.selectedId);
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      const next = visible[(i + step + visible.length) % visible.length];
      onNodeTap(next.id);
    } else if (e.key === "Escape") {
      onBackgroundTap();
    } else if (e.key === "f") {
      cy.animate({ fit: { eles: cy.elements(":visible"), padding: 40 } }, { duration: 300 });
    } else if (e.key === "+" || e.key === "=") {
      cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    } else if (e.key === "-") {
      cy.zoom({ level: cy.zoom() / 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    }
  };

  const selected = selectedId ? index.byId.get(selectedId) : undefined;
  const pathSource = pathFrom ? index.byId.get(pathFrom) : undefined;

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        tabIndex={0}
        role="application"
        aria-roledescription="graph"
        aria-label={`Geospatial landscape graph with ${index.nodes.length} nodes. Use arrow keys to move between nodes, Escape to clear, F to fit, plus and minus to zoom, Ctrl+K to search.`}
        onKeyDown={onKeyDown}
        className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
      />
      <div aria-live="polite" className="sr-only">
        {selected ? `Selected ${selected.label}, ${selected.kind}` : ""}
        {highlight ? `. ${highlight.label}: ${highlight.nodeIds.length} nodes highlighted` : ""}
      </div>
      {(pathSource || highlight) && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-4 py-1.5 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
            {pathSource ? (
              <span>
                Pick a target for the path from <strong>{pathSource.label}</strong>: click a node or press{" "}
                <kbd className="kbd">⌘K</kbd>
              </span>
            ) : (
              <span className="truncate">
                <strong>{highlight!.label}</strong>{" "}
                <span className="text-slate-500 dark:text-slate-400">({highlight!.nodeIds.length} nodes)</span>
              </span>
            )}
            <button
              type="button"
              className="rounded-full px-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={() => (pathSource ? useStore.getState().setPathFrom(null) : useStore.getState().setHighlight(null))}
              aria-label={pathSource ? "Cancel path selection" : "Clear highlight"}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
