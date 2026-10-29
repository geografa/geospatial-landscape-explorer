import { z } from "zod";

export const KINDS = [
  "library",
  "framework",
  "desktop-app",
  "cli",
  "service",
  "saas",
  "database",
  "server",
  "format",
  "spec",
  "dataset",
  "org",
] as const;

export const TAGS = [
  "api",
  "hosting",
  "basemap",
  "sdk",
  "saas",
  "open-source",
  "proprietary",
  "vector-tiles",
  "raster",
  "vector",
  "3d",
  "routing",
  "geocoding",
  "analysis",
  "etl",
  "cloud-native",
  "web",
  "desktop",
  "python",
  "javascript",
  "cpp",
  "java",
  "rust",
  "go",
  "r",
  "sql",
  "visualization",
  "standard",
  "remote-sensing",
  "basemap-data",
  "places",
  "editing",
  "styling",
  "indexing",
  "satellite",
  "mobile",
  "ai",
] as const;

export const EDGE_TYPES = [
  "uses",
  "implements",
  "reads",
  "writes",
  "hosts",
  "renders",
  "built-on",
  "alternative-to",
  "part-of",
  "produces",
  "consumes",
] as const;

/** Edge types without a meaningful direction (rendered without arrowheads). */
export const UNDIRECTED_EDGE_TYPES: readonly EdgeType[] = ["alternative-to"];

export type Kind = (typeof KINDS)[number];
export type Tag = (typeof TAGS)[number];
export type EdgeType = (typeof EDGE_TYPES)[number];

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be a kebab-case slug");

export const GeoNodeSchema = z
  .object({
    id: slug,
    label: z.string().min(1),
    kind: z.enum(KINDS),
    tags: z.array(z.enum(TAGS)).min(2, "every node needs at least 2 tags"),
    description: z.string().min(10),
    url: z.string().url(),
    license: z.string().optional(),
    maintainer: z.string().optional(),
  })
  .strict();

export const GeoEdgeSchema = z
  .object({
    source: slug,
    target: slug,
    type: z.enum(EDGE_TYPES),
  })
  .strict();

export const GraphSchema = z
  .object({
    nodes: z.array(GeoNodeSchema),
    edges: z.array(GeoEdgeSchema),
  })
  .strict();

export type GeoNode = z.infer<typeof GeoNodeSchema>;
export type GeoEdge = z.infer<typeof GeoEdgeSchema>;
export type Graph = z.infer<typeof GraphSchema>;

export const edgeId = (e: GeoEdge) => `${e.source}__${e.type}__${e.target}`;

/**
 * Referential checks Zod can't express: duplicate ids, dangling edges,
 * self-loops, duplicate edges, orphan nodes and duplicate tags.
 */
export function checkGraphIntegrity(graph: Graph): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const n of graph.nodes) {
    if (ids.has(n.id)) errors.push(`duplicate node id: ${n.id}`);
    ids.add(n.id);
    if (new Set(n.tags).size !== n.tags.length) errors.push(`duplicate tags on node: ${n.id}`);
  }

  const degree = new Map<string, number>();
  const seenEdges = new Set<string>();
  for (const e of graph.edges) {
    const label = `${e.source} -[${e.type}]-> ${e.target}`;
    if (!ids.has(e.source)) errors.push(`dangling edge source: ${label}`);
    if (!ids.has(e.target)) errors.push(`dangling edge target: ${label}`);
    if (e.source === e.target) errors.push(`self-loop: ${label}`);
    const key =
      e.type === "alternative-to"
        ? `${[e.source, e.target].sort().join("|")}|${e.type}`
        : edgeId(e);
    if (seenEdges.has(key)) errors.push(`duplicate edge: ${label}`);
    seenEdges.add(key);
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  for (const id of ids) {
    if (!degree.get(id)) errors.push(`node has no edges: ${id}`);
  }
  return errors;
}

export function parseGraph(raw: unknown): Graph {
  const graph = GraphSchema.parse(raw);
  const errors = checkGraphIntegrity(graph);
  if (errors.length) {
    throw new Error(`Invalid graph data:\n${errors.join("\n")}`);
  }
  return graph;
}
