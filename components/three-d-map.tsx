"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Building2 } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { parcels, type Parcel } from "@/lib/data";
import { KIGALI_CENTER_LNGLAT, parcelCenterLngLat, parcelRingLngLat } from "@/lib/geospatial-engine";

type ThreeDMapProps = {
  selected?: Parcel;
  onSelect?: (parcel: Parcel) => void;
  highlightedUpis?: string[];
};

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
      geometry: { type: "Polygon" as const, coordinates: [parcelRingLngLat(parcel, index)] },
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
    let resizeObserver: ResizeObserver | undefined;
    try {
      if (disposed || !containerRef.current) return;
      const initialSelected = initialSelectedRef.current;
      const selectedIndex = initialSelected ? parcels.findIndex((parcel) => parcel.upi === initialSelected.upi) : -1;
      const center = initialSelected && selectedIndex >= 0 ? parcelCenterLngLat(initialSelected, selectedIndex) : KIGALI_CENTER_LNGLAT;
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
      resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current);
      loadTimer = window.setTimeout(() => setFailed(true), 20_000);
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
      map.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 110 }), "bottom-left");

      map.on("style.load", () => {
        if (disposed) return;
        if (map.getSource("nla-3d-parcels")) return;
        if (loadTimer) window.clearTimeout(loadTimer);
        const firstLabel = map.getStyle().layers.find((layer) => layer.type === "symbol" && layer.layout?.["text-field"])?.id;
        if (!map.getLayer("building-3d") && map.getSource("openmaptiles")) map.addLayer({
          id: "osm-3d-buildings",
          source: "openmaptiles",
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
        map.resize();
        map.triggerRepaint();
        setReady(true);
      });
    } catch {
      window.setTimeout(() => setFailed(true), 0);
    }

    return () => {
      disposed = true;
      if (loadTimer) window.clearTimeout(loadTimer);
      resizeObserver?.disconnect();
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
    if (index >= 0) map.flyTo({ center: parcelCenterLngLat(selected, index), zoom: 16.4, pitch: 62, bearing: -28, duration: 900 });
  }, [highlightedUpis, ready, selected]);

  return <div className="three-d-map" aria-label="Interactive 3D open-source map">
    <div ref={containerRef} className="three-d-map-canvas" />
    {!ready && !failed && <div className="three-d-map-loading"><Box size={20} aria-hidden />Building the 3D scene…</div>}
    {failed && <div className="three-d-map-loading error"><Building2 size={20} aria-hidden />3D map data is temporarily unavailable.</div>}
    <div className="three-d-map-badge"><Building2 size={14} aria-hidden /><span><b>Open 3D scene</b><small>OSM buildings + synthetic NLA parcel extrusions</small></span></div>
  </div>;
}
