import type { LayoutOptions, NodeSingular } from "cytoscape";
import type { Kind } from "../data/schema";
import type { LayoutName } from "../store";

/** Concentric rings from the inside out: orgs and specs at the core, end-user tools on the rim. */
const RING_ORDER: Kind[] = [
  "org", "spec", "format", "dataset", "library", "framework",
  "database", "server", "cli", "service", "saas", "desktop-app",
];

export const LAYOUT_LABELS: Record<LayoutName, string> = {
  fcose: "Force (fCoSE)",
  concentric: "Concentric by kind",
  breadthfirst: "Breadth-first",
};

export function layoutOptions(name: LayoutName, opts: { animate: boolean }): LayoutOptions {
  const common = { fit: true, padding: 40, animate: opts.animate, animationDuration: 600 };
  switch (name) {
    case "fcose":
      return {
        name: "fcose",
        ...common,
        quality: "default",
        randomize: true,
        nodeRepulsion: () => 45000,
        idealEdgeLength: () => 140,
        edgeElasticity: () => 0.2,
        gravity: 0.12,
        gravityRange: 2.5,
        numIter: 2500,
        nodeSeparation: 120,
        nodeDimensionsIncludeLabels: true,
        packComponents: true,
      } as LayoutOptions;
    case "concentric":
      return {
        name: "concentric",
        ...common,
        minNodeSpacing: 14,
        startAngle: (3 / 2) * Math.PI,
        concentric: (n: NodeSingular) => RING_ORDER.length - RING_ORDER.indexOf(n.data("kind") as Kind),
        levelWidth: () => 1,
      } as LayoutOptions;
    case "breadthfirst":
      return {
        name: "breadthfirst",
        ...common,
        directed: false,
        spacingFactor: 1.1,
        avoidOverlap: true,
        // Rooting at orgs gives a readable "who owns what" tree.
        roots: 'node[kind = "org"]',
      } as LayoutOptions;
  }
}
