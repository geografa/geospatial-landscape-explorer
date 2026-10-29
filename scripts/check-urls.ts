import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { GraphSchema } from "../src/data/schema.ts";

const here = dirname(fileURLToPath(import.meta.url));
const graph = GraphSchema.parse(JSON.parse(readFileSync(resolve(here, "../src/data/graph.json"), "utf8")));

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

type Result = { status: number | string; final?: string };

async function request(url: string, method: "HEAD" | "GET", headers: Record<string, string>): Promise<Result> {
  try {
    const res = await fetch(url, { method, redirect: "follow", headers, signal: AbortSignal.timeout(20_000) });
    return { status: res.status, final: res.url };
  } catch (err) {
    return { status: (err as Error).name };
  }
}

const isOk = (r: Result) => typeof r.status === "number" && r.status < 400;

async function check(url: string): Promise<Result> {
  const browser = { "user-agent": UA, accept: "text/html,*/*" };
  const head = await request(url, "HEAD", browser);
  if (isOk(head)) return head;
  const get = await request(url, "GET", browser);
  if (isOk(get)) return get;
  // Some hosts (e.g. Meta's) reject a browser UA that lacks client hints,
  // so retry with fetch's default UA before reporting a failure.
  const plain = await request(url, "GET", {});
  return isOk(plain) ? plain : get;
}

// Statuses some hosts return to any non-browser client (e.g. SourceForge 403,
// observablehq.com 429). They prove nothing about the URL, so they only warn.
const BOT_BLOCKED = new Set([401, 403, 429]);

const queue = [...graph.nodes];
const bad: string[] = [];
const blocked: string[] = [];
await Promise.all(
  Array.from({ length: 12 }, async () => {
    for (let n = queue.shift(); n; n = queue.shift()) {
      const r = await check(n.url);
      const ok = typeof r.status === "number" && r.status < 400;
      const isBlocked = typeof r.status === "number" && BOT_BLOCKED.has(r.status);
      const moved = r.final && r.final.replace(/\/$/, "") !== n.url.replace(/\/$/, "") ? ` -> ${r.final}` : "";
      console.log(`${ok ? "ok  " : isBlocked ? "WARN" : "BAD "} ${r.status} ${n.id} ${n.url}${moved}`);
      if (isBlocked) blocked.push(`${n.id}: ${n.url} (${r.status})`);
      else if (!ok) bad.push(`${n.id}: ${n.url} (${r.status})`);
    }
  }),
);

if (blocked.length) {
  console.warn(`\n${blocked.length} URL(s) could not be verified (host blocks automated clients):\n  ${blocked.join("\n  ")}`);
}
if (bad.length) {
  console.error(`\n${bad.length} URL(s) failed:\n  ${bad.join("\n  ")}`);
  process.exit(1);
}
console.log(`\n${graph.nodes.length - blocked.length} URLs reachable, ${blocked.length} unverifiable, 0 broken.`);
