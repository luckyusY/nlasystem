"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BoxSelect, Braces, Clock3, Combine, Download, MapPin, Mountain, Pentagon, Search, ShieldCheck } from "lucide-react";
import type { FeatureCollection, Geometry } from "geojson";

import OpenStreetMap from "@/components/open-street-map";
import { aggregateParcelGeometry, screenPoint, type PointScreeningResult } from "@/lib/advanced-spatial-engine";
import { parcels } from "@/lib/data";
import { parseRwandaCoordinate } from "@/lib/geospatial-engine";

type HistoryEntry = { id: string; label: string; detail: string; createdAt: string; sourceIds: string[] };
type AggregateOperation = "union" | "hull" | "envelope";

function downloadJson(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export default function AdvancedSpatialTools({ notify }: { notify: (message: string) => void }) {
  const [mode, setMode] = useState<"point" | "aggregate">("point");
  const [coordinateInput, setCoordinateInput] = useState("-1.953600, 30.060600");
  const [pointResult, setPointResult] = useState<PointScreeningResult | null>(null);
  const [selectedUpis, setSelectedUpis] = useState(parcels.slice(0, 3).map((parcel) => parcel.upi));
  const [aggregateOperation, setAggregateOperation] = useState<AggregateOperation>("union");
  const [aggregateResult, setAggregateResult] = useState<FeatureCollection<Geometry, Record<string, unknown>> | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setHistory(JSON.parse(sessionStorage.getItem("nla-analysis-history") ?? "[]") as HistoryEntry[]); } catch { setHistory([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function remember(entry: HistoryEntry) {
    setHistory((current) => {
      const next = [entry, ...current].slice(0, 8);
      sessionStorage.setItem("nla-analysis-history", JSON.stringify(next));
      return next;
    });
  }

  function runPoint(event: FormEvent) {
    event.preventDefault();
    const parsed = parseRwandaCoordinate(coordinateInput);
    if (!parsed) { notify("Enter a WGS84 or Rwanda UTM zone 36S coordinate"); return; }
    const result = screenPoint(parsed.lat, parsed.lng);
    setPointResult(result);
    remember({ id: `point-${Date.now()}`, label: "Point screening", detail: `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)} · ${result.containing.length} containing parcels`, createdAt: new Date().toISOString(), sourceIds: ["synthetic-parcels", "demo-roads", "demo-wetlands", "demo-service-points"] });
    notify(`Point screened against parcels, roads, wetlands and service points`);
  }

  function runAggregate(operation: AggregateOperation) {
    if (!selectedUpis.length) { notify("Select at least one parcel geometry"); return; }
    const result = aggregateParcelGeometry(selectedUpis, operation);
    setAggregateOperation(operation);
    setAggregateResult(result);
    remember({ id: `${operation}-${Date.now()}`, label: operation === "union" ? "Parcel dissolve / union" : operation === "hull" ? "Convex hull" : "Bounding envelope", detail: `${selectedUpis.length} source parcels`, createdAt: new Date().toISOString(), sourceIds: selectedUpis });
    notify(`${operation === "union" ? "Union" : operation === "hull" ? "Convex hull" : "Envelope"} created from ${selectedUpis.length} parcels`);
  }

  const activeFeatures = useMemo(() => {
    if (mode === "aggregate") return aggregateResult ?? undefined;
    if (!pointResult) return undefined;
    return { type: "FeatureCollection", features: [pointResult.point] } as FeatureCollection;
  }, [aggregateResult, mode, pointResult]);

  function exportEvidenceBundle() {
    const generatedAt = new Date().toISOString();
    const result = mode === "point" ? pointResult ? { coordinate: pointResult.point.geometry.coordinates, containingUpis: pointResult.containing.map((parcel) => parcel.upi), nearestParcel: pointResult.nearestParcel?.upi, nearestParcelDistanceM: pointResult.nearestParcelDistanceM, nearestRoad: pointResult.nearestRoad, nearestWetland: pointResult.nearestWetland, nearestService: pointResult.nearestService } : null : aggregateResult;
    downloadJson("nla-spatial-analysis-evidence-demo.json", { schema: "nla-geoai-evidence/1.0", generatedAt, operation: mode === "point" ? "point-screening" : aggregateOperation, result, sources: [{ id: "synthetic-parcels", class: "synthetic", retrievedAt: generatedAt }, { id: "demo-reference-geometry", class: "synthetic", retrievedAt: generatedAt }], engine: { turf: "7.4.0", crs: "EPSG:4326 geodesic", outputCrs: "EPSG:32736 where reported" }, disclaimer: "Decision-support demonstration. Authoritative source and officer verification required." });
    notify("Analysis evidence bundle downloaded with provenance timestamps");
  }

  return <section className="advanced-spatial panel">
    <header><div><span><Braces size={18} aria-hidden /></span><div><p>Advanced browser GIS</p><h2>Geometry laboratory</h2></div></div><div className="advanced-mode"><button className={mode === "point" ? "active" : ""} onClick={() => setMode("point")}><MapPin size={14} aria-hidden />Point screening</button><button className={mode === "aggregate" ? "active" : ""} onClick={() => setMode("aggregate")}><Combine size={14} aria-hidden />Aggregate parcels</button></div></header>
    <div className="advanced-grid">
      <div className="advanced-controls">
        {mode === "point" ? <form onSubmit={runPoint}><label>Coordinate<input aria-label="Point screening coordinate" value={coordinateInput} onChange={(event) => setCoordinateInput(event.target.value)} placeholder="-1.9536, 30.0606 or UTM 36S…" /></label><small>Accepts latitude/longitude or EPSG:32736 easting and northing.</small><button className="primary-button" type="submit"><Search size={14} aria-hidden />Screen point</button>{pointResult && <div className="point-results"><p><b>Containing parcel</b><span>{pointResult.containing.map((parcel) => parcel.upi).join(", ") || "None"}</span></p><p><b>Nearest parcel</b><span>{pointResult.nearestParcel?.upi ?? "—"} · {pointResult.nearestParcelDistanceM.toFixed(0)} m</span></p><p><b>Nearest road</b><span>{pointResult.nearestRoad.name} · {pointResult.nearestRoad.distanceM.toFixed(0)} m</span></p><p><b>Nearest wetland</b><span>{pointResult.nearestWetland.name} · {pointResult.nearestWetland.distanceM.toFixed(0)} m</span></p><p><b>Nearest service</b><span>{pointResult.nearestService.name} · {pointResult.nearestService.distanceM.toFixed(0)} m</span></p></div>}</form> : <div><p className="aggregate-help">Select demonstration parcels, then create one inspectable summary geometry.</p><div className="parcel-select-list">{parcels.slice(0, 10).map((parcel) => <label key={parcel.upi}><input type="checkbox" checked={selectedUpis.includes(parcel.upi)} onChange={() => setSelectedUpis((current) => current.includes(parcel.upi) ? current.filter((upi) => upi !== parcel.upi) : [...current, parcel.upi])} /><span><b>{parcel.upi}</b><small>{parcel.district} · {parcel.landUse}</small></span></label>)}</div><div className="aggregate-actions"><button className={aggregateOperation === "union" ? "active" : ""} onClick={() => runAggregate("union")}><Combine size={14} aria-hidden />Union</button><button className={aggregateOperation === "hull" ? "active" : ""} onClick={() => runAggregate("hull")}><Pentagon size={14} aria-hidden />Hull</button><button className={aggregateOperation === "envelope" ? "active" : ""} onClick={() => runAggregate("envelope")}><BoxSelect size={14} aria-hidden />Envelope</button></div></div>}
        <button className="evidence-download" onClick={exportEvidenceBundle} disabled={mode === "point" ? !pointResult : !aggregateResult}><Download size={14} aria-hidden />Export evidence bundle</button>
      </div>
      <div className="advanced-map"><OpenStreetMap analysisFeatures={activeFeatures} analysisColour="#6e5ac7" visibleLayers={{ parcels: true, roads: true, wetlands: true, zoning: false, boundaries: false, osmPlaces: false }} /></div>
      <aside className="analysis-history"><div><Clock3 size={15} aria-hidden /><h3>Session history</h3><button onClick={() => { setHistory([]); sessionStorage.removeItem("nla-analysis-history"); }}>Clear</button></div>{history.map((entry) => <article key={entry.id}><b>{entry.label}</b><p>{entry.detail}</p><small>{new Date(entry.createdAt).toLocaleTimeString("en-RW", { hour: "2-digit", minute: "2-digit" })} · {entry.sourceIds.length} sources</small></article>)}{!history.length && <p className="history-empty">Run a tool to create local, reusable history.</p>}</aside>
    </div>
    <footer><Mountain size={17} aria-hidden /><p><b>Slope-risk interpretation</b><span>Terrain slope layers support preliminary screening. Resolution, vertical accuracy, drainage, soil, cut/fill and field survey conditions must be checked before design or enforcement.</span></p><ShieldCheck size={17} aria-hidden /></footer>
  </section>;
}
