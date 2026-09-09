import type { Coords, CRS, Map as LeafletMap, Point, TileLayer, TileLayerOptions } from "leaflet";

export type ArcGisDynamicOptions = TileLayerOptions & {
  /** Projection to request the image in. Defaults to the map's own CRS. */
  crs?: CRS;
  /** Sub-layer ids to draw. Omitted means the service default visibility. */
  layerIds?: number[];
  /** Logical screen DPI. Scaled automatically on high-density displays. */
  dpi?: number;
  /** ArcGIS image format. PNG32 keeps clean alpha for overlays. */
  format?: string;
};

type LeafletModule = typeof import("leaflet");
type ArcGisDynamicConstructor = new (serviceUrl: string, options: ArcGisDynamicOptions) => TileLayer;

type ArcGisLayerInternals = {
  _map: LeafletMap;
  _exportCrs: CRS;
  options: ArcGisDynamicOptions;
  getTileSize: () => Point;
};

const definitionCache = new WeakMap<LeafletModule, ArcGisDynamicConstructor>();

/**
 * ArcGIS `export` adjusts the extent it was asked for whenever the bbox aspect ratio
 * does not match the requested pixel size, and it reports that adjustment only in the
 * JSON response — an `f=image` caller never sees it. Requesting one square tile at a
 * time keeps the two aspect ratios identical, so the returned image always covers
 * exactly the extent it was asked for and registers against the basemap pixel for pixel.
 */
function defineArcGisDynamicLayer(L: LeafletModule): ArcGisDynamicConstructor {
  const cached = definitionCache.get(L);
  if (cached) return cached;

  const created = L.TileLayer.extend({
    onAdd(this: ArcGisLayerInternals, map: LeafletMap) {
      this._exportCrs = this.options.crs ?? map.options.crs ?? L.CRS.EPSG3857;
      L.TileLayer.prototype.onAdd.call(this as unknown as TileLayer, map);
    },

    getTileUrl(this: ArcGisLayerInternals, coords: Coords) {
      const map = this._map;
      const crs = this._exportCrs;
      const tileSize = this.getTileSize();
      const topLeft = coords.scaleBy(tileSize);
      const bottomRight = topLeft.add(tileSize);
      const northWest = crs.project(map.unproject(topLeft, coords.z));
      const southEast = crs.project(map.unproject(bottomRight, coords.z));
      const bbox = [
        Math.min(northWest.x, southEast.x),
        Math.min(northWest.y, southEast.y),
        Math.max(northWest.x, southEast.x),
        Math.max(northWest.y, southEast.y),
      ].map((value) => value.toFixed(6)).join(",");

      const pixelRatio = this.options.detectRetina && L.Browser.retina ? 2 : 1;
      const spatialReference = crs.code?.replace(/^EPSG:/, "") ?? "3857";
      const endpoint = new URL(`${(this as unknown as { _url: string })._url}/export`);
      endpoint.searchParams.set("bbox", bbox);
      endpoint.searchParams.set("bboxSR", spatialReference);
      endpoint.searchParams.set("imageSR", spatialReference);
      endpoint.searchParams.set("size", `${tileSize.x * pixelRatio},${tileSize.y * pixelRatio}`);
      endpoint.searchParams.set("format", this.options.format ?? "png32");
      endpoint.searchParams.set("transparent", "true");
      endpoint.searchParams.set("dpi", String(Math.round((this.options.dpi ?? 96) * pixelRatio)));
      if (this.options.layerIds?.length) endpoint.searchParams.set("layers", `show:${this.options.layerIds.join(",")}`);
      endpoint.searchParams.set("f", "image");
      return endpoint.toString();
    },
  }) as unknown as ArcGisDynamicConstructor;

  definitionCache.set(L, created);
  return created;
}

export function createArcGisDynamicLayer(L: LeafletModule, serviceUrl: string, options: ArcGisDynamicOptions = {}): TileLayer {
  return new (defineArcGisDynamicLayer(L))(serviceUrl, options);
}
