"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { auditEvents, corsStations, datasets, documents, parcels, reports, roles, type Parcel } from "@/lib/data";

type PageKey = "dashboard" | "assistant" | "map" | "parcels" | "analysis" | "catalogue" | "knowledge" | "reports" | "cors" | "satellite" | "audit" | "admin" | "health";
type Message = { id: number; role: "assistant" | "user"; text: string; sources?: string[]; stats?: { label: string; value: string }[]; warning?: string };

const navGroups: { label: string; items: { key: PageKey; label: string; mark: string }[] }[] = [
  { label: "Workspace", items: [
    { key: "dashboard", label: "Dashboard", mark: "DB" },
    { key: "assistant", label: "GeoAI Assistant", mark: "AI" },
    { key: "map", label: "Interactive Map", mark: "MP" },
    { key: "parcels", label: "Parcels", mark: "PC" },
    { key: "analysis", label: "GIS Analysis", mark: "GA" },
  ]},
  { label: "Knowledge", items: [
    { key: "catalogue", label: "NSDI Catalogue", mark: "NS" },
    { key: "knowledge", label: "Knowledge Centre", mark: "KC" },
    { key: "reports", label: "Reports", mark: "RP" },
  ]},
  { label: "Operations", items: [
    { key: "cors", label: "CORS Monitoring", mark: "GN" },
    { key: "satellite", label: "Change Detection", mark: "CD" },
    { key: "audit", label: "Audit Logs", mark: "AL" },
    { key: "admin", label: "Administration", mark: "AD" },
    { key: "health", label: "System Health", mark: "SH" },
  ]},
];

const titles: Record<PageKey, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: { eyebrow: "Operational overview", title: "Good evening, Aline", subtitle: "Here is the current state of the GeoAI prototype workspace." },
  assistant: { eyebrow: "Decision support", title: "GeoAI Assistant", subtitle: "Ask questions across parcels, GIS layers, NSDI metadata and verified demo documents." },
  map: { eyebrow: "Geospatial workspace", title: "Interactive Map", subtitle: "Explore synthetic parcel geometry and prototype national reference layers." },
  parcels: { eyebrow: "Land intelligence", title: "Parcel Registry", subtitle: "Search and inspect non-sensitive synthetic cadastral records." },
  analysis: { eyebrow: "Approved spatial tools", title: "GIS Analysis", subtitle: "Run controlled proximity, intersection and impact workflows." },
  catalogue: { eyebrow: "National Spatial Data Infrastructure", title: "NSDI Data Catalogue", subtitle: "Discover available geospatial datasets and their access conditions." },
  knowledge: { eyebrow: "Verified institutional knowledge", title: "Knowledge Centre", subtitle: "Search indexed demonstration procedures, manuals and technical guidance." },
  reports: { eyebrow: "Evidence and documentation", title: "Reports", subtitle: "Generate traceable decision-support reports with sources and disclaimers." },
  cors: { eyebrow: "Simulated network telemetry", title: "CORS Monitoring", subtitle: "Prototype health view for GNSS reference infrastructure — not live GeoNet data." },
  satellite: { eyebrow: "Future capability", title: "Satellite Change Detection", subtitle: "Demonstration workflow for imagery comparison and officer-reviewed findings." },
  audit: { eyebrow: "Security and accountability", title: "Audit Logs", subtitle: "Search important user, data and analysis events across the prototype." },
  admin: { eyebrow: "Access and configuration", title: "Administration", subtitle: "Manage prototype roles, permissions, content and service configuration." },
  health: { eyebrow: "Platform operations", title: "System Health", subtitle: "Monitor connected prototype services and deployment readiness." },
};

const suggestions = [
  "Show agricultural parcels in Gasabo.",
  "Find parcels within 100 metres of roads.",
  "Which parcels intersect wetlands?",
  "Calculate the area of parcel 1/02/03/04/0012.",
  "Find NSDI datasets about roads.",
  "What documents discuss subdivision?",
];

function getAssistantResponse(question: string): Message {
  const q = question.toLowerCase();
  const base = { id: Date.now() + 1, role: "assistant" as const };
  if (q.includes("agric") && q.includes("gasabo")) return { ...base, text: "I found 21 synthetic agricultural parcels in Gasabo District. The matching features are ready to inspect on the map. This result uses approved district and land-use filters rather than unrestricted database queries.", stats: [{ label: "Matching parcels", value: "21" }, { label: "Combined area", value: "18.7 ha" }, { label: "Data confidence", value: "Demo" }], sources: ["GIS — Synthetic Parcel Layer", "GIS — District Boundaries", "GIS — Land-use Classification"], warning: "Prototype result. Parcel boundaries and classifications require officer verification." };
  if (q.includes("100") && q.includes("road")) return { ...base, text: "The approved within-distance analysis identified 37 parcels within 100 metres of the selected road network. Twenty-one are classified as agricultural in the synthetic dataset.", stats: [{ label: "Affected parcels", value: "37" }, { label: "Agricultural", value: "21" }, { label: "Area affected", value: "18.7 ha" }], sources: ["PostGIS — ST_DWithin", "NSDI — National Road Network", "GIS — Synthetic Parcel Layer"], warning: "Road alignments and parcel geometry are synthetic demonstration data." };
  if (q.includes("wetland")) return { ...base, text: "Nine synthetic parcels intersect the demonstration wetland layer. Three have a high overlap ratio and should be reviewed first by an authorized GIS or Land Use officer.", stats: [{ label: "Intersections", value: "9" }, { label: "High impact", value: "3" }, { label: "Total overlap", value: "4.2 ha" }], sources: ["PostGIS — ST_Intersects", "REMA — National Wetlands (catalogue record)", "GIS — Synthetic Parcel Layer"], warning: "This screening does not establish a legal wetland boundary." };
  if (q.includes("0012") || q.includes("analyse parcel")) return { ...base, text: "Parcel 1/02/03/04/0012 is a 3,250 m² registered residential parcel in Remera Sector, Gasabo. It is zoned R2, approximately 84 m from the nearest mapped road and does not intersect the prototype wetland layer. No major spatial conflict was detected in the currently connected demo sources.", stats: [{ label: "Area", value: "3,250 m²" }, { label: "Road distance", value: "84 m" }, { label: "Wetland overlap", value: "None" }], sources: ["LAIS Mock Connector — Parcel Record", "GIS — Road Network", "GIS — Wetland Layer", "Knowledge — Land Use Planning Reference (DEMO)"], warning: "AI-generated decision support. Final administrative or legal decisions require an authorized NLA officer." };
  if (q.includes("nsdi") || q.includes("dataset") || q.includes("roads")) return { ...base, text: "Yes. The NSDI demonstration catalogue contains a National Road Network dataset maintained by RTDA. It has national coverage, a 1:10,000 reference scale, EPSG:32736 coordinates and internal access classification.", stats: [{ label: "Catalogue matches", value: "2" }, { label: "Latest update", value: "02 Aug 2026" }, { label: "Access", value: "Internal" }], sources: ["NSDI Catalogue — National Road Network", "NSDI Catalogue — Administrative Boundaries"] };
  if (q.includes("subdivision") || q.includes("document")) return { ...base, text: "I found relevant sections in two indexed demonstration documents. They describe a prototype review sequence covering parcel identification, zoning checks, survey-plan validation and authorized officer approval. I cannot verify an official legal requirement from demo material alone.", stats: [{ label: "Documents", value: "2" }, { label: "Relevant sections", value: "7" }, { label: "Verification", value: "Required" }], sources: ["Subdivision Review Guide — DEMO, sections 2–4", "Land Administration Procedures — DEMO, section 8"], warning: "These are DEMO documents, not official regulations. Consult an authorized legal or land administration officer." };
  return { ...base, text: "I checked the currently connected prototype sources but could not verify a sufficiently specific answer. Try including a parcel UPI, district, layer, distance or document topic.", sources: ["Connected NLA prototype sources"], warning: "Information could not be verified from the currently connected NLA data sources." };
}

export default function GeoAIApp() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [toast, setToast] = useState("");

  function navigate(key: PageKey) {
    setPage(key);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-block">
          <Image className="nla-brand-logo" src="/nla-logo.png" alt="National Land Authority" width={1043} height={541} priority />
          <div className="brand-copy"><strong>GeoAI Workspace</strong><small>Intelligent land & geospatial assistant</small></div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">×</button>
        </div>
        <div className="prototype-chip"><span /> Prototype · Internal concept</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <button key={item.key} className={page === item.key ? "active" : ""} onClick={() => navigate(item.key)}>
                  <span className="nav-mark">{item.mark}</span>{item.label}{page === item.key && <i />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-avatar">AU</div>
          <div><strong>Aline Uwase</strong><small>GIS Officer</small></div>
          <button aria-label="User options">•••</button>
        </div>
      </aside>

      {sidebarOpen && <button className="scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}

      <main className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">☰</button>
          <Image className="mobile-brand-logo" src="/nla-logo.png" alt="National Land Authority" width={1043} height={541} priority />
          <div className="global-search"><span>⌕</span><input aria-label="Global search" placeholder="Search parcels, datasets, reports…" onKeyDown={(e) => { if (e.key === "Enter") { navigate("parcels"); notify("Search opened in Parcel Registry"); } }} /><kbd>⌘ K</kbd></div>
          <div className="top-actions">
            <div className="environment"><span /> Prototype data</div>
            <button className="mobile-search-button" onClick={() => navigate("parcels")} aria-label="Search parcels and datasets">⌕</button>
            <button className="icon-button" onClick={() => setNoticeOpen(!noticeOpen)} aria-label="Notifications">●<i>3</i></button>
            <div className="header-user"><span>AU</span><div><b>Aline Uwase</b><small>GIS Department · GIS Officer</small></div></div>
          </div>
          {noticeOpen && <div className="notification-popover"><strong>Notifications</strong><p><b>Road layer refreshed</b><span>NSDI metadata · 8 min ago</span></p><p><b>MUSN latency warning</b><span>CORS monitoring · 24 min ago</span></p><p><b>Report ready for review</b><span>NLA-GEO-2026-084 · 1 hr ago</span></p></div>}
        </header>

        <div className="content-wrap">
          <PageIntro page={page} onAsk={() => navigate("assistant")} />
          {page === "dashboard" && <Dashboard onNavigate={navigate} notify={notify} />}
          {page === "assistant" && <AssistantPage onOpenMap={() => navigate("map")} notify={notify} />}
          {page === "map" && <MapPage notify={notify} />}
          {page === "parcels" && <ParcelsPage onAnalyse={() => navigate("assistant")} notify={notify} />}
          {page === "analysis" && <AnalysisPage onOpenMap={() => navigate("map")} notify={notify} />}
          {page === "catalogue" && <CataloguePage notify={notify} />}
          {page === "knowledge" && <KnowledgePage notify={notify} />}
          {page === "reports" && <ReportsPage notify={notify} />}
          {page === "cors" && <CorsPage />}
          {page === "satellite" && <SatellitePage notify={notify} />}
          {page === "audit" && <AuditPage />}
          {page === "admin" && <AdminPage notify={notify} />}
          {page === "health" && <HealthPage />}
        </div>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <button className={page === "dashboard" ? "active" : ""} onClick={() => navigate("dashboard")}><span>DB</span><small>Home</small></button>
        <button className={page === "assistant" ? "active" : ""} onClick={() => navigate("assistant")}><span>AI</span><small>GeoAI</small></button>
        <button className={page === "map" ? "active" : ""} onClick={() => navigate("map")}><span>MP</span><small>Map</small></button>
        <button className={page === "parcels" ? "active" : ""} onClick={() => navigate("parcels")}><span>PC</span><small>Parcels</small></button>
        <button onClick={() => setSidebarOpen(true)}><span>••</span><small>More</small></button>
      </nav>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  );
}

function PageIntro({ page, onAsk }: { page: PageKey; onAsk: () => void }) {
  const info = titles[page];
  return <section className="page-intro"><div><p>{info.eyebrow}</p><h1>{info.title}</h1><span>{info.subtitle}</span></div>{page !== "assistant" && <button className="primary-button" onClick={onAsk}><span>✦</span> Ask GeoAI</button>}</section>;
}

function Dashboard({ onNavigate, notify }: { onNavigate: (p: PageKey) => void; notify: (s: string) => void }) {
  const metrics = [
    ["128", "Synthetic parcels", "+12 this month", "PC"], ["6", "Districts covered", "Prototype scope", "DS"], ["12", "Available GIS layers", "11 online", "LY"], ["42", "NSDI datasets", "+3 indexed", "NS"],
    ["28", "Documents indexed", "1,483 chunks", "DC"], ["184", "AI queries today", "+18% vs. Friday", "AI"], ["31", "GIS analyses", "7 reports created", "GA"], ["Healthy", "System health", "7 of 8 services", "SH"],
  ];
  return <div className="dashboard-stack">
    <section className="metric-grid">{metrics.map(([value, label, detail, mark]) => <article className="metric-card" key={label}><div className="metric-top"><span className="metric-mark">{mark}</span><i>↗</i></div><strong>{value}</strong><h3>{label}</h3><p>{detail}</p></article>)}</section>
    <section className="dashboard-grid">
      <article className="panel span-2"><PanelHeader title="AI activity" detail="Queries by department · last 7 days" action="View audit" onAction={() => onNavigate("audit")} /><div className="chart-wrap"><div className="bar-chart" aria-label="AI queries chart">{[38, 55, 42, 68, 54, 78, 64, 86, 71, 92, 76, 98].map((n, i) => <div key={i}><span style={{ height: `${n}%` }} /><small>{["GIS", "REG", "LU", "NSDI", "MGT", "SVY"][i % 6]}</small></div>)}</div><div className="chart-legend"><p><i className="dot-green" /> GIS <b>34%</b></p><p><i className="dot-amber" /> Land Use <b>27%</b></p><p><i className="dot-blue" /> Other <b>39%</b></p></div></div></article>
      <article className="panel"><PanelHeader title="Parcel categories" detail="Synthetic dataset" /><div className="donut-row"><div className="donut"><div><b>128</b><span>parcels</span></div></div><div className="donut-legend"><p><i className="res" />Residential <b>39%</b></p><p><i className="agr" />Agriculture <b>28%</b></p><p><i className="mix" />Mixed use <b>18%</b></p><p><i className="oth" />Other <b>15%</b></p></div></div></article>
      <article className="panel span-2"><PanelHeader title="Recent GeoAI queries" detail="Answers grounded in connected prototype sources" action="Open assistant" onAction={() => onNavigate("assistant")} /><div className="activity-list"><Activity mark="AU" title="Agricultural parcels within 100 m of KN 5 Road" meta="Aline Uwase · GIS · 6 min ago" tag="37 parcels" /><Activity mark="JM" title="Documents discussing subdivision requirements" meta="Jean Mutesi · Registrar · 18 min ago" tag="2 sources" /><Activity mark="EN" title="Wetland overlap for parcel 1/02/03/04/0012" meta="Eric Niyonzima · Land Use · 34 min ago" tag="No overlap" /></div></article>
      <article className="panel"><PanelHeader title="System notices" detail="Items that may need attention" /><div className="notice-list"><div className="notice warning"><i>!</i><p><b>MUSN station latency</b><span>286 ms · increasing for 45 min</span></p></div><div className="notice info"><i>i</i><p><b>Catalogue refresh complete</b><span>3 metadata records updated</span></p></div><div className="notice good"><i>✓</i><p><b>Nightly index complete</b><span>28 documents · 1,483 chunks</span></p></div></div></article>
    </section>
    <section className="quick-actions"><button onClick={() => onNavigate("analysis")}><span>GA</span><b>Run GIS analysis</b><small>Approved spatial operations</small></button><button onClick={() => onNavigate("parcels")}><span>PC</span><b>Find a parcel</b><small>Search synthetic records</small></button><button onClick={() => onNavigate("catalogue")}><span>NS</span><b>Search NSDI</b><small>Discover available datasets</small></button><button onClick={() => { notify("New parcel assessment draft created"); onNavigate("reports"); }}><span>RP</span><b>Create report</b><small>Traceable decision support</small></button></section>
  </div>;
}

function PanelHeader({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) {
  return <div className="panel-header"><div><h2>{title}</h2><p>{detail}</p></div>{action && <button onClick={onAction}>{action} <span>→</span></button>}</div>;
}

function Activity({ mark, title, meta, tag }: { mark: string; title: string; meta: string; tag: string }) { return <div className="activity"><span>{mark}</span><div><b>{title}</b><small>{meta}</small></div><em>{tag}</em></div>; }

function AssistantPage({ onOpenMap, notify }: { onOpenMap: () => void; notify: (s: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", text: "Good evening, Aline. I can help you explore synthetic parcels, run approved GIS operations, search the NSDI catalogue and find verified sections in indexed demo documents. What would you like to investigate?", sources: ["NLA GeoAI prototype services"] }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = (text: string) => {
    const clean = text.trim(); if (!clean || loading) return;
    setMessages((old) => [...old, { id: Date.now(), role: "user", text: clean }]); setInput(""); setLoading(true);
    window.setTimeout(async () => {
      const grounded = getAssistantResponse(clean);
      try {
        const response = await fetch("/api/assistant/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: clean, role: "GIS Officer" }),
          signal: AbortSignal.timeout(2500),
        });
        if (response.ok) {
          const apiResult = await response.json() as { answer?: string; sources?: string[]; warning?: string };
          grounded.text = apiResult.answer || grounded.text;
          grounded.sources = apiResult.sources?.length ? apiResult.sources : grounded.sources;
          grounded.warning = apiResult.warning || grounded.warning;
        }
      } catch {
        // Local UI workflows stay usable when the optional Python service is offline.
      }
      setMessages((old) => [...old, grounded]);
      setLoading(false);
    }, 450);
  };
  return <div className="assistant-layout">
    <aside className="conversation-panel"><button className="new-chat" onClick={() => setMessages(messages.slice(0, 1))}>＋ New investigation</button><p>Today</p><button className="conversation active"><span>Road buffer · Gasabo</span><small>37 affected parcels</small></button><button className="conversation"><span>Subdivision guidance</span><small>2 verified demo sources</small></button><p>Previous</p><button className="conversation"><span>Wetland intersection</span><small>9 parcels identified</small></button><button className="conversation"><span>NSDI roads data</span><small>Catalogue discovery</small></button><div className="data-scope"><span>✓</span><p><b>Safe data scope</b><small>Synthetic parcels · demo documents · catalogue metadata</small></p></div></aside>
    <section className="chat-panel"><div className="chat-status"><div><span className="ai-orb">✦</span><p><b>NLA GeoAI</b><small><i /> Mock AI mode · approved tools only</small></p></div><button onClick={() => notify("Conversation exported to audit-safe text")}>Export</button></div>
      <div className="messages">
        {messages.map((message) => <div className={`message ${message.role}`} key={message.id}>{message.role === "assistant" && <span className="message-avatar">✦</span>}<div className="message-body"><small>{message.role === "assistant" ? "GEOAI ASSISTANT" : "YOU"}</small><p>{message.text}</p>{message.stats && <div className="answer-stats">{message.stats.map((stat) => <div key={stat.label}><b>{stat.value}</b><span>{stat.label}</span></div>)}</div>}{message.sources && <div className="sources"><b>Sources used</b>{message.sources.map((source) => <span key={source}>↗ {source}</span>)}</div>}{message.warning && <div className="answer-warning"><b>Human verification required</b><span>{message.warning}</span></div>}{message.stats && <div className="message-actions"><button onClick={onOpenMap}>View on map</button><button onClick={() => notify("Assessment added to a report draft")}>Add to report</button></div>}</div></div>)}
        {loading && <div className="message assistant"><span className="message-avatar">✦</span><div className="typing"><i /><i /><i /></div></div>}
      </div>
      {messages.length < 3 && <div className="suggestion-grid">{suggestions.map((s) => <button key={s} onClick={() => submit(s)}><span>↗</span>{s}</button>)}</div>}
      <form className="prompt-box" onSubmit={(e: FormEvent) => { e.preventDefault(); submit(input); }}><textarea aria-label="Ask GeoAI" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a parcel, GIS layer, dataset or verified document…" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } }} /><div><span>GeoAI may make mistakes. Verify important decisions.</span><button disabled={!input.trim() || loading} aria-label="Send question">↑</button></div></form>
    </section>
    <aside className="context-panel"><PanelHeader title="Active context" detail="Sources available to this chat" /><ContextItem mark="PC" title="Synthetic parcels" meta="128 records · 6 districts" status="Ready" /><ContextItem mark="MP" title="GIS layers" meta="11 of 12 available" status="Ready" /><ContextItem mark="NS" title="NSDI catalogue" meta="42 metadata records" status="Ready" /><ContextItem mark="KC" title="Knowledge index" meta="28 demo documents" status="Ready" /><ContextItem mark="LA" title="LAIS connector" meta="Mock endpoint only" status="Demo" /><div className="guardrail-card"><span>◆</span><h3>Built-in guardrails</h3><p>GeoAI can search, analyse and explain. It cannot register, transfer or alter land rights.</p><button onClick={() => notify("Security policy reference opened")}>View safety policy</button></div></aside>
  </div>;
}

function ContextItem({ mark, title, meta, status }: { mark: string; title: string; meta: string; status: string }) { return <div className="context-item"><span>{mark}</span><p><b>{title}</b><small>{meta}</small></p><em>{status}</em></div>; }

function ParcelMap({ compact = false, selected, onSelect, visibleLayers }: { compact?: boolean; selected?: Parcel; onSelect?: (p: Parcel) => void; visibleLayers?: Record<string, boolean> }) {
  const shown = parcels.slice(0, compact ? 12 : 26);
  return <div className={`parcel-map ${compact ? "compact" : ""}`}>
    <div className="map-grid" />
    {(visibleLayers?.wetlands ?? true) && <><div className="wetland wetland-one" /><div className="wetland wetland-two" /></>}
    {(visibleLayers?.roads ?? true) && <><div className="road road-one" /><div className="road road-two" /><div className="road road-three" /></>}
    {shown.map((parcel, i) => <button key={parcel.upi} title={parcel.upi} aria-label={`Parcel ${parcel.upi}`} onClick={() => onSelect?.(parcel)} className={`map-parcel land-${parcel.landUse.toLowerCase().replace(" ", "-")} ${selected?.upi === parcel.upi ? "selected" : ""}`} style={{ left: `${parcel.x}%`, top: `${parcel.y}%`, width: `${parcel.w}%`, height: `${parcel.h}%`, transform: `rotate(${parcel.rotation}deg)`, zIndex: i + 2 }}><span>{i < 8 ? String(i + 1).padStart(2, "0") : ""}</span></button>)}
    <div className="map-city"><i />Kigali</div><div className="map-label label-gasabo">GASABO</div><div className="map-label label-kicukiro">KICUKIRO</div>
    <div className="map-scale"><i /> 0 <span>1 km</span></div>
    <div className="map-attribution">Synthetic prototype map · EPSG:32736</div>
  </div>;
}

function MapPage({ notify }: { notify: (s: string) => void }) {
  const [selected, setSelected] = useState<Parcel | undefined>(parcels[0]);
  const [layers, setLayers] = useState({ parcels: true, roads: true, wetlands: true, zoning: false, buildings: false, boundaries: true });
  const [zoom, setZoom] = useState(11);
  return <div className="map-workspace"><div className="map-main"><ParcelMap selected={selected} onSelect={setSelected} visibleLayers={layers} /><div className="map-toolbar"><button className="active" title="Select">↖</button><button title="Pan">✥</button><button title="Draw polygon">⬡</button><button title="Measure distance">↔</button><button title="Measure area">▱</button><button title="Clear" onClick={() => setSelected(undefined)}>×</button></div><div className="zoom-control"><button onClick={() => setZoom(Math.min(18, zoom + 1))}>+</button><span>{zoom}</span><button onClick={() => setZoom(Math.max(5, zoom - 1))}>−</button></div><div className="map-search"><span>⌕</span><input aria-label="Search map" placeholder="Search UPI, district or location…" /></div><div className="map-mode"><button className="active">Map</button><button>Satellite</button></div></div>
    <aside className="map-side"><div className="map-tabs"><button className="active">Layers</button><button>Legend</button></div><div className="layer-group"><h3>Reference layers <span>−</span></h3><LayerToggle label="Administrative boundaries" sub="Province · District · Sector" checked={layers.boundaries} onChange={() => setLayers({ ...layers, boundaries: !layers.boundaries })} /><LayerToggle label="National road network" sub="Primary and secondary roads" checked={layers.roads} onChange={() => setLayers({ ...layers, roads: !layers.roads })} /></div><div className="layer-group"><h3>Land intelligence <span>−</span></h3><LayerToggle label="Sample cadastral parcels" sub="128 synthetic records" checked={layers.parcels} onChange={() => setLayers({ ...layers, parcels: !layers.parcels })} /><LayerToggle label="Land-use zoning" sub="Prototype classification" checked={layers.zoning} onChange={() => setLayers({ ...layers, zoning: !layers.zoning })} /><LayerToggle label="Building footprints" sub="Demonstration layer" checked={layers.buildings} onChange={() => setLayers({ ...layers, buildings: !layers.buildings })} /></div><div className="layer-group"><h3>Environment <span>−</span></h3><LayerToggle label="National wetlands" sub="Catalogue reference" checked={layers.wetlands} onChange={() => setLayers({ ...layers, wetlands: !layers.wetlands })} /></div>
      {selected && <div className="selected-card"><div className="selected-head"><span>Selected parcel</span><button onClick={() => setSelected(undefined)}>×</button></div><h3>{selected.upi}</h3><dl><div><dt>District</dt><dd>{selected.district}</dd></div><div><dt>Sector</dt><dd>{selected.sector}</dd></div><div><dt>Area</dt><dd>{selected.area.toLocaleString()} m²</dd></div><div><dt>Land use</dt><dd>{selected.landUse}</dd></div><div><dt>Zoning</dt><dd>{selected.zoning}</dd></div><div><dt>Status</dt><dd><i />{selected.status}</dd></div></dl><button className="primary-button full" onClick={() => notify(`Parcel ${selected.upi} added to the analysis workspace`)}>Analyse parcel</button></div>}
    </aside></div>;
}

function LayerToggle({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: () => void }) { return <label className="layer-toggle"><input type="checkbox" checked={checked} onChange={onChange} /><span className="toggle-ui" /><p><b>{label}</b><small>{sub}</small></p><i>••</i></label>; }

function ParcelsPage({ onAnalyse, notify }: { onAnalyse: () => void; notify: (s: string) => void }) {
  const [query, setQuery] = useState(""); const [district, setDistrict] = useState("All districts"); const [selected, setSelected] = useState<Parcel | null>(null);
  const filtered = parcels.filter((p) => (district === "All districts" || p.district === district) && (`${p.upi} ${p.district} ${p.sector} ${p.landUse}`.toLowerCase().includes(query.toLowerCase())));
  return <div className="registry-layout"><section className="panel registry-panel"><div className="filters-row"><div className="field-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search UPI, sector or land use…" /></div><select value={district} onChange={(e) => setDistrict(e.target.value)}>{["All districts", "Gasabo", "Kicukiro", "Nyarugenge", "Musanze", "Huye", "Bugesera"].map((d) => <option key={d}>{d}</option>)}</select><button onClick={() => { setQuery(""); setDistrict("All districts"); }}>Clear filters</button><em>{filtered.length} records</em></div><div className="table-scroll"><table><thead><tr><th>UPI</th><th>Location</th><th>Area</th><th>Land use</th><th>Zoning</th><th>Status</th><th /></tr></thead><tbody>{filtered.slice(0, 12).map((p) => <tr key={p.upi} onClick={() => setSelected(p)} className={selected?.upi === p.upi ? "row-selected" : ""}><td><b>{p.upi}</b></td><td>{p.district}<small>{p.sector} · {p.cell}</small></td><td>{p.area.toLocaleString()} m²</td><td><span className={`use-tag ${p.landUse.toLowerCase().replace(" ", "-")}`}>{p.landUse}</span></td><td>{p.zoning}</td><td><span className={`status-tag ${p.status === "Registered" ? "good" : "warning"}`}><i />{p.status}</span></td><td>›</td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing 1–{Math.min(12, filtered.length)} of {filtered.length}</span><div><button disabled>←</button><button className="active">1</button><button>2</button><button>3</button><button>→</button></div></div></section>
    <aside className="parcel-inspector">{selected ? <><div className="inspector-map"><ParcelMap compact selected={selected} /></div><div className="inspector-content"><span className="eyebrow">Parcel intelligence</span><h2>{selected.upi}</h2><p>{selected.sector}, {selected.district}</p><dl><div><dt>Area</dt><dd>{selected.area.toLocaleString()} m²</dd></div><div><dt>Land use</dt><dd>{selected.landUse}</dd></div><div><dt>Zoning</dt><dd>{selected.zoning}</dd></div><div><dt>Nearest road</dt><dd>{selected.roadDistance} m</dd></div><div><dt>Wetland distance</dt><dd>{selected.wetlandDistance} m</dd></div><div><dt>Registration</dt><dd>{selected.status}</dd></div></dl><div className="assessment-note"><b>AI observation</b><p>No major spatial conflict was detected using currently available prototype layers.</p></div><button className="primary-button full" onClick={onAnalyse}>Analyse with GeoAI</button><button className="secondary-button full" onClick={() => notify("Parcel report draft created")}>Generate assessment report</button></div></> : <div className="empty-inspector"><span>PC</span><h3>Select a parcel</h3><p>Choose a row to view land information and spatial relationships.</p></div>}</aside></div>;
}

function AnalysisPage({ onOpenMap, notify }: { onOpenMap: () => void; notify: (s: string) => void }) {
  const [operation, setOperation] = useState("Road Impact Analysis"); const [running, setRunning] = useState(false); const [complete, setComplete] = useState(false);
  const run = () => { setRunning(true); setComplete(false); window.setTimeout(() => { setRunning(false); setComplete(true); }, 900); };
  return <div className="analysis-layout"><aside className="analysis-menu"><p>Analysis operations</p>{["Buffer Analysis", "Intersection Analysis", "Proximity Analysis", "Parcel Area Analysis", "Land Use Analysis", "Zoning Analysis", "Wetland Impact Analysis", "Road Impact Analysis"].map((item) => <button key={item} className={operation === item ? "active" : ""} onClick={() => { setOperation(item); setComplete(false); }}><span>{item.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>{item}</button>)}</aside><section className="analysis-content"><div className="panel analysis-form"><div className="operation-title"><span>GA</span><div><p>Approved PostGIS workflow</p><h2>{operation}</h2></div><em>ST_DWithin</em></div><div className="form-grid"><label>Select road<select><option>KN 5 Road</option><option>KK 15 Road</option><option>NR 4 Corridor</option></select></label><label>Buffer distance<div className="input-suffix"><input defaultValue="100" /><span>metres</span></div></label><label>Land use<select><option>Agriculture</option><option>All categories</option><option>Residential</option></select></label><label>District<select><option>Gasabo</option><option>All districts</option><option>Kicukiro</option></select></label></div><div className="safe-query"><span>◆</span><p><b>Controlled spatial operation</b><small>GeoAI will call the approved <code>findParcelsWithinDistance()</code> function. It cannot generate or run unrestricted SQL.</small></p></div><button className="primary-button run-button" onClick={run} disabled={running}>{running ? "Running approved analysis…" : "Run analysis"}</button></div>
      {(complete || !running) && <div className={`analysis-results ${complete ? "fresh" : ""}`}><div className="results-head"><div><span>Completed · synthetic data</span><h2>37 parcels affected</h2><p>Parcels within 100 metres of KN 5 Road in Gasabo</p></div><div><button onClick={onOpenMap}>View on map</button><button onClick={() => notify("CSV export prepared")}>Export CSV</button></div></div><div className="impact-grid"><div><span>Total area affected</span><b>18.7 ha</b><small>Across 37 parcels</small></div><div className="high"><span>High impact</span><b>8</b><small>More than 50% overlap</small></div><div className="medium"><span>Medium impact</span><b>13</b><small>20–50% overlap</small></div><div className="low"><span>Low impact</span><b>16</b><small>Less than 20% overlap</small></div></div><div className="result-map-row"><div className="result-map"><ParcelMap compact /></div><div className="ai-summary"><span>✦ GeoAI summary</span><p>The road corridor affects 37 synthetic parcels, with the highest concentration in Remera Sector. Agricultural parcels account for 56.8% of the affected area.</p><div><b>Recommended next action</b><p>An authorized GIS or Land Use officer should verify the selected alignment and parcel boundaries before any administrative use.</p></div><button onClick={() => notify("AI summary added to report draft")}>Generate PDF report →</button></div></div></div>}
    </section></div>;
}

function CataloguePage({ notify }: { notify: (s: string) => void }) {
  const [query, setQuery] = useState(""); const [theme, setTheme] = useState("All themes");
  const visible = datasets.filter((d) => (theme === "All themes" || d.theme === theme) && `${d.name} ${d.description} ${d.org}`.toLowerCase().includes(query.toLowerCase()));
  return <><section className="catalogue-search"><span>NS</span><div><h2>Find geospatial data</h2><p>Search metadata across connected prototype catalogue records.</p><div className="catalogue-input"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try “wetlands”, “roads” or “land use”…" /><button>Search</button></div></div></section><div className="catalogue-toolbar"><div><button className="active">All datasets <span>{datasets.length}</span></button><button>Recently updated</button><button>My access</button></div><select value={theme} onChange={(e) => setTheme(e.target.value)}><option>All themes</option>{[...new Set(datasets.map((d) => d.theme))].map((t) => <option key={t}>{t}</option>)}</select></div><section className="dataset-grid">{visible.map((d, i) => <article className="dataset-card" key={d.name}><div className={`dataset-preview preview-${i % 4}`}><span>{d.theme.toUpperCase()}</span><i /><i /><i /></div><div className="dataset-body"><div className="dataset-meta"><span>{d.access}</span><em>{d.updated}</em></div><h2>{d.name}</h2><p>{d.description}</p><dl><div><dt>Organization</dt><dd>{d.org}</dd></div><div><dt>Coverage</dt><dd>{d.coverage}</dd></div><div><dt>Resolution</dt><dd>{d.resolution}</dd></div><div><dt>CRS</dt><dd>{d.crs}</dd></div></dl><div className="dataset-foot"><b>{d.format}</b><button onClick={() => notify(`${d.name} metadata opened`)}>View metadata →</button></div></div></article>)}</section></>;
}

function KnowledgePage({ notify }: { notify: (s: string) => void }) {
  const [query, setQuery] = useState("subdivision"); const [searched, setSearched] = useState(true);
  return <div className="knowledge-layout"><section><div className="knowledge-search"><span>KC</span><div><h2>Search verified institutional knowledge</h2><p>Answers are limited to indexed content and always cite their source.</p></div><form onSubmit={(e) => { e.preventDefault(); setSearched(true); }}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search procedures, manuals and guidelines…" /><button>Search</button></form></div>{searched && <div className="knowledge-answer"><div className="answer-label"><span>✦</span><p><b>GeoAI knowledge summary</b><small>Based on 7 relevant sections in 2 demo documents</small></p></div><p>The indexed demonstration material describes a subdivision review sequence that includes parcel identification, zoning compatibility, a survey-plan check and final review by an authorized officer. The connected sources are not official legal instruments, so requirements cannot be treated as verified law.</p><div className="quote-block"><span>Most relevant section · DEMO</span><p>“Confirm the parent parcel reference, applicable planning zone and completeness of the survey submission before routing the case for authorized review.”</p><b>Subdivision Review Guide — DEMO · Section 3.2</b></div><div className="answer-warning"><b>Verification required</b><span>Consult current official regulations and an authorized NLA officer before administrative use.</span></div></div>}<div className="document-list panel"><PanelHeader title="Indexed documents" detail="28 documents · 1,483 searchable chunks" action="Manage index" onAction={() => notify("Knowledge index management opened")} />{documents.map((d) => <div className="document-row" key={d.title}><span>DOC</span><div><b>{d.title}</b><small>{d.category} · {d.pages} pages · {d.sections} sections</small></div><em>{d.status}</em><time>{d.updated}</time><button>•••</button></div>)}</div></section><aside className="upload-card"><span>↑</span><h3>Add a knowledge document</h3><p>PDF, DOCX or TXT · demo and authorized content only</p><label><input type="file" accept=".pdf,.docx,.txt" onChange={() => notify("Demo upload received for administrator review")} />Choose file</label><small>Uploads are virus-scanned, classified and audited before indexing.</small><hr /><h3>Index health</h3><div><p><span>Vector search</span><b>Healthy</b></p><p><span>Last indexed</span><b>8 min ago</b></p><p><span>Pending review</span><b>2 files</b></p></div></aside></div>;
}

function downloadSimplePdf(title: string, id: string) {
  const lines = ["NLA GeoAI - Intelligent Land & Geospatial Assistant", "PROTOTYPE - INTERNAL CONCEPT", "", `Report: ${title}`, `Report number: ${id}`, "Prepared by: Aline Uwase - GIS Officer", "Date: 10 August 2026", "", "ANALYSIS SUMMARY", "This report uses synthetic parcel and demonstration geospatial data.", "The prototype identified 37 parcels within 100 metres of the selected road.", "", "SOURCES USED", "Synthetic Parcel Layer; National Road Network; Land-use Classification", "", "DISCLAIMER", "AI-generated decision-support information. Final administrative or legal", "decisions must be verified and approved by an authorized NLA officer."];
  const escaped = lines.map((line) => line.replace(/[()\\]/g, (m) => `\\${m}`));
  let content = "BT /F1 14 Tf 54 770 Td"; escaped.forEach((line, i) => { content += `${i ? " 0 -24 Td" : ""} (${line}) Tj`; }); content += " ET";
  const objects = ["1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj", "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj", "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj", "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj", `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`];
  let pdf = "%PDF-1.4\n"; const offsets = [0]; objects.forEach((obj) => { offsets.push(pdf.length); pdf += `${obj}\n`; }); const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`; offsets.slice(1).forEach((o) => { pdf += `${String(o).padStart(10, "0")} 00000 n \n`; }); pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" })); const a = document.createElement("a"); a.href = url; a.download = `${id}.pdf`; a.click(); URL.revokeObjectURL(url);
}

function ReportsPage({ notify }: { notify: (s: string) => void }) {
  const [creating, setCreating] = useState(false);
  return <div className="reports-layout"><section><div className="report-types">{["Parcel Assessment", "Road Impact", "Land Use Analysis", "Wetland Impact", "GIS Analysis", "NSDI Dataset"].map((type, i) => <button key={type} onClick={() => setCreating(true)}><span>{["PC", "RD", "LU", "WT", "GA", "NS"][i]}</span><b>{type}</b><small>Create traceable report</small><i>＋</i></button>)}</div><div className="panel report-list"><PanelHeader title="Recent reports" detail="Generated from prototype analyses" /><table><thead><tr><th>Report</th><th>Type</th><th>Prepared by</th><th>Date</th><th>Status</th><th /></tr></thead><tbody>{reports.map((r) => <tr key={r.id}><td><b>{r.title}</b><small>{r.id}</small></td><td>{r.type}</td><td>{r.author}</td><td>{r.date}</td><td><span className={`status-tag ${r.status === "Ready" ? "good" : "warning"}`}><i />{r.status}</span></td><td><button onClick={() => { downloadSimplePdf(r.title, r.id); notify("PDF report downloaded"); }}>Download PDF</button></td></tr>)}</tbody></table></div></section><aside className="report-preview"><div className="paper"><div className="paper-head"><Image className="paper-logo" src="/nla-logo.png" alt="National Land Authority" width={1043} height={541} /><em>PROTOTYPE</em></div><p>PARCEL ASSESSMENT REPORT</p><h2>1/02/03/04/0012</h2><div className="paper-meta"><span>Report no.<b>NLA-GEO-2026-083</b></span><span>Prepared by<b>Aline Uwase</b></span><span>Date<b>10 Aug 2026</b></span></div><div className="paper-map"><ParcelMap compact selected={parcels[0]} /></div><h3>Analysis summary</h3><p className="paper-copy">No major spatial conflict was detected using currently available prototype layers. The parcel is zoned R2 and is approximately 84 m from the nearest mapped road.</p><div className="paper-disclaimer">AI-generated decision-support information. Final decisions require verification and approval by an authorized NLA officer.</div></div></aside>{creating && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setCreating(false)}>×</button><span className="modal-mark">RP</span><h2>Create assessment report</h2><p>Generate a traceable PDF from the selected synthetic parcel and GIS findings.</p><label>Report type<select><option>Parcel Assessment Report</option><option>GIS Analysis Report</option></select></label><label>Parcel UPI<input defaultValue="1/02/03/04/0012" /></label><label>Purpose<textarea defaultValue="Prototype parcel screening and decision support" /></label><div className="safe-query"><span>◆</span><p><b>Mandatory disclaimer included</b><small>All AI-generated findings will be marked for authorized officer verification.</small></p></div><button className="primary-button full" onClick={() => { setCreating(false); downloadSimplePdf("Parcel Assessment Report", "NLA-GEO-2026-085"); notify("Report generated and downloaded"); }}>Generate PDF report</button></div></div>}</div>;
}

function CorsPage() { return <><div className="cors-banner"><div><span>GN</span><p><b>Simulated telemetry only</b><small>This prototype is not connected to the real Rwanda GeoNet system.</small></p></div><time>Last refresh · 19:42:10 CAT</time></div><section className="cors-summary"><article><span>●</span><b>3</b><p>Stations online</p></article><article className="warn"><span>●</span><b>1</b><p>Station warning</p></article><article className="off"><span>●</span><b>1</b><p>Station offline</p></article><article><span>◎</span><b>15.5</b><p>Avg. satellites</p></article><article><span>↯</span><b>87 ms</b><p>Network latency</p></article></section><section className="cors-grid">{corsStations.map((s) => <article className={`station-card ${s.status.toLowerCase()}`} key={s.code}><div className="station-head"><div><span>{s.code}</span><p><b>{s.name}</b><small>{s.location}</small></p></div><em><i />{s.status}</em></div><div className="signal-bars"><i /><i /><i /><i /><i /></div><dl><div><dt>Satellites</dt><dd>{s.satellites || "—"}</dd></div><div><dt>Latency</dt><dd>{s.latency ? `${s.latency} ms` : "—"}</dd></div><div><dt>Data stream</dt><dd>{s.stream}</dd></div><div><dt>Last observation</dt><dd>{s.observed}</dd></div><div><dt>Power</dt><dd>{s.power}</dd></div></dl></article>)}</section><section className="anomaly-panel"><span>✦</span><div><p>GEOAI ANOMALY SUMMARY</p><h2>MUSN station requires attention</h2><span>MUSN has experienced increasing network latency during the last 45 minutes. RUSZ has been offline for 46 minutes with a simulated battery alert. A CORS engineer should verify network and power conditions.</span></div><button>Open incident view →</button></section></>;
}

function SatellitePage({ notify }: { notify: (s: string) => void }) { return <div className="satellite-layout"><section className="satellite-hero"><div className="sat-image before"><span>12 MAY 2026</span><i /><i /><i /></div><div className="sat-scan">→</div><div className="sat-image after"><span>02 AUG 2026</span><i /><i /><i /><b>+ 14</b></div><div className="sat-overlay"><span>FUTURE MODULE · MOCK RESULTS</span><h2>From imagery to officer-reviewed parcel insight</h2><p>Compare two dates, detect meaningful change, intersect results with cadastral parcels and route findings for human review.</p></div></section><section className="workflow"><div><span>01</span><b>Satellite imagery</b><small>Select two observation dates</small></div><i>→</i><div><span>02</span><b>Computer vision</b><small>Detect candidate change</small></div><i>→</i><div><span>03</span><b>GIS intersection</b><small>Identify affected parcels</small></div><i>→</i><div><span>04</span><b>Officer review</b><small>Verify before action</small></div></section><section className="change-grid"><article><span>NB</span><b>14</b><h3>New buildings</h3><p>Candidate structures detected</p></article><article><span>VL</span><b>2.8 ha</b><h3>Vegetation loss</h3><p>Change above demo threshold</p></article><article><span>WE</span><b>3</b><h3>Wetland alerts</h3><p>Potential encroachment candidates</p></article><article><span>RD</span><b>1.4 km</b><h3>Road development</h3><p>New linear feature detected</p></article></section><button className="primary-button satellite-cta" onClick={() => notify("Mock change-detection review started")}>Run demonstration comparison</button></div>; }

function AuditPage() {
  const [filter, setFilter] = useState("");
  const events = auditEvents.filter((e) => `${e.user} ${e.action} ${e.module} ${e.target}`.toLowerCase().includes(filter.toLowerCase()));
  return <section className="panel audit-panel"><div className="audit-tools"><div className="field-search"><span>⌕</span><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search user, action or module…" /></div><select><option>All actions</option><option>AI_QUERY</option><option>RUN_SPATIAL_ANALYSIS</option></select><select><option>Today</option><option>Last 7 days</option></select><button>Export audit log</button></div><div className="audit-timeline">{events.map((e) => <div className="audit-event" key={`${e.time}-${e.action}`}><time>{e.time}<small>10 Aug 2026</small></time><span className={e.result === "Blocked" ? "blocked" : ""}>{e.result === "Blocked" ? "!" : "✓"}</span><div><b>{e.action}</b><p>{e.target}</p><small>{e.user} · {e.module} · IP retained securely</small></div><em className={e.result === "Blocked" ? "bad" : "good"}>{e.result}</em></div>)}</div></section>;
}

function AdminPage({ notify }: { notify: (s: string) => void }) { return <div className="admin-layout"><section className="admin-summary"><article><span>US</span><div><b>71</b><p>Active users</p></div><em>+4 this month</em></article><article><span>RL</span><div><b>9</b><p>Defined roles</p></div><em>RBAC enforced</em></article><article><span>KY</span><div><b>0</b><p>Exposed secrets</p></div><em>Environment protected</em></article></section><section className="panel roles-panel"><PanelHeader title="Roles and access" detail="Prototype role-based permissions" action="Add role" onAction={() => notify("Role creation panel opened")} /><div className="role-grid">{roles.map((r) => <button key={r.name} onClick={() => notify(`${r.name} permissions opened`)}><span>{r.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span><div><b>{r.name}</b><small>{r.scope}</small></div><em>{r.users} users</em><i>›</i></button>)}</div></section><section className="admin-cards"><article className="panel"><PanelHeader title="AI provider" detail="Environment-based configuration" /><div className="provider"><span>✦</span><p><b>Mock AI mode</b><small>No production API key configured</small></p><em>Active</em></div><button className="secondary-button full" onClick={() => notify("Provider configuration opened")}>Configure provider</button></article><article className="panel"><PanelHeader title="Data connectors" detail="Least-privilege service access" /><ContextItem mark="LA" title="LAIS connector" meta="Mock data only" status="Healthy" /><ContextItem mark="PG" title="PostGIS" meta="Approved functions" status="Healthy" /><ContextItem mark="NS" title="NSDI catalogue" meta="Metadata service" status="Healthy" /></article><article className="panel"><PanelHeader title="Security controls" detail="Prototype policy enforcement" /><div className="security-list"><p><span>✓</span>Role-based access control</p><p><span>✓</span>JWT/session verification</p><p><span>✓</span>Rate limiting policy</p><p><span>✓</span>Audit event capture</p><p><span>✓</span>HTTPS-ready deployment</p></div></article></section></div>; }

function HealthPage() {
  const services = [["PostgreSQL database", "Healthy", "18 ms"], ["PostGIS spatial engine", "Healthy", "24 ms"], ["AI provider", "Warning", "Mock mode"], ["pgvector knowledge index", "Healthy", "31 ms"], ["GIS layer service", "Healthy", "42 ms"], ["LAIS mock connector", "Healthy", "27 ms"], ["NSDI catalogue", "Healthy", "21 ms"], ["Object storage", "Healthy", "34 ms"]];
  return <div className="health-layout"><section className="health-hero"><div className="health-ring"><span>99.8%</span><small>prototype uptime</small></div><div><span className="eyebrow">All core services available</span><h2>Operational with one advisory</h2><p>The platform is ready for demonstration. AI responses are running in safe mock mode until an authorized provider key is configured.</p><time>Last checked · 10 Aug 2026, 19:42 CAT</time></div></section><section className="service-grid">{services.map(([name, status, latency]) => <article key={name}><div><span className={status.toLowerCase()}><i />{status}</span><em>{latency}</em></div><h3>{name}</h3><p>{status === "Warning" ? "Deterministic prototype responses enabled" : "Connection check passed"}</p><div className="sparkline">{[4, 7, 5, 8, 6, 9, 7, 10, 8, 9].map((h, i) => <i key={i} style={{ height: `${h * 3}px` }} />)}</div></article>)}</section><section className="deployment-panel"><span>VC</span><div><p>VERCEL DEPLOYMENT</p><h2>Production build configuration ready</h2><span>Next.js frontend and Python FastAPI functions share one deployment with environment-managed secrets.</span></div><em>Ready</em></section></div>;
}
