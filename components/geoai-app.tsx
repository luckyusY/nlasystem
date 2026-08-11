"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BarChart3, Bell, Bot, BookOpen, Boxes, CircleDotDashed, Combine, Database, Download, ExternalLink, FileDown, FileText, HeartPulse, Home, LandPlot, Layers3, LoaderCircle, Map as MapIcon, Menu, MoreHorizontal, Play, Radar, RadioTower, Route, Satellite, ScanLine, ScrollText, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Tags, TreePine, Waves, Workflow, type LucideIcon } from "lucide-react";
import { A11y, Keyboard, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import OpenStreetMap, { type MapLayerVisibility } from "@/components/open-street-map";
import { auditEvents, corsStations, datasets, parcels, reports, roles, type Parcel } from "@/lib/data";
import { analyzeParcels, type SpatialMetric } from "@/lib/geospatial-engine";
import { inferLocalGeoIntent, warmLocalGeoAI, type LocalGeoAIResult } from "@/lib/local-geoai";
import { DOCUMENT_CATEGORIES, OFFICIAL_DOCUMENTS, searchOfficialDocuments } from "@/lib/official-document-catalog";
import { RWANDA_MAP_CATEGORIES, RWANDA_ONLINE_MAP_LAYERS, type RwandaMapCategory } from "@/lib/rwanda-map-catalog";

type PageKey = "dashboard" | "assistant" | "map" | "parcels" | "analysis" | "catalogue" | "knowledge" | "reports" | "cors" | "satellite" | "audit" | "admin" | "health";
type Message = { id: number; role: "assistant" | "user"; text: string; sources?: string[]; stats?: { label: string; value: string }[]; warning?: string };

const navGroups: { label: string; items: { key: PageKey; label: string }[] }[] = [
  { label: "Workspace", items: [
    { key: "dashboard", label: "Dashboard" },
    { key: "assistant", label: "NLA GeoAI" },
    { key: "map", label: "Interactive Map" },
    { key: "parcels", label: "Parcels" },
    { key: "analysis", label: "GIS Analysis" },
  ]},
  { label: "Knowledge", items: [
    { key: "catalogue", label: "NSDI Catalogue" },
    { key: "knowledge", label: "Knowledge Centre" },
    { key: "reports", label: "Reports" },
  ]},
  { label: "Operations", items: [
    { key: "cors", label: "CORS Monitoring" },
    { key: "satellite", label: "Change Detection" },
    { key: "audit", label: "Audit Logs" },
    { key: "admin", label: "Administration" },
    { key: "health", label: "System Health" },
  ]},
];

const PAGE_ICONS: Record<PageKey, LucideIcon> = {
  dashboard: BarChart3,
  assistant: Bot,
  map: MapIcon,
  parcels: LandPlot,
  analysis: Workflow,
  catalogue: Database,
  knowledge: BookOpen,
  reports: FileText,
  cors: RadioTower,
  satellite: Satellite,
  audit: ScrollText,
  admin: Settings,
  health: HeartPulse,
};

const titles: Record<PageKey, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: { eyebrow: "Operational overview", title: "Good evening, Aline", subtitle: "Here is the current state of the GeoAI prototype workspace." },
  assistant: { eyebrow: "Decision support", title: "NLA GeoAI Assistant", subtitle: "Ask questions across parcels, GIS layers, NSDI metadata and verified official-source documents." },
  map: { eyebrow: "National geospatial workspace", title: "Interactive Rwanda Map", subtitle: "Combine parcels with live national, forestry, water, terrain, risk and infrastructure maps." },
  parcels: { eyebrow: "Land intelligence", title: "Parcel Registry", subtitle: "Search and inspect non-sensitive synthetic cadastral records." },
  analysis: { eyebrow: "Open spatial tools", title: "GIS Analysis", subtitle: "Run real Turf.js proximity, intersection, buffer and area workflows." },
  catalogue: { eyebrow: "National Spatial Data Infrastructure", title: "NSDI Data Catalogue", subtitle: "Discover available geospatial datasets and their access conditions." },
  knowledge: { eyebrow: "Verified institutional knowledge", title: "Official Document Library", subtitle: "Search authoritative Rwanda land, planning, environment, forestry, water and geospatial publications." },
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
  "Show Rwanda forestry and land-cover maps.",
  "Calculate the area of parcel 1/02/03/04/0012.",
  "Find NSDI datasets about roads.",
  "Find official documents about subdivision.",
];

function getAssistantResponse(question: string): Message {
  const q = question.toLowerCase();
  const base = { id: Date.now() + 1, role: "assistant" as const };
  if (q.includes("agric") && q.includes("gasabo")) {
    const matches = parcels.filter((parcel) => parcel.district === "Gasabo" && parcel.landUse === "Agriculture");
    const areaHa = matches.reduce((sum, parcel) => sum + parcel.area, 0) / 10_000;
    return { ...base, text: `I found ${matches.length} synthetic agricultural parcels in Gasabo District. This result is calculated from the current demonstration registry using district and land-use attributes.`, stats: [{ label: "Matching parcels", value: String(matches.length) }, { label: "Recorded area", value: `${areaHa.toFixed(2)} ha` }, { label: "Data confidence", value: "Demo" }], sources: ["GIS — Synthetic Parcel Registry", "Attribute filter — District + Land use"], warning: "Prototype result. Parcel boundaries and classifications require officer verification." };
  }
  if (q.includes("road") || q.includes("buffer") || q.includes("proximity")) {
    const result = analyzeParcels({ source: "road", threshold: 100, road: "KN 5 Road", district: "All districts", landUse: "All categories", zoning: "All zones" });
    const agricultural = result.matches.filter((parcel) => parcel.landUse === "Agriculture").length;
    const areaHa = result.matches.reduce((sum, parcel) => sum + result.metrics[parcel.upi].areaM2, 0) / 10_000;
    return { ...base, text: `The Turf.js road-buffer workflow identified ${result.matches.length} synthetic parcel geometries within 100 metres of KN 5 Road. ${agricultural} are classified as agricultural.`, stats: [{ label: "Affected parcels", value: String(result.matches.length) }, { label: "Agricultural", value: String(agricultural) }, { label: "Geodesic area", value: `${areaHa.toFixed(2)} ha` }], sources: ["Turf.js — buffer + booleanIntersects", "GeoJSON — KN 5 Road reference", "GIS — Synthetic Parcel Geometry"], warning: "Road alignments and parcel geometry are synthetic demonstration data." };
  }
  if (q.includes("wetland")) {
    const result = analyzeParcels({ source: "wetland", threshold: 0, road: "KN 5 Road", district: "All districts", landUse: "All categories", zoning: "All zones" });
    const areaHa = result.matches.reduce((sum, parcel) => sum + result.metrics[parcel.upi].areaM2, 0) / 10_000;
    return { ...base, text: `${result.matches.length} synthetic parcel geometries intersect the demonstration wetland references. The browser calculated this from the shared map geometry rather than a stored overlap label.`, stats: [{ label: "Intersections", value: String(result.matches.length) }, { label: "Geodesic area", value: `${areaHa.toFixed(2)} ha` }, { label: "Engine", value: "Turf.js" }], sources: ["Turf.js — booleanIntersects", "GeoJSON — Demo Wetland References", "GIS — Synthetic Parcel Geometry"], warning: "This screening does not establish a legal wetland boundary." };
  }
  if (q.includes("0012") || q.includes("analyse parcel")) {
    const parcel = parcels.find((candidate) => candidate.upi === "1/02/03/04/0012") ?? parcels[0];
    const result = analyzeParcels({ source: "attribute", threshold: 0, road: "KN 5 Road", district: "All districts", landUse: "All categories", zoning: "All zones" });
    const metric = result.metrics[parcel.upi];
    return { ...base, text: `Parcel ${parcel.upi} is a ${metric.areaM2.toLocaleString(undefined, { maximumFractionDigits: 0 })} m² synthetic ${parcel.landUse.toLowerCase()} parcel in ${parcel.sector} Sector, ${parcel.district}. Its centroid is approximately ${metric.roadDistanceM.toFixed(0)} m from KN 5 Road and ${metric.wetlandDistanceM.toFixed(0)} m from the closest demonstration wetland boundary.`, stats: [{ label: "Geodesic area", value: `${metric.areaM2.toFixed(0)} m²` }, { label: "Road distance", value: `${metric.roadDistanceM.toFixed(0)} m` }, { label: "UTM CRS", value: "EPSG:32736" }], sources: ["GeoJSON — Synthetic Parcel Geometry", "Turf.js — geodesic metrics", "Proj4js — UTM 36S centroid"], warning: "AI-generated decision support. Final administrative or legal decisions require an authorized NLA officer." };
  }
  const mapTopics = ["forest", "forestry", "land cover", "flood", "erosion", "slope", "soil", "hydrology", "catchment", "biodiversity", "protected area", "air quality", "temperature", "mining", "electricity", "telecom"];
  const requestedMapTopics = mapTopics.filter((topic) => q.includes(topic));
  if (requestedMapTopics.length && !/\b(document|law|policy|manual|report|publication)\b/.test(q)) {
    const matchingMaps = RWANDA_ONLINE_MAP_LAYERS.filter((layer) => requestedMapTopics.some((topic) => `${layer.title} ${layer.description} ${layer.tags.join(" ")}`.toLowerCase().includes(topic))).slice(0, 5);
    return { ...base, text: `I found ${matchingMaps.length} relevant online map services for ${requestedMapTopics.join(" and ")}: ${matchingMaps.map((layer) => layer.title).join(", ")}. Open Interactive Rwanda Map → Rwanda maps to add them as live overlays, combine up to four and adjust opacity.`, stats: [{ label: "Relevant maps", value: String(matchingMaps.length) }, { label: "Full catalogue", value: String(RWANDA_ONLINE_MAP_LAYERS.length) }, { label: "Provider keys", value: "None" }], sources: matchingMaps.map((layer) => `${layer.provider} — ${layer.title} — ${layer.licence}`), warning: "Public visibility does not automatically grant unrestricted reuse. Review the licence shown for each source before publication or operational use." };
  }
  if (q.includes("nsdi") || q.includes("dataset") || q.includes("roads")) return { ...base, text: "Yes. The NSDI demonstration catalogue contains a National Road Network dataset maintained by RTDA. It has national coverage, a 1:10,000 reference scale, EPSG:32736 coordinates and internal access classification.", stats: [{ label: "Catalogue matches", value: "2" }, { label: "Latest update", value: "02 Aug 2026" }, { label: "Access", value: "Internal" }], sources: ["NSDI Catalogue — National Road Network", "NSDI Catalogue — Administrative Boundaries"] };
  if (q.includes("subdivision") || q.includes("document") || q.includes("law") || q.includes("policy") || q.includes("manual") || q.includes("report") || q.includes("publication")) {
    const documentQuery = q.replace(/\b(find|show|official|documents?|about|what|which|discuss|rwanda|nla)\b/g, " ").replace(/\s+/g, " ").trim() || question;
    const matches = searchOfficialDocuments(documentQuery).slice(0, 4);
    const fallback = searchOfficialDocuments("subdivision").slice(0, 4);
    const relevant = matches.length ? matches : fallback;
    return {
      ...base,
      text: `I found ${relevant.length} authoritative-source publication${relevant.length === 1 ? "" : "s"} in the NLA document catalogue: ${relevant.map((document) => document.title).join("; ")}. Open the Official Document Library to read the PDFs and confirm the latest applicable version.`,
      stats: [{ label: "Document matches", value: String(relevant.length) }, { label: "Catalogue", value: String(OFFICIAL_DOCUMENTS.length) }, { label: "Access", value: "Official links" }],
      sources: relevant.map((document) => `${document.issuer} — ${document.title} (${document.year})`),
      warning: "Metadata is searchable in this demo; PDF text is not locally embedded. Laws, orders, policies and plans must be checked against the latest Official Gazette or issuing institution before administrative use.",
    };
  }
  return { ...base, text: "I checked the currently connected prototype sources but could not verify a sufficiently specific answer. Try including a parcel UPI, district, layer, distance or document topic.", sources: ["Connected NLA prototype sources"], warning: "Information could not be verified from the currently connected NLA data sources." };
}

export default function GeoAIApp() {
  const reduceMotion = useReducedMotion();
  const [page, setPage] = useState<PageKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [analysisMatches, setAnalysisMatches] = useState<string[]>([]);
  const [registryQuery, setRegistryQuery] = useState("");

  function navigate(key: PageKey) {
    setPage(key);
    setSidebarOpen(false);
  }

  useEffect(() => {
    const resetWorkspaceScroll = () => {
      window.dispatchEvent(new Event("nla:navigate"));
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    resetWorkspaceScroll();
    const frame = window.requestAnimationFrame(resetWorkspaceScroll);
    const timer = window.setTimeout(resetWorkspaceScroll, 80);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [page]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace-main">Skip to workspace</a>
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-block">
          <Image className="nla-brand-logo" src="/nla-logo.png" alt="National Land Authority" width={1043} height={541} priority />
          <div className="brand-copy"><strong>NLA GeoAI Workspace</strong><small>Intelligent land & geospatial assistant</small></div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">×</button>
        </div>
        <div className="prototype-chip"><span /> Prototype · Internal concept</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => { const Icon = PAGE_ICONS[item.key]; return (
                <motion.button key={item.key} className={page === item.key ? "active" : ""} aria-current={page === item.key ? "page" : undefined} onClick={() => navigate(item.key)} whileHover={reduceMotion ? undefined : { x: 4 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
                  <span className="nav-mark"><Icon size={16} strokeWidth={1.9} aria-hidden /></span>{item.label}{page === item.key && <motion.i layoutId="active-navigation-rail" />}
                </motion.button>
              ); })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-avatar">AU</div>
          <div><strong>Aline Uwase</strong><small>GIS Officer</small></div>
          <button onClick={() => notify("Profile settings are managed in the Administration workspace")} aria-label="User options">•••</button>
        </div>
      </aside>

      <AnimatePresence>{sidebarOpen && <motion.button className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}</AnimatePresence>

      <main className="main-area" id="workspace-main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} aria-hidden /></button>
          <Image className="mobile-brand-logo" src="/nla-logo.png" alt="National Land Authority" width={1043} height={541} priority />
          <div className="global-search"><span><Search size={15} aria-hidden /></span><input aria-label="Global search" placeholder="Search UPI, district, sector or land use…" onKeyDown={(event) => { if (event.key === "Enter") { const query = event.currentTarget.value.trim(); setRegistryQuery(query); navigate("parcels"); notify(query ? `Searching the Parcel Registry for “${query}”` : "Parcel Registry opened"); } }} /><kbd>↵</kbd></div>
          <div className="top-actions">
            <div className="environment"><span /> Prototype data</div>
            <button className="mobile-search-button" onClick={() => navigate("parcels")} aria-label="Search parcels and datasets"><Search size={20} aria-hidden /></button>
            <button className="icon-button" onClick={() => setNoticeOpen(!noticeOpen)} aria-label="Notifications"><Bell size={17} aria-hidden /><i>3</i></button>
            <div className="header-user"><span>AU</span><div><b>Aline Uwase</b><small>GIS Department · GIS Officer</small></div></div>
          </div>
          <AnimatePresence>{noticeOpen && <motion.div className="notification-popover" role="status" aria-label="Workspace notifications" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, rotateX: -7 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, rotateX: -5 }} transition={{ duration: 0.18 }}><strong>Notifications</strong><p><b>Road layer refreshed</b><span>NSDI metadata · 8 min ago</span></p><p><b>MUSN latency warning</b><span>CORS monitoring · 24 min ago</span></p><p><b>Report ready for review</b><span>NLA-GEO-2026-084 · 1 hr ago</span></p></motion.div>}</AnimatePresence>
        </header>

        <div className="content-wrap">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div className="page-stage" key={page} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, rotateX: -1.5 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? 0.08 : 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <PageIntro page={page} onAsk={() => navigate("assistant")} />
              {page === "dashboard" && <Dashboard onNavigate={navigate} notify={notify} />}
              {page === "assistant" && <AssistantPage onOpenMap={() => navigate("map")} notify={notify} />}
              {page === "map" && <MapPage notify={notify} highlightedUpis={analysisMatches} />}
              {page === "parcels" && <ParcelsPage key={registryQuery} initialQuery={registryQuery} onAnalyse={() => navigate("assistant")} notify={notify} />}
              {page === "analysis" && <AnalysisPage onOpenMap={(matches) => { setAnalysisMatches(matches.map((parcel) => parcel.upi)); navigate("map"); }} notify={notify} />}
              {page === "catalogue" && <CataloguePage notify={notify} />}
              {page === "knowledge" && <KnowledgePage notify={notify} />}
              {page === "reports" && <ReportsPage notify={notify} />}
              {page === "cors" && <CorsPage notify={notify} />}
              {page === "satellite" && <SatellitePage notify={notify} />}
              {page === "audit" && <AuditPage notify={notify} />}
              {page === "admin" && <AdminPage notify={notify} onOpenAssistant={() => navigate("assistant")} />}
              {page === "health" && <HealthPage />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <button className={page === "dashboard" ? "active" : ""} onClick={() => navigate("dashboard")}><span><Home size={17} aria-hidden /></span><small>Home</small></button>
        <button className={page === "assistant" ? "active" : ""} onClick={() => navigate("assistant")}><span><Bot size={17} aria-hidden /></span><small>GeoAI</small></button>
        <button className={page === "map" ? "active" : ""} onClick={() => navigate("map")}><span><MapIcon size={17} aria-hidden /></span><small>Map</small></button>
        <button className={page === "parcels" ? "active" : ""} onClick={() => navigate("parcels")}><span><LandPlot size={17} aria-hidden /></span><small>Parcels</small></button>
        <button onClick={() => setSidebarOpen(true)}><span><MoreHorizontal size={18} aria-hidden /></span><small>More</small></button>
      </nav>
      {page !== "assistant" && <GeoAISupportBubble onNavigate={navigate} />}
      <AnimatePresence>{toast && <motion.div className="toast" role="status" aria-live="polite" initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}><span><ShieldCheck size={15} aria-hidden /></span>{toast}</motion.div>}</AnimatePresence>
    </div>
  );
}

function GeoAISupportBubble({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", text: "Hello. I can help you find a parcel, explain a land workflow, or open the interactive OpenStreetMap workspace." },
  ]);

  function ask(question: string) {
    const clean = question.trim();
    if (!clean) return;
    const userMessage: Message = { id: Date.now(), role: "user", text: clean };
    const answer = getAssistantResponse(clean);
    setMessages((current) => [...current, userMessage, answer].slice(-5));
    setInput("");
  }

  return <div className={`support-widget ${open ? "open" : ""}`}>
    <AnimatePresence>{open && <motion.section className="support-panel" role="dialog" aria-label="NLA GeoAI support" id="geoai-support-panel" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96, rotateX: -4 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
      <header><div><span><Sparkles size={15} aria-hidden /></span><p><b>NLA GeoAI Support</b><small><i /> Prototype assistant online</small></p></div><button onClick={() => setOpen(false)} aria-label="Close GeoAI support">×</button></header>
      <div className="support-messages" aria-live="polite">
        {messages.map((message) => <div className={`support-message ${message.role}`} key={message.id}><small>{message.role === "assistant" ? "NLA GEOAI" : "YOU"}</small><p>{message.text}</p>{message.warning && <em>Officer verification required</em>}</div>)}
      </div>
      <div className="support-actions"><button onClick={() => { setOpen(false); onNavigate("map"); }}><span><MapIcon size={15} aria-hidden /></span>Open street map</button><button onClick={() => ask("Calculate the area of parcel 1/02/03/04/0012.")}><span><LandPlot size={15} aria-hidden /></span>Check parcel 0012</button></div>
      <form onSubmit={(event) => { event.preventDefault(); ask(input); }}><input aria-label="Ask NLA GeoAI support" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about parcels or land data…" /><button disabled={!input.trim()} aria-label="Send support question">↑</button></form>
      <button className="support-full-link" onClick={() => { setOpen(false); onNavigate("assistant"); }}>Open full GeoAI workspace →</button>
    </motion.section>}</AnimatePresence>
    <motion.button className="support-launcher" aria-label={open ? "Close NLA GeoAI support" : "Open NLA GeoAI support"} aria-expanded={open} aria-controls="geoai-support-panel" onClick={() => setOpen((current) => !current)} whileHover={reduceMotion ? undefined : { y: -3, scale: 1.02 }} whileTap={reduceMotion ? undefined : { scale: 0.97 }}><span><Sparkles size={18} aria-hidden /></span><b>{open ? "Close" : "Ask NLA GeoAI"}</b>{!open && <i aria-hidden>1</i>}</motion.button>
  </div>;
}

function PageIntro({ page, onAsk }: { page: PageKey; onAsk: () => void }) {
  const info = titles[page];
  const PageIcon = PAGE_ICONS[page];
  return <section className="page-intro"><div><p><PageIcon size={14} aria-hidden />{info.eyebrow}</p><h1>{info.title}</h1><span>{info.subtitle}</span></div>{page !== "assistant" && <button className="primary-button" onClick={onAsk}><Sparkles size={15} aria-hidden /> Ask NLA GeoAI</button>}</section>;
}

function Dashboard({ onNavigate, notify }: { onNavigate: (p: PageKey) => void; notify: (s: string) => void }) {
  const reduceMotion = useReducedMotion();
  const metrics = [
    ["128", "Synthetic parcels", "+12 this month", "PC"], ["6", "Districts covered", "Prototype scope", "DS"], [String(RWANDA_ONLINE_MAP_LAYERS.length), "Rwanda online maps", "6 source families", "LY"], ["42", "NSDI datasets", "+3 indexed", "NS"],
    [String(OFFICIAL_DOCUMENTS.length), "Official documents", "Searchable metadata", "DC"], ["Local", "AI runtime", "No provider key", "AI"], ["8", "GIS operations", "Turf geometry", "GA"], ["Live", "Open-stack health", "Runtime checks", "SH"],
  ];
  return <div className="dashboard-stack">
    <section className="metric-carousel" aria-label="Operational metrics"><Swiper className="metric-swiper" modules={[A11y, Keyboard, Pagination]} slidesPerView={1.18} spaceBetween={12} keyboard={{ enabled: true }} pagination={{ clickable: true }} breakpoints={{ 520: { slidesPerView: 2.15 }, 900: { slidesPerView: 3.15 }, 1260: { slidesPerView: 4 } }}>{metrics.map(([value, label, detail, mark]) => <SwiperSlide key={label}><motion.article className="metric-card" whileHover={reduceMotion ? undefined : { y: -6, rotateX: 2, rotateY: -1 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}><div className="metric-top"><span className="metric-mark">{mark}</span><i>↗</i></div><strong>{value}</strong><h3>{label}</h3><p>{detail}</p></motion.article></SwiperSlide>)}</Swiper></section>
    <section className="quick-actions" aria-label="Workspace quick actions"><motion.button whileHover={reduceMotion ? undefined : { y: -4, rotateX: 2 }} whileTap={{ scale: 0.98 }} onClick={() => onNavigate("analysis")}><span><Workflow size={18} aria-hidden /></span><b>Run GIS analysis</b><small>Approved spatial operations</small></motion.button><motion.button whileHover={reduceMotion ? undefined : { y: -4, rotateX: 2 }} whileTap={{ scale: 0.98 }} onClick={() => onNavigate("parcels")}><span><LandPlot size={18} aria-hidden /></span><b>Find a parcel</b><small>Search synthetic records</small></motion.button><motion.button whileHover={reduceMotion ? undefined : { y: -4, rotateX: 2 }} whileTap={{ scale: 0.98 }} onClick={() => onNavigate("catalogue")}><span><Database size={18} aria-hidden /></span><b>Search NSDI</b><small>Discover available datasets</small></motion.button><motion.button whileHover={reduceMotion ? undefined : { y: -4, rotateX: 2 }} whileTap={{ scale: 0.98 }} onClick={() => { notify("New parcel assessment draft created"); onNavigate("reports"); }}><span><FileText size={18} aria-hidden /></span><b>Create report</b><small>Traceable decision support</small></motion.button></section>
    <section className="dashboard-grid">
      <article className="panel span-2"><PanelHeader title="AI activity" detail="Queries by department · last 7 days" action="View audit" onAction={() => onNavigate("audit")} /><div className="chart-wrap"><div className="bar-chart" aria-label="AI queries chart">{[38, 55, 42, 68, 54, 78, 64, 86, 71, 92, 76, 98].map((n, i) => <div key={i}><span style={{ height: `${n}%` }} /><small>{["GIS", "REG", "LU", "NSDI", "MGT", "SVY"][i % 6]}</small></div>)}</div><div className="chart-legend"><p><i className="dot-green" /> GIS <b>34%</b></p><p><i className="dot-amber" /> Land Use <b>27%</b></p><p><i className="dot-blue" /> Other <b>39%</b></p></div></div></article>
      <article className="panel"><PanelHeader title="Parcel categories" detail="Synthetic dataset" /><div className="donut-row"><div className="donut"><div><b>128</b><span>parcels</span></div></div><div className="donut-legend"><p><i className="res" />Residential <b>39%</b></p><p><i className="agr" />Agriculture <b>28%</b></p><p><i className="mix" />Mixed use <b>18%</b></p><p><i className="oth" />Other <b>15%</b></p></div></div></article>
      <article className="panel span-2"><PanelHeader title="Recent GeoAI queries" detail="Answers grounded in connected prototype sources" action="Open assistant" onAction={() => onNavigate("assistant")} /><div className="activity-list"><Activity mark="AU" title="Agricultural parcels within 100 m of KN 5 Road" meta="Aline Uwase · GIS · 6 min ago" tag="37 parcels" /><Activity mark="JM" title="Documents discussing subdivision requirements" meta="Jean Mutesi · Registrar · 18 min ago" tag="2 sources" /><Activity mark="EN" title="Wetland overlap for parcel 1/02/03/04/0012" meta="Eric Niyonzima · Land Use · 34 min ago" tag="No overlap" /></div></article>
      <article className="panel"><PanelHeader title="System notices" detail="Items that may need attention" /><div className="notice-list"><div className="notice warning"><i>!</i><p><b>MUSN station latency</b><span>286 ms · increasing for 45 min</span></p></div><div className="notice info"><i>i</i><p><b>Catalogue refresh complete</b><span>3 metadata records updated</span></p></div><div className="notice good"><i>✓</i><p><b>Official document catalogue ready</b><span>{OFFICIAL_DOCUMENTS.length} publications · metadata search</span></p></div></div></article>
    </section>
  </div>;
}

function PanelHeader({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) {
  return <div className="panel-header"><div><h2>{title}</h2><p>{detail}</p></div>{action && <button onClick={onAction}>{action} <span>→</span></button>}</div>;
}

function Activity({ mark, title, meta, tag }: { mark: string; title: string; meta: string; tag: string }) { return <div className="activity"><span>{mark}</span><div><b>{title}</b><small>{meta}</small></div><em>{tag}</em></div>; }

function AssistantPage({ onOpenMap, notify }: { onOpenMap: () => void; notify: (s: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", text: "Good evening, Aline. I can help you explore synthetic parcels, run approved GIS operations, search the NSDI catalogue and find authoritative Rwanda land and geospatial publications. What would you like to investigate?", sources: ["NLA GeoAI prototype services", "Official-source document metadata"] }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [localAiState, setLocalAiState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [localAiProgress, setLocalAiProgress] = useState(0);
  const [localAiDetail, setLocalAiDetail] = useState("Runs privately in this browser");
  const [localInsight, setLocalInsight] = useState<LocalGeoAIResult | null>(null);

  async function enableLocalAI() {
    if (localAiState === "loading" || localAiState === "ready") return;
    setLocalAiState("loading");
    setLocalAiProgress(0);
    setLocalAiDetail("Preparing the quantized geospatial intent model");
    try {
      await warmLocalGeoAI((percent, detail) => {
        setLocalAiProgress(percent);
        setLocalAiDetail(detail);
      });
      setLocalAiState("ready");
      setLocalAiProgress(100);
      setLocalAiDetail("all-MiniLM-L6-v2 · WASM · browser cache");
      notify("NLA Local GeoAI is ready in this browser");
    } catch (error) {
      setLocalAiState("error");
      setLocalAiDetail(error instanceof Error ? `Model unavailable: ${error.message.slice(0, 96)}` : "Model download was unavailable; grounded tools still work");
      notify("Local AI could not load; grounded NLA tools remain available");
    }
  }

  const submit = (text: string) => {
    const clean = text.trim(); if (!clean || loading) return;
    setMessages((old) => [...old, { id: Date.now(), role: "user", text: clean }]); setInput(""); setLoading(true);
    window.setTimeout(async () => {
      const grounded = getAssistantResponse(clean);
      if (localAiState === "ready") {
        try {
          const insight = await inferLocalGeoIntent(clean);
          setLocalInsight(insight);
          grounded.sources = [...(grounded.sources ?? []), `NLA Local GeoAI · ${insight.label} · ${Math.round(insight.confidence * 100)}%`];
        } catch {
          setLocalAiState("error");
          setLocalAiDetail("Local inference failed; deterministic geospatial routing remains active");
        }
      }
      setMessages((old) => [...old, grounded]);
      setLoading(false);
    }, 450);
  };
  return <div className="assistant-layout">
    <aside className="conversation-panel"><button className="new-chat" onClick={() => setMessages(messages.slice(0, 1))}>＋ New investigation</button><p>Today</p><button className="conversation active" onClick={() => submit("Find parcels within 100 metres of KN 5 Road.")}><span>Road buffer · Gasabo</span><small>Open the grounded investigation</small></button><button className="conversation" onClick={() => submit("Find official documents about subdivision.")}><span>Subdivision guidance</span><small>Search official-source publications</small></button><p>Previous</p><button className="conversation" onClick={() => submit("Which parcels intersect wetlands?")}><span>Wetland intersection</span><small>Re-run the geometry screening</small></button><button className="conversation" onClick={() => submit("Find NSDI datasets about roads.")}><span>NSDI roads data</span><small>Search catalogue metadata</small></button><div className="data-scope"><span>✓</span><p><b>Safe data scope</b><small>Synthetic parcels · public documents · catalogue metadata</small></p></div></aside>
    <section className="chat-panel"><div className="chat-status"><div><span className="ai-orb">✦</span><p><b>NLA GeoAI</b><small><i /> {localAiState === "ready" ? "Local AI + grounded GIS tools" : "Grounded GIS tools · local AI optional"}</small></p></div><button onClick={() => notify("Conversation exported to audit-safe text")}>Export</button></div>
      <div className="messages">
        {messages.map((message) => <div className={`message ${message.role}`} key={message.id}>{message.role === "assistant" && <span className="message-avatar">✦</span>}<div className="message-body"><small>{message.role === "assistant" ? "GEOAI ASSISTANT" : "YOU"}</small><p>{message.text}</p>{message.stats && <div className="answer-stats">{message.stats.map((stat) => <div key={stat.label}><b>{stat.value}</b><span>{stat.label}</span></div>)}</div>}{message.sources && <div className="sources"><b>Sources used</b>{message.sources.map((source) => <span key={source}>↗ {source}</span>)}</div>}{message.warning && <div className="answer-warning"><b>Human verification required</b><span>{message.warning}</span></div>}{message.stats && <div className="message-actions"><button onClick={onOpenMap}>View on map</button><button onClick={() => notify("Assessment added to a report draft")}>Add to report</button></div>}</div></div>)}
        {loading && <div className="message assistant"><span className="message-avatar">✦</span><div className="typing"><i /><i /><i /></div></div>}
      </div>
      {messages.length < 3 && <div className="suggestion-grid">{suggestions.map((s) => <button key={s} onClick={() => submit(s)}><span>↗</span>{s}</button>)}</div>}
      <form className="prompt-box" onSubmit={(e: FormEvent) => { e.preventDefault(); submit(input); }}><textarea aria-label="Ask GeoAI" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a parcel, GIS layer, dataset or verified document…" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } }} /><div><span>GeoAI may make mistakes. Verify important decisions.</span><button disabled={!input.trim() || loading} aria-label="Send question">↑</button></div></form>
    </section>
    <aside className="context-panel"><PanelHeader title="Active context" detail="Sources available to this chat" /><ContextItem mark="PC" title="Synthetic parcels" meta="128 records · 6 districts" status="Ready" /><ContextItem mark="MP" title="Open GIS engine" meta="Turf · Proj4 · GeoJSON" status="Ready" /><ContextItem mark="OS" title="OpenStreetMap services" meta="Photon search · Overpass places" status="Live" /><ContextItem mark="KC" title="Official documents" meta={`${OFFICIAL_DOCUMENTS.length} verified source links`} status="Ready" /><div className={`local-ai-card ${localAiState}`}><div><span>AI</span><p><b>NLA Local GeoAI</b><small>{localAiDetail}</small></p></div>{localAiState === "loading" && <div className="local-ai-progress"><i style={{ width: `${Math.max(4, localAiProgress)}%` }} /></div>}{localInsight && <p className="local-ai-insight">Last route: <b>{localInsight.label}</b> · {Math.round(localInsight.confidence * 100)}%</p>}<button onClick={() => void enableLocalAI()} disabled={localAiState === "loading" || localAiState === "ready"}>{localAiState === "ready" ? "Local model ready" : localAiState === "loading" ? `Loading ${localAiProgress}%` : localAiState === "error" ? "Retry local AI" : "Enable no-key local AI"}</button><small>First use downloads a quantized open model. Prompts and inference stay in your browser.</small></div><div className="guardrail-card"><span>◆</span><h3>Built-in guardrails</h3><p>GeoAI can search, analyse and explain. It cannot register, transfer or alter land rights.</p><button onClick={() => notify("Security policy reference opened")}>View safety policy</button></div></aside>
  </div>;
}

function ContextItem({ mark, title, meta, status }: { mark: string; title: string; meta: string; status: string }) { return <div className="context-item"><span>{mark}</span><p><b>{title}</b><small>{meta}</small></p><em>{status}</em></div>; }

function ParcelMap({ compact = false, selected, onSelect, onClearSelection, onNotify, visibleLayers, highlightedUpis, onlineLayerIds, onlineLayerOpacity }: { compact?: boolean; selected?: Parcel; onSelect?: (p: Parcel) => void; onClearSelection?: () => void; onNotify?: (message: string) => void; visibleLayers?: Partial<MapLayerVisibility>; highlightedUpis?: string[]; onlineLayerIds?: string[]; onlineLayerOpacity?: number }) {
  return <OpenStreetMap compact={compact} selected={selected} onSelect={onSelect} onClearSelection={onClearSelection} onNotify={onNotify} visibleLayers={visibleLayers} highlightedUpis={highlightedUpis} onlineLayerIds={onlineLayerIds} onlineLayerOpacity={onlineLayerOpacity} />;
}

function MapPage({ notify, highlightedUpis }: { notify: (s: string) => void; highlightedUpis: string[] }) {
  const [selected, setSelected] = useState<Parcel | undefined>(() => parcels.find((parcel) => highlightedUpis.includes(parcel.upi)) ?? parcels[0]);
  const [layers, setLayers] = useState<MapLayerVisibility>({ parcels: true, osmPlaces: false, roads: true, wetlands: true, zoning: false, boundaries: true });
  const [mapTab, setMapTab] = useState<"layers" | "catalogue">("layers");
  const [onlineLayerIds, setOnlineLayerIds] = useState<string[]>([]);
  const [onlineLayerOpacity, setOnlineLayerOpacity] = useState(1);
  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [catalogueCategory, setCatalogueCategory] = useState<"All" | RwandaMapCategory>("All");

  const activeOnlineLayers = RWANDA_ONLINE_MAP_LAYERS.filter((layer) => onlineLayerIds.includes(layer.id));
  const filteredOnlineLayers = RWANDA_ONLINE_MAP_LAYERS.filter((layer) => {
    const matchesCategory = catalogueCategory === "All" || layer.category === catalogueCategory;
    const searchable = `${layer.title} ${layer.description} ${layer.provider} ${layer.tags.join(" ")}`.toLowerCase();
    return matchesCategory && searchable.includes(catalogueQuery.trim().toLowerCase());
  });

  function toggleOnlineLayer(id: string) {
    setOnlineLayerIds((current) => {
      if (current.includes(id)) {
        const layer = RWANDA_ONLINE_MAP_LAYERS.find((item) => item.id === id);
        notify(`${layer?.shortTitle ?? "Online layer"} removed from the map`);
        return current.filter((item) => item !== id);
      }
      if (current.length >= 4) {
        notify("Keep up to four online layers active for a readable map");
        return current;
      }
      const layer = RWANDA_ONLINE_MAP_LAYERS.find((item) => item.id === id);
      notify(`Loading ${layer?.shortTitle ?? "online layer"} and fitting Rwanda`);
      return [...current, id];
    });
  }

  return <div className="map-workspace"><div className="map-main"><ParcelMap selected={selected} onSelect={setSelected} onClearSelection={() => setSelected(undefined)} onNotify={notify} visibleLayers={layers} highlightedUpis={highlightedUpis} onlineLayerIds={onlineLayerIds} onlineLayerOpacity={onlineLayerOpacity} /></div>
    <aside className="map-side"><div className="map-tabs"><button className={mapTab === "layers" ? "active" : ""} onClick={() => setMapTab("layers")}>Layers <em>{onlineLayerIds.length}</em></button><button className={mapTab === "catalogue" ? "active" : ""} onClick={() => setMapTab("catalogue")}>Rwanda maps <em>{RWANDA_ONLINE_MAP_LAYERS.length}</em></button></div>
      {mapTab === "layers" ? <>
        {highlightedUpis.length > 0 && <div className="analysis-map-note"><Workflow size={16} aria-hidden /><p><b>Analysis result</b><small>{highlightedUpis.length} matched parcels highlighted in orange</small></p></div>}
        <div className="open-map-note"><span>RW</span><p><b>National online map stack</b><small>RSA · RWB · ESA · NASA · OpenStreetMap</small></p></div>
        {activeOnlineLayers.length > 0 && <div className="active-online-section"><div className="active-online-head"><p><b>Online map overlays</b><small>{activeOnlineLayers.length} of 4 active</small></p><button onClick={() => setMapTab("catalogue")}>Add maps</button></div>{activeOnlineLayers.map((layer) => <div className="active-online-layer" key={layer.id}><i style={{ background: layer.accent }} /><p><b>{layer.shortTitle}</b><small>{layer.provider}</small></p><button aria-label={`Remove ${layer.title}`} onClick={() => toggleOnlineLayer(layer.id)}>×</button></div>)}<label className="layer-opacity"><span><SlidersHorizontal size={13} aria-hidden />Overlay opacity</span><b>{Math.round(onlineLayerOpacity * 100)}%</b><input aria-label="Online overlay opacity" type="range" min="25" max="100" value={Math.round(onlineLayerOpacity * 100)} onChange={(event) => setOnlineLayerOpacity(Number(event.target.value) / 100)} /></label></div>}
        {activeOnlineLayers.length === 0 && <button className="empty-online-layers" onClick={() => setMapTab("catalogue")}><Layers3 size={20} aria-hidden /><span><b>Add authoritative Rwanda maps</b><small>Browse {RWANDA_ONLINE_MAP_LAYERS.length} national, water, forest and risk layers</small></span><i>→</i></button>}
        <div className="layer-group"><h3>Live open data <span>−</span></h3><LayerToggle label="Live OSM places" sub="Schools · health · government · markets" checked={layers.osmPlaces} onChange={() => setLayers({ ...layers, osmPlaces: !layers.osmPlaces })} /><LayerToggle label="Analysis roads" sub="Shared Turf road-reference geometry" checked={layers.roads} onChange={() => setLayers({ ...layers, roads: !layers.roads })} /><LayerToggle label="Wetland references" sub="Shared Turf environmental geometry" checked={layers.wetlands} onChange={() => setLayers({ ...layers, wetlands: !layers.wetlands })} /></div><div className="layer-group"><h3>NLA demo context <span>−</span></h3><LayerToggle label="Prototype coverage" sub="Kigali demonstration boundary" checked={layers.boundaries} onChange={() => setLayers({ ...layers, boundaries: !layers.boundaries })} /><LayerToggle label="Synthetic cadastral parcels" sub="128 non-sensitive demonstration records" checked={layers.parcels} onChange={() => setLayers({ ...layers, parcels: !layers.parcels })} /><LayerToggle label="Demo planning zone" sub="Illustrative classification only" checked={layers.zoning} onChange={() => setLayers({ ...layers, zoning: !layers.zoning })} /></div>
        {selected && <div className="selected-card"><div className="selected-head"><span>Selected parcel</span><button onClick={() => setSelected(undefined)}>×</button></div><h3>{selected.upi}</h3><dl><div><dt>District</dt><dd>{selected.district}</dd></div><div><dt>Sector</dt><dd>{selected.sector}</dd></div><div><dt>Area</dt><dd>{selected.area.toLocaleString()} m²</dd></div><div><dt>Land use</dt><dd>{selected.landUse}</dd></div><div><dt>Zoning</dt><dd>{selected.zoning}</dd></div><div><dt>Status</dt><dd><i />{selected.status}</dd></div></dl><button className="primary-button full" onClick={() => notify(`Parcel ${selected.upi} added to the analysis workspace`)}>Analyse parcel</button></div>}
      </> : <div className="rwanda-map-catalogue"><div className="catalogue-intro"><span><TreePine size={18} aria-hidden /></span><p><b>Rwanda online map library</b><small>Public web-map services curated for planning and environmental screening.</small></p></div><div className="catalogue-search-mini"><Search size={14} aria-hidden /><input aria-label="Search Rwanda online maps" value={catalogueQuery} onChange={(event) => setCatalogueQuery(event.target.value)} placeholder="Search forest, flood, roads…" /></div><select className="catalogue-category" aria-label="Filter Rwanda map category" value={catalogueCategory} onChange={(event) => setCatalogueCategory(event.target.value as typeof catalogueCategory)}><option>All</option>{RWANDA_MAP_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><div className="catalogue-disclaimer"><ShieldCheck size={15} aria-hidden /><p><b>Source-aware integration</b><small>“Public map service” is not treated as an open-data licence. Each layer shows its actual reuse status.</small></p></div><div className="online-layer-results"><p>{filteredOnlineLayers.length} available {filteredOnlineLayers.length === 1 ? "map" : "maps"}</p>{filteredOnlineLayers.map((layer) => { const active = onlineLayerIds.includes(layer.id); return <article className={active ? "active" : ""} key={layer.id} style={{ borderLeftColor: layer.accent }}><div className="online-layer-title"><span style={{ background: layer.accent }}><Layers3 size={14} aria-hidden /></span><p><b>{layer.title}</b><small>{layer.provider} · {layer.vintage}</small></p><button className={active ? "active" : ""} onClick={() => toggleOnlineLayer(layer.id)} aria-pressed={active}>{active ? "Added" : "Add"}</button></div><p>{layer.description}</p><div className="online-layer-meta"><span>{layer.category}</span><span>{layer.resolution}</span><span>{layer.licence}</span></div><a href={layer.sourceUrl} target="_blank" rel="noreferrer">Open source metadata <ExternalLink size={11} aria-hidden /></a></article>; })}</div></div>}
    </aside></div>;
}

function LayerToggle({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: () => void }) { return <label className="layer-toggle"><input type="checkbox" checked={checked} onChange={onChange} /><span className="toggle-ui" /><p><b>{label}</b><small>{sub}</small></p><i>••</i></label>; }

function ParcelsPage({ initialQuery, onAnalyse, notify }: { initialQuery?: string; onAnalyse: () => void; notify: (s: string) => void }) {
  const [query, setQuery] = useState(initialQuery ?? ""); const [district, setDistrict] = useState("All districts"); const [selected, setSelected] = useState<Parcel | null>(null); const [currentPage, setCurrentPage] = useState(1);
  const filtered = parcels.filter((p) => (district === "All districts" || p.district === district) && (`${p.upi} ${p.district} ${p.sector} ${p.landUse}`.toLowerCase().includes(query.toLowerCase())));
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageWindowStart = Math.min(Math.max(1, safePage - 2), Math.max(1, pageCount - 4));
  const visiblePageNumbers = Array.from({ length: Math.min(5, pageCount) }, (_, index) => pageWindowStart + index);
  return <div className="registry-layout"><section className="panel registry-panel"><div className="filters-row"><div className="field-search"><span>⌕</span><input aria-label="Search parcel registry" value={query} onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }} placeholder="Search UPI, sector or land use…" /></div><select aria-label="Filter parcels by district" value={district} onChange={(e) => { setDistrict(e.target.value); setCurrentPage(1); }}>{["All districts", "Gasabo", "Kicukiro", "Nyarugenge", "Musanze", "Huye", "Bugesera"].map((d) => <option key={d}>{d}</option>)}</select><button onClick={() => { setQuery(""); setDistrict("All districts"); setCurrentPage(1); }}>Clear filters</button><em>{filtered.length} records</em></div><div className="table-scroll"><table><thead><tr><th>UPI</th><th>Location</th><th>Area</th><th>Land use</th><th>Zoning</th><th>Status</th><th /></tr></thead><tbody>{visible.map((p) => <tr key={p.upi} onClick={() => setSelected(p)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(p); } }} tabIndex={0} role="button" aria-label={`Inspect parcel ${p.upi}`} className={selected?.upi === p.upi ? "row-selected" : ""}><td><b>{p.upi}</b></td><td>{p.district}<small>{p.sector} · {p.cell}</small></td><td>{p.area.toLocaleString()} m²</td><td><span className={`use-tag ${p.landUse.toLowerCase().replace(" ", "-")}`}>{p.landUse}</span></td><td>{p.zoning}</td><td><span className={`status-tag ${p.status === "Registered" ? "good" : "warning"}`}><i />{p.status}</span></td><td>›</td></tr>)}</tbody></table></div><div className="table-footer"><span>{filtered.length ? `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}` : "No matching parcels"}</span><div><button aria-label="Previous parcel page" disabled={safePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>←</button>{visiblePageNumbers.map((pageNumber) => <button key={pageNumber} className={pageNumber === safePage ? "active" : ""} aria-current={pageNumber === safePage ? "page" : undefined} onClick={() => setCurrentPage(pageNumber)}>{pageNumber}</button>)}<button aria-label="Next parcel page" disabled={safePage === pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>→</button></div></div></section>
    <aside className="parcel-inspector">{selected ? <><div className="inspector-map"><ParcelMap compact selected={selected} /></div><div className="inspector-content"><span className="eyebrow">Parcel intelligence</span><h2>{selected.upi}</h2><p>{selected.sector}, {selected.district}</p><dl><div><dt>Area</dt><dd>{selected.area.toLocaleString()} m²</dd></div><div><dt>Land use</dt><dd>{selected.landUse}</dd></div><div><dt>Zoning</dt><dd>{selected.zoning}</dd></div><div><dt>Nearest road</dt><dd>{selected.roadDistance} m</dd></div><div><dt>Wetland distance</dt><dd>{selected.wetlandDistance} m</dd></div><div><dt>Registration</dt><dd>{selected.status}</dd></div></dl><div className="assessment-note"><b>AI observation</b><p>No major spatial conflict was detected using currently available prototype layers.</p></div><button className="primary-button full" onClick={onAnalyse}>Analyse with GeoAI</button><button className="secondary-button full" onClick={() => notify("Parcel report draft created")}>Generate assessment report</button></div></> : <div className="empty-inspector"><span>PC</span><h3>Select a parcel</h3><p>Choose a row to view land information and spatial relationships.</p></div>}</aside></div>;
}

type AnalysisOperation = {
  name: string;
  icon: LucideIcon;
  functionName: string;
  parameterLabel: string;
  parameterUnit: string;
  defaultValue: number;
  source: "road" | "wetland" | "area" | "attribute" | "intersection";
};

const ANALYSIS_OPERATIONS: AnalysisOperation[] = [
  { name: "Buffer Analysis", icon: CircleDotDashed, functionName: "ST_Buffer", parameterLabel: "Buffer distance", parameterUnit: "metres", defaultValue: 100, source: "road" },
  { name: "Intersection Analysis", icon: Combine, functionName: "ST_Intersects", parameterLabel: "Search tolerance", parameterUnit: "metres", defaultValue: 120, source: "intersection" },
  { name: "Proximity Analysis", icon: Radar, functionName: "ST_DWithin", parameterLabel: "Maximum distance", parameterUnit: "metres", defaultValue: 150, source: "road" },
  { name: "Parcel Area Analysis", icon: ScanLine, functionName: "ST_Area", parameterLabel: "Minimum parcel area", parameterUnit: "m²", defaultValue: 3000, source: "area" },
  { name: "Land Use Analysis", icon: Tags, functionName: "Attribute_Filter", parameterLabel: "Minimum parcel area", parameterUnit: "m²", defaultValue: 0, source: "attribute" },
  { name: "Zoning Analysis", icon: LandPlot, functionName: "Zone_Filter", parameterLabel: "Minimum parcel area", parameterUnit: "m²", defaultValue: 0, source: "attribute" },
  { name: "Wetland Impact Analysis", icon: Waves, functionName: "ST_DWithin", parameterLabel: "Wetland distance", parameterUnit: "metres", defaultValue: 100, source: "wetland" },
  { name: "Road Impact Analysis", icon: Route, functionName: "ST_DWithin", parameterLabel: "Road buffer", parameterUnit: "metres", defaultValue: 100, source: "road" },
];

function downloadAnalysisCsv(matches: Parcel[], operation: string, metrics: Record<string, SpatialMetric>) {
  const rows = [["UPI", "District", "Sector", "Area_m2_Turf", "Land_use", "Zoning", "Road_distance_m_Turf", "Wetland_distance_m_Turf", "Centroid_EPSG32736_E", "Centroid_EPSG32736_N"], ...matches.map((parcel) => {
    const metric = metrics[parcel.upi];
    return [parcel.upi, parcel.district, parcel.sector, metric?.areaM2.toFixed(2) ?? parcel.area, parcel.landUse, parcel.zoning, metric?.roadDistanceM.toFixed(2) ?? "", metric?.wetlandDistanceM.toFixed(2) ?? "", metric?.centroidUtm36S[0].toFixed(2) ?? "", metric?.centroidUtm36S[1].toFixed(2) ?? ""];
  })];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${operation.toLowerCase().replaceAll(" ", "-")}-demo.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function AnalysisPage({ onOpenMap, notify }: { onOpenMap: (matches: Parcel[]) => void; notify: (s: string) => void }) {
  const [operation, setOperation] = useState(ANALYSIS_OPERATIONS[7]);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [road, setRoad] = useState("KN 5 Road");
  const [parameter, setParameter] = useState(operation.defaultValue);
  const [landUse, setLandUse] = useState<"All categories" | Parcel["landUse"]>("All categories");
  const [district, setDistrict] = useState("All districts");
  const [zoning, setZoning] = useState("All zones");
  const [matches, setMatches] = useState<Parcel[]>([]);
  const [metrics, setMetrics] = useState<Record<string, SpatialMetric>>({});

  function chooseOperation(next: AnalysisOperation) {
    setOperation(next);
    setParameter(next.defaultValue);
    setComplete(false);
    setMatches([]);
    setMetrics({});
  }

  function run(event: FormEvent) {
    event.preventDefault();
    setRunning(true);
    setComplete(false);
    const threshold = Math.max(0, Number(parameter) || 0);
    const result = analyzeParcels({ source: operation.source, threshold, road, district, landUse, zoning });
    window.setTimeout(() => {
      setMatches(result.matches);
      setMetrics(result.metrics);
      setRunning(false);
      setComplete(true);
      notify(`${operation.name} completed with ${result.matches.length} geometry matches`);
    }, 650);
  }

  const distanceFor = (parcel: Parcel) => operation.source === "wetland" ? metrics[parcel.upi]?.wetlandDistanceM ?? parcel.wetlandDistance : operation.source === "intersection" ? Math.max(metrics[parcel.upi]?.roadDistanceM ?? parcel.roadDistance, metrics[parcel.upi]?.wetlandDistanceM ?? parcel.wetlandDistance) : metrics[parcel.upi]?.roadDistanceM ?? parcel.roadDistance;
  const areaFor = (parcel: Parcel) => metrics[parcel.upi]?.areaM2 ?? parcel.area;
  const high = matches.filter((parcel) => operation.source === "area" || operation.source === "attribute" ? areaFor(parcel) >= 6000 : distanceFor(parcel) <= Math.max(1, parameter * .34)).length;
  const medium = matches.filter((parcel) => operation.source === "area" || operation.source === "attribute" ? areaFor(parcel) >= 3000 && areaFor(parcel) < 6000 : distanceFor(parcel) > parameter * .34 && distanceFor(parcel) <= parameter * .67).length;
  const low = Math.max(0, matches.length - high - medium);
  const totalArea = matches.reduce((sum, parcel) => sum + areaFor(parcel), 0);
  const dominantSector = matches.length ? [...new Set(matches.map((parcel) => parcel.sector))].sort((a, b) => matches.filter((parcel) => parcel.sector === b).length - matches.filter((parcel) => parcel.sector === a).length)[0] : "none";
  const context = operation.source === "road" ? `${operation.parameterLabel.toLowerCase()} ${parameter} ${operation.parameterUnit} from ${road}` : operation.source === "wetland" ? `within ${parameter} metres of the synthetic wetland reference` : operation.source === "intersection" ? `within ${parameter} metres of both road and wetland references` : operation.source === "area" ? `with area of at least ${parameter.toLocaleString()} m²` : `matching the selected land and zoning attributes`;
  const OperationIcon = operation.icon;

  return <div className="analysis-layout"><aside className="analysis-menu"><p>Analysis operations</p>{ANALYSIS_OPERATIONS.map((item) => { const Icon = item.icon; return <button key={item.name} className={operation.name === item.name ? "active" : ""} onClick={() => chooseOperation(item)}><span><Icon size={14} strokeWidth={1.9} aria-hidden /></span>{item.name}</button>; })}</aside><section className="analysis-content"><form className="panel analysis-form" onSubmit={run}><div className="operation-title"><span><OperationIcon size={19} aria-hidden /></span><div><p>Open geospatial engine</p><h2>{operation.name}</h2></div><em>Turf · {operation.functionName}</em></div><div className="form-grid">{(operation.source === "road" || operation.source === "intersection") && <label>Select road<select value={road} onChange={(event) => setRoad(event.target.value)}><option>KN 5 Road</option><option>KK 15 Road</option><option>NR 4 Corridor</option></select></label>}<label>{operation.parameterLabel}<div className="input-suffix"><input aria-label={operation.parameterLabel} type="number" min="0" max={operation.source === "area" || operation.source === "attribute" ? 10000 : 2500} value={parameter} onChange={(event) => setParameter(Number(event.target.value))} /><span>{operation.parameterUnit}</span></div></label><label>Land use<select value={landUse} onChange={(event) => setLandUse(event.target.value as typeof landUse)}><option>All categories</option><option>Agriculture</option><option>Residential</option><option>Commercial</option><option>Mixed Use</option><option>Conservation</option></select></label><label>District<select value={district} onChange={(event) => setDistrict(event.target.value)}><option>All districts</option><option>Gasabo</option><option>Kicukiro</option><option>Nyarugenge</option><option>Musanze</option><option>Huye</option><option>Bugesera</option></select></label><label>Zoning<select value={zoning} onChange={(event) => setZoning(event.target.value)}><option>All zones</option><option>R1</option><option>R2</option><option>R3</option><option>C1</option><option>AG</option><option>OS</option></select></label></div><div className="safe-query"><span><ShieldCheck size={17} aria-hidden /></span><p><b>Controlled spatial operation</b><small>Turf.js runs buffer, intersection, nearest-line and geodesic-area calculations on shared GeoJSON. <code>{operation.functionName}</code> names the production PostGIS equivalent; no SQL is generated or executed.</small></p></div><button className="primary-button run-button" type="submit" disabled={running}>{running ? <><LoaderCircle className="spin" size={16} aria-hidden />Running analysis…</> : <><Play size={16} fill="currentColor" aria-hidden />Run analysis</>}</button></form>
      {!complete && !running && <div className="analysis-empty"><span><Boxes size={29} aria-hidden /></span><h2>Configure and run the workflow</h2><p>Results are calculated from shared GeoJSON parcel, road and wetland geometry—not stored distance labels.</p><small>Turf.js geodesic operations · WGS84 · Proj4 UTM 36S output</small></div>}
      {running && <div className="analysis-empty running"><span><LoaderCircle className="spin" size={29} aria-hidden /></span><h2>Processing real geometry</h2><p>Applying Turf.js {operation.functionName} equivalent logic to the demonstration GeoJSON.</p></div>}
      {complete && <div className="analysis-results fresh"><div className="results-head"><div><span>Completed · Turf.js · EPSG:4326 → EPSG:32736</span><h2>{matches.length} {matches.length === 1 ? "parcel" : "parcels"} matched</h2><p>{operation.name}: {context} in {district === "All districts" ? "all demonstration districts" : district}.</p></div><div><button onClick={() => onOpenMap(matches)} disabled={!matches.length}><MapIcon size={14} aria-hidden />View map</button><button onClick={() => { downloadAnalysisCsv(matches, operation.name, metrics); notify("Analysis CSV downloaded with geometry metrics"); }} disabled={!matches.length}><Download size={14} aria-hidden />Export CSV</button></div></div><div className="impact-grid"><div><span>Geodesic matched area</span><b>{(totalArea / 10_000).toFixed(2)} ha</b><small>Across {matches.length} GeoJSON parcels</small></div><div className="high"><span>High priority</span><b>{high}</b><small>Closest or largest matches</small></div><div className="medium"><span>Medium priority</span><b>{medium}</b><small>Middle analysis band</small></div><div className="low"><span>Low priority</span><b>{low}</b><small>Remaining matches</small></div></div><div className="result-map-row"><div className="result-map"><ParcelMap compact selected={matches[0]} highlightedUpis={matches.map((parcel) => parcel.upi)} /><div className="result-upis">{matches.slice(0, 4).map((parcel) => <span key={parcel.upi}>{parcel.upi}</span>)}{matches.length > 4 && <em>+{matches.length - 4} more</em>}</div></div><div className="ai-summary"><span><Sparkles size={14} aria-hidden />NLA GeoAI summary</span><p>{matches.length ? `${matches.length} synthetic parcel geometries match this ${operation.name.toLowerCase()}, covering ${(totalArea / 10_000).toFixed(2)} geodesic hectares. The largest concentration is in ${dominantSector} Sector.` : `No synthetic parcel geometry matched the current ${operation.name.toLowerCase()} settings. Increase the distance or broaden the attribute filters and run it again.`}</p><div><b>Recommended next action</b><p>An authorized GIS or Land Use officer should verify source geometry and current official records before administrative use.</p></div><button disabled={!matches.length} onClick={() => { downloadSimplePdf(`${operation.name} Report`, `NLA-GEO-${Date.now().toString().slice(-6)}`); notify("GIS analysis PDF downloaded"); }}><FileDown size={14} aria-hidden />Generate PDF report</button></div></div></div>}
    </section></div>;
}

function CataloguePage({ notify }: { notify: (s: string) => void }) {
  const [query, setQuery] = useState(""); const [theme, setTheme] = useState("All themes"); const [scope, setScope] = useState<"all" | "recent" | "access">("all");
  const visible = datasets.filter((d) => (theme === "All themes" || d.theme === theme) && (scope !== "recent" || d.updated.endsWith("2026")) && (scope !== "access" || d.access !== "Restricted") && `${d.name} ${d.description} ${d.org}`.toLowerCase().includes(query.toLowerCase()));
  return <><section className="catalogue-search"><span>NS</span><div><h2>Find geospatial data</h2><p>Search metadata across connected prototype catalogue records.</p><form className="catalogue-input" onSubmit={(event) => { event.preventDefault(); notify(`${visible.length} NSDI dataset${visible.length === 1 ? "" : "s"} matched`); }}><span>⌕</span><input aria-label="Search NSDI datasets" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try “wetlands”, “roads” or “land use”…" /><button type="submit">Search</button></form></div></section><div className="catalogue-toolbar"><div><button className={scope === "all" ? "active" : ""} aria-pressed={scope === "all"} onClick={() => setScope("all")}>All datasets <span>{datasets.length}</span></button><button className={scope === "recent" ? "active" : ""} aria-pressed={scope === "recent"} onClick={() => setScope("recent")}>Recently updated</button><button className={scope === "access" ? "active" : ""} aria-pressed={scope === "access"} onClick={() => setScope("access")}>My access</button></div><select aria-label="Filter datasets by theme" value={theme} onChange={(e) => setTheme(e.target.value)}><option>All themes</option>{[...new Set(datasets.map((d) => d.theme))].map((t) => <option key={t}>{t}</option>)}</select></div><section className="dataset-grid">{visible.map((d, i) => <article className="dataset-card" key={d.name}><div className={`dataset-preview preview-${i % 4}`}><span>{d.theme.toUpperCase()}</span><i /><i /><i /></div><div className="dataset-body"><div className="dataset-meta"><span>{d.access}</span><em>{d.updated}</em></div><h2>{d.name}</h2><p>{d.description}</p><dl><div><dt>Organization</dt><dd>{d.org}</dd></div><div><dt>Coverage</dt><dd>{d.coverage}</dd></div><div><dt>Resolution</dt><dd>{d.resolution}</dd></div><div><dt>CRS</dt><dd>{d.crs}</dd></div></dl><div className="dataset-foot"><b>{d.format}</b><button onClick={() => notify(`${d.name} metadata opened: ${d.format}, ${d.crs}, ${d.access} access`)}>View metadata →</button></div></div></article>)}{!visible.length && <div className="catalogue-empty"><Search size={22} aria-hidden /><h3>No matching datasets</h3><button onClick={() => { setQuery(""); setTheme("All themes"); setScope("all"); }}>Clear catalogue filters</button></div>}</section></>;
}

function KnowledgePage({ notify }: { notify: (s: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const matches = useMemo(() => searchOfficialDocuments(query, category), [query, category]);
  const issuers = new Set(OFFICIAL_DOCUMENTS.map((document) => document.issuer)).size;

  return <div className="knowledge-layout">
    <section>
      <div className="knowledge-search">
        <span><BookOpen size={18} aria-hidden /></span>
        <div><h2>Search Rwanda&apos;s official-source document library</h2><p>Find NLA laws, manuals, plans and reports together with related environment, forestry and water publications.</p></div>
        <form onSubmit={(event) => event.preventDefault()}>
          <Search size={17} aria-hidden />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try land law, subdivision, zoning, wetland or surveying…" aria-label="Search official documents" />
          {query && <button type="button" className="knowledge-clear" onClick={() => setQuery("")} aria-label="Clear document search">Clear</button>}
        </form>
      </div>

      <div className="knowledge-stats" aria-label="Document library summary">
        <article><FileText size={18} aria-hidden /><span><b>{OFFICIAL_DOCUMENTS.length}</b><small>Publications</small></span></article>
        <article><ShieldCheck size={18} aria-hidden /><span><b>{issuers}</b><small>Official issuers</small></span></article>
        <article><Search size={18} aria-hidden /><span><b>{matches.length}</b><small>Current matches</small></span></article>
      </div>

      <div className="document-toolbar panel">
        <div className="document-categories" aria-label="Document category filters">
          {DOCUMENT_CATEGORIES.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <p><ShieldCheck size={15} aria-hidden /> Metadata verified against public institutional publication pages. PDFs open on the issuing organisation&apos;s website.</p>
      </div>

      {query && <div className="knowledge-answer">
        <div className="answer-label"><span><Sparkles size={15} aria-hidden /></span><p><b>NLA document search</b><small>{matches.length} metadata match{matches.length === 1 ? "" : "es"} for “{query}”</small></p></div>
        <p>{matches.length ? `The strongest matches are ${matches.slice(0, 3).map((document) => `${document.title} (${document.year})`).join(", ")}. Open the original PDF for the complete wording, maps, tables and appendices.` : "No exact metadata match was found. Try a broader term such as land, surveying, zoning, environment, forestry or water."}</p>
        <div className="answer-warning"><b>Source boundary</b><span>This demo searches curated metadata, not the full text of every PDF. Legal applicability and later amendments must be confirmed with the Official Gazette or issuing institution.</span></div>
      </div>}

      <div className="document-list panel">
        <PanelHeader title="Authoritative publications" detail={`${matches.length} of ${OFFICIAL_DOCUMENTS.length} documents`} action="Source policy" onAction={() => notify("Only official institutional sources are included in this library")} />
        <div className="document-grid">
          {matches.map((document) => <article className="document-card" key={document.id}>
            <div className="document-card-top">
              <span className="document-icon"><FileText size={20} aria-hidden /></span>
              <div><p>{document.category}</p><h3>{document.title}</h3></div>
              {document.featured && <em>Featured</em>}
            </div>
            <p className="document-description">{document.description}</p>
            <div className="document-tags">{document.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
            <dl>
              <div><dt>Issuer</dt><dd>{document.issuer}</dd></div>
              <div><dt>Published</dt><dd>{document.year}</dd></div>
              <div><dt>Language</dt><dd>{document.language}</dd></div>
              <div><dt>Status</dt><dd>{document.legalInstrument ? "Official instrument" : "Official publication"}</dd></div>
            </dl>
            <div className="document-actions">
              <a className="document-open" href={document.pdfUrl} target="_blank" rel="noreferrer"><FileText size={15} aria-hidden />Open PDF<ExternalLink size={13} aria-hidden /></a>
              <a href={document.sourceUrl} target="_blank" rel="noreferrer">View source<ExternalLink size={13} aria-hidden /></a>
            </div>
          </article>)}
        </div>
        {!matches.length && <div className="document-empty"><Search size={24} aria-hidden /><h3>No matching publications</h3><p>Clear the search or select another category.</p><button onClick={() => { setQuery(""); setCategory("All categories"); }}>Show all documents</button></div>}
      </div>
    </section>

    <aside className="upload-card document-source-card">
      <span><ShieldCheck size={21} aria-hidden /></span>
      <h3>Curated official sources</h3>
      <p>This catalogue links to documents published by NLA, the Ministry of Environment, REMA and Rwanda Water Resources Board.</p>
      <a href="https://www.lands.rw/publications" target="_blank" rel="noreferrer">Browse NLA publications<ExternalLink size={13} aria-hidden /></a>
      <hr />
      <h3>Catalogue status</h3>
      <div><p><span>Metadata search</span><b>Ready</b></p><p><span>External PDFs</span><b>{OFFICIAL_DOCUMENTS.length}</b></p><p><span>Full-text embedding</span><b>Not claimed</b></p></div>
      <div className="source-caution"><ShieldCheck size={15} aria-hidden /><p><b>Always verify currency</b><small>A public PDF can be amended, replaced or repealed. Confirm legal and operational use with the latest official source.</small></p></div>
    </aside>
  </div>;
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
  const [creating, setCreating] = useState<string | null>(null);
  return <div className="reports-layout"><section><div className="report-types">{["Parcel Assessment", "Road Impact", "Land Use Analysis", "Wetland Impact", "GIS Analysis", "NSDI Dataset"].map((type, i) => <button key={type} onClick={() => setCreating(type)}><span>{["PC", "RD", "LU", "WT", "GA", "NS"][i]}</span><b>{type}</b><small>Create traceable report</small><i>＋</i></button>)}</div><div className="panel report-list"><PanelHeader title="Recent reports" detail="Generated from prototype analyses" /><table><thead><tr><th>Report</th><th>Type</th><th>Prepared by</th><th>Date</th><th>Status</th><th /></tr></thead><tbody>{reports.map((r) => <tr key={r.id}><td><b>{r.title}</b><small>{r.id}</small></td><td>{r.type}</td><td>{r.author}</td><td>{r.date}</td><td><span className={`status-tag ${r.status === "Ready" ? "good" : "warning"}`}><i />{r.status}</span></td><td><button onClick={() => { downloadSimplePdf(r.title, r.id); notify("PDF report downloaded"); }}>Download PDF</button></td></tr>)}</tbody></table></div></section><aside className="report-preview"><div className="paper"><div className="paper-head"><Image className="paper-logo" src="/nla-logo.png" alt="National Land Authority" width={1043} height={541} /><em>PROTOTYPE</em></div><p>PARCEL ASSESSMENT REPORT</p><h2>1/02/03/04/0012</h2><div className="paper-meta"><span>Report no.<b>NLA-GEO-2026-083</b></span><span>Prepared by<b>Aline Uwase</b></span><span>Date<b>10 Aug 2026</b></span></div><div className="paper-map"><ParcelMap compact selected={parcels[0]} /></div><h3>Analysis summary</h3><p className="paper-copy">No major spatial conflict was detected using currently available prototype layers. The parcel is zoned R2 and is approximately 84 m from the nearest mapped road.</p><div className="paper-disclaimer">AI-generated decision-support information. Final decisions require verification and approval by an authorized NLA officer.</div></div></aside>{creating && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-label="Create report"><button className="modal-close" onClick={() => setCreating(null)} aria-label="Close report creator">×</button><span className="modal-mark">RP</span><h2>Create assessment report</h2><p>Generate a traceable PDF from the selected synthetic parcel and GIS findings.</p><label>Report type<select value={creating} onChange={(event) => setCreating(event.target.value)}>{["Parcel Assessment", "Road Impact", "Land Use Analysis", "Wetland Impact", "GIS Analysis", "NSDI Dataset"].map((type) => <option key={type}>{type}</option>)}</select></label><label>Parcel UPI<input defaultValue="1/02/03/04/0012" /></label><label>Purpose<textarea defaultValue="Prototype parcel screening and decision support" /></label><div className="safe-query"><span>◆</span><p><b>Mandatory disclaimer included</b><small>All AI-generated findings will be marked for authorized officer verification.</small></p></div><button className="primary-button full" onClick={() => { const reportType = creating; setCreating(null); downloadSimplePdf(`${reportType} Report`, `NLA-GEO-${Date.now().toString().slice(-6)}`); notify(`${reportType} PDF generated`); }}>Generate PDF report</button></div></div>}</div>;
}

function CorsPage({ notify }: { notify: (s: string) => void }) {
  const [incidentOpen, setIncidentOpen] = useState(false);
  return <><div className="cors-banner"><div><span>GN</span><p><b>Simulated telemetry only</b><small>This prototype is not connected to the real Rwanda GeoNet system.</small></p></div><time>Last refresh · 19:42:10 CAT</time></div><section className="cors-summary"><article><span>●</span><b>3</b><p>Stations online</p></article><article className="warn"><span>●</span><b>1</b><p>Station warning</p></article><article className="off"><span>●</span><b>1</b><p>Station offline</p></article><article><span>◎</span><b>15.5</b><p>Avg. satellites</p></article><article><span>↯</span><b>87 ms</b><p>Network latency</p></article></section><section className="cors-grid">{corsStations.map((s) => <article className={`station-card ${s.status.toLowerCase()}`} key={s.code}><div className="station-head"><div><span>{s.code}</span><p><b>{s.name}</b><small>{s.location}</small></p></div><em><i />{s.status}</em></div><div className="signal-bars"><i /><i /><i /><i /><i /></div><dl><div><dt>Satellites</dt><dd>{s.satellites || "—"}</dd></div><div><dt>Latency</dt><dd>{s.latency ? `${s.latency} ms` : "—"}</dd></div><div><dt>Data stream</dt><dd>{s.stream}</dd></div><div><dt>Last observation</dt><dd>{s.observed}</dd></div><div><dt>Power</dt><dd>{s.power}</dd></div></dl></article>)}</section><section className="anomaly-panel"><span>✦</span><div><p>GEOAI ANOMALY SUMMARY</p><h2>MUSN station requires attention</h2><span>MUSN has experienced increasing network latency during the last 45 minutes. RUSZ has been offline for 46 minutes with a simulated battery alert. A CORS engineer should verify network and power conditions.</span></div><button aria-expanded={incidentOpen} onClick={() => { setIncidentOpen((open) => !open); notify(incidentOpen ? "Incident details closed" : "Simulated CORS incident details opened"); }}>{incidentOpen ? "Close incident view" : "Open incident view →"}</button></section>{incidentOpen && <section className="panel incident-detail" aria-live="polite"><div><span>MUSN</span><p><b>High latency warning</b><small>286 ms · first observed 45 minutes ago</small></p><em>Needs engineer review</em></div><div><span>RUSZ</span><p><b>Offline station</b><small>No stream · battery alert · last observation 46 minutes ago</small></p><em>Escalate power check</em></div><p><ShieldCheck size={15} aria-hidden /> This is a simulated incident workflow. No ticket or real GeoNet action has been created.</p></section>}</>;
}

function SatellitePage({ notify }: { notify: (s: string) => void }) { return <div className="satellite-layout"><section className="satellite-hero"><div className="sat-image before"><span>12 MAY 2026</span><i /><i /><i /></div><div className="sat-scan">→</div><div className="sat-image after"><span>02 AUG 2026</span><i /><i /><i /><b>+ 14</b></div><div className="sat-overlay"><span>FUTURE MODULE · MOCK RESULTS</span><h2>From imagery to officer-reviewed parcel insight</h2><p>Compare two dates, detect meaningful change, intersect results with cadastral parcels and route findings for human review.</p></div></section><section className="workflow"><div><span>01</span><b>Satellite imagery</b><small>Select two observation dates</small></div><i>→</i><div><span>02</span><b>Computer vision</b><small>Detect candidate change</small></div><i>→</i><div><span>03</span><b>GIS intersection</b><small>Identify affected parcels</small></div><i>→</i><div><span>04</span><b>Officer review</b><small>Verify before action</small></div></section><section className="change-grid"><article><span>NB</span><b>14</b><h3>New buildings</h3><p>Candidate structures detected</p></article><article><span>VL</span><b>2.8 ha</b><h3>Vegetation loss</h3><p>Change above demo threshold</p></article><article><span>WE</span><b>3</b><h3>Wetland alerts</h3><p>Potential encroachment candidates</p></article><article><span>RD</span><b>1.4 km</b><h3>Road development</h3><p>New linear feature detected</p></article></section><button className="primary-button satellite-cta" onClick={() => notify("Mock change-detection review started")}>Run demonstration comparison</button></div>; }

function AuditPage({ notify }: { notify: (s: string) => void }) {
  const [filter, setFilter] = useState("");
  const [action, setAction] = useState("All actions");
  const events = auditEvents.filter((event) => (action === "All actions" || event.action === action) && `${event.user} ${event.action} ${event.module} ${event.target}`.toLowerCase().includes(filter.toLowerCase()));
  function exportAuditLog() {
    const rows = [["Time", "Date", "User", "Action", "Module", "Target", "Result"], ...events.map((event) => [event.time, "10 Aug 2026", event.user, event.action, event.module, event.target, event.result])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "nla-geoai-audit-log-demo.csv"; anchor.click(); URL.revokeObjectURL(url);
    notify(`${events.length} audit event${events.length === 1 ? "" : "s"} exported`);
  }
  return <section className="panel audit-panel"><div className="audit-tools"><div className="field-search"><span>⌕</span><input aria-label="Search audit events" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search user, action or module…" /></div><select aria-label="Filter audit events by action" value={action} onChange={(event) => setAction(event.target.value)}><option>All actions</option>{[...new Set(auditEvents.map((event) => event.action))].map((eventAction) => <option key={eventAction}>{eventAction}</option>)}</select><select aria-label="Audit date range" defaultValue="Today"><option>Today</option><option>Last 7 days</option></select><button onClick={exportAuditLog} disabled={!events.length}>Export audit log</button></div><div className="audit-timeline">{events.map((e) => <div className="audit-event" key={`${e.time}-${e.action}`}><time>{e.time}<small>10 Aug 2026</small></time><span className={e.result === "Blocked" ? "blocked" : ""}>{e.result === "Blocked" ? "!" : "✓"}</span><div><b>{e.action}</b><p>{e.target}</p><small>{e.user} · {e.module} · IP retained securely</small></div><em className={e.result === "Blocked" ? "bad" : "good"}>{e.result}</em></div>)}{!events.length && <div className="audit-empty">No audit events match the current filters.</div>}</div></section>;
}

function AdminPage({ notify, onOpenAssistant }: { notify: (s: string) => void; onOpenAssistant: () => void }) { return <div className="admin-layout"><section className="admin-summary"><article><span>US</span><div><b>71</b><p>Demonstration users</p></div><em>Prototype data</em></article><article><span>RL</span><div><b>9</b><p>Defined roles</p></div><em>UI policy demo</em></article><article><span>KY</span><div><b>0</b><p>Required AI keys</p></div><em>Local inference</em></article></section><section className="panel roles-panel"><PanelHeader title="Roles and access" detail="Prototype role-based permissions" action="Add role" onAction={() => notify("Role creation is shown as a policy concept; no account is changed in this demo")} /><div className="role-grid">{roles.map((r) => <button key={r.name} onClick={() => notify(`${r.name}: ${r.scope}`)}><span>{r.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span><div><b>{r.name}</b><small>{r.scope}</small></div><em>{r.users} users</em><i>›</i></button>)}</div></section><section className="admin-cards"><article className="panel"><PanelHeader title="AI runtime" detail="No-key browser integration" /><div className="provider"><span>✦</span><p><b>NLA Local GeoAI</b><small>Transformers.js · quantized WASM model</small></p><em>On demand</em></div><button className="secondary-button full" onClick={onOpenAssistant}>Open NLA GeoAI to enable</button></article><article className="panel"><PanelHeader title="Data connectors" detail="Current demonstration state" /><ContextItem mark="OS" title="OpenStreetMap" meta="Photon · Overpass · open tiles" status="Live" /><ContextItem mark="LA" title="LAIS connector" meta="No official connection" status="Demo only" /><ContextItem mark="PG" title="PostGIS" meta="Production migration target" status="Not configured" /></article><article className="panel"><PanelHeader title="Security boundaries" detail="Functional demo safeguards" /><div className="security-list"><p><span>✓</span>No unrestricted spatial SQL</p><p><span>✓</span>No AI provider key required</p><p><span>✓</span>Local GeoJSON import stays in-browser</p><p><span>✓</span>Official LAIS data is not represented</p><p><span>✓</span>HTTPS-ready Vercel deployment</p></div></article></section></div>; }

function HealthPage() {
  const [health, setHealth] = useState<{ checkedAt: string; services: { id: string; name: string; status: "Available" | "Unavailable"; latencyMs: number | null; detail: string }[]; engines: { name: string; detail: string; status: string }[] } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/system/health", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Health endpoint unavailable")))
      .then(setHealth)
      .catch(() => setHealth(null));
    return () => controller.abort();
  }, []);

  const localServices = [
    { name: "Turf.js spatial engine", status: "Available", detail: "Real browser-side buffer, intersection, distance and area", latency: "Local" },
    { name: "Proj4js CRS engine", status: "Available", detail: "WGS84 to Rwanda UTM zone 36S", latency: "Local" },
    { name: "Leaflet + MapLibre", status: "Available", detail: "Interactive 2D and 3D mapping", latency: "Local" },
    { name: "NLA Local GeoAI", status: "On demand", detail: "No-key Transformers.js browser inference", latency: "WASM" },
    { name: "LAIS connector", status: "Not configured", detail: "No official land registry connection in this demo", latency: "—" },
  ];
  const liveServices = health?.services.map((service) => ({ name: service.name, status: service.status, detail: service.detail, latency: service.latencyMs === null ? "—" : `${service.latencyMs} ms` })) ?? [
    { name: "Open mapping services", status: "Checking", detail: "Verifying Photon, Overpass and OpenFreeMap", latency: "…" },
  ];
  const services = [...localServices, ...liveServices];
  const available = services.filter((service) => service.status === "Available" || service.status === "On demand").length;
  return <div className="health-layout"><section className="health-hero"><div className="health-ring"><span>{available}/{services.length}</span><small>capabilities ready</small></div><div><span className="eyebrow">Open-stack observability</span><h2>Functional geospatial demo</h2><p>Local engines are verified by the application. External OpenStreetMap services are checked live; official LAIS and production PostGIS connections are intentionally not claimed.</p><time>{health ? `Last checked · ${new Date(health.checkedAt).toLocaleString("en-RW", { timeZone: "Africa/Kigali", dateStyle: "medium", timeStyle: "short" })}` : "Checking external open services…"}</time></div></section><section className="service-grid">{services.map((service) => <article key={service.name}><div><span className={service.status === "Available" ? "available" : service.status === "On demand" || service.status === "Checking" ? "warning" : "unavailable"}><i />{service.status}</span><em>{service.latency}</em></div><h3>{service.name}</h3><p>{service.detail}</p><div className="sparkline">{[4, 7, 5, 8, 6, 9, 7, 10, 8, 9].map((height, index) => <i key={index} style={{ height: `${height * 3}px` }} />)}</div></article>)}</section><section className="deployment-panel"><span>VC</span><div><p>VERCEL DEPLOYMENT</p><h2>One deployable Next.js application</h2><span>Browser GIS and AI engines work without provider keys; server routes proxy and monitor public open-data services.</span></div><em>Build ready</em></section></div>;
}
