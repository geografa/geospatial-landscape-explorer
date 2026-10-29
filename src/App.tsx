import type { Core } from "cytoscape";
import { useEffect, useState } from "react";
import type { GraphIndex } from "./data/load";
import { DetailPanel } from "./components/DetailPanel";
import { GraphCanvas } from "./components/GraphCanvas";
import { KindFilter } from "./components/KindFilter";
import { SearchPalette } from "./components/SearchPalette";
import { TagFilter } from "./components/TagFilter";
import { LAYOUT_LABELS } from "./graph/layouts";
import { filteredSubgraph } from "./graph/queries";
import { useStore, type LayoutName } from "./store";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App({ index }: { index: GraphIndex }) {
  const [cy, setCy] = useState<Core | null>(null);
  const layout = useStore((s) => s.layout);
  const theme = useStore((s) => s.theme);
  const selectedId = useStore((s) => s.selectedId);
  const { setLayout, toggleTheme, setPaletteOpen, select } = useStore.getState();

  useEffect(() => {
    if (selectedId && !index.byId.has(selectedId)) select(null);
  }, [index, selectedId, select]);

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __cy?: Core | null }).__cy = cy;
  }, [cy]);

  const exportPng = async () => {
    if (!cy) return;
    const blob = await cy.png({
      output: "blob-promise",
      full: false,
      scale: 2,
      bg: theme === "dark" ? "#020617" : "#ffffff",
    });
    download(blob, "geospatial-landscape.png");
  };

  const exportJson = () => {
    const s = useStore.getState();
    const sub = filteredSubgraph(index, s);
    const payload = {
      exportedAt: new Date().toISOString(),
      filters: { tags: s.tags, tagMode: s.tagMode, hiddenKinds: s.hiddenKinds, highlight: s.highlight?.label ?? null },
      ...sub,
    };
    download(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "geospatial-subgraph.json");
  };

  const fit = () => cy?.animate({ fit: { eles: cy.elements(":visible"), padding: 40 } }, { duration: 300 });

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <h1 className="mr-auto flex items-center gap-2 text-base font-semibold">
          <span aria-hidden className="text-lg">🌐</span>
          <span>Geospatial Landscape Explorer</span>
        </h1>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex min-w-[12rem] items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400"
          aria-keyshortcuts="Control+K Meta+K"
        >
          <span aria-hidden>🔍</span>
          <span className="flex-1 text-left">Search…</span>
          <kbd className="kbd">⌘K</kbd>
        </button>
        <label className="flex items-center gap-1.5 text-sm">
          <span className="sr-only sm:not-sr-only">Layout</span>
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value as LayoutName)}
            className="rounded-md border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {(Object.keys(LAYOUT_LABELS) as LayoutName[]).map((l) => (
              <option key={l} value={l}>
                {LAYOUT_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button type="button" className="btn" onClick={fit} title="Fit to screen (F)">
            Fit
          </button>
          <button type="button" className="btn" onClick={exportPng} disabled={!cy} title="Download a PNG of the current view">
            PNG
          </button>
          <button type="button" className="btn" onClick={exportJson} title="Download the filtered subgraph as JSON">
            JSON
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <div className="space-y-0.5 border-b border-slate-200 px-3 py-1 dark:border-slate-800">
        <TagFilter index={index} />
        <KindFilter index={index} />
      </div>

      <main className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <section aria-label="Graph" className="relative min-h-0 min-w-0 flex-1">
          <GraphCanvas index={index} onReady={setCy} />
        </section>
        <aside
          aria-label="Details"
          className={`${selectedId ? "flex" : "hidden md:flex"} z-10 max-h-[55dvh] shrink-0 flex-col overflow-hidden rounded-t-2xl border-t border-slate-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:border-slate-800 dark:bg-slate-950 md:max-h-none md:w-96 md:rounded-none md:border-l md:border-t-0 md:shadow-none`}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700 md:hidden" />
          <DetailPanel index={index} cy={cy} />
        </aside>
      </main>

      <SearchPalette index={index} cy={cy} />
    </div>
  );
}
