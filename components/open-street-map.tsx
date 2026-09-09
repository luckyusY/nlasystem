"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { LayerGroup, Map as LeafletMap, TileLayer } from "leaflet";
import type { GeoJsonObject } from "geojson";
import { Box, Download, Eraser, Expand, LocateFixed, Map, MapPinned, MousePointer2, Ruler, ScanLine, Upload } from "lucide-react";
import { parcels, type Parcel } from "@/lib/data";
import { calculatePolygonArea, getReferenceLayers, KIGALI_CENTER_LATLNG, parseRwandaCoordinate, parcelCenterLatLng, parcelRingLatLng, RWANDA_BOUNDS, toUtm36S } from "@/lib/geospatial-engine";
import { findRwandaOnlineLayer } from "@/lib/rwanda-map-catalog";
import { createArcGisDynamicLayer } from "@/lib/arcgis-tile-layer";
import { RWANDA_VIEW_BOUNDS } from "@/lib/rwanda-extent";
import { fetchWithTimeout } from "@/lib/network";

const ThreeDMap = dynamic(() => import("@/components/three-d-map"), { ssr: false, loading: () => <div className="three-d-map-loading"><Box size={20} aria-hidden />Loading the 3D engine…</div> });

export type MapLayerVisibility = {
  parcels: boolean;
  osmPlaces: boolean;
  roads: boolean;
  wetlands: boolean;
  zoning: boolean;
  boundaries: boolean;
};

type OpenStreetMapProps = {
  compact?: boolean;
  selected?: Parcel;
  onSelect?: (parcel: Parcel) => void;
  onClearSelection?: () => void;
  onNotify?: (message: string) => void;
  visibleLayers?: Partial<MapLayerVisibility>;
  highlightedUpis?: string[];
  onlineLayerIds?: string[];
  onlineLayerOpacity?: number;
  basemap?: BasemapKey;
  onBasemapChange?: (basemap: BasemapKey) => void;
  onLayerStatusChange?: (id: string, status: MapServiceStatus) => void;
  analysisFeatures?: GeoJsonObject;
  analysisLabelProperty?: string;
  analysisColour?: string;
  referencePosition?: { lat: number; lon: number; label: string };
};

export type BasemapKey = "street" | "humanitarian" | "topographic" | "light" | "dark" | "satellite" | "daily";

/**
 * NASA GIBS publishes one true-colour mosaic per day, so a hard-coded date goes stale and
 * eventually 404s. Ask for a recent complete UTC day instead and let Leaflet substitute it.
 */
export function recentImageryDate(daysBack = 2) {
  const day = new Date(Date.now() - daysBack * 86_400_000);
  return day.toISOString().slice(0, 10);
}
export type MapServiceStatus = "loading" | "ready" | "error";
type MapTool = "select" | "distance" | "area";
type ViewMode = "2d" | "3d";
type SearchResult = { id: string; name: string; description: string; category: string; lat: number; lon: number };
type OsmFeature = { id: string; name: string; category: string; lat: number; lon: number };
type PhotonFeature = { geometry?: { coordinates?: [number, number] }; properties?: { osm_id?: number; osm_type?: string; osm_key?: string; osm_value?: string; type?: string; name?: string; street?: string; district?: string; city?: string; state?: string; countrycode?: string } };
type OverpassElement = { id: number; type: string; lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: Record<string, string> };

export const BASEMAPS: Record<BasemapKey, { label: string; shortLabel: string; detail: string; url: string; attribution: string; licence: string; maxNativeZoom: number; tone: string }> = {
  street: {
    label: "OSM Street",
    shortLabel: "Street",
    detail: "Open community street map",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
    licence: "open data · ODbL",
    maxNativeZoom: 19,
    tone: "street",
  },
  humanitarian: {
    label: "Humanitarian",
    shortLabel: "Humanitarian",
    detail: "High-contrast roads, settlements and services",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> · Tiles by <a href="https://www.hotosm.org" target="_blank" rel="noreferrer">HOT</a>',
    licence: "open data · ODbL",
    maxNativeZoom: 19,
    tone: "humanitarian",
  },
  topographic: {
    label: "OpenTopoMap",
    shortLabel: "Topographic",
    detail: "Terrain and elevation context",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>, SRTM | Map style &copy; <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a> (CC-BY-SA)',
    licence: "open data · ODbL + CC-BY-SA",
    maxNativeZoom: 17,
    tone: "topographic",
  },
  light: {
    label: "Light Gray Canvas",
    shortLabel: "Light",
    detail: "Clean light canvas for operational overlays",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a>, HERE, Garmin &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
    licence: "free to use with attribution · not open data",
    maxNativeZoom: 19,
    tone: "light",
  },
  dark: {
    label: "Dark Gray Canvas",
    shortLabel: "Dark",
    detail: "Dark canvas for bright thematic overlays",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noreferrer">Esri</a>, HERE, Garmin &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
    licence: "free to use with attribution · not open data",
    maxNativeZoom: 19,
    tone: "dark",
  },
  satellite: {
    label: "Esri World Imagery",
    shortLabel: "Satellite",
    detail: "High-resolution imagery for boundary and building checks",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Imagery &copy; <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noreferrer">Esri</a>, Maxar, Earthstar Geographics and the GIS user community',
    licence: "free to use with attribution · not open data",
    maxNativeZoom: 19,
    tone: "satellite",
  },
  daily: {
    label: "NASA daily true colour",
    shortLabel: "Daily satellite",
    detail: "Recent national cloud, flood and land-surface context",
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg",
    attribution: 'Imagery &copy; <a href="https://www.earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA EOSDIS GIBS</a>',
    licence: "public domain · NASA open data",
    maxNativeZoom: 9,
    tone: "daily",
  },
};

const LAND_USE_COLORS: Record<Parcel["landUse"], string> = {
  Residential: "#1f9fd1",
  Agriculture: "#89a83b",
  Commercial: "#f0a72f",
  "Mixed Use": "#7659a8",
  Conservation: "#21633f",
};

function popupContent(title: string, detail: string) {
  const content = document.createElement("div");
  const heading = document.createElement("strong");
  const description = document.createElement("span");
  heading.textContent = title;
  description.textContent = detail;
  content.className = "osm-popup-content";
  content.append(heading, description);
  return content;
}

function normalizePhotonResults(features: PhotonFeature[]) {
  return features.flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates;
    const properties = feature.properties;
    if (!coordinates || !properties?.name || properties.countrycode?.toLowerCase() !== "rw") return [];
    const [lon, lat] = coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    const location = [properties.street, properties.district, properties.city, properties.state].filter((value, index, all) => value && all.indexOf(value) === index).join(" · ");
    return [{ id: `${properties.osm_type ?? "OSM"}/${properties.osm_id ?? `${lat}-${lon}`}`, name: properties.name, description: location || `${properties.osm_key ?? "place"} · Rwanda`, category: properties.osm_value ?? properties.type ?? properties.osm_key ?? "place", lat, lon }];
  }).slice(0, 8);
}

function normalizeOverpassFeatures(elements: OverpassElement[]) {
  return elements.flatMap((element) => {
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") return [];
    const tags = element.tags ?? {};
    return [{ id: `${element.type}/${element.id}`, name: tags.name ?? tags.amenity ?? tags.office ?? tags.tourism ?? "Mapped place", category: tags.amenity ?? tags.office ?? tags.tourism ?? "place", lat, lon }];
  }).slice(0, 80);
}

async function searchPhotonDirect(query: string) {
  const endpoint = new URL("https://photon.komoot.io/api/");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("limit", "12");
  endpoint.searchParams.set("lang", "en");
  endpoint.searchParams.set("bbox", "28.8,-2.9,30.9,-1.0");
  const response = await fetchWithTimeout(endpoint, {}, { timeoutMs: 7_000, retries: 1 });
  if (!response.ok) throw new Error("Open map search is unavailable.");
  const data = await response.json() as { features?: PhotonFeature[] };
  return normalizePhotonResults(data.features ?? []);
}

async function loadOverpassFeaturesDirect(lat: number, lon: number, signal: AbortSignal) {
  const query = `[out:json][timeout:18];
(
  nwr(around:1200,${lat.toFixed(6)},${lon.toFixed(6)})["amenity"~"hospital|clinic|pharmacy|school|university|college|police|fire_station|marketplace|bank|post_office"];
  nwr(around:1200,${lat.toFixed(6)},${lon.toFixed(6)})["office"="government"];
  nwr(around:1200,${lat.toFixed(6)},${lon.toFixed(6)})["tourism"~"museum|viewpoint|attraction"];
);
out center tags 80;`;
  const response = await fetchWithTimeout("https://overpass.kumi.systems/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }),
    signal,
  }, { timeoutMs: 10_000, retries: 1, retryDelayMs: 350 });
  if (!response.ok) throw new Error("Live OpenStreetMap places are unavailable.");
  const data = await response.json() as { elements?: OverpassElement[] };
  return normalizeOverpassFeatures(data.elements ?? []);
}

export default function OpenStreetMap({ compact = false, selected, onSelect, onClearSelection, onNotify, visibleLayers, highlightedUpis = [], onlineLayerIds = [], onlineLayerOpacity = 1, basemap: controlledBasemap, onBasemapChange, onLayerStatusChange, analysisFeatures, analysisLabelProperty = "id", analysisColour = "#d55d30", referencePosition }: OpenStreetMapProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const baseLayerRef = useRef<TileLayer | null>(null);
  const overlaysRef = useRef<LayerGroup | null>(null);
  const drawingRef = useRef<LayerGroup | null>(null);
  const searchMarkerRef = useRef<LayerGroup | null>(null);
  const importedLayerRef = useRef<LayerGroup | null>(null);
  const onlineLayersRef = useRef<LayerGroup | null>(null);
  const lastOnlineLayerSetRef = useRef("");
  const lastAnalysisFeaturesRef = useRef<GeoJsonObject | undefined>(undefined);
  const geoJsonInputRef = useRef<HTMLInputElement>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const notifyRef = useRef(onNotify);
  const layerStatusRef = useRef(onLayerStatusChange);
  const [ready, setReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [internalBasemap, setInternalBasemap] = useState<BasemapKey>("street");
  const [basemapStatus, setBasemapStatus] = useState<MapServiceStatus>("loading");
  const basemap = controlledBasemap ?? internalBasemap;
  const [activeTool, setActiveTool] = useState<MapTool>("select");
  const [measurement, setMeasurement] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [osmFeatures, setOsmFeatures] = useState<OsmFeature[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesReload, setPlacesReload] = useState(0);
  const [coordinateReadout, setCoordinateReadout] = useState<{ lat: number; lng: number } | null>(null);
  const shownParcels = useMemo(() => compact ? parcels.slice(0, 12) : parcels, [compact]);
  const highlightedSet = useMemo(() => new Set(highlightedUpis), [highlightedUpis]);
  const referenceLayers = useMemo(() => getReferenceLayers(), []);

  useEffect(() => { notifyRef.current = onNotify; }, [onNotify]);
  useEffect(() => { layerStatusRef.current = onLayerStatusChange; }, [onLayerStatusChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;
      const map = L.map(containerRef.current, {
        center: KIGALI_CENTER_LATLNG,
        zoom: compact ? 13 : 12,
        minZoom: 5,
        maxZoom: 19,
        zoomControl: !compact,
        attributionControl: true,
        maxBounds: L.latLngBounds(RWANDA_VIEW_BOUNDS),
        maxBoundsViscosity: 0.5,
        dragging: !compact,
        scrollWheelZoom: !compact,
        doubleClickZoom: !compact,
        keyboard: !compact,
      });
      map.attributionControl.setPrefix(false);
      leafletRef.current = L;
      mapRef.current = map;
      drawingRef.current = L.layerGroup().addTo(map);
      searchMarkerRef.current = L.layerGroup().addTo(map);
      importedLayerRef.current = L.layerGroup().addTo(map);
      onlineLayersRef.current = L.layerGroup().addTo(map);
      setReady(true);
      window.setTimeout(() => map.invalidateSize(), 0);
      resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
      resizeObserver.observe(containerRef.current);
    });
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      overlaysRef.current?.remove();
      drawingRef.current?.remove();
      searchMarkerRef.current?.remove();
      importedLayerRef.current?.remove();
      onlineLayersRef.current?.remove();
      baseLayerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    baseLayerRef.current?.remove();
    const config = BASEMAPS[basemap];
    const layer = L.tileLayer(config.url, { maxNativeZoom: config.maxNativeZoom, maxZoom: 19, minZoom: 5, noWrap: true, attribution: config.attribution, ...(config.url.includes("{date}") ? { date: recentImageryDate() } : {}) });
    setBasemapStatus("loading");
    layer.once("tileload", () => setBasemapStatus("ready"));
    layer.once("tileerror", () => setBasemapStatus("error"));
    layer.addTo(map).bringToBack();
    baseLayerRef.current = layer;
  }, [basemap, ready]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const destination = onlineLayersRef.current;
    if (!ready || !L || !map || !destination || compact) return;
    destination.clearLayers();
    const activeLayers = onlineLayerIds.map(findRwandaOnlineLayer).filter((layer) => layer !== undefined);
    const nationalBounds = L.latLngBounds(RWANDA_BOUNDS);
    activeLayers.forEach((layer) => {
      layerStatusRef.current?.(layer.id, "loading");
      const opacity = Math.max(0.12, Math.min(1, layer.opacity * onlineLayerOpacity));
      const attribution = `<a href="${layer.sourceUrl}" target="_blank" rel="noreferrer">${layer.provider}</a> · ${layer.licence}`;
      // Both source families are requested one tile at a time so each image covers exactly the
      // extent it was asked for, stays sharp at every zoom, and is never fetched outside Rwanda.
      const shared = { opacity, attribution, bounds: nationalBounds, minZoom: 5, maxZoom: 19 };
      const overlay = layer.kind === "arcgis-image"
        ? createArcGisDynamicLayer(L, layer.serviceUrl, { ...shared, layerIds: layer.layerIds, detectRetina: true })
        : layer.wmsLayer
          ? L.tileLayer.wms(layer.serviceUrl, { ...shared, layers: layer.wmsLayer, format: "image/png", transparent: true, version: "1.3.0", ...(layer.wmsTime ? { time: layer.wmsTime } : {}) })
          : undefined;
      if (!overlay) return;
      overlay.once("load", () => { layerStatusRef.current?.(layer.id, "ready"); notifyRef.current?.(`${layer.shortTitle} loaded from ${layer.provider}`); });
      overlay.on("tileerror", () => { layerStatusRef.current?.(layer.id, "error"); notifyRef.current?.(`${layer.shortTitle} has unavailable tiles at this zoom`); });
      overlay.addTo(destination).bringToBack();
    });
    baseLayerRef.current?.bringToBack();
    const layerSet = onlineLayerIds.join("|");
    if (layerSet && layerSet !== lastOnlineLayerSetRef.current) map.fitBounds(nationalBounds, { padding: [18, 18] });
    lastOnlineLayerSetRef.current = layerSet;
  }, [compact, onlineLayerIds, onlineLayerOpacity, ready]);

  useEffect(() => {
    if (viewMode === "2d") window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
  }, [viewMode]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    overlaysRef.current?.remove();
    const overlays = L.layerGroup().addTo(map);
    overlaysRef.current = overlays;

    if (visibleLayers?.boundaries ?? true) {
      L.rectangle([[-2.052, 29.965], [-1.86, 30.205]], { color: "#087fae", weight: 2, dashArray: "7 7", fill: false, interactive: false }).bindTooltip("Kigali prototype coverage", { direction: "center" }).addTo(overlays);
    }
    if (visibleLayers?.zoning) {
      L.circle([-1.944, 30.095], { radius: 2_100, color: "#7659a8", fillColor: "#b8a8d4", fillOpacity: 0.12, weight: 2, interactive: false }).addTo(overlays);
    }
    if (visibleLayers?.wetlands ?? true) {
      L.geoJSON(referenceLayers.wetlands, {
        style: { color: "#078aaa", weight: 2, fillColor: "#69c7dc", fillOpacity: 0.24, dashArray: "5 4" },
        onEachFeature: (feature, layer) => layer.bindTooltip(String(feature.properties?.name ?? "Demo wetland reference"), { sticky: true }),
      }).addTo(overlays);
    }
    if (visibleLayers?.roads ?? true) {
      L.geoJSON(referenceLayers.roads, {
        style: { color: "#e77817", weight: 4, opacity: 0.86 },
        onEachFeature: (feature, layer) => layer.bindTooltip(String(feature.properties?.name ?? "Analysis road"), { sticky: true }),
      }).addTo(overlays);
    }
    if (visibleLayers?.parcels ?? true) {
      shownParcels.forEach((parcel, index) => {
        const isSelected = selected?.upi === parcel.upi;
        const isHighlighted = highlightedSet.has(parcel.upi);
        const polygon = L.polygon(parcelRingLatLng(parcel, index), { color: isSelected ? "#ffd400" : isHighlighted ? "#e77817" : LAND_USE_COLORS[parcel.landUse], fillColor: isHighlighted ? "#ffad45" : LAND_USE_COLORS[parcel.landUse], fillOpacity: isSelected ? 0.72 : isHighlighted ? 0.64 : 0.42, weight: isSelected ? 4 : isHighlighted ? 3 : 2 });
        polygon.bindTooltip(popupContent(parcel.upi, `${parcel.district} · ${parcel.landUse}`), { sticky: true, direction: "top" });
        polygon.on("click", () => onSelect?.(parcel));
        polygon.addTo(overlays);
      });
    }
    if (visibleLayers?.osmPlaces) {
      osmFeatures.forEach((feature) => {
        const marker = L.circleMarker([feature.lat, feature.lon], { radius: 6, color: "#ffffff", weight: 2, fillColor: "#087fae", fillOpacity: 0.95 });
        marker.bindPopup(popupContent(feature.name, `OpenStreetMap · ${feature.category.replaceAll("_", " ")}`));
        marker.addTo(overlays);
      });
    }
    if (analysisFeatures) {
      const analysisLayer = L.geoJSON(analysisFeatures, {
        style: { color: analysisColour, weight: 3, fillColor: analysisColour, fillOpacity: 0.5, dashArray: "4 3" },
        onEachFeature: (feature, layer) => {
          const properties = feature.properties as Record<string, unknown> | null;
          const label = properties?.[analysisLabelProperty] ?? properties?.id ?? "Analysis feature";
          const detail = properties?.score ? `Score ${properties.score} · ${properties.areaM2 ?? "—"} m²` : "Browser-side analysis result";
          layer.bindTooltip(popupContent(String(label), detail), { sticky: true, direction: "top" });
        },
      }).addTo(overlays);
      if (lastAnalysisFeaturesRef.current !== analysisFeatures) {
        const bounds = analysisLayer.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
        lastAnalysisFeaturesRef.current = analysisFeatures;
      }
    }
    if (referencePosition) {
      L.circleMarker([referencePosition.lat, referencePosition.lon], { radius: 9, color: "#ffffff", weight: 3, fillColor: "#1f9fd1", fillOpacity: 1 })
        .bindTooltip(popupContent(referencePosition.label, `${referencePosition.lat.toFixed(5)}, ${referencePosition.lon.toFixed(5)}`), { permanent: compact, direction: "top" })
        .addTo(overlays);
    }
  }, [analysisColour, analysisFeatures, analysisLabelProperty, compact, highlightedSet, onSelect, osmFeatures, ready, referenceLayers, referencePosition, selected, shownParcels, visibleLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selected) return;
    const index = parcels.findIndex((parcel) => parcel.upi === selected.upi);
    if (index >= 0) map.flyTo(parcelCenterLatLng(selected, index), compact ? 15 : Math.max(map.getZoom(), 15), { duration: compact ? 0 : 0.55 });
  }, [compact, ready, selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !referencePosition) return;
    map.flyTo([referencePosition.lat, referencePosition.lon], compact ? 11 : Math.max(map.getZoom(), 13), { duration: compact ? 0 : 0.5 });
  }, [compact, ready, referencePosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || compact) return;
    const updateCoordinate = (event: { latlng: { lat: number; lng: number } }) => setCoordinateReadout({ lat: event.latlng.lat, lng: event.latlng.lng });
    map.on("mousemove", updateCoordinate);
    map.on("click", updateCoordinate);
    return () => { map.off("mousemove", updateCoordinate); map.off("click", updateCoordinate); };
  }, [compact, ready]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const group = drawingRef.current;
    if (!ready || !L || !map || !group || compact || activeTool === "select") return;
    group.clearLayers();
    setMeasurement(activeTool === "distance" ? "Tap two or more points to measure distance." : "Tap three or more points to measure area.");
    const points: { lat: number; lng: number }[] = [];
    map.doubleClickZoom.disable();

    const handleClick = (event: { latlng: { lat: number; lng: number } }) => {
      points.push(event.latlng);
      group.clearLayers();
      points.forEach((point) => L.circleMarker([point.lat, point.lng], { radius: 4, color: "#ffffff", weight: 2, fillColor: "#087fae", fillOpacity: 1 }).addTo(group));
      if (activeTool === "distance") {
        L.polyline(points.map((point) => [point.lat, point.lng]), { color: "#087fae", weight: 4, dashArray: "7 5" }).addTo(group);
        let metres = 0;
        for (let index = 1; index < points.length; index += 1) metres += map.distance(points[index - 1], points[index]);
        if (points.length > 1) setMeasurement(metres >= 1000 ? `${(metres / 1000).toFixed(2)} km` : `${Math.round(metres)} m`);
      } else {
        L.polygon(points.map((point) => [point.lat, point.lng]), { color: "#21633f", fillColor: "#ffd400", fillOpacity: 0.25, weight: 3 }).addTo(group);
        const area = calculatePolygonArea(points);
        if (points.length > 2) setMeasurement(area >= 10_000 ? `${(area / 10_000).toFixed(2)} ha` : `${Math.round(area).toLocaleString()} m²`);
      }
    };
    map.on("click", handleClick);
    return () => { map.off("click", handleClick); map.doubleClickZoom.enable(); };
  }, [activeTool, compact, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || compact || !visibleLayers?.osmPlaces) return;
    const controller = new AbortController();
    const center = map.getCenter();
    setPlacesLoading(true);
    const requestFeatures = async () => {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return loadOverpassFeaturesDirect(center.lat, center.lng, controller.signal);
      const response = await fetchWithTimeout(`/api/osm/features?lat=${center.lat.toFixed(6)}&lon=${center.lng.toFixed(6)}&radius=1200`, { signal: controller.signal }, { timeoutMs: 9_000, retries: 1 });
      const data = await response.json() as { features?: OsmFeature[]; error?: string };
      if (!response.ok) return loadOverpassFeaturesDirect(center.lat, center.lng, controller.signal);
      return data.features ?? [];
    };
    void requestFeatures()
      .then((features) => {
        setOsmFeatures(features);
        notifyRef.current?.(`${features.length} live OpenStreetMap places loaded`);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setOsmFeatures([]);
        notifyRef.current?.("Live OpenStreetMap places could not be loaded");
      })
      .finally(() => setPlacesLoading(false));
    return () => controller.abort();
  }, [compact, placesReload, ready, visibleLayers?.osmPlaces]);

  async function searchMap(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) { setSearchError("Enter at least two characters."); return; }
    const coordinate = parseRwandaCoordinate(term);
    if (coordinate) {
      const L = leafletRef.current;
      const map = mapRef.current;
      if (L && map) {
        searchMarkerRef.current?.clearLayers();
        L.circleMarker([coordinate.lat, coordinate.lng], { radius: 9, color: "#ffffff", weight: 3, fillColor: "#ffd400", fillOpacity: 1 }).bindPopup(popupContent(coordinate.label, "Coordinate search · Rwanda")).addTo(searchMarkerRef.current!).openPopup();
        map.flyTo([coordinate.lat, coordinate.lng], 16, { duration: 0.65 });
        setCoordinateReadout({ lat: coordinate.lat, lng: coordinate.lng });
        setSearchResults([]); setSearchError("");
        notifyRef.current?.(`${coordinate.label} located`);
      }
      return;
    }
    const localMatch = parcels.find((parcel) => `${parcel.upi} ${parcel.district} ${parcel.sector} ${parcel.cell}`.toLowerCase().includes(term.toLowerCase()));
    if (localMatch) {
      onSelect?.(localMatch);
      setSearchResults([]);
      setSearchError("");
      notifyRef.current?.(`Prototype parcel ${localMatch.upi} selected`);
      return;
    }
    setSearching(true);
    setSearchError("");
    setSearchResults([]);
    try {
      let results: SearchResult[];
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        results = await searchPhotonDirect(term);
      } else {
        const response = await fetchWithTimeout(`/api/osm/search?q=${encodeURIComponent(term)}`, {}, { timeoutMs: 8_000, retries: 1 });
        const data = await response.json() as { results?: SearchResult[]; error?: string };
        results = response.ok ? data.results ?? [] : await searchPhotonDirect(term);
      }
      setSearchResults(results);
      if (!results.length) setSearchError("No matching OpenStreetMap place found in Rwanda.");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Open map search is unavailable.");
    } finally {
      setSearching(false);
    }
  }

  function openSearchResult(result: SearchResult) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    searchMarkerRef.current?.clearLayers();
    const marker = L.circleMarker([result.lat, result.lon], { radius: 9, color: "#ffffff", weight: 3, fillColor: "#ffd400", fillOpacity: 1 });
    marker.bindPopup(popupContent(result.name, result.description)).addTo(searchMarkerRef.current!).openPopup();
    map.flyTo([result.lat, result.lon], 16, { duration: 0.7 });
    setSearchResults([]);
    setQuery(result.name);
    notifyRef.current?.(`${result.name} opened from OpenStreetMap`);
  }

  function locateUser() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    map.once("locationfound", (event) => {
      searchMarkerRef.current?.clearLayers();
      L.circle(event.latlng, { radius: event.accuracy, color: "#087fae", fillColor: "#a7dcef", fillOpacity: 0.18, weight: 2 }).addTo(searchMarkerRef.current!);
      L.circleMarker(event.latlng, { radius: 7, color: "#ffffff", weight: 3, fillColor: "#087fae", fillOpacity: 1 }).bindPopup("Your approximate location").addTo(searchMarkerRef.current!).openPopup();
      notifyRef.current?.("Map centred on your location");
    });
    map.once("locationerror", () => notifyRef.current?.("Location permission was unavailable"));
    map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true, timeout: 10_000 });
  }

  function clearMapWork() {
    drawingRef.current?.clearLayers();
    searchMarkerRef.current?.clearLayers();
    importedLayerRef.current?.clearLayers();
    setMeasurement("");
    setActiveTool("select");
    onClearSelection?.();
  }

  function exportSelectedParcel() {
    if (!selected) { notifyRef.current?.("Select a prototype parcel before exporting"); return; }
    const index = parcels.findIndex((parcel) => parcel.upi === selected.upi);
    const coordinates = parcelRingLatLng(selected, Math.max(0, index)).map(([lat, lon]) => [lon, lat]);
    const feature = { type: "Feature", properties: { upi: selected.upi, district: selected.district, sector: selected.sector, landUse: selected.landUse, zoning: selected.zoning, source: "NLA GeoAI synthetic demonstration parcel" }, geometry: { type: "Polygon", coordinates: [coordinates] } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(feature, null, 2)], { type: "application/geo+json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selected.upi.replaceAll("/", "-")}.geojson`;
    anchor.click();
    URL.revokeObjectURL(url);
    notifyRef.current?.("Selected parcel exported as GeoJSON");
  }

  async function importGeoJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5_000_000) { notifyRef.current?.("GeoJSON must be smaller than 5 MB"); return; }
    const L = leafletRef.current;
    const map = mapRef.current;
    const destination = importedLayerRef.current;
    if (!L || !map || !destination) return;
    try {
      const parsed = JSON.parse(await file.text()) as { type?: string; features?: unknown[] };
      if (parsed.type !== "Feature" && parsed.type !== "FeatureCollection") throw new Error("Unsupported GeoJSON root");
      const layer = L.geoJSON(parsed as GeoJsonObject, {
        style: { color: "#e77817", weight: 3, fillColor: "#ffad45", fillOpacity: 0.24 },
        pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 7, color: "#e77817", fillColor: "#ffd400", fillOpacity: 0.9, weight: 2 }),
      });
      destination.clearLayers();
      layer.eachLayer((item) => destination.addLayer(item));
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.15), { maxZoom: 16 });
      const count = parsed.type === "FeatureCollection" ? parsed.features?.length ?? 0 : 1;
      notifyRef.current?.(`${count} GeoJSON ${count === 1 ? "feature" : "features"} loaded locally`);
    } catch {
      notifyRef.current?.("That file is not valid GeoJSON");
    }
  }

  async function toggleFullscreen() {
    if (!shellRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen(); else await shellRef.current.requestFullscreen();
    window.setTimeout(() => mapRef.current?.invalidateSize(), 120);
  }

  return <div ref={shellRef} className={`osm-map-shell ${compact ? "compact" : ""} view-${viewMode}`} aria-label="Interactive open-source map">
    <div ref={containerRef} className={`osm-map-canvas ${viewMode === "3d" ? "map-layer-hidden" : ""}`} />
    {!compact && viewMode === "3d" && <ThreeDMap selected={selected} onSelect={onSelect} highlightedUpis={highlightedUpis} />}
    {!ready && <div className="osm-map-loading"><span />Loading open map…</div>}
    {!compact && <>
      <div className="map-view-switcher" aria-label="Map dimension"><button className={viewMode === "2d" ? "active" : ""} onClick={() => setViewMode("2d")}><Map size={15} aria-hidden /><span>2D map</span></button><button className={viewMode === "3d" ? "active" : ""} onClick={() => setViewMode("3d")}><Box size={15} aria-hidden /><span>3D view</span></button></div>
      {viewMode === "2d" && <>
        <form className="osm-search" onSubmit={searchMap}><span>⌕</span><input aria-label="Search parcels, places or coordinates" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="UPI, place, lat/lon or UTM 36S…" /><button disabled={searching}>{searching ? "…" : "Search"}</button></form>
        {(searchResults.length > 0 || searchError) && <div className="osm-search-results">{searchError && <p>{searchError}</p>}{searchResults.map((result) => <button key={result.id} onClick={() => openSearchResult(result)}><span>OSM</span><b>{result.name}<small>{result.description}</small></b><i>›</i></button>)}</div>}
        <label className="osm-basemap-switcher"><span><Map size={14} aria-hidden /><i className={basemapStatus} /></span><select aria-label="Select map background" value={basemap} onChange={(event) => { const next = event.target.value as BasemapKey; setInternalBasemap(next); onBasemapChange?.(next); }} title={BASEMAPS[basemap].detail}>{(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => <option key={key} value={key}>{BASEMAPS[key].shortLabel}</option>)}</select></label>
        <div className="osm-map-tools" aria-label="Open mapping tools">
          <button aria-label="Select parcels" className={activeTool === "select" ? "active" : ""} onClick={() => { setActiveTool("select"); setMeasurement(""); }} title="Select parcels"><MousePointer2 size={16} aria-hidden /></button>
          <button aria-label="Measure distance" className={activeTool === "distance" ? "active" : ""} onClick={() => setActiveTool("distance")} title="Measure distance"><Ruler size={16} aria-hidden /></button>
          <button aria-label="Measure area" className={activeTool === "area" ? "active" : ""} onClick={() => setActiveTool("area")} title="Measure area"><ScanLine size={16} aria-hidden /></button>
          <button aria-label="Find my location" onClick={locateUser} title="Find my location"><LocateFixed size={16} aria-hidden /></button>
          <button aria-label="Fit Rwanda" onClick={() => mapRef.current?.fitBounds(RWANDA_BOUNDS)} title="Fit Rwanda"><MapPinned size={16} aria-hidden /></button>
          <button aria-label="Clear map work" onClick={clearMapWork} title="Clear map work"><Eraser size={16} aria-hidden /></button>
          <button aria-label="Export selected parcel as GeoJSON" onClick={exportSelectedParcel} disabled={!selected} title="Export selected parcel as GeoJSON"><Download size={16} aria-hidden /></button>
          <button aria-label="Import GeoJSON" onClick={() => geoJsonInputRef.current?.click()} title="Import GeoJSON locally"><Upload size={16} aria-hidden /></button>
          <button aria-label="Toggle fullscreen" onClick={() => void toggleFullscreen()} title="Toggle fullscreen"><Expand size={16} aria-hidden /></button>
        </div>
        <input ref={geoJsonInputRef} className="geojson-file-input" type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={(event) => void importGeoJson(event)} />
        {visibleLayers?.osmPlaces && <button className="osm-refresh-places" onClick={() => setPlacesReload((value) => value + 1)} disabled={placesLoading}>{placesLoading ? "Loading open places…" : `Refresh OSM places · ${osmFeatures.length}`}</button>}
        {measurement && <div className="osm-measurement"><span>{activeTool === "distance" ? "Distance" : "Area"}</span><b>{measurement}</b><button onClick={() => { setActiveTool("select"); setMeasurement(""); }}>Done</button></div>}
        {coordinateReadout && <div className="osm-coordinate-readout"><b>WGS84 {coordinateReadout.lat.toFixed(6)}, {coordinateReadout.lng.toFixed(6)}</b><span>UTM 36S {toUtm36S([coordinateReadout.lng, coordinateReadout.lat]).map((value) => value.toFixed(1)).join(" · ")}</span></div>}
        <div className="osm-map-status"><i />{BASEMAPS[basemap].label} · {BASEMAPS[basemap].licence}{onlineLayerIds.length ? ` · ${onlineLayerIds.length} Rwanda ${onlineLayerIds.length === 1 ? "layer" : "layers"}` : ""}{visibleLayers?.parcels ? " + synthetic parcels" : ""}{analysisFeatures ? " + analysis results" : ""}</div>
      </>}
    </>}
  </div>;
}
