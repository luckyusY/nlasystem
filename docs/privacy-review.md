# NLA GeoAI privacy review notes

This functional demonstration has no official LAIS connector and no AI provider key. Its privacy posture is intentionally local-first.

- **Browser location:** requested only by the Route to parcel action. The current position is combined with the synthetic parcel centroid and handed to OpenStreetMap directions. The demo does not persist it.
- **Imported GeoJSON:** parsed in the browser and displayed locally. The application does not upload the file.
- **Field photo placeholders:** the file input records only the selected count for the active component state. Image bytes are not uploaded or analysed.
- **Field notes, reviews and history:** held in React state, `sessionStorage` or local browser state depending on the workflow. Users can clear history; none of these values modifies a legal record.
- **Optional local AI:** the quantized model is downloaded and cached by the browser after explicit activation. Inference happens locally; prompts are not sent to an AI provider by this application.
- **Exports:** GeoJSON, CSV, SVG, JSON and PDF outputs are created in the browser. Once downloaded, retention and sharing are the user’s responsibility.
- **Public map/search services:** a search query, map area or service-metadata request may be sent to the named public provider, directly during localhost development or through same-origin server routes in production. No cadastral authority should be inferred from those services.

A production NLA system requires an approved data-protection impact assessment, authentication, role enforcement, retention schedules, encrypted audit logs, purpose limitation, incident response and documented controller/processor responsibilities.
