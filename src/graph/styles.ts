import type { StylesheetJson } from "cytoscape";
import type { EdgeType, Kind } from "../data/schema";
import type { Theme } from "../store";

type NodeShape =
  | "ellipse" | "pentagon" | "round-rectangle" | "rectangle" | "hexagon" | "octagon"
  | "barrel" | "concave-hexagon" | "tag" | "diamond" | "rhomboid" | "star";

export const KIND_STYLE: Record<Kind, { color: string; shape: NodeShape; label: string }> = {
  library: { color: "#3b82f6", shape: "ellipse", label: "Library" },
  framework: { color: "#06b6d4", shape: "pentagon", label: "Framework" },
  "desktop-app": { color: "#22c55e", shape: "round-rectangle", label: "App" },
  cli: { color: "#94a3b8", shape: "rectangle", label: "CLI" },
  service: { color: "#f97316", shape: "hexagon", label: "Service" },
  saas: { color: "#ec4899", shape: "octagon", label: "SaaS" },
  database: { color: "#8b5cf6", shape: "barrel", label: "Database" },
  server: { color: "#ef4444", shape: "concave-hexagon", label: "Server" },
  format: { color: "#eab308", shape: "tag", label: "Format" },
  spec: { color: "#a3e635", shape: "diamond", label: "Spec" },
  dataset: { color: "#10b981", shape: "rhomboid", label: "Dataset" },
  org: { color: "#d946ef", shape: "star", label: "Org" },
};

export const EDGE_COLORS: Record<EdgeType, string> = {
  uses: "#64748b",
  "built-on": "#3b82f6",
  "part-of": "#a855f7",
  implements: "#84cc16",
  reads: "#0ea5e9",
  writes: "#f59e0b",
  hosts: "#f97316",
  renders: "#06b6d4",
  produces: "#eab308",
  consumes: "#14b8a6",
  "alternative-to": "#f43f5e",
};

const SOLID: EdgeType[] = ["uses", "built-on", "part-of"];

export function buildStylesheet(theme: Theme): StylesheetJson {
  const dark = theme === "dark";
  const text = dark ? "#e2e8f0" : "#0f172a";
  const outline = dark ? "#020617" : "#ffffff";
  const accent = dark ? "#fde047" : "#0f172a";

  return [
    {
      selector: "node",
      style: {
        "background-color": "data(color)",
        shape: "data(shape)" as never,
        width: "data(size)",
        height: "data(size)",
        label: "data(label)",
        color: text,
        "font-size": 11,
        "font-family": "ui-sans-serif, system-ui, sans-serif",
        "text-valign": "bottom",
        "text-margin-y": 4,
        "text-outline-color": outline,
        "text-outline-width": 2,
        "text-max-width": "110px",
        "text-wrap": "ellipsis",
        // Labels disappear once their on-screen size drops below 7px, which keeps
        // zoomed-out frames cheap.
        "min-zoomed-font-size": 7,
        "border-width": 1,
        "border-color": outline,
        "transition-property": "opacity",
        "transition-duration": 150,
      },
    },
    {
      selector: "edge",
      style: {
        width: 1.2,
        "curve-style": "straight",
        "line-color": "data(color)",
        "target-arrow-color": "data(color)",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.7,
        opacity: dark ? 0.45 : 0.5,
        "font-size": 9,
        color: text,
        "text-outline-color": outline,
        "text-outline-width": 2,
        "min-zoomed-font-size": 8,
        "text-rotation": "autorotate",
      },
    },
    ...SOLID.map((t) => ({ selector: `edge[type = "${t}"]`, style: { "line-style": "solid" as const, width: 1.6 } })),
    {
      selector: 'edge[type = "alternative-to"]',
      style: { "line-style": "dashed", "line-dash-pattern": [6, 4], "target-arrow-shape": "none" },
    },
    { selector: ".kind-hidden", style: { display: "none" } },
    { selector: "node.dim", style: { opacity: 0.12 } },
    { selector: "edge.dim", style: { opacity: 0.05 } },
    { selector: "node.faded", style: { opacity: 0.12 } },
    { selector: "edge.faded", style: { opacity: 0.04 } },
    {
      selector: "node.emph",
      style: { opacity: 1, "border-width": 3, "border-color": accent, "z-index": 10 },
    },
    {
      selector: "edge.emph",
      style: { opacity: 1, width: 2.6, label: "data(type)", "z-index": 10 },
    },
    {
      selector: "node.hover",
      style: { "border-width": 3, "border-color": accent, "z-index": 20, "font-weight": "bold" },
    },
    { selector: "edge.hover", style: { opacity: 1, width: 2.4, label: "data(type)", "z-index": 20 } },
    {
      selector: "node.sel",
      style: {
        "border-width": 4,
        "border-color": accent,
        "font-weight": "bold",
        "font-size": 13,
        "z-index": 30,
        opacity: 1,
      },
    },
    {
      selector: "node.path-source",
      style: { "border-style": "double", "border-width": 6, "border-color": "#f43f5e" },
    },
  ];
}
