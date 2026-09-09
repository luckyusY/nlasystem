import { BookCheck, Cloud, Database, HardDrive, LockKeyhole, MapPinned, ShieldCheck, Smartphone, Upload } from "lucide-react";

const sourceClasses = [
  { icon: ShieldCheck, name: "Authoritative", use: "Official publication or service from the legally responsible institution.", rule: "Still verify currency, amendments, scale and the exact administrative purpose." },
  { icon: Cloud, name: "Public institutional", use: "Government or intergovernmental data exposed through a public portal.", rule: "Public access is not assumed to grant unrestricted reuse." },
  { icon: MapPinned, name: "Community open data", use: "OpenStreetMap places, roads, search and basemap context.", rule: "Retain attribution and do not treat community features as cadastral authority." },
  { icon: Database, name: "Synthetic demonstration", use: "Generated parcels, change observations, CORS telemetry and GNSS epochs.", rule: "Never use for rights, enforcement, survey control or official reporting." },
];

const privacyNotes = [
  { icon: Smartphone, title: "Browser location", text: "Requested only after a user action. The route handoff uses the current browser position and opens OpenStreetMap; this demo does not store it." },
  { icon: Upload, title: "Imported files and photos", text: "GeoJSON and field photo placeholders remain in the active browser session. They are not uploaded by the demonstration." },
  { icon: HardDrive, title: "Local NLA GeoAI", text: "The optional quantized model runs in the browser. Model files may be cached; prompts are not sent to an AI provider by this application." },
  { icon: BookCheck, title: "Exports and history", text: "Downloaded reports/evidence leave the application under the user’s control. Analysis history and notes use local or session storage and can be cleared." },
];

export default function ProvenancePolicyPage() {
  return <div className="policy-page">
    <section className="policy-hero"><span><LockKeyhole size={25} aria-hidden /></span><div><p>Decision-support governance</p><h2>Know what each source can establish</h2><span>NLA GeoAI keeps origin, currency, licensing and privacy boundaries visible so a convenient map never silently becomes an authoritative land record.</span></div></section>
    <section className="source-class-grid" aria-label="Geospatial source classes">{sourceClasses.map(({ icon: Icon, name, use, rule }) => <article key={name}><span><Icon size={18} aria-hidden /></span><h3>{name}</h3><p>{use}</p><small>{rule}</small></article>)}</section>
    <section className="privacy-review panel"><header><span><ShieldCheck size={18} aria-hidden /></span><div><p>Privacy review notes</p><h2>What stays on this device</h2></div></header><div>{privacyNotes.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={17} aria-hidden /><p><b>{title}</b><span>{text}</span></p></article>)}</div></section>
    <section className="policy-decision panel"><h2>Operational decision rule</h2><ol><li>Identify the source class and licence.</li><li>Check observation date, publication date and endpoint-check date separately.</li><li>Inspect scale, CRS, fields, resolution and known limitations.</li><li>Reconfirm the latest official source before an administrative or legal decision.</li><li>Record the source identifier and retrieval time in the evidence bundle.</li></ol><p><b>No legal mutation:</b> this prototype does not register, transfer, subdivide, survey or modify land rights.</p></section>
  </div>;
}
