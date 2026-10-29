import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ZodError } from "zod";
import { GraphSchema, checkGraphIntegrity, KINDS, type Graph } from "../src/data/schema.ts";

const MIN_NODES = 100;
const MIN_EDGES = 150;

const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ? resolve(process.argv[2]) : resolve(here, "../src/data/graph.json");

function fail(lines: string[]): never {
  console.error(`\n✖ graph.json is invalid (${lines.length} problem${lines.length === 1 ? "" : "s"}):`);
  for (const l of lines) console.error(`  - ${l}`);
  process.exit(1);
}

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(file, "utf8"));
} catch (err) {
  fail([`could not parse JSON: ${(err as Error).message}`]);
}

const errors: string[] = [];
const parsed = GraphSchema.safeParse(raw);
if (!parsed.success) {
  const nodes = (raw as { nodes?: { id?: string }[] }).nodes ?? [];
  for (const i of (parsed.error as ZodError).issues) {
    const [coll, idx] = i.path;
    const where =
      coll === "nodes" && typeof idx === "number" && nodes[idx]?.id
        ? `node "${nodes[idx].id}" ${i.path.slice(2).join(".")}`
        : i.path.join(".");
    errors.push(`${where}: ${i.message}`);
  }
}

const rawGraph = raw as Graph;
if (!Array.isArray(rawGraph?.nodes) || !Array.isArray(rawGraph?.edges)) fail(errors);
// Referential checks still run on schema-invalid data so every problem is reported in one pass.
errors.push(...checkGraphIntegrity(rawGraph));
const graph = parsed.success ? parsed.data : rawGraph;
if (graph.nodes.length < MIN_NODES) errors.push(`expected at least ${MIN_NODES} nodes, found ${graph.nodes.length}`);
if (graph.edges.length < MIN_EDGES) errors.push(`expected at least ${MIN_EDGES} edges, found ${graph.edges.length}`);
if (errors.length) fail(errors);

const byKind = Object.fromEntries(KINDS.map((k) => [k, graph.nodes.filter((n) => n.kind === k).length]));
console.log(`✔ graph.json is valid: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
console.log(
  "  " +
    Object.entries(byKind)
      .map(([k, v]) => `${k}=${v}`)
      .join("  "),
);
