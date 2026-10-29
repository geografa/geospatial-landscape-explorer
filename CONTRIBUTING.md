# Contributing

Thanks for helping map the geospatial landscape! Most contributions are data edits to [`src/data/graph.json`](src/data/graph.json): adding a tool, fixing a URL or license, or adding a missing relationship. You don't need to touch any code for those.

## Ways to contribute

- **Suggest an addition or correction without writing JSON.** [Open an issue](../../issues/new/choose) using the "Suggest or correct an entry" form, and a maintainer will turn it into a data change.
- **Edit the data yourself.** Fork the repo, edit `src/data/graph.json`, and open a pull request. The rest of this guide explains the format.
- **Improve the app.** Bug fixes and features in `src/` are welcome. For anything large, please open an issue first so we can agree on the approach.

## What belongs in the graph

Add entries that are **current and widely used** (or clearly emerging, with real adoption) in geospatial work: libraries, frameworks, apps, CLIs, servers, databases, SaaS products, formats, specs, datasets and organisations. Please don't add:

- Abandoned or archived projects, unless they're still foundational (Shapefile stays).
- Thin wrappers, single plugins or personal projects, unless they're widely adopted.
- Marketing copy. Descriptions should be neutral.

## Adding a node

Each node is one object in the `nodes` array:

```json
{
  "id": "maplibre-gl-js",
  "label": "MapLibre GL JS",
  "kind": "library",
  "tags": ["javascript", "web", "vector-tiles", "open-source", "3d"],
  "description": "Open-source WebGL map renderer forked from Mapbox GL JS v1, with globe and terrain support.",
  "url": "https://maplibre.org/maplibre-gl-js/docs/",
  "license": "BSD-3-Clause",
  "maintainer": "MapLibre"
}
```

| Field | Rules |
| --- | --- |
| `id` | Unique kebab-case slug. Never rename an existing id, because ids appear in shared URLs. |
| `label` | The project's own spelling and capitalisation. |
| `kind` | Exactly one of the kinds in [`src/data/schema.ts`](src/data/schema.ts). Pick what the thing primarily *is*. |
| `tags` | At least 2, chosen from the controlled list in `schema.ts`. No duplicates. |
| `description` | 1–2 neutral sentences: what it is and why it matters. |
| `url` | The official homepage or docs (not a blog post or mirror). Check that it loads. |
| `license` | Optional. Use an [SPDX identifier](https://spdx.org/licenses/) where one exists, taken from the project's own LICENSE file or package registry. Use `Proprietary` for commercial products. Leave it out if you can't verify it. |
| `maintainer` | Optional. The company, foundation or person responsible. |

**New tags or kinds:** add the value to the `TAGS` or `KINDS` array in `src/data/schema.ts` in the same pull request, and explain why no existing tag fits. Prefer reusing tags, because filtering only works well with a small vocabulary.

## Adding an edge

Each edge reads as a sentence, `source —type→ target`:

```json
{ "source": "qgis", "target": "gdal", "type": "uses" }
```

| Type | Meaning | Example |
| --- | --- | --- |
| `uses` | Depends on at runtime | QGIS uses GDAL |
| `built-on` | Built on top of, or forked from | Rasterio built-on GDAL |
| `part-of` | Child belongs to parent (always child → parent) | OGR part-of GDAL |
| `implements` | Implements a spec or standard | GeoServer implements WMS |
| `reads` / `writes` | Reads or writes a format | DuckDB Spatial reads GeoParquet |
| `produces` / `consumes` | Generates or ingests data or artefacts | Tippecanoe produces PMTiles |
| `hosts` | Serves or hosts content | Martin hosts MVT |
| `renders` | Draws a format or dataset | MapLibre GL JS renders MVT |
| `alternative-to` | Comparable choice (symmetric; add it only once, in either direction) | Leaflet alternative-to OpenLayers |

Guidelines:

- Every node needs at least one edge.
- Add the most direct relationship only. Don't add QGIS → PROJ if QGIS already uses PROJ through another edge that conveys the same thing.
- "Show dependencies" and "Show dependents" follow the directed edge types, so a wrong direction produces wrong answers.

## Checking your change locally

```bash
npm install
npm run validate    # schema, unknown tags, duplicate ids, dangling or duplicate edges, orphan nodes
npm run check-urls  # optional: checks every URL loads
npm run dev         # look at your node in the app
```

The pre-commit hook runs `validate` and `typecheck` automatically, and CI runs `validate`, `typecheck` and `build` on every pull request. A pull request can't be merged until CI passes.

## Pull request checklist

- [ ] `npm run validate` passes
- [ ] New URLs load, and licenses were checked against the project's own source
- [ ] Edge directions read correctly as sentences
- [ ] Short explanation and sources in the PR description (links to docs, LICENSE files, or announcements)

## Licensing of contributions

By contributing, you agree that your contributions are licensed under the same terms as the project: **MIT** for code ([`LICENSE`](LICENSE)) and **CC BY 4.0** for the dataset ([`LICENSE-DATA`](LICENSE-DATA)). Don't paste descriptions copied from other websites; write your own.
