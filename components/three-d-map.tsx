"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Building2 } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { parcels, type Parcel } from "@/lib/data";

type ThreeDMapProps = {
  selected?: Parcel;
  onSelect?: (parcel: Parcel) => void;
  highlightedUpis?: string[];
};

const KIGALI_CENTER: [number, number] = [30.0606, -1.9536];
const DISTRICT_CENTERS: Record<string, [number, number]> = {
  Gasabo: [30.1015, -1.9325],
  Kicukiro: [30.1072, -1.9858],
  Nyarugenge: [30.038, -1.9675],
  Musanze: [29.6344, -1.5007],
  Huye: [29.739, -2.5967],
  Bugesera: [30.0804, -2.1412],
};

function parcelCenter(parcel: Parcel, index: number): [number, number] {
  const base = DISTRICT_CENTERS[parcel.district] ?? KIGALI_CENTER;
  const column = (index % 7) - 3;
  const row = (Math.floor(index / 7) % 6) - 2;
  return [base[0] + column * 0.0042 + (index % 4) * 0.0005, base[1] + row * 0.0037 + (index % 3) * 0.0007];
}

function parcelRing(parcel: Parcel, index: number) {
  const [lng, lat] = parcelCenter(parcel, index);
  const size = Math.min(0.0028, 0.00115 + parcel.area / 8_000_000);
  const skew = ((index % 4) - 1.5) * 0.00018;
  const ring = [
    [lng - size + skew, lat - size],
    [lng + size, lat - size * 0.72],
    [lng + size * 0.8 - skew, lat + size],
    [lng - size, lat + size * 0.82],
  ];
  return [...ring, ring[0]];
}

function parcelCollection(selectedUpi?: string, highlightedUpis: string[] = []) {
  const highlighted = new Set(highlightedUpis);
  return {
    type: "FeatureCollection" as const,
    features: parcels.map((parcel, index) => ({
      type: "Feature" as const,
      properties: {
        upi: parcel.upi,
        district: parcel.district,
        landUse: parcel.landUse,
        selected: parcel.upi === selectedUpi ? 1 : 0,
        highlighted: highlighted.has(parcel.upi) ? 1 : 0,
        height: parcel.upi === selectedUpi ? 28 : highlighted.has(parcel.upi) ? 20 : 7 + (index % 5) * 3,
      },
      geometry: { type: "Polygon" as const, coordinates: [parcelRing(parcel, index)] },
    })),
  };
}

function popupContent(parcel: Parcel) {
  const content = document.createElement("div");
  const title = document.createElement("strong");
  const detail = document.createElement("span");
  title.textContent = parcel.upi;
  detail.textContent = `${parcel.district} · ${parcel.landUse} · synthetic parcel`;
  content.className = "osm-popup-content";
  content.append(title, detail);
  return content;
}

export default function ThreeDMap({ selected, onSelect, highlightedUpis = [] }: ThreeDMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<{ remove: () => void } | null>(null);
  const initialSelectedRef = useRef(selected);
  const initialHighlightedRef = useRef(highlightedUpis);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;
    let loadTimer: number | undefined;
    try {
      if (disposed || !containerRef.current) return;
      const initialSelected = initialSelectedRef.current;
      const selectedIndex = initialSelected ? parcels.findIndex((parcel) => parcel.upi === initialSelected.upi) : -1;
      const center = initialSelected && selectedIndex >= 0 ? parcelCenter(initialSelected, selectedIndex) : KIGALI_CENTER;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center,
        zoom: initialSelected ? 15.6 : 14.2,
        pitch: 58,
        bearing: -24,
        maxPitch: 75,
        canvasContextAttributes: { antialias: true },
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      loadTimer = window.setTimeout(() => setFailed(true), 20_000);
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
      map.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 110 }), "bottom-left");

      map.on("style.load", () => {
        if (disposed) return;
        if (map.getSource("nla-3d-parcels")) return;
        if (loadTimer) window.clearTimeout(loadTimer);
        const firstLabel = map.getStyle().layers.find((layer) => layer.type === "symbol" && layer.layout?.["text-field"])?.id;
        map.addSource("openfreemap-3d", { type: "vector", url: "https://tiles.openfreemap.org/planet" });
        map.addLayer({
          id: "osm-3d-buildings",
          source: "openfreemap-3d",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 14.5,
          filter: ["!=", ["get", "hide_3d"], true],
          paint: {
            "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 4], 0, "#d8e5e8", 30, "#9fc6d4", 120, "#4f97b3"],
            "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 14.5, 0, 16, ["coalesce", ["get", "render_height"], 5]],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.78,
          },
        }, firstLabel);

        map.addSource("nla-3d-parcels", { type: "geojson", data: parcelCollection(initialSelected?.upi, initialHighlightedRef.current) });
        map.addLayer({
          id: "nla-parcel-extrusions",
          source: "nla-3d-parcels",
          type: "fill-extrusion",
          paint: {
            "fill-extrusion-color": ["case", ["==", ["get", "selected"], 1], "#ffd400", ["==", ["get", "highlighted"], 1], "#ff8f28", "#1f9fd1"],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.72,
          },
        }, firstLabel);
        map.addLayer({
          id: "nla-parcel-outlines",
          source: "nla-3d-parcels",
          type: "line",
          paint: { "line-color": ["case", ["==", ["get", "selected"], 1], "#705f00", "#ffffff"], "line-width": 1.4, "line-opacity": 0.9 },
        }, firstLabel);

        map.on("mouseenter", "nla-parcel-extrusions", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "nla-parcel-extrusions", () => { map.getCanvas().style.cursor = ""; });
        map.on("click", "nla-parcel-extrusions", (event: MapLayerMouseEvent) => {
          const upi = event.features?.[0]?.properties?.upi as string | undefined;
          const parcel = parcels.find((candidate) => candidate.upi === upi);
          if (!parcel) return;
          onSelectRef.current?.(parcel);
          popupRef.current?.remove();
          popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 12 }).setLngLat(event.lngLat).setDOMContent(popupContent(parcel)).addTo(map);
        });
        setReady(true);
      });
    } catch {
      window.setTimeout(() => setFailed(true), 0);
    }

    return () => {
      disposed = true;
      if (loadTimer) window.clearTimeout(loadTimer);
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("nla-3d-parcels") as GeoJSONSource | undefined;
    source?.setData(parcelCollection(selected?.upi, highlightedUpis));
    if (!selected) return;
    const index = parcels.findIndex((parcel) => parcel.upi === selected.upi);
    if (index >= 0) map.flyTo({ center: parcelCenter(selected, index), zoom: 16.4, pitch: 62, bearing: -28, duration: 900 });
  }, [highlightedUpis, ready, selected]);

  return <div className="three-d-map" aria-label="Interactive 3D open-source map">
    <div ref={containerRef} className="three-d-map-canvas" />
    {!ready && !failed && <div className="three-d-map-loading"><Box size={20} aria-hidden />Building the 3D scene…</div>}
    {failed && <div className="three-d-map-loading error"><Building2 size={20} aria-hidden />3D map data is temporarily unavailable.</div>}
    <div className="three-d-map-badge"><Building2 size={14} aria-hidden /><span><b>Open 3D scene</b><small>OSM buildings + synthetic NLA parcel extrusions</small></span></div>
  </div>;
}
