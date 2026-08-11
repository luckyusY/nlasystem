# NLA GeoAI repeatable smoke-test checklist

Use this checklist after `npm run verify` and before publishing a batch. Record the commit, browser and date in the PR.

## Desktop — 1440 × 900

- [ ] Open `/` and confirm the Interactive Rwanda Map is the default workspace.
- [ ] Search a parcel UPI, `-1.9536, 30.0606`, and an EPSG:32736 coordinate.
- [ ] Click the map and confirm WGS84 plus UTM 36S readout values appear.
- [ ] Change the basemap, context layers and selected parcel; reload the copied URL and confirm restoration.
- [ ] Open Map Library, filter by category and licence, then inspect one WMS and one ArcGIS service.
- [ ] Run distance/area measurement, GeoJSON import and selected-parcel GeoJSON export.
- [ ] Run road, wetland, point, nearest-feature, union, hull and envelope workflows.
- [ ] Export an analysis evidence bundle and confirm session history survives page navigation.
- [ ] Run Construction Change Monitor, adjust threshold/quality, review a candidate and export PDF/CSV/GeoJSON.
- [ ] Open GNSS Sky View, toggle all four constellations, apply a skyline, inspect a blocked satellite and export CSV/SVG.
- [ ] Ask NLA GeoAI about a parcel, a forest map, construction and GNSS; use each cross-page action.
- [ ] Open System Health, retry a public service if needed and run the official document-link check.
- [ ] Open Data Provenance Policy and verify source classes plus on-device privacy notes.

## Mobile — 390 × 844

- [ ] Confirm the map remains the primary view with no horizontal page overflow.
- [ ] Confirm map search, 2D/3D, basemap and primary tools meet 44 px touch targets.
- [ ] Open the parcel field card; verify coordinates, route, split estimate, checklist and local notes.
- [ ] Run a GIS analysis and reach Geometry Laboratory, history and export without clipped controls.
- [ ] Open GNSS controls, change the mask/obstruction and reach the sky plot and quality cards.
- [ ] Open source metadata and the provenance page; confirm the mobile full-height dialog can close and retry.

## Accessibility and resilience

- [ ] Traverse header, navigation, forms, map tools, dialogs and exports using only Tab, Shift+Tab, Enter, Space and Escape where applicable.
- [ ] Confirm every icon-only button has a descriptive accessible name and focus remains visible.
- [ ] Enable reduced motion and confirm Lenis, decorative transitions and automatic epoch animation are disabled or replaceable with a step button.
- [ ] Simulate a failed source request and confirm timeout, error copy and retry action are visible.
- [ ] Confirm a component exception is contained by the workspace recovery boundary rather than blanking the application.
