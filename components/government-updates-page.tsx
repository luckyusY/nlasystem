"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Building2, ExternalLink, Globe2, LandPlot, LoaderCircle, Newspaper, Radio, Search, ShieldCheck, Sparkles } from "lucide-react";
import {
  GOVERNMENT_UPDATE_CATEGORIES,
  OFFICIAL_UPDATE_HUBS,
  RWANDA_GOVERNMENT_SOCIAL_ACCOUNTS,
  SOCIAL_ACCOUNT_VERIFIED_AT,
  type GovernmentSocialAccount,
  type GovernmentUpdateCategory,
} from "@/lib/rwanda-government-social";

type XWidgetWindow = Window & {
  twttr?: {
    widgets?: {
      load: (element?: HTMLElement) => Promise<unknown> | void;
    };
  };
};

type FeedStatus = "private" | "loading" | "ready" | "unavailable";

function profileUrl(account: GovernmentSocialAccount) {
  return `https://x.com/${account.handle}`;
}

export default function GovernmentUpdatesPage({ notify }: { notify: (message: string) => void }) {
  const reduceMotion = useReducedMotion();
  const [category, setCategory] = useState<GovernmentUpdateCategory>("All channels");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("nla");
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>("private");
  const feedRef = useRef<HTMLDivElement>(null);

  const selected = RWANDA_GOVERNMENT_SOCIAL_ACCOUNTS.find((account) => account.id === selectedId) ?? RWANDA_GOVERNMENT_SOCIAL_ACCOUNTS[0];
  const featured = RWANDA_GOVERNMENT_SOCIAL_ACCOUNTS.filter((account) => account.featured);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return RWANDA_GOVERNMENT_SOCIAL_ACCOUNTS.filter((account) => {
      const inCategory = category === "All channels" || account.categories.includes(category);
      const searchable = `${account.name} ${account.shortName} ${account.handle} ${account.description} ${account.categories.join(" ")}`.toLowerCase();
      return inCategory && (!needle || searchable.includes(needle));
    });
  }, [category, query]);

  useEffect(() => {
    if (!liveEnabled || !feedRef.current) return;
    const holder = feedRef.current;
    let cancelled = false;
    let timeoutId = 0;
    setFeedStatus("loading");
    holder.replaceChildren();

    const timeline = document.createElement("a");
    timeline.className = "twitter-timeline";
    timeline.href = `https://twitter.com/${selected.handle}?ref_src=twsrc%5Etfw`;
    timeline.dataset.height = "620";
    timeline.dataset.dnt = "true";
    timeline.dataset.chrome = "noheader nofooter transparent";
    timeline.textContent = `Open posts from @${selected.handle}`;
    holder.appendChild(timeline);

    const markResult = () => {
      if (cancelled) return;
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setFeedStatus(holder.querySelector("iframe") ? "ready" : "unavailable");
      }, 2200);
    };

    const loadWidget = () => {
      const widgets = (window as XWidgetWindow).twttr?.widgets;
      if (!widgets) {
        markResult();
        return;
      }
      Promise.resolve(widgets.load(holder)).then(markResult).catch(() => !cancelled && setFeedStatus("unavailable"));
    };

    const existing = document.getElementById("x-wjs") as HTMLScriptElement | null;
    if (existing) {
      if ((window as XWidgetWindow).twttr?.widgets) loadWidget();
      else existing.addEventListener("load", loadWidget, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = "x-wjs";
      script.async = true;
      script.src = "https://platform.twitter.com/widgets.js";
      script.addEventListener("load", loadWidget, { once: true });
      script.addEventListener("error", () => !cancelled && setFeedStatus("unavailable"), { once: true });
      document.body.appendChild(script);
    }

    timeoutId = window.setTimeout(() => {
      if (!cancelled && !holder.querySelector("iframe")) setFeedStatus("unavailable");
    }, 9000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      existing?.removeEventListener("load", loadWidget);
    };
  }, [liveEnabled, selected.handle]);

  function chooseAccount(account: GovernmentSocialAccount) {
    setSelectedId(account.id);
    notify(`${account.shortName} selected for the live public feed`);
  }

  return <div className="government-updates-page">
    <section className="updates-radar panel">
      <div className="updates-radar-copy">
        <span><Radio size={24} aria-hidden /></span>
        <div><p>Rwanda public-information radar</p><h2>One place to watch land decisions and the systems around them</h2><span>Follow official land, environment, planning, water, energy, roads, agriculture and leadership channels without a paid social-media API.</span></div>
      </div>
      <div className="updates-radar-metrics" aria-label="Government update coverage">
        <article><b>{RWANDA_GOVERNMENT_SOCIAL_ACCOUNTS.length}</b><span>official channels</span></article>
        <article><b>{GOVERNMENT_UPDATE_CATEGORIES.length - 1}</b><span>public sectors</span></article>
        <article><b>0</b><span>API keys required</span></article>
      </div>
    </section>

    <section className="updates-featured" aria-labelledby="priority-channels-title">
      <div className="updates-section-heading"><div><p>Priority watchlist</p><h2 id="priority-channels-title">Land intelligence starts with connected institutions</h2></div><small>Official profiles verified {SOCIAL_ACCOUNT_VERIFIED_AT}</small></div>
      <div className="updates-featured-track">
        {featured.map((account) => <motion.button
          key={account.id}
          type="button"
          className={selected.id === account.id ? "active" : ""}
          onClick={() => chooseAccount(account)}
          aria-pressed={selected.id === account.id}
          whileHover={reduceMotion ? undefined : { y: -4, rotateX: 2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          style={{ "--channel-accent": account.accent } as CSSProperties}
        >
          <span>{account.shortName.slice(0, 3)}</span><p><b>{account.shortName}</b><small>@{account.handle}</small></p><i>{selected.id === account.id ? "Watching" : "Watch"}</i>
        </motion.button>)}
      </div>
    </section>

    <section className="updates-primary-grid">
      <article className="updates-live panel">
        <header>
          <div className="updates-account-avatar" style={{ background: selected.accent }}>{selected.shortName.slice(0, 3)}</div>
          <div><span><BadgeCheck size={14} aria-hidden /> Official-site confirmed</span><h2>{selected.name}</h2><p>@{selected.handle}</p></div>
          <a href={profileUrl(selected)} target="_blank" rel="noreferrer">Open on X <ExternalLink size={13} aria-hidden /></a>
        </header>
        <div className="updates-live-context"><LandPlot size={16} aria-hidden /><p><b>Why this matters</b><span>{selected.description}</span></p></div>
        {!liveEnabled && <div className="updates-consent">
          <span><Radio size={27} aria-hidden /></span><h3>Load the live public timeline</h3><p>The directory works without tracking. Loading the timeline contacts X and may set third-party cookies under X’s policies.</p>
          <button type="button" onClick={() => { setLiveEnabled(true); setFeedStatus("loading"); }}><Sparkles size={15} aria-hidden /> Load @{selected.handle} posts</button>
          <a href={profileUrl(selected)} target="_blank" rel="noreferrer">Open the profile instead <ExternalLink size={12} aria-hidden /></a>
        </div>}
        {liveEnabled && <div className={`updates-feed-shell status-${feedStatus}`}>
          <div className="updates-feed-status" role="status" aria-live="polite">
            {feedStatus === "loading" && <><LoaderCircle className="spin" size={15} aria-hidden /> Loading public posts…</>}
            {feedStatus === "ready" && <><BadgeCheck size={15} aria-hidden /> Live public timeline loaded</>}
            {feedStatus === "unavailable" && <><ShieldCheck size={15} aria-hidden /> X did not return an embeddable timeline. Official links remain available below.</>}
          </div>
          <div ref={feedRef} className="updates-x-widget" />
          {feedStatus === "unavailable" && <div className="updates-feed-fallback"><p>Browser privacy settings, network filters or X availability can block public embeds.</p><a href={profileUrl(selected)} target="_blank" rel="noreferrer">Read @{selected.handle} on X <ExternalLink size={12} aria-hidden /></a><a href={selected.websiteUrl} target="_blank" rel="noreferrer">Open official website <Globe2 size={12} aria-hidden /></a></div>}
        </div>}
      </article>

      <aside className="updates-hubs panel">
        <header><span><Newspaper size={18} aria-hidden /></span><div><p>Resilient fallback</p><h2>Official update hubs</h2></div></header>
        <p className="updates-hubs-intro">These institution-owned newsrooms remain useful when a social platform is unavailable or requires sign-in.</p>
        <div>{OFFICIAL_UPDATE_HUBS.map((hub) => <a href={hub.url} target="_blank" rel="noreferrer" key={hub.name}><span>{hub.category}</span><p><b>{hub.name}</b><small>{hub.detail}</small></p><ExternalLink size={14} aria-hidden /></a>)}</div>
      </aside>
    </section>

    <section className="updates-directory panel" aria-labelledby="official-directory-title">
      <div className="updates-directory-head">
        <div><p>Verified directory</p><h2 id="official-directory-title">Official public channels</h2><span>Search by institution, service, handle or topic.</span></div>
        <label><Search size={16} aria-hidden /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search land, water, roads, climate…" aria-label="Search official public channels" /></label>
      </div>
      <div className="updates-category-tabs" role="group" aria-label="Filter public channels by sector">
        {GOVERNMENT_UPDATE_CATEGORIES.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)} aria-pressed={category === item}>{item}</button>)}
      </div>
      <div className="updates-result-count" aria-live="polite"><b>{filtered.length}</b> verified channel{filtered.length === 1 ? "" : "s"} shown</div>
      <div className="updates-account-grid">
        {filtered.map((account) => <motion.article key={account.id} whileHover={reduceMotion ? undefined : { y: -4, rotateX: 1 }} style={{ "--channel-accent": account.accent } as CSSProperties}>
          <header><span>{account.shortName.slice(0, 3)}</span><div><h3>{account.name}</h3><p>@{account.handle}</p></div><BadgeCheck size={17} aria-label="Official-site confirmed account" /></header>
          <p>{account.description}</p>
          <div className="updates-account-tags">{account.categories.map((item) => <span key={item}>{item}</span>)}</div>
          <footer><button type="button" onClick={() => chooseAccount(account)}><Radio size={13} aria-hidden /> Watch here</button><a href={profileUrl(account)} target="_blank" rel="noreferrer" aria-label={`Open ${account.name} on X`}>X profile <ExternalLink size={11} aria-hidden /></a><a href={account.officialSourceUrl} target="_blank" rel="noreferrer" aria-label={`Verify ${account.name} through its official website`}>Verify <ShieldCheck size={11} aria-hidden /></a></footer>
        </motion.article>)}
      </div>
      {!filtered.length && <div className="updates-empty"><Search size={23} aria-hidden /><h3>No channels match this filter</h3><p>Try another sector or clear the search phrase.</p><button type="button" onClick={() => { setCategory("All channels"); setQuery(""); }}>Show every channel</button></div>}
    </section>

    <section className="updates-boundary">
      <ShieldCheck size={19} aria-hidden />
      <div><b>Public communication is an early-warning signal, not a legal record</b><p>A post can point an officer to a policy, outage, project or field event. Confirm land rights in authorized NLA systems, laws in the Official Gazette, service status with the institution, and technical claims against the original publication.</p></div>
      <Building2 size={19} aria-hidden />
    </section>
  </div>;
}
