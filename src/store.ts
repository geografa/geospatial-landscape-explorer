import { create } from "zustand";
import { KINDS, TAGS, type Kind, type Tag } from "./data/schema";

export type LayoutName = "fcose" | "concentric" | "breadthfirst";
export type TagMode = "and" | "or";
export type Theme = "light" | "dark";

export interface Highlight {
  label: string;
  nodeIds: string[];
  edgeIds: string[];
  /** Ordered node ids when the highlight is a path. */
  path?: string[];
}

interface UrlState {
  selectedId: string | null;
  tags: Tag[];
  tagMode: TagMode;
  hiddenKinds: Kind[];
  layout: LayoutName;
}

interface State extends UrlState {
  highlight: Highlight | null;
  hoverTag: Tag | null;
  /** Source node while the user is picking a shortest-path target. */
  pathFrom: string | null;
  paletteOpen: boolean;
  theme: Theme;

  select: (id: string | null) => void;
  toggleTag: (tag: Tag) => void;
  clearTags: () => void;
  setTagMode: (mode: TagMode) => void;
  toggleKind: (kind: Kind) => void;
  showAllKinds: () => void;
  setLayout: (layout: LayoutName) => void;
  setHighlight: (h: Highlight | null) => void;
  setHoverTag: (tag: Tag | null) => void;
  setPathFrom: (id: string | null) => void;
  setPaletteOpen: (open: boolean) => void;
  toggleTheme: () => void;
  applyUrlState: (s: UrlState) => void;
}

const LAYOUTS: LayoutName[] = ["fcose", "concentric", "breadthfirst"];

export function readUrlState(search = window.location.search): UrlState {
  const p = new URLSearchParams(search);
  const list = (key: string) => (p.get(key) ?? "").split(",").filter(Boolean);
  const layout = p.get("layout") as LayoutName | null;
  return {
    selectedId: p.get("node"),
    tags: list("tags").filter((t): t is Tag => (TAGS as readonly string[]).includes(t)),
    tagMode: p.get("mode") === "and" ? "and" : "or",
    hiddenKinds: list("hide").filter((k): k is Kind => (KINDS as readonly string[]).includes(k)),
    layout: layout && LAYOUTS.includes(layout) ? layout : "fcose",
  };
}

export function serializeUrlState(s: UrlState): string {
  const p = new URLSearchParams();
  if (s.selectedId) p.set("node", s.selectedId);
  if (s.tags.length) p.set("tags", s.tags.join(","));
  if (s.tags.length && s.tagMode === "and") p.set("mode", "and");
  if (s.hiddenKinds.length) p.set("hide", s.hiddenKinds.join(","));
  if (s.layout !== "fcose") p.set("layout", s.layout);
  const qs = p.toString().replace(/%2C/g, ",");
  return qs ? `?${qs}` : "";
}

function initialTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export const useStore = create<State>((set) => ({
  ...readUrlState(),
  highlight: null,
  hoverTag: null,
  pathFrom: null,
  paletteOpen: false,
  theme: initialTheme(),

  select: (id) => set((s) => (s.selectedId === id ? s : { selectedId: id, highlight: null, pathFrom: null })),
  toggleTag: (tag) => set((s) => ({ tags: toggle(s.tags, tag) })),
  clearTags: () => set({ tags: [] }),
  setTagMode: (tagMode) => set({ tagMode }),
  toggleKind: (kind) => set((s) => ({ hiddenKinds: toggle(s.hiddenKinds, kind) })),
  showAllKinds: () => set({ hiddenKinds: [] }),
  setLayout: (layout) => set({ layout }),
  setHighlight: (highlight) => set({ highlight }),
  setHoverTag: (hoverTag) => set({ hoverTag }),
  setPathFrom: (pathFrom) => set({ pathFrom }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", theme === "dark");
      try {
        localStorage.setItem("gle-theme", theme);
      } catch {
        /* storage unavailable */
      }
      return { theme };
    }),
  applyUrlState: (u) => set({ ...u, highlight: null, pathFrom: null }),
}));

/**
 * Mirrors URL-relevant state into the query string. Selection changes push a
 * history entry (so Back returns to the previous node); filter changes replace it.
 */
export function startUrlSync(): () => void {
  const onPop = () => useStore.getState().applyUrlState(readUrlState());
  window.addEventListener("popstate", onPop);
  const unsub = useStore.subscribe((s, prev) => {
    const next = serializeUrlState(s);
    if (next === window.location.search || (next === "" && window.location.search === "")) return;
    const url = `${window.location.pathname}${next}${window.location.hash}`;
    if (s.selectedId !== prev.selectedId) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  });
  return () => {
    window.removeEventListener("popstate", onPop);
    unsub();
  };
}
