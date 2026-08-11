"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Camera, CheckSquare, Copy, ExternalLink, Navigation, Scissors, ShieldCheck, UsersRound } from "lucide-react";

import { type Parcel, parcels } from "@/lib/data";
import { findParcelNeighbours } from "@/lib/advanced-spatial-engine";
import { parcelCenterLngLat, toUtm36S } from "@/lib/geospatial-engine";

export default function ParcelFieldTools({ parcel, notify, onShare }: { parcel: Parcel; notify: (message: string) => void; onShare: () => void }) {
  const index = parcels.findIndex((candidate) => candidate.upi === parcel.upi);
  const [lng, lat] = parcelCenterLngLat(parcel, index);
  const [easting, northing] = toUtm36S([lng, lat]);
  const neighbours = useMemo(() => findParcelNeighbours(parcel), [parcel]);
  const [splitPercent, setSplitPercent] = useState(50);
  const [checks, setChecks] = useState({ monument: false, occupation: false, access: false, evidence: false });
  const [note, setNote] = useState("");
  const [photoCount, setPhotoCount] = useState(0);

  function routeToParcel() {
    if (!navigator.geolocation) { notify("Browser location is unavailable"); return; }
    notify("Requesting your browser location for an OpenStreetMap route");
    navigator.geolocation.getCurrentPosition((position) => {
      const route = `${position.coords.latitude},${position.coords.longitude};${lat},${lng}`;
      window.open(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(route)}`, "_blank", "noopener,noreferrer");
    }, () => notify("Location permission was not granted; parcel coordinates remain available to copy"), { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 });
  }

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const count = event.target.files?.length ?? 0;
    setPhotoCount(count);
    notify(count ? `${count} field photo placeholder${count === 1 ? "" : "s"} kept on this device` : "No field photos selected");
  }

  return <div className="parcel-field-tools">
    <div className="parcel-coordinates"><div><b>WGS84 centroid</b><code>{lat.toFixed(6)}, {lng.toFixed(6)}</code></div><button onClick={() => { void navigator.clipboard?.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`); notify("WGS84 coordinates copied"); }} aria-label="Copy WGS84 parcel coordinates"><Copy size={14} aria-hidden /></button><div><b>UTM 36S centroid</b><code>{easting.toFixed(2)} E · {northing.toFixed(2)} N</code></div></div>
    <div className="parcel-field-actions"><button onClick={onShare}><Copy size={14} aria-hidden />Share workspace</button><button onClick={routeToParcel}><Navigation size={14} aria-hidden />Route to parcel<ExternalLink size={11} aria-hidden /></button></div>
    <details><summary><UsersRound size={15} aria-hidden />Nearby parcels <em>{neighbours.length}</em></summary><div className="neighbour-list">{neighbours.map((item) => <p key={item.parcel.upi}><b>{item.parcel.upi}</b><span>{item.relationship} · {item.distanceM.toFixed(0)} m · {item.parcel.landUse}</span></p>)}{!neighbours.length && <p>No demonstration neighbours within 5 km.</p>}</div></details>
    <details><summary><Scissors size={15} aria-hidden />Local split estimate</summary><div className="split-tool"><label>Proposed split <output>{splitPercent}% / {100 - splitPercent}%</output><input type="range" min="20" max="80" value={splitPercent} onChange={(event) => setSplitPercent(Number(event.target.value))} /></label><div><i style={{ width: `${splitPercent}%` }} /><i /></div><p><b>Child A {(parcel.area * splitPercent / 100).toFixed(0)} m²</b><b>Child B {(parcel.area * (100 - splitPercent) / 100).toFixed(0)} m²</b></p><small>Area estimate only. This does not create survey geometry or alter a parcel.</small></div></details>
    <details><summary><CheckSquare size={15} aria-hidden />Field verification checklist</summary><div className="field-checklist">{([['monument','Boundary monuments observed'],['occupation','Occupation/land use checked'],['access','Access conditions checked'],['evidence','Supporting evidence noted']] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={checks[key]} onChange={() => setChecks((current) => ({ ...current, [key]: !current[key] }))} />{label}</label>)}<textarea aria-label="Local field visit note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add local visit notes…" /><label className="photo-button"><Camera size={14} aria-hidden />Select field photos<input type="file" accept="image/*" multiple onChange={addPhotos} /></label>{photoCount > 0 && <small>{photoCount} photo placeholder{photoCount === 1 ? "" : "s"} selected · not uploaded</small>}</div></details>
    <div className="parcel-authority-boundary"><ShieldCheck size={15} aria-hidden /><p><b>Decision-support boundary</b><span>Coordinates, split estimates, notes and photos stay local to this demonstration. No legal parcel, title, survey or LAIS record is created or changed.</span></p></div>
  </div>;
}
