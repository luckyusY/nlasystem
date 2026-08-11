# GNSS Sky View production data path

The current Sky View is deterministic simulation. It is useful for teaching geometry, testing interface behaviour and comparing constellation masks, but it must not be described as live Rwanda GeoNet telemetry.

## Minimum operational inputs

1. **Receiver observations:** ingest validated RINEX 3 observation files or a documented real-time receiver stream. Preserve receiver, antenna, marker, interval and time-system metadata.
2. **Satellite orbit and clock:** ingest broadcast navigation messages for a near-real-time view, or verified IGS precise orbit/clock products for post-processing. Reject stale ephemerides and satellites flagged unhealthy.
3. **Real-time corrections:** when authorized, consume RTCM through an authenticated NTRIP client. Never expose mount-point credentials or raw station access tokens in the browser.
4. **Station metadata:** use surveyed station coordinates, antenna reference points, antenna calibration, monument details and equipment-change history from an authoritative registry.
5. **Time handling:** normalize GPS, Galileo, GLONASS and BeiDou time scales explicitly and record leap-second handling. Display the observation epoch and age of data.

## Processing sequence

```text
receiver/RINEX → validate epoch and metadata → decode observations
navigation/precise products → propagate satellite ECEF position and clock
station ECEF → topocentric ENU transform → azimuth/elevation
quality mask + health flags → geometry matrix H → DOP and solution status
```

For a station at geodetic latitude φ and longitude λ, transform the satellite-minus-receiver ECEF vector to east/north/up, then compute:

- azimuth = atan2(east, north), normalized to 0–360 degrees;
- elevation = atan2(up, √(east² + north²));
- design-matrix row = `[-cos(el)sin(az), -cos(el)cos(az), -sin(el), 1]`;
- covariance geometry = `(HᵀH)⁻¹` when at least four independent, valid observations are available.

## Reliability and security gates

- Separate **observed**, **decoded**, **healthy**, **above mask**, **used in solution** and **corrected** states.
- Reject impossible epochs, duplicate PRNs, non-finite observations, stale navigation data and station-coordinate jumps.
- Monitor cycle slips, multipath indicators, loss-of-lock, C/N₀ trends, correction age and residuals. These can indicate a problem but do not by themselves prove spoofing or jamming.
- Keep raw receiver streams server-side behind least-privilege access. Publish only the fields needed by the UI.
- Record input identifiers, retrieval time, decoder version, mask, exclusions and computation version for every exported result.
- Require a CORS/geodesy engineer to approve operational thresholds and incident rules.

## Open-source implementation candidates

- RTKLIB or GNSSTk for receiver/navigation decoding and positioning research.
- BKG Ntrip Client-compatible workflows for authorized NTRIP access.
- georinex for controlled RINEX batch ingestion in a Python processing service.
- IGS products for precise post-processing where their latency and terms fit the workflow.

Selection requires a security, maintenance, licensing and numerical-validation review before production integration.
