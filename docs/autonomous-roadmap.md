# NLA GeoAI autonomous engineering roadmap

This roadmap turns the demonstration into a useful, map-first geospatial prototype. Every item has a visible acceptance condition. A checked item has been implemented and verified in the application; an unchecked item is queued. "Demo" means browser-side or synthetic data that is clearly labelled and cannot be mistaken for an authoritative NLA, LAIS, GeoNet or legal record.

## A. Map-first product foundation

- [x] **001 — Default to the map workspace.** Opening the product lands on the interactive Rwanda map.
- [x] **002 — Make maps the first navigation group.** Map Explorer, Map Library, GIS Analysis and Change Detection appear before administrative pages.
- [x] **003 — Provide six keyless basemaps.** Street, humanitarian, topographic, light, dark and satellite-style backgrounds can be switched.
- [x] **004 — Provide national map themes.** One action can assemble useful land, water, terrain and risk layer combinations.
- [x] **005 — Expose layer provenance.** Every online layer shows its provider, access type, source URL and licence note.
- [x] **006 — Report map service health.** Loading, ready and unavailable states are visible rather than silently failing.
- [x] **007 — Support local GeoJSON import.** A user can load a small GeoJSON file without uploading it to a server.
- [x] **008 — Support parcel GeoJSON export.** A selected demonstration parcel can be downloaded as GeoJSON.
- [x] **009 — Add measuring and geolocation tools.** Distance, area, fit-to-Rwanda and browser location controls are available.
- [x] **010 — Provide a 3D map mode.** The map can switch to the open MapLibre terrain/building view with an honest engine status.

## B. Construction and land-change monitoring

- [x] **011 — Create a deterministic change-analysis engine.** Identical inputs always return identical cells, metrics and candidate geometries.
- [x] **012 — Publish the change-score equation.** Edge, built-up and texture deltas plus their weights are visible beside results.
- [x] **013 — Add quality-aware confidence.** Cloud and registration penalties visibly reduce confidence.
- [x] **014 — Add adjustable detection threshold.** Moving the threshold recomputes candidates without a page reload.
- [x] **015 — Add minimum-footprint filtering.** Small noisy clusters can be excluded using a square-metre control.
- [x] **016 — Add monitoring-area selection.** Users can choose a demonstration sector/area of interest.
- [x] **017 — Add before/after observation dates.** Date controls reject an end date that is not later than the start date.
- [x] **018 — Map candidate construction polygons.** Detected cells appear as styled, inspectable GeoJSON on an interactive map.
- [x] **019 — Summarise affected parcels.** Candidate geometries are intersected with demonstration parcels and listed for review.
- [x] **020 — Export change results as GeoJSON.** The export includes metrics, thresholds, quality flags and demo provenance.

## C. Change review and reporting

- [x] **021 — Export change results as CSV.** Each candidate row includes area, score, confidence and review status.
- [x] **022 — Add before/after visual comparison.** The two epochs and candidate cells can be compared in one responsive view.
- [x] **023 — Add a reviewer decision workflow.** Candidates can be marked pending, accepted or rejected locally.
- [x] **024 — Add reviewer notes.** Notes persist for the current browser session and export with results.
- [x] **025 — Add a false-positive warning.** The page explains shadow, cloud, seasonal and registration failure modes.
- [x] **026 — Add source-resolution guidance.** The page explains what a 10 m Sentinel-2 cell can and cannot establish.
- [x] **027 — Add vegetation-loss scoring.** NDVI-style deltas produce a separately labelled vegetation candidate metric.
- [x] **028 — Add linear-change scoring.** A transparent compactness/elongation heuristic identifies road-like candidates.
- [x] **029 — Add wetland screening.** Candidate change can be intersected with the demonstration wetland references.
- [x] **030 — Generate a traceable change PDF.** The report contains parameters, results, sources, review state and disclaimer.

## D. GNSS sky view and positioning quality

- [x] **031 — Add a dedicated GNSS Sky View page.** It is directly reachable from Maps & analysis and responsive on mobile.
- [x] **032 — Plot satellites by azimuth and elevation.** Horizon, zenith, compass directions and elevation rings use a correct polar transform.
- [x] **033 — Support GPS observations.** GPS satellites, PRNs, signal labels and counts use a distinct accessible colour.
- [x] **034 — Support Galileo observations.** Galileo satellites and E1/E5 signal labels can be independently toggled.
- [x] **035 — Support GLONASS observations.** GLONASS satellites and G1/G2 signal labels can be independently toggled.
- [x] **036 — Support BeiDou observations.** BeiDou satellites and B1/B2 signal labels can be independently toggled.
- [x] **037 — Add an elevation-mask control.** Satellites below the mask are excluded from the usable solution.
- [x] **038 — Compute approximate DOP.** The browser derives geometry quality from the visible-satellite design matrix.
- [x] **039 — Report HDOP, VDOP and PDOP.** Values and plain-language quality bands update with the controls.
- [x] **040 — Add station/observer selection.** Kigali and demonstration CORS locations update the observer card and map.

## E. GNSS operations and resilience

- [x] **041 — Add epoch animation.** Advancing the simulated epoch moves satellites deterministically.
- [x] **042 — Add per-satellite signal strength.** C/N0-style demonstration values are displayed and quality-coded.
- [x] **043 — Add multi-constellation comparison.** Users can compare geometry from one constellation versus all selected systems.
- [x] **044 — Add satellite detail inspection.** Selecting a sky-plot marker reveals PRN, elevation, azimuth, signal and use state.
- [x] **045 — Add obstruction-mask simulation.** A skyline mask shows how buildings or hills degrade geometry.
- [x] **046 — Add spoofing/jamming education.** The page explains anomalies without claiming receiver-level detection.
- [x] **047 — Add GNSS observation CSV export.** The current epoch, controls and per-satellite observations download locally.
- [x] **048 — Add GNSS sky-plot image export.** A clean PNG or SVG export preserves legend and simulation label.
- [x] **049 — Connect GNSS to CORS monitoring.** A station card opens its matching sky/quality view.
- [x] **050 — Document live-data upgrade path.** RINEX, broadcast ephemeris, NTRIP and receiver telemetry boundaries are documented.

## F. Parcel and field workflows

- [x] **051 — Add map-first parcel selection.** Selecting a parcel opens essential identity, area and land-use details without leaving the map.
- [x] **052 — Add shareable workspace state.** Page, basemap, selected layers and selected parcel can be encoded in the URL.
- [x] **053 — Add coordinate search.** Latitude/longitude and UTM zone 36S coordinates can locate the map.
- [x] **054 — Add coordinate readout.** Pointer/tap location reports WGS84 and EPSG:32736 values.
- [x] **055 — Add parcel-neighbour analysis.** Touching and nearby demonstration parcels can be enumerated.
- [x] **056 — Add parcel split sketching.** A local-only sketch estimates proposed child areas without changing records.
- [x] **057 — Add route-to-parcel.** A browser geolocation point can open an external directions link to the parcel vicinity.
- [x] **058 — Add field checklist mode.** Officers can record local visit notes, photo placeholders and verification state.
- [x] **059 — Add offline-ready field shell.** Core UI and bundled demo data remain understandable during a temporary network loss.
- [x] **060 — Add a clear authority boundary.** Every parcel workflow states that no legal record is created or modified.

## G. Spatial analysis toolkit

- [x] **061 — Run real browser-side buffers.** Turf.js produces road and proximity buffers from GeoJSON.
- [x] **062 — Run real intersections.** Turf.js tests parcel, road and wetland geometry instead of stored overlap flags.
- [x] **063 — Calculate geodesic area.** Parcel/result areas are computed from geometry.
- [x] **064 — Transform to Rwanda UTM.** Proj4js exposes EPSG:32736 centroids for technical review.
- [x] **065 — Add point-in-polygon analysis.** User-entered coordinates can be screened against visible local polygons.
- [x] **066 — Add nearest-feature analysis.** The map identifies the closest road, wetland and selected service point.
- [x] **067 — Add dissolve and union.** Selected demonstration parcels can be merged into a summary geometry.
- [x] **068 — Add convex-hull and envelope tools.** A set of points/parcels can produce an inspectable boundary estimate.
- [x] **069 — Add slope-risk explanation.** Terrain layers and thresholds are presented as screening, not a survey result.
- [x] **070 — Add reusable analysis history.** Recent local analyses can be reopened and exported in the same session.

## H. Open data, documents and provenance

- [x] **071 — Curate Rwanda online map services.** The catalogue includes official/public land, water, terrain, forest and risk services.
- [x] **072 — Verify live layer endpoints.** The catalogue separates verified, degraded and temporarily unavailable sources.
- [x] **073 — Add official document metadata.** Authoritative Rwanda land and geospatial publications are searchable by topic.
- [ ] **074 — Add source freshness labels.** Datasets distinguish observation date, publication date and last endpoint check.
- [ ] **075 — Add licence filtering.** Users can filter sources by open, attribution-required and restricted/unknown reuse.
- [ ] **076 — Add WMS capabilities inspection.** A service can show supported layers, CRS, bounds and formats.
- [ ] **077 — Add ArcGIS service metadata inspection.** Layer fields, extent, copyright and supported operations are visible.
- [ ] **078 — Add document link checking.** Broken official PDF/source links are reported in System Health.
- [x] **079 — Add evidence bundles.** Analysis exports include machine-readable source identifiers and retrieval timestamps.
- [ ] **080 — Add a provenance policy page.** The product explains authoritative, public, community and synthetic source classes.

## I. NLA GeoAI, usability and accessibility

- [x] **081 — Brand the assistant as NLA GeoAI.** The name is consistent in navigation, support bubble, reports and safety copy.
- [x] **082 — Provide a no-key local AI option.** Optional Transformers.js inference runs in the browser after user activation.
- [x] **083 — Add change-monitoring intents.** NLA GeoAI can open and explain construction-change results and parameters.
- [x] **084 — Add GNSS intents.** NLA GeoAI can open Sky View and explain masks, DOP and constellation selection.
- [ ] **085 — Add cross-page command links.** Assistant answers can directly open the relevant map, layer, parcel or analysis.
- [ ] **086 — Improve base typography.** Dense 7–9 px labels are raised to readable minimums without losing hierarchy.
- [ ] **087 — Audit keyboard navigation.** Every control has a visible focus state and logical tab order.
- [ ] **088 — Audit screen-reader names.** Interactive icons, plots and map controls have descriptive accessible labels.
- [ ] **089 — Meet touch-target guidance.** Primary mobile controls are at least 44 px on their shortest side.
- [ ] **090 — Honour reduced motion.** Animated scans, cards and sky epochs offer non-animated equivalents.

## J. Reliability, QA and delivery

- [ ] **091 — Add engine unit tests.** Change scoring, area conversion, polar coordinates and DOP calculations have deterministic tests.
- [ ] **092 — Add component interaction tests.** Threshold, constellation and export controls are covered.
- [ ] **093 — Add a smoke-test checklist.** The repository records repeatable desktop and mobile validation scenarios.
- [ ] **094 — Add runtime error boundaries.** A failed map or scientific component has a useful recovery state.
- [ ] **095 — Add network timeouts and retries.** Public map/search calls fail quickly and expose a retry action.
- [ ] **096 — Add performance budgets.** Build size and map startup targets are documented and checked.
- [ ] **097 — Add privacy review notes.** Browser location, imported files, local AI and exports state what remains on-device.
- [x] **098 — Keep lint and production build green.** Every implementation batch passes both checks before publication.
- [x] **099 — Validate responsive workflows.** Map, change monitoring and GNSS are exercised at desktop and 390 × 844 mobile sizes.
- [x] **100 — Publish each verified batch.** Changes are committed, pushed to the draft PR and checked on Vercel.

## Scientific boundaries

- Construction results in this prototype are deterministic synthetic observations designed to demonstrate a review workflow. They are not detections from current NLA imagery and must never trigger enforcement or legal action.
- The GNSS sky view uses deterministic simulated satellite observations unless a future implementation explicitly ingests verified ephemeris/receiver data. It demonstrates geometry and quality concepts, not live constellation status.
- Open map and document sources retain their provider attribution and reuse conditions. Public accessibility is not treated as unrestricted licensing.
