import { area } from "@turf/turf";
import * as L from "leaflet";
import { describe, expect, it } from "vitest";

import { parcels } from "@/lib/data";
import { parcelFeature, parcelRingLngLat, RWANDA_BOUNDS } from "@/lib/geospatial-engine";
import { RWANDA_BBOX_4326, RWANDA_VIEW_BOUNDS } from "@/lib/rwanda-extent";
import { RWANDA_ONLINE_MAP_LAYERS } from "@/lib/rwanda-map-catalog";
import { createArcGisDynamicLayer } from "@/lib/arcgis-tile-layer";

const WEB_MERCATOR_RADIUS_M = 6_378_137;

describe("parcel geometry", () => {
  it("draws every parcel at exactly its registered area", () => {
    for (const [index, parcel] of parcels.entries()) {
      expect(area(parcelFeature(parcel, index))).toBeCloseTo(parcel.area, 3);
    }
  });

  it("closes each ring and keeps it inside Rwanda", () => {
    for (const [index, parcel] of parcels.entries()) {
      const ring = parcelRingLngLat(parcel, index);
      expect(ring.at(0)).toEqual(ring.at(-1));
      for (const [lng, lat] of ring) {
        expect(lng).toBeGreaterThan(RWANDA_BBOX_4326.west);
        expect(lng).toBeLessThan(RWANDA_BBOX_4326.east);
        expect(lat).toBeGreaterThan(RWANDA_BBOX_4326.south);
        expect(lat).toBeLessThan(RWANDA_BBOX_4326.north);
      }
    }
  });
});

describe("national extent", () => {
  it("covers the extent published by the official boundary service", () => {
    // fullExtent reported by Rwanda Space Agency Admin_Boundaries/MapServer
    const [[south, west], [north, east]] = RWANDA_BOUNDS;
    expect(west).toBeLessThanOrEqual(28.861439);
    expect(south).toBeLessThanOrEqual(-2.840402);
    expect(east).toBeGreaterThanOrEqual(30.900257);
    expect(north).toBeGreaterThanOrEqual(-1.046991);
  });

  it("leaves working margin around the country without losing it", () => {
    const [[viewSouth, viewWest], [viewNorth, viewEast]] = RWANDA_VIEW_BOUNDS;
    const [[south, west], [north, east]] = RWANDA_BOUNDS;
    expect(viewWest).toBeLessThan(west);
    expect(viewSouth).toBeLessThan(south);
    expect(viewEast).toBeGreaterThan(east);
    expect(viewNorth).toBeGreaterThan(north);
  });
});

describe("raster overlay registration", () => {
  it("asks each ArcGIS tile for exactly the square extent that tile covers", () => {
    // ArcGIS export silently widens the extent it renders whenever the bbox aspect ratio does not
    // match the requested pixel size, and reports that only in its JSON response — an `f=image`
    // caller never sees it. Rwanda in a square image is exactly that mismatch, and it squashed
    // every raster overlay vertically by 13%. Per-tile requests are immune because a Web Mercator
    // tile and the image asked for it are both square.
    const container = document.createElement("div");
    document.body.append(container);
    const map = L.map(container, { center: [-1.95, 30.06], zoom: 12 });
    const layer = createArcGisDynamicLayer(L, "https://example.invalid/rest/services/Demo/MapServer", { layerIds: [0, 3] });
    layer.addTo(map);

    for (const coords of [{ x: 149, y: 129, z: 8 }, { x: 38789, y: 32573, z: 16 }]) {
      const url = new URL((layer as unknown as { getTileUrl: (c: unknown) => string }).getTileUrl(Object.assign(L.point(coords.x, coords.y), { z: coords.z })));
      const [xmin, ymin, xmax, ymax] = (url.searchParams.get("bbox") ?? "").split(",").map(Number);

      const tileSpanM = 2 * Math.PI * WEB_MERCATOR_RADIUS_M / 2 ** coords.z;
      expect(xmax - xmin).toBeCloseTo(tileSpanM, 3);
      expect(ymax - ymin).toBeCloseTo(tileSpanM, 3);
      expect(xmin).toBeCloseTo(-Math.PI * WEB_MERCATOR_RADIUS_M + coords.x * tileSpanM, 3);
      expect(ymax).toBeCloseTo(Math.PI * WEB_MERCATOR_RADIUS_M - coords.y * tileSpanM, 3);

      expect(url.searchParams.get("size")).toBe("256,256");
      expect(url.searchParams.get("bboxSR")).toBe("3857");
      expect(url.searchParams.get("imageSR")).toBe("3857");
      expect(url.searchParams.get("layers")).toBe("show:0,3");
      expect(url.searchParams.get("f")).toBe("image");
    }

    map.remove();
    container.remove();
  });

  it("keeps every catalogue entry renderable by one of the two tiled paths", () => {
    for (const layer of RWANDA_ONLINE_MAP_LAYERS) {
      if (layer.kind === "arcgis-image") expect(layer.serviceUrl).toMatch(/\/MapServer$/);
      else expect(layer.wmsLayer).toBeTruthy();
    }
  });
});
