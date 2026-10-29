import raw from "./graph.json";
import { parseGraph, edgeId, type GeoEdge, type GeoNode, type Graph, type Tag } from "./schema";

export interface IndexedEdge extends GeoEdge {
  id: string;
}

export interface GraphIndex {
  graph: Graph;
  nodes: GeoNode[];
  edges: IndexedEdge[];
  byId: Map<string, GeoNode>;
  outgoing: Map<string, IndexedEdge[]>;
  incoming: Map<string, IndexedEdge[]>;
  degree: Map<string, number>;
  tagCounts: Map<Tag, number>;
}

function buildIndex(graph: Graph): GraphIndex {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const edges = graph.edges.map((e) => ({ ...e, id: edgeId(e) }));
  const outgoing = new Map<string, IndexedEdge[]>();
  const incoming = new Map<string, IndexedEdge[]>();
  const degree = new Map<string, number>();
  for (const e of edges) {
    (outgoing.get(e.source) ?? outgoing.set(e.source, []).get(e.source)!).push(e);
    (incoming.get(e.target) ?? incoming.set(e.target, []).get(e.target)!).push(e);
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  const tagCounts = new Map<Tag, number>();
  for (const n of graph.nodes) for (const t of n.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  return { graph, nodes: graph.nodes, edges, byId, outgoing, incoming, degree, tagCounts };
}

export type LoadResult = { ok: true; index: GraphIndex } | { ok: false; error: string };

export function loadGraph(): LoadResult {
  try {
    return { ok: true, index: buildIndex(parseGraph(raw)) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
