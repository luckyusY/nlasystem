"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Clock3, Compass, Download, ExternalLink, ImageDown, MapPin, Orbit, Pause, Play, RadioTower, ShieldAlert, StepForward } from "lucide-react";

import OpenStreetMap from "@/components/open-street-map";
import { calculateDop, CONSTELLATION_META, generateGnssEpoch, GNSS_OBSERVERS, type GnssConstellation, type ObserverKey } from "@/lib/gnss-engine";

const ALL_CONSTELLATIONS = Object.keys(CONSTELLATION_META) as GnssConstellation[];

function downloadCsv(filename: string, rows: Array<Array<string | number | boolean>>) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

function dopLabel(value: number | null) {
  return value === null ? "—" : value.toFixed(2);
}

export default function GnssSkyViewPage({ notify, initialObserver = "kigali" }: { notify: (message: string) => void; initialObserver?: ObserverKey }) {
  const reduceMotion = useReducedMotion();
  const [observerKey, setObserverKey] = useState<ObserverKey>(initialObserver);
  const [selected, setSelected] = useState<GnssConstellation[]>(ALL_CONSTELLATIONS);
  const [mask, setMask] = useState(15);
  const [epochMinutes, setEpochMinutes] = useState(630);
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string>("G01");
  const [playing, setPlaying] = useState(false);
  const [obstruction, setObstruction] = useState<"none" | "north" | "east" | "south" | "west">("none");
  const [obstructionElevation, setObstructionElevation] = useState(35);
  const observer = GNSS_OBSERVERS[observerKey];
  const rawEpoch = useMemo(() => generateGnssEpoch({ observer: observerKey, epochMinutes, elevationMask: mask, selectedConstellations: selected }), [epochMinutes, mask, observerKey, selected]);
  const epoch = useMemo(() => {
    const centres = { north: 0, east: 90, south: 180, west: 270 } as const;
    const satellites = rawEpoch.satellites.map((satellite) => {
      if (obstruction === "none") return satellite;
      const difference = Math.abs(((satellite.azimuth - centres[obstruction] + 540) % 360) - 180);
      const blocked = difference <= 48 && satellite.elevation <= obstructionElevation;
      return blocked ? { ...satellite, used: false } : satellite;
    });
    return { satellites, dop: calculateDop(satellites) };
  }, [obstruction, obstructionElevation, rawEpoch]);
  const used = epoch.satellites.filter((satellite) => satellite.used);
  const selectedSatellite = epoch.satellites.find((satellite) => satellite.id === selectedSatelliteId) ?? used[0] ?? epoch.satellites[0];
  const timeLabel = `${String(Math.floor(epochMinutes / 60) % 24).padStart(2, "0")}:${String(epochMinutes % 60).padStart(2, "0")} CAT`;

  useEffect(() => {
    if (!playing || reduceMotion) return;
    const interval = window.setInterval(() => setEpochMinutes((value) => (value + 5) % 1440), 1200);
    return () => window.clearInterval(interval);
  }, [playing, reduceMotion]);

  function toggleConstellation(constellation: GnssConstellation) {
    setSelected((current) => current.includes(constellation) ? current.filter((item) => item !== constellation) : [...current, constellation]);
  }

  function exportObservations() {
    const rows: Array<Array<string | number | boolean>> = [["satellite", "constellation", "azimuth_deg", "elevation_deg", "signal", "cn0_demo_dbhz", "above_mask", "used"]];
    epoch.satellites.forEach((satellite) => rows.push([satellite.id, satellite.constellation, satellite.azimuth.toFixed(1), satellite.elevation.toFixed(1), satellite.signal, satellite.cn0.toFixed(1), satellite.visible, satellite.used]));
    rows.push([], ["observer", observer.code], ["latitude", observer.lat], ["longitude", observer.lon], ["epoch", timeLabel], ["elevation_mask_deg", mask], ["pdop", dopLabel(epoch.dop.pdop)], ["provenance", "Deterministic simulated GNSS epoch"]);
    downloadCsv("nla-gnss-sky-view-demo.csv", rows);
    notify(`${epoch.satellites.length} simulated observations exported`);
  }

  function exportSkyPlot() {
    const plotted = epoch.satellites.filter((satellite) => selected.includes(satellite.constellation));
    const markers = plotted.map((satellite) => {
      const x = 320 + satellite.x * 270;
      const y = 320 + satellite.y * 270;
      const colour = CONSTELLATION_META[satellite.constellation].colour;
      const fill = satellite.used ? colour : "#ffffff";
      const textColour = satellite.used ? "#ffffff" : "#64777d";
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14" fill="${fill}" stroke="${colour}" stroke-width="3"/><text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" fill="${textColour}" text-anchor="middle" font-size="8" font-family="Arial">${satellite.id}</text>`;
    }).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="700" viewBox="0 0 640 700"><rect width="640" height="700" fill="#f7fbfc"/><text x="28" y="35" fill="#17313a" font-family="Arial" font-size="18" font-weight="700">NLA GeoAI GNSS Sky View</text><text x="28" y="57" fill="#65757b" font-family="Arial" font-size="11">${observer.code} · ${timeLabel} · ${mask}° mask · SIMULATED</text><circle cx="320" cy="320" r="270" fill="#ffffff" stroke="#69858d" stroke-width="2"/><circle cx="320" cy="320" r="180" fill="none" stroke="#afc3c9"/><circle cx="320" cy="320" r="90" fill="none" stroke="#afc3c9"/><line x1="50" y1="320" x2="590" y2="320" stroke="#c3d2d6"/><line x1="320" y1="50" x2="320" y2="590" stroke="#c3d2d6"/><text x="320" y="45" text-anchor="middle" font-family="Arial" font-size="12">N</text><text x="600" y="324" font-family="Arial" font-size="12">E</text><text x="320" y="610" text-anchor="middle" font-family="Arial" font-size="12">S</text><text x="30" y="324" font-family="Arial" font-size="12">W</text>${markers}<text x="28" y="660" fill="#17313a" font-family="Arial" font-size="12">Used satellites: ${used.length} · PDOP: ${dopLabel(epoch.dop.pdop)} (${epoch.dop.quality})</text><text x="28" y="680" fill="#8a5c21" font-family="Arial" font-size="10">Deterministic demonstration — not live ephemeris or receiver telemetry.</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "nla-gnss-sky-plot-demo.svg"; anchor.click(); URL.revokeObjectURL(url);
    notify("GNSS sky plot exported as SVG");
  }

  return <div className="gnss-workspace">
    <section className="gnss-alert"><ShieldAlert size={19} aria-hidden /><div><b>Simulated multi-GNSS geometry</b><p>This page demonstrates satellite geometry and DOP mathematics. It does not use live ephemeris, receiver telemetry or Rwanda GeoNet data.</p></div><em>Deterministic epoch</em></section>

    <section className="gnss-layout">
      <aside className="gnss-controls panel">
        <div className="gnss-section-heading"><span><RadioTower size={17} aria-hidden /></span><div><h2>Observer and receiver</h2><p>Adjust the simulated reception conditions.</p></div></div>
        <label>Observer<select value={observerKey} onChange={(event) => setObserverKey(event.target.value as ObserverKey)}>{Object.values(GNSS_OBSERVERS).map((site) => <option key={site.key} value={site.key}>{site.code} · {site.name.replace(" demonstration observer", "")}</option>)}</select></label>
        <div className="observer-coordinates"><MapPin size={16} aria-hidden /><div><b>{observer.lat.toFixed(5)}, {observer.lon.toFixed(5)}</b><small>{observer.elevationM} m demonstration ellipsoidal height</small></div></div>
        <label>Elevation mask <output>{mask}°</output><input aria-label="GNSS elevation mask" type="range" min="0" max="40" step="5" value={mask} onChange={(event) => setMask(Number(event.target.value))} /><small>Satellites below this horizon angle are excluded.</small></label>
        <label>Sky obstruction<select value={obstruction} onChange={(event) => setObstruction(event.target.value as typeof obstruction)}><option value="none">No obstruction</option><option value="north">Buildings / hill to north</option><option value="east">Buildings / hill to east</option><option value="south">Buildings / hill to south</option><option value="west">Buildings / hill to west</option></select><small>Blocks a 96° azimuth sector below the simulated skyline.</small></label>
        {obstruction !== "none" && <label>Skyline height <output>{obstructionElevation}°</output><input aria-label="Obstruction skyline height" type="range" min="15" max="70" step="5" value={obstructionElevation} onChange={(event) => setObstructionElevation(Number(event.target.value))} /></label>}
        <label>Epoch <output>{timeLabel}</output><input aria-label="GNSS epoch time" type="range" min="0" max="1435" step="5" value={epochMinutes} onChange={(event) => setEpochMinutes(Number(event.target.value))} /></label>
        <div className="gnss-time-actions"><button className="primary-button gnss-advance" disabled={Boolean(reduceMotion)} onClick={() => setPlaying((current) => !current)}>{playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}{reduceMotion ? "Animation off" : playing ? "Pause epoch" : "Animate epoch"}</button><button className="secondary-button" onClick={() => { setEpochMinutes((value) => (value + 15) % 1440); notify("Simulated epoch advanced by 15 minutes"); }} aria-label="Advance epoch by 15 minutes"><StepForward size={15} aria-hidden /></button></div>
        <div className="constellation-toggles"><p>Constellations</p>{ALL_CONSTELLATIONS.map((constellation) => { const count = epoch.satellites.filter((satellite) => satellite.constellation === constellation && satellite.visible).length; return <label key={constellation}><input type="checkbox" checked={selected.includes(constellation)} onChange={() => toggleConstellation(constellation)} /><i style={{ background: CONSTELLATION_META[constellation].colour }} /><span><b>{constellation}</b><small>{CONSTELLATION_META[constellation].signals.join(" · ")}</small></span><em>{count}</em></label>; })}</div>
        <div className="gnss-export-row"><button className="secondary-button gnss-export" onClick={exportObservations}><Download size={15} aria-hidden /> CSV</button><button className="secondary-button gnss-export" onClick={exportSkyPlot}><ImageDown size={15} aria-hidden /> Sky SVG</button></div>
      </aside>

      <section className="sky-card panel">
        <header><div><span className="eyebrow">Azimuth / elevation</span><h2>GNSS sky plot</h2></div><div><b>{used.length}</b><small>satellites used</small></div></header>
        <div className="sky-plot" role="img" aria-label={`Simulated GNSS sky plot with ${used.length} satellites used above a ${mask} degree elevation mask`}>
          <i className="sky-ring ring-0" /><i className="sky-ring ring-30" /><i className="sky-ring ring-60" /><i className="sky-axis horizontal" /><i className="sky-axis vertical" />
          <span className="north">N</span><span className="east">E</span><span className="south">S</span><span className="west">W</span><span className="zenith">90°</span><span className="horizon">0°</span>
          {epoch.satellites.filter((satellite) => selected.includes(satellite.constellation)).map((satellite) => <button key={satellite.id} className={`sky-satellite ${satellite.used ? "used" : "masked"} ${selectedSatellite?.id === satellite.id ? "selected" : ""}`} style={{ left: `${50 + satellite.x * 45}%`, top: `${50 + satellite.y * 45}%`, borderColor: CONSTELLATION_META[satellite.constellation].colour, background: satellite.used ? CONSTELLATION_META[satellite.constellation].colour : "#ffffff" }} onClick={() => setSelectedSatelliteId(satellite.id)} aria-label={`${satellite.id}, ${satellite.constellation}, azimuth ${satellite.azimuth.toFixed(0)} degrees, elevation ${satellite.elevation.toFixed(0)} degrees`}><span>{satellite.id}</span></button>)}
        </div>
        <footer>{ALL_CONSTELLATIONS.map((constellation) => <span key={constellation}><i style={{ background: CONSTELLATION_META[constellation].colour }} />{constellation}</span>)}</footer>
      </section>

      <aside className="gnss-quality">
        <section className="dop-panel panel"><header><div><span><Compass size={16} aria-hidden /></span><div><h2>Geometry quality</h2><p>Derived from HᵀH inversion</p></div></div><em className={epoch.dop.quality.toLowerCase()}>{epoch.dop.quality}</em></header><div className="dop-grid"><div><b>{dopLabel(epoch.dop.hdop)}</b><span>HDOP</span><small>Horizontal</small></div><div><b>{dopLabel(epoch.dop.vdop)}</b><span>VDOP</span><small>Vertical</small></div><div><b>{dopLabel(epoch.dop.pdop)}</b><span>PDOP</span><small>Position</small></div><div><b>{dopLabel(epoch.dop.gdop)}</b><span>GDOP</span><small>Position + time</small></div></div><code>Q = (HᵀH)⁻¹ · PDOP = √(qₓₓ + qᵧᵧ + qzz)</code></section>
        <section className="satellite-detail panel"><div className="gnss-section-heading"><span style={{ background: CONSTELLATION_META[selectedSatellite.constellation].colour }}><Orbit size={17} aria-hidden /></span><div><h2>{selectedSatellite.id} · {selectedSatellite.constellation}</h2><p>Selected simulated observation</p></div></div><dl><div><dt>Azimuth</dt><dd>{selectedSatellite.azimuth.toFixed(1)}°</dd></div><div><dt>Elevation</dt><dd>{selectedSatellite.elevation.toFixed(1)}°</dd></div><div><dt>Signal</dt><dd>{selectedSatellite.signal}</dd></div><div><dt>C/N₀ demo</dt><dd className={selectedSatellite.cn0 >= 40 ? "signal-good" : selectedSatellite.cn0 >= 32 ? "signal-moderate" : "signal-weak"}>{selectedSatellite.cn0.toFixed(1)} dB-Hz · {selectedSatellite.cn0 >= 40 ? "Strong" : selectedSatellite.cn0 >= 32 ? "Moderate" : "Weak"}</dd></div><div><dt>Solution</dt><dd>{selectedSatellite.used ? "Used" : selected.includes(selectedSatellite.constellation) ? selectedSatellite.elevation < mask ? `Below ${mask}° mask` : obstruction !== "none" ? "Blocked by skyline" : "Excluded" : "Constellation off"}</dd></div></dl></section>
        <section className="gnss-map panel"><OpenStreetMap compact referencePosition={{ lat: observer.lat, lon: observer.lon, label: `${observer.code} simulated observer` }} visibleLayers={{ parcels: false, roads: false, wetlands: false, zoning: false, boundaries: false, osmPlaces: false }} /><div><Clock3 size={14} aria-hidden /> {timeLabel} · {observer.code}</div></section>
      </aside>
    </section>

    <section className="gnss-explainer-grid">
      <article><span>01</span><h3>Correct sky geometry</h3><p>Radius = (90° − elevation) / 90°. Azimuth rotates clockwise from north; zenith is the centre.</p></article>
      <article><span>02</span><h3>Multi-constellation benefit</h3><p>Additional well-spread satellites can strengthen the geometry matrix, especially where terrain or buildings obscure the sky.</p></article>
      <article><span>03</span><h3>Not an accuracy promise</h3><p>DOP describes geometry only. Atmosphere, multipath, antenna, clock, signal integrity and corrections also affect a position.</p></article>
      <article><span>04</span><h3>Production upgrade path</h3><p>Verified RINEX observations, broadcast ephemeris or precise products would replace the deterministic epoch for operational use.</p></article>
    </section>
    <section className="method-sources" aria-label="Official GNSS references"><span>Official references</span><a href="https://www.gps.gov/space-segment" target="_blank" rel="noreferrer">GPS.gov <ExternalLink size={13} aria-hidden /></a><a href="https://www.euspa.europa.eu/eu-space-programme/galileo" target="_blank" rel="noreferrer">EU Galileo <ExternalLink size={13} aria-hidden /></a><a href="https://en.beidou.gov.cn/SYSTEMS/System/" target="_blank" rel="noreferrer">BeiDou system <ExternalLink size={13} aria-hidden /></a><a href="https://www.glonass-iac.ru/en/" target="_blank" rel="noreferrer">GLONASS IAC <ExternalLink size={13} aria-hidden /></a></section>
    <section className="gnss-resilience panel"><div><ShieldAlert size={18} aria-hidden /><p><b>Interference and spoofing awareness</b><span>Potential indicators include simultaneous signal-strength loss, inconsistent time, impossible position jumps, abnormal residuals or constellation disagreement.</span></p></div><p>These symptoms can also result from buildings, terrain, antenna faults, multipath, atmosphere or receiver configuration. This interface does not detect or prove jamming or spoofing; a qualified engineer must inspect raw observations, receiver diagnostics and independent reference data.</p></section>
  </div>;
}
