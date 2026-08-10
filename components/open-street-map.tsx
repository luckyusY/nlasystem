"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { parcels, type Parcel } from "@/lib/data";

export type MapLayerVisibility = {
  parcels: boolean;
  roads: boolean;
  wetlands: boolean;
  zoning: boolean;
  buildings: boolean;
  boundaries: boolean;
};

type OpenStreetMapProps = {
  compact?: boolean;
  selected?: Parcel;
  onSelect?: (parcel: Parcel) => void;
  visibleLayers?: Partial<MapLayerVisibility>;
  resetViewSignal?: number;
};

const KIGALI_CENTER: [number, number] = [-1.9536, 30.0606];
const DISTRICT_CENTERS: Record<string, [number, number]> = {
  Gasabo: [-1.9325, 30.1015],
  Kicukiro: [-1.9858, 30.1072],
  Nyarugenge: [-1.9598, 30.0436],
  Musanze: [-1.4998, 29.6344],
  Huye: [-2.5967, 29.7398],
  Bugesera: [-2.1412, 30.0804],
};

const LAND_USE_COLORS: Record<Parcel["landUse"], string> = {
  Residential: "#1f9fd1",
  Agriculture: "#89a83b",
  Commercial: "#f0a72f",
  "Mixed Use": "#7659a8",
  Conservation: "#21633f",
};

function parcelCenter(parcel: Parcel, index: number): [number, number] {
  const base = DISTRICT_CENTERS[parcel.district] ?? KIGALI_CENTER;
  const column = (index % 7) - 3;
  const row = (Math.floor(index / 7) % 7) - 3;
  return [base[0] + row * 0.0037 + (index % 3) * 0.0007, base[1] + column * 0.0042 + (index % 4) * 0.0005];
}

function parcelShape(parcel: Parcel, index: number): [number, number][] {
  const [lat, lng] = parcelCenter(parcel, index);
  const size = Math.min(0.0028, 0.00115 + parcel.area / 8_000_000);
  const skew = ((index % 4) - 1.5) * 0.00018;
  return [
    [lat - size, lng - size + skew],
    [lat - size * 0.72, lng + size],
    [lat + size, lng + size * 0.8 - skew],
    [lat + size * 0.82, lng - size],
  ];
}

export default function OpenStreetMap({ compact = false, selected, onSelect, visibleLayers, resetViewSignal = 0 }: OpenStreetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlaysRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);
  const shownParcels = useMemo(() => parcels.slice(0, compact ? 12 : 42), [compact]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let disposed = false;

    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;
      const map = L.map(containerRef.current, {
        center: KIGALI_CENTER,
        zoom: compact ? 13 : 12,
        minZoom: 5,
        maxZoom: 19,
        zoomControl: !compact,
        attributionControl: true,
        dragging: !compact,
        scrollWheelZoom: !compact,
        doubleClickZoom: !compact,
        keyboard: !compact,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        minZoom: 5,
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
      }).addTo(map);

      map.attributionControl.setPrefix(false);
      leafletRef.current = L;
      mapRef.current = map;
      setReady(true);
      window.setTimeout(() => map.invalidateSize(), 0);
    });

    return () => {
      disposed = true;
      overlaysRef.current?.remove();
      overlaysRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    overlaysRef.current?.remove();
    const overlays = L.layerGroup().addTo(map);
    overlaysRef.current = overlays;

    if (visibleLayers?.boundaries ?? true) {
      L.rectangle([[-2.052, 29.965], [-1.86, 30.205]], {
        color: "#087fae",
        weight: 2,
        dashArray: "7 7",
        fill: false,
        interactive: false,
      }).bindTooltip("Kigali prototype coverage", { direction: "center" }).addTo(overlays);
    }

    if (visibleLayers?.roads ?? true) {
      const roadStyle = { color: "#ffd400", weight: compact ? 3 : 5, opacity: 0.9, interactive: false } as const;
      L.polyline([[-1.996, 30.021], [-1.968, 30.052], [-1.947, 30.086], [-1.918, 30.132]], roadStyle).addTo(overlays);
      L.polyline([[-1.985, 30.126], [-1.958, 30.092], [-1.934, 30.061], [-1.908, 30.038]], roadStyle).addTo(overlays);
    }

    if (visibleLayers?.wetlands ?? true) {
      L.polygon([[-1.975, 30.132], [-1.965, 30.151], [-1.948, 30.145], [-1.952, 30.123]], {
        color: "#168db9",
        fillColor: "#a7dcef",
        fillOpacity: 0.38,
        weight: 2,
        interactive: false,
      }).addTo(overlays);
    }

    if (visibleLayers?.zoning) {
      L.circle([-1.944, 30.095], { radius: 2_100, color: "#7659a8", fillColor: "#b8a8d4", fillOpacity: 0.12, weight: 2, interactive: false }).addTo(overlays);
    }

    if (visibleLayers?.buildings) {
      for (let index = 0; index < 18; index += 1) {
        const lat = -1.968 + (index % 6) * 0.0045;
        const lng = 30.071 + Math.floor(index / 6) * 0.006;
        L.rectangle([[lat, lng], [lat + 0.0016, lng + 0.0023]], { color: "#57575b", weight: 1, fillOpacity: 0.28, interactive: false }).addTo(overlays);
      }
    }

    if (visibleLayers?.parcels ?? true) {
      shownParcels.forEach((parcel, index) => {
        const isSelected = selected?.upi === parcel.upi;
        const polygon = L.polygon(parcelShape(parcel, index), {
          color: isSelected ? "#ffd400" : LAND_USE_COLORS[parcel.landUse],
          fillColor: LAND_USE_COLORS[parcel.landUse],
          fillOpacity: isSelected ? 0.72 : 0.42,
          weight: isSelected ? 4 : 2,
        });
        polygon.bindTooltip(`${parcel.upi} · ${parcel.landUse}`, { sticky: true, direction: "top" });
        polygon.on("click", () => onSelect?.(parcel));
        polygon.addTo(overlays);
      });
    }
  }, [compact, onSelect, ready, selected, shownParcels, visibleLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || compact) return;
    map.setView(KIGALI_CENTER, 12, { animate: true });
  }, [compact, ready, resetViewSignal]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !selected) return;
    const index = parcels.findIndex((parcel) => parcel.upi === selected.upi);
    if (index >= 0) map.flyTo(parcelCenter(selected, index), compact ? 14 : Math.max(map.getZoom(), 14), { duration: compact ? 0 : 0.55 });
  }, [compact, ready, selected]);

  return (
    <div className={`osm-map-shell ${compact ? "compact" : ""}`} aria-label="Interactive OpenStreetMap">
      <div ref={containerRef} className="osm-map-canvas" />
      {!ready && <div className="osm-map-loading"><span />Loading OpenStreetMap…</div>}
      {!compact && <div className="osm-map-status"><i /> OpenStreetMap · synthetic parcel overlays</div>}
    </div>
  );
}
