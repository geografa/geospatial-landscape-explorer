import cytoscape, { type Core, type ElementDefinition, type StylesheetJson } from "cytoscape";
import fcose from "cytoscape-fcose";
import { useEffect, useRef, type RefObject } from "react";
import type { LayoutName } from "../store";
import { layoutOptions } from "./layouts";

let registered = false;
function registerExtensions() {
  if (registered) return;
  cytoscape.use(fcose);
  registered = true;
}

export interface Emphasis {
  nodes: ReadonlySet<string>;
  edges: ReadonlySet<string>;
}

export interface CytoscapeProps {
  /** Read once on mount; the graph data is static for the app's lifetime. */
  elements: ElementDefinition[];
  stylesheet: StylesheetJson;
  layout: LayoutName;
  dimmed: ReadonlySet<string>;
  hidden: ReadonlySet<string>;
  emphasis: Emphasis | null;
  selectedId: string | null;
  pathSourceId: string | null;
  onNodeTap: (id: string) => void;
  onBackgroundTap: () => void;
}

/**
 * Owns a single Cytoscape instance for the lifetime of the container and syncs
 * props into it imperatively. Each prop has its own effect so a change to, say,
 * the tag filter only toggles classes and never rebuilds elements or reruns layout.
 */
export function useCytoscape(container: RefObject<HTMLElement>, props: CytoscapeProps) {
  const cyRef = useRef<Core | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const appliedLayout = useRef<LayoutName | null>(null);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    registerExtensions();
    const { elements, stylesheet, layout } = latest.current;

    const cy = cytoscape({
      container: el,
      elements,
      style: stylesheet,
      layout: { name: "preset" },
      minZoom: 0.08,
      maxZoom: 4,
      textureOnViewport: true,
      motionBlur: false,
      boxSelectionEnabled: false,
      autounselectify: true,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    });
    cy.layout(layoutOptions(layout, { animate: false })).run();
    appliedLayout.current = layout;

    cy.on("tap", "node", (e) => latest.current.onNodeTap(e.target.id()));
    cy.on("tap", (e) => {
      if (e.target === cy) latest.current.onBackgroundTap();
    });
    cy.on("mouseover", "node", (e) => {
      e.target.addClass("hover").connectedEdges().addClass("hover");
      el.style.cursor = "pointer";
    });
    cy.on("mouseout", "node", (e) => {
      e.target.removeClass("hover").connectedEdges().removeClass("hover");
      el.style.cursor = "";
    });
    cy.on("mouseover", "edge", (e) => e.target.addClass("hover"));
    cy.on("mouseout", "edge", (e) => e.target.removeClass("hover"));

    // Cytoscape only listens to window resizes; the container also changes size
    // when the mobile bottom sheet opens or closes.
    const ro = new ResizeObserver(() => cy.resize());
    ro.observe(el);

    cyRef.current = cy;
    return () => {
      ro.disconnect();
      cy.destroy();
      cyRef.current = null;
      appliedLayout.current = null;
    };
  }, [container]);

  useEffect(() => {
    cyRef.current?.style(props.stylesheet);
  }, [props.stylesheet]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || appliedLayout.current === props.layout) return;
    appliedLayout.current = props.layout;
    const layout = cy.layout(layoutOptions(props.layout, { animate: true }));
    layout.run();
    return () => {
      layout.stop();
    };
  }, [props.layout]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.nodes().forEach((n) => {
        n.toggleClass("kind-hidden", props.hidden.has(n.id()));
      });
    });
  }, [props.hidden]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const { dimmed } = props;
    cy.batch(() => {
      cy.nodes().forEach((n) => {
        n.toggleClass("dim", dimmed.has(n.id()));
      });
      cy.edges().forEach((e) => {
        e.toggleClass("dim", dimmed.has(e.data("source")) || dimmed.has(e.data("target")));
      });
    });
  }, [props.dimmed]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const { emphasis } = props;
    cy.batch(() => {
      if (!emphasis) {
        cy.elements().removeClass("faded emph");
        return;
      }
      cy.nodes().forEach((n) => {
        const on = emphasis.nodes.has(n.id());
        n.toggleClass("emph", on).toggleClass("faded", !on);
      });
      cy.edges().forEach((e) => {
        const on = emphasis.edges.has(e.id());
        e.toggleClass("emph", on).toggleClass("faded", !on);
      });
    });
  }, [props.emphasis]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes(".sel").removeClass("sel");
    if (!props.selectedId) return;
    const n = cy.getElementById(props.selectedId);
    if (n.empty()) return;
    n.addClass("sel");
    cy.stop();
    cy.animate({ center: { eles: n }, zoom: Math.max(cy.zoom(), 0.9) }, { duration: 450, easing: "ease-in-out-cubic" });
  }, [props.selectedId]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes(".path-source").removeClass("path-source");
    if (props.pathSourceId) cy.getElementById(props.pathSourceId).addClass("path-source");
  }, [props.pathSourceId]);

  return cyRef;
}
