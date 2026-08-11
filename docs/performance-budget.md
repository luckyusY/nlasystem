# NLA GeoAI performance budget

The prototype deliberately includes Leaflet, MapLibre, Turf, Proj4, Framer Motion and an optional dynamically loaded Transformers.js runtime. The budget therefore separates a useful hard ceiling from runtime experience targets.

## Enforced build budgets

Run `npm run build` followed by `npm run qa:budget`.

- Total emitted JavaScript under `.next/static`: **3.8 MiB** uncompressed.
- Largest JavaScript chunk: **1.05 MiB** uncompressed. This accommodates the optional browser-AI runtime while preventing accidental monolithic growth.
- Total emitted CSS: **400 KiB** uncompressed, including the upstream MapLibre stylesheet (about 81 KiB).

The script exits non-zero when a build exceeds any ceiling and reports the current measurements.

## Interaction targets

- The bundled map shell and synthetic parcel context should become understandable within **3.5 seconds** on a typical broadband desktop after a cold navigation.
- Search and public-source requests have explicit **7–12 second** timeouts and one controlled retry where the operation is safe to repeat.
- The optional local AI model loads only after user activation and must never block map, parcel, GIS, document or GNSS workflows.
- At most four online raster overlays are active at once to control network pressure and preserve visual readability.

These are demonstration budgets, not a substitute for production real-user monitoring. A production NLA deployment should add Web Vitals, route-level bundle reporting and representative low-bandwidth Rwanda field testing.
