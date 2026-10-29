import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadGraph } from "./data/load";
import { startUrlSync } from "./store";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
const result = loadGraph();

if (result.ok) {
  startUrlSync();
  root.render(
    <StrictMode>
      <App index={result.index} />
    </StrictMode>,
  );
} else {
  root.render(
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-3 text-xl font-semibold text-rose-600">graph.json failed validation</h1>
      <pre className="overflow-auto whitespace-pre-wrap rounded bg-slate-100 p-4 text-sm dark:bg-slate-900">{result.error}</pre>
    </main>,
  );
}
