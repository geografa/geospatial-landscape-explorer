# Geospatial Landscape Explorer

An interactive graph of the geospatial ecosystem (libraries, apps, servers, SaaS, formats, specs, datasets and orgs) built with Vite, React 18, TypeScript, Cytoscape.js (fCoSE), Tailwind CSS and Zustand.

```bash
npm install
npm run dev         # http://localhost:5173
npm run validate    # schema + referential checks on src/data/graph.json
npm run check-urls  # live HTTP check of every node URL (needs network)
npm run build       # tsc -b && vite build
```

A Husky `pre-commit` hook runs `npm run validate` and `npm run typecheck`. GitHub Actions runs the same checks plus `npm run build` on every push and pull request, and runs `npm run check-urls` weekly (or on demand). The link check never blocks a merge.

## Contributing

Suggestions are welcome, especially new tools, corrections and missing relationships. Use the **"Suggest or correct an entry"** issue form (no JSON needed), or edit `src/data/graph.json` and open a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the data format and edge conventions.

## License

- **Code**: [MIT](LICENSE)
- **Dataset** (`src/data/graph.json`): [CC BY 4.0](LICENSE-DATA). Reuse it freely with attribution.

## Features

- **Graph view**: fCoSE force layout by default, plus "Concentric by kind" and "Breadth-first" (rooted at orgs). The graph fits on load, and zoom/pan animate smoothly.
- **Detail panel**: kind, tag chips, description, website, license, maintainer, and relationships grouped by edge type in both directions (e.g. *uses* / *used by*). Every related node is clickable. On screens narrower than 768 px the panel becomes a collapsible bottom sheet.
- **Query helpers**: Show neighborhood, Show dependencies, Show dependents, Show alternatives, and Shortest path to… (pick the target by clicking a node or through the search palette; uses `aStar`).
- **Tag filter**: multi-select with an AND/OR toggle. Non-matching nodes get the `.dim` class (opacity 0.12) rather than being removed, so the layout stays stable.
- **Kind filter**: toggles visibility per kind (`display: none` via a class, so positions are kept). It doubles as the legend.
- **Search**: Fuse.js fuzzy search over label, id, tags, kind and description, in a command palette opened with <kbd>⌘K</kbd>, <kbd>Ctrl+K</kbd> or <kbd>/</kbd>.
- **Shared-tag highlight**: hovering or focusing any tag chip highlights every node with that tag.
- **URL state**: `?node=gdal&tags=api,hosting&mode=and&hide=format,spec&layout=concentric`. Changing the selection pushes a history entry (so Back works); filter changes replace the current one.
- **Export**: PNG of the current viewport (2× scale), and JSON of the current filtered subgraph (kind and tag filters, intersected with the active highlight if there is one).
- **Light/dark mode**: follows the OS setting by default and persists to `localStorage`.

### Keyboard

| Key | Action |
| --- | --- |
| ⌘K / Ctrl+K / `/` | Open search |
| ↑ ↓ Enter Esc | Navigate, select and close inside search |
| ← → (graph focused) | Step through visible nodes alphabetically |
| Esc (graph focused) | Cancel path picking, then clear the highlight, then clear the selection |
| F, + / − | Fit, zoom in / out |

Every control is a native button or select with an ARIA label. A live region announces the selection and query results.

## Architecture

```
src/
  data/graph.json        seed data (178 nodes, 598 edges)
  data/schema.ts         Zod schema, Kind/Tag/EdgeType unions, integrity checks
  data/load.ts           validates at load and builds lookup indexes
  graph/useCytoscape.ts  owns the cy instance in a ref and syncs props imperatively
  graph/styles.ts        stylesheet (kind → color/shape, edge type → color/dash)
  graph/layouts.ts       fcose / concentric / breadthfirst options
  graph/queries.ts       neighborhood, closures, alternatives, aStar, subgraph export
  components/            GraphCanvas, DetailPanel, TagFilter, KindFilter, SearchPalette
  store.ts               Zustand store + URL sync
scripts/validate-graph.ts  fails on schema errors, duplicate ids, unknown tags, dangling/duplicate edges, orphan nodes
scripts/check-urls.ts      HEAD/GET every node URL
```

`useCytoscape` creates the Cytoscape instance once and never passes elements through React. Each concern (stylesheet, layout, hidden kinds, tag dimming, emphasis, selection, path source) has its own effect that only toggles classes inside `cy.batch()`. Filtering or hovering therefore never rebuilds the graph or reruns the layout. A `ResizeObserver` keeps the canvas sized correctly when the mobile sheet opens.

### Performance

- `textureOnViewport: true`, `motionBlur: false`, straight edges, no shadows, and pixel ratio capped at 2.
- Labels use `min-zoomed-font-size`, so they disappear when zoomed out.
- Hover feedback is applied directly in Cytoscape, with no React state updates.
- Measured in Chromium with 303 nodes and 804 edges (130 synthetic nodes added): a steady 60 fps (16.7 ms average, worst frame 17.7 ms) during animated zoom-in, pan and zoom-out-to-fit.

## Data decisions

- **Edge direction** reads as a sentence, `source —type→ target`: "QGIS uses GDAL", "OGR part-of GDAL". So `part-of` always points from child to parent, which is why "COG part-of Cloud-Native Geospatial Forum" is stored in that direction.
- **`alternative-to`** is symmetric. It's drawn dashed with no arrowhead, merged into one "alternative to" group in the panel, and checked for duplicates in either direction.
- **Dependencies and dependents** are the transitive closure along directed edges (the `successors()` / `predecessors()` idea), except that they **skip `alternative-to` edges**. Being an alternative to QGIS doesn't make ArcGIS Pro depend on GDAL. For GDAL, "Show dependents" returns 45 nodes, including QGIS, Rasterio, Fiona, Pyogrio, GeoPandas, PostGIS, DuckDB Spatial, TiTiler and the GDAL CLIs.
- **Shortest path** ignores edge direction (you can ask how two things relate in either direction) and skips hidden kinds.
- **Added tags**: `vector` (needed for OGR, as requested), `ai` (TorchGeo, SAMGeo, ML building footprints) and `r` (sf, terra).
- **`desktop-app`** also covers interactive end-user apps that run in the browser (iD, Maputnik), since there is no `web-app` kind.
- **Organisations** in the data: Esri, MapLibre, OGC, OSGeo, Cloud-Native Geospatial Forum and Overture Maps Foundation. Vendors whose main identity is a product (Mapbox, HERE, TomTom, Planet…) are modelled as `service` or `saas` nodes, following the task's spec.
- **OGC standards** (WMS, WFS, WMTS, OGC API family, GeoPackage, KML, GeoTIFF, COG, Zarr, NetCDF, 3D Tiles, I3S, Simple Features) are `part-of` the OGC org node.
- **Additions beyond the requested list** include Planet, Amazon Location Service, Azure Maps, Cesium ion, Fused, Wherobots, BigQuery GIS, Source Cooperative, OpenFreeMap, Planetiler, Osmium, PDAL, WhiteboxTools, JTS, the unified `gdal` CLI (GDAL 3.11+), JOSM, iD, Maputnik, React Leaflet, Lonboard, geemap, PySAL, PySTAC, rio-tiler, TorchGeo, SAMGeo, sf and terra (R), PostgreSQL, SQLite, pg_featureserv, TileServer GL, Terracotta, pygeoapi, openrouteservice, GeoArrow, GeoZarr, MBTiles, MapLibre Tile (MLT), A5, LAS/LAZ, COPC, 3D Tiles, I3S, Simple Features, NetCDF, GeoTIFF and Google Open Buildings.

### Verification of URLs and licenses

- Every URL was fetched live with `npm run check-urls`. Redirects were followed and moved projects updated (for example, rioxarray moved from Corteva to `vylor.github.io`, and PDAL to `pdal.org`). Two hosts refuse automated clients (SourceForge for SAGA GIS returns 403, and observablehq.com rate-limits with 429). Those URLs are the canonical ones and were left as is.
- Licenses were cross-checked against PyPI, npm, crates.io and the GitHub license API. Where the spec repo and a package disagreed (FlatGeobuf: BSD-2-Clause in the spec repo, BSD-3-Clause on npm), the spec repo wins. Specs and services without a meaningful single license omit the field.
