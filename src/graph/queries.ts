import type { CollectionReturnValue, Core, NodeCollection, NodeSingular } from "cytoscape";
import type { GeoNode, Tag } from "../data/schema";
import type { GraphIndex } from "../data/load";
import type { Highlight, TagMode } from "../store";

const NOT_ALT = 'edge[type != "alternative-to"]';

function toHighlight(label: string, eles: CollectionReturnValue, path?: string[]): Highlight {
  return {
    label,
    nodeIds: eles.nodes().map((n) => n.id()),
    edgeIds: eles.edges().map((e) => e.id()),
    path,
  };
}

function nodeOf(cy: Core, id: string): NodeSingular | null {
  const n = cy.getElementById(id);
  return n.nonempty() && n.isNode() ? n : null;
}

/**
 * Transitive closure along directed edges, like `successors()` / `predecessors()`,
 * but skipping `alternative-to` edges: "QGIS is an alternative to ArcGIS Pro" doesn't
 * make ArcGIS Pro depend on QGIS's dependencies.
 */
function closure(root: NodeSingular, dir: "out" | "in"): CollectionReturnValue {
  const cy = root.cy();
  let result = cy.collection();
  let frontier: NodeCollection = root.union(root);
  const seen = new Set([root.id()]);
  while (frontier.nonempty()) {
    const edges = (dir === "out" ? frontier.outgoers(NOT_ALT) : frontier.incomers(NOT_ALT)).edges();
    const next = (dir === "out" ? edges.targets() : edges.sources()).filter((n: NodeSingular) => !seen.has(n.id()));
    next.forEach((n: NodeSingular) => {
      seen.add(n.id());
    });
    result = result.union(edges).union(next);
    frontier = next;
  }
  return result;
}

export function neighborhood(cy: Core, id: string): Highlight | null {
  const n = nodeOf(cy, id);
  return n && toHighlight(`Neighborhood of ${n.data("label")}`, n.closedNeighborhood());
}

export function dependencies(cy: Core, id: string): Highlight | null {
  const n = nodeOf(cy, id);
  return n && toHighlight(`Dependencies of ${n.data("label")}`, closure(n, "out").union(n));
}

export function dependents(cy: Core, id: string): Highlight | null {
  const n = nodeOf(cy, id);
  return n && toHighlight(`Dependents of ${n.data("label")}`, closure(n, "in").union(n));
}

export function alternatives(cy: Core, id: string): Highlight | null {
  const n = nodeOf(cy, id);
  if (!n) return null;
  const edges = n.connectedEdges('[type = "alternative-to"]');
  return toHighlight(`Alternatives to ${n.data("label")}`, edges.union(edges.connectedNodes()).union(n));
}

export function shortestPath(cy: Core, from: string, to: string): Highlight | null {
  const a = nodeOf(cy, from);
  const b = nodeOf(cy, to);
  if (!a || !b) return null;
  const visible = cy.elements().not(".kind-hidden");
  const res = visible.aStar({ root: a, goal: b, directed: false });
  const label = `Path: ${a.data("label")} → ${b.data("label")}`;
  if (!res.found) return { label: `${label} (no path)`, nodeIds: [a.id(), b.id()], edgeIds: [], path: [] };
  return toHighlight(`${label} (${res.distance} hops)`, res.path, res.path.nodes().map((n) => n.id()));
}

export function matchesTags(node: GeoNode, tags: Tag[], mode: TagMode): boolean {
  if (!tags.length) return true;
  return mode === "and" ? tags.every((t) => node.tags.includes(t)) : tags.some((t) => node.tags.includes(t));
}

/** Nodes passing kind and tag filters (and the active highlight, if any) plus the edges among them. */
export function filteredSubgraph(
  index: GraphIndex,
  opts: { tags: Tag[]; tagMode: TagMode; hiddenKinds: string[]; highlight: Highlight | null },
) {
  const inHighlight = opts.highlight ? new Set(opts.highlight.nodeIds) : null;
  const nodes = index.nodes.filter(
    (n) =>
      !opts.hiddenKinds.includes(n.kind) &&
      matchesTags(n, opts.tags, opts.tagMode) &&
      (!inHighlight || inHighlight.has(n.id)),
  );
  const ids = new Set(nodes.map((n) => n.id));
  const edges = index.graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  return { nodes, edges };
}
