export type RwandaMapCategory = "Land & forests" | "Agriculture & soils" | "Climate & atmosphere" | "Boundaries" | "Water" | "Risk & terrain" | "Infrastructure" | "Settlements" | "Conservation";

export type RwandaOnlineMapLayer = {
  id: string;
  title: string;
  shortTitle: string;
  category: RwandaMapCategory;
  description: string;
  provider: string;
  vintage: string;
  resolution: string;
  licence: string;
  sourceUrl: string;
  kind: "arcgis-image" | "wms";
  serviceUrl: string;
  layerIds?: number[];
  wmsLayer?: string;
  wmsTime?: string;
  opacity: number;
  accent: string;
  tags: string[];
  availability: "verified" | "degraded";
  serviceNote?: string;
};

export type RwandaLicenceClass = "open" | "attribution" | "verify";

export function getLayerLicenceClass(layer: RwandaOnlineMapLayer): RwandaLicenceClass {
  const licence = layer.licence.toLowerCase();
  if (licence.includes("public domain") || licence.includes("cc0")) return "open";
  if (licence.includes("cc by") || licence.includes("openstreetmap") || licence.includes("attribution")) return "attribution";
  return "verify";
}

export function getLayerFreshness(layer: RwandaOnlineMapLayer) {
  const yearMatches = layer.vintage.match(/20\d{2}/g) ?? [];
  const observation = yearMatches.length ? yearMatches.join("–") : "Not stated by service";
  const publication = /published/i.test(layer.vintage) ? layer.vintage : yearMatches.length ? `Dataset vintage ${yearMatches.at(-1)}` : "Current portal record";
  return { observation, publication, endpointCheck: RWANDA_MAP_VERIFIED_AT };
}

const RSA_ROOT = "https://gh.space.gov.rw/server/rest/services";
const RWB_WMS = "https://www.geoportal.rwb.rw/geoserver/ows";

function rsaLayer(layer: Omit<RwandaOnlineMapLayer, "kind" | "serviceUrl" | "sourceUrl" | "provider" | "licence" | "availability"> & { service: string; layerIds?: number[]; availability?: RwandaOnlineMapLayer["availability"] }): RwandaOnlineMapLayer {
  const { service, availability = "verified", ...item } = layer;
  const serviceUrl = `${RSA_ROOT}/${service}/MapServer`;
  return {
    ...item,
    provider: "Rwanda Space Agency",
    licence: "Public national map service · verify reuse terms",
    kind: "arcgis-image",
    serviceUrl,
    sourceUrl: serviceUrl,
    availability,
  };
}

function rwbLayer(layer: Omit<RwandaOnlineMapLayer, "kind" | "serviceUrl" | "sourceUrl" | "provider" | "licence" | "availability" | "wmsLayer"> & { wmsLayer: string }): RwandaOnlineMapLayer {
  return {
    ...layer,
    provider: "Rwanda Water Resources Board",
    licence: "Public Domain",
    sourceUrl: `https://www.geoportal.rwb.rw/layers/${encodeURIComponent(layer.wmsLayer)}`,
    kind: "wms",
    serviceUrl: RWB_WMS,
    availability: "verified",
  };
}

export const RWANDA_MAP_VERIFIED_AT = "11 Aug 2026";

export const RWANDA_ONLINE_MAP_LAYERS: RwandaOnlineMapLayer[] = [
  rsaLayer({ id: "rsa-landcover-2024", title: "Rwanda Land Cover 2024", shortTitle: "Land cover 2024", category: "Land & forests", description: "Sentinel-derived national land-cover classes, including forest, cropland, settlements, water and wetlands.", service: "Landcover_2024_map", layerIds: [0], vintage: "2024", resolution: "National raster", opacity: 0.66, accent: "#3d8c40", tags: ["forest", "forestry", "land use", "sentinel", "agriculture", "vegetation"] }),
  {
    id: "esa-worldcover-2021",
    title: "ESA WorldCover 10 m",
    shortTitle: "ESA WorldCover",
    category: "Land & forests",
    description: "Globally consistent 10-metre land cover with tree cover, shrubland, grassland, cropland, built-up, wetland and water classes.",
    provider: "ESA WorldCover consortium",
    vintage: "2021 v200",
    resolution: "10 m",
    licence: "CC BY 4.0",
    sourceUrl: "https://esa-worldcover.org/en/data-access",
    kind: "wms",
    serviceUrl: "https://titiler.terrascope.be/wms",
    wmsLayer: "esa-worldcover-map-10m-2021-v2_map",
    wmsTime: "2021-01-01",
    opacity: 0.62,
    accent: "#5a9f45",
    tags: ["forest", "forestry", "tree cover", "land cover", "esa", "sentinel", "10m"],
    availability: "verified",
  },
  rsaLayer({ id: "rsa-admin", title: "Administrative Boundaries 2022", shortTitle: "Admin boundaries", category: "Boundaries", description: "Official public map service for Rwanda provinces and districts. Detailed cells and sectors remain available from the source service.", service: "Admin_Boundaries", layerIds: [1, 2], vintage: "2022", resolution: "Province + district", opacity: 0.78, accent: "#4b6fa8", tags: ["province", "district", "boundary", "administrative"] }),
  rsaLayer({ id: "rsa-protected", title: "Protected Areas & Land Cover", shortTitle: "Protected areas", category: "Conservation", description: "Protected-area boundaries with the 2024 land-cover view published by Rwanda Space Agency.", service: "Protected_Areas", layerIds: [0, 9], vintage: "2017–2024", resolution: "National conservation", opacity: 0.66, accent: "#176a49", tags: ["forest", "park", "protected", "conservation", "biodiversity"] }),
  rsaLayer({ id: "rsa-biodiversity", title: "Biodiversity Observations", shortTitle: "Biodiversity", category: "Conservation", description: "Published biodiversity observations located outside protected areas for environmental screening.", service: "Biodiversity", layerIds: [0], vintage: "Current portal", resolution: "Observation points", opacity: 0.82, accent: "#8f5f9e", tags: ["species", "biodiversity", "conservation", "environment"] }),
  rsaLayer({ id: "rsa-hydrology", title: "National Hydrology", shortTitle: "Hydrology", category: "Water", description: "National hydrological features from the Rwanda Space Agency public map service.", service: "hydrology", vintage: "Current portal", resolution: "National vector", opacity: 0.72, accent: "#188fb7", tags: ["river", "stream", "catchment", "hydrology", "water"], availability: "degraded", serviceNote: "The source currently returns a service error; use the verified RWB rivers, lakes and catchments while it recovers." }),
  rsaLayer({ id: "rsa-water", title: "Water Infrastructure & Features", shortTitle: "Water", category: "Water", description: "Public national water map service for water-related infrastructure and mapped features.", service: "Water", vintage: "Current portal", resolution: "National vector", opacity: 0.72, accent: "#1878bd", tags: ["water", "lake", "infrastructure", "river"] }),
  {
    id: "rwb-rivers",
    title: "Rwanda Perennial Rivers",
    shortTitle: "Perennial rivers",
    category: "Water",
    description: "Perennial river and stream network from the National Water Resources Master Plan.",
    provider: "Rwanda Water Resources Board",
    vintage: "Published 2021",
    resolution: "Generalised 1:50,000 reference",
    licence: "Public Domain",
    sourceUrl: "https://www.geoportal.rwb.rw/layers/geonode%3ARiver",
    kind: "wms",
    serviceUrl: RWB_WMS,
    wmsLayer: "geonode:River",
    opacity: 0.78,
    accent: "#1878bd",
    tags: ["river", "stream", "hydrology", "water", "public domain"],
    availability: "verified",
  },
  {
    id: "rwb-lakes",
    title: "Rwanda Lakes",
    shortTitle: "Lakes",
    category: "Water",
    description: "Lake areas and islands inside Rwanda and along national borders.",
    provider: "Rwanda Water Resources Board",
    vintage: "Published 2021",
    resolution: "1:50,000 reference",
    licence: "Public Domain",
    sourceUrl: "https://www.geoportal.rwb.rw/layers/geonode%3ALake",
    kind: "wms",
    serviceUrl: RWB_WMS,
    wmsLayer: "geonode:Lake",
    opacity: 0.72,
    accent: "#1685a8",
    tags: ["lake", "water", "hydrology", "public domain"],
    availability: "verified",
  },
  {
    id: "rwb-catchments",
    title: "Water Master Plan Catchments",
    shortTitle: "Level 1 catchments",
    category: "Water",
    description: "Nine national water-management catchments based on Rwanda's key river systems.",
    provider: "Rwanda Water Resources Board",
    vintage: "Published 2020",
    resolution: "9 level-1 catchments",
    licence: "Public Domain",
    sourceUrl: "https://www.geoportal.rwb.rw/layers/geonode%3ACatchment_Level1",
    kind: "wms",
    serviceUrl: RWB_WMS,
    wmsLayer: "geonode:Catchment_Level1",
    opacity: 0.58,
    accent: "#4d7eb4",
    tags: ["catchment", "watershed", "basin", "hydrology", "public domain"],
    availability: "verified",
  },
  rwbLayer({ id: "rwb-catchments-l0", title: "National Drainage Basins", shortTitle: "National basins", category: "Water", description: "Top-level national drainage basins for strategic water planning and basin-level reporting.", wmsLayer: "geonode:Catchment_Level0", vintage: "Published portal", resolution: "National basin level", opacity: 0.54, accent: "#3f75a9", tags: ["basin", "catchment", "watershed", "water", "national"] }),
  rwbLayer({ id: "rwb-catchments-l2", title: "Level 2 Catchments", shortTitle: "Level 2 catchments", category: "Water", description: "More detailed catchment units for sub-basin planning, hydrological assessment and water allocation context.", wmsLayer: "geonode:Catchment_Level2", vintage: "Published portal", resolution: "Sub-basin level", opacity: 0.56, accent: "#5d83b8", tags: ["catchment", "sub-basin", "watershed", "hydrology"] }),
  rwbLayer({ id: "rwb-catchments-l3", title: "Level 3 Catchments", shortTitle: "Level 3 catchments", category: "Water", description: "Detailed local catchment units for finer water-management and landscape screening.", wmsLayer: "geonode:Catchment_Level3", vintage: "Published portal", resolution: "Local catchments", opacity: 0.58, accent: "#7395c3", tags: ["catchment", "local", "watershed", "hydrology"] }),
  rwbLayer({ id: "rwb-constructed-dams", title: "Constructed Dams", shortTitle: "Constructed dams", category: "Water", description: "Mapped constructed dam locations for water-storage, infrastructure and proximity assessment.", wmsLayer: "geonode:Constructed_Dam", vintage: "Published portal", resolution: "Facility points", opacity: 0.86, accent: "#24769a", tags: ["dam", "reservoir", "water", "infrastructure"] }),
  rwbLayer({ id: "rwb-planned-dams", title: "Planned Dams", shortTitle: "Planned dams", category: "Water", description: "Published planned dam locations for early-stage infrastructure and land-use coordination.", wmsLayer: "geonode:Planned_Dam", vintage: "Published portal", resolution: "Planning points", opacity: 0.86, accent: "#6d80a5", tags: ["dam", "planned", "reservoir", "infrastructure"] }),
  rwbLayer({ id: "rwb-groundwater-aquifer", title: "Groundwater Aquifers", shortTitle: "Groundwater aquifers", category: "Water", description: "National aquifer mapping for groundwater-resource and land-planning context.", wmsLayer: "geonode:Ground_Water_Acquifer", vintage: "Published portal", resolution: "National hydrogeology", opacity: 0.6, accent: "#3e8c9d", tags: ["groundwater", "aquifer", "hydrogeology", "water"] }),
  rwbLayer({ id: "rwb-groundwater-recharge", title: "Groundwater Recharge", shortTitle: "Groundwater recharge", category: "Water", description: "Mapped groundwater-recharge conditions expressed by the source as million cubic metres per hectare per year.", wmsLayer: "geonode:Ground_water_recharge", vintage: "Published portal", resolution: "National recharge surface", opacity: 0.6, accent: "#54a4aa", tags: ["groundwater", "recharge", "aquifer", "water"] }),
  rwbLayer({ id: "rwb-groundwater-potential", title: "Groundwater Potential", shortTitle: "Groundwater potential", category: "Water", description: "National groundwater-potential map for preliminary water-supply and resource screening.", wmsLayer: "geonode:Groundwater_Potential_Map", vintage: "Published portal", resolution: "National potential surface", opacity: 0.62, accent: "#377e93", tags: ["groundwater", "potential", "borehole", "water"] }),
  rwbLayer({ id: "rwb-hydropower", title: "Hydropower Plants", shortTitle: "Hydropower plants", category: "Infrastructure", description: "Published hydropower-plant locations for energy and water-infrastructure context.", wmsLayer: "geonode:Hydropower_Plant", vintage: "Published portal", resolution: "Facility points", opacity: 0.88, accent: "#416d9e", tags: ["hydropower", "energy", "electricity", "water", "infrastructure"] }),
  rwbLayer({ id: "rwb-irrigation", title: "Irrigation Schemes", shortTitle: "Irrigation", category: "Agriculture & soils", description: "Mapped irrigation areas and schemes for agricultural land and water-planning context.", wmsLayer: "geonode:Irrigation", vintage: "Published portal", resolution: "Scheme areas", opacity: 0.64, accent: "#83a83c", tags: ["irrigation", "agriculture", "crop", "water"] }),
  rwbLayer({ id: "rwb-lulc-2018", title: "Land Use / Land Cover 2018", shortTitle: "LULC 2018", category: "Land & forests", description: "2018 national land-use and land-cover reference for historical comparison with newer land-cover products.", wmsLayer: "geonode:LULC_2018", vintage: "2018", resolution: "National land cover", opacity: 0.62, accent: "#678b43", tags: ["land use", "land cover", "forest", "agriculture", "historical"] }),
  rwbLayer({ id: "rwb-national-parks", title: "National Parks", shortTitle: "National parks", category: "Conservation", description: "National park boundaries for conservation, protected-area and land-use screening.", wmsLayer: "geonode:NationalParks", vintage: "Published portal", resolution: "Protected-area polygons", opacity: 0.66, accent: "#21633f", tags: ["park", "protected", "conservation", "forest", "biodiversity"] }),
  rwbLayer({ id: "rwb-water-treatment", title: "Water Treatment Plants", shortTitle: "Water treatment", category: "Infrastructure", description: "Published water-treatment plant locations for service-access and infrastructure planning.", wmsLayer: "geonode:Water_Treatment_Plant", vintage: "Published portal", resolution: "Facility points", opacity: 0.88, accent: "#247b93", tags: ["water treatment", "plant", "utility", "infrastructure"] }),
  rwbLayer({ id: "rwb-districts", title: "RWB District Boundaries", shortTitle: "District boundaries", category: "Boundaries", description: "District boundaries published through the Water Resources Board geoportal for administrative map context.", wmsLayer: "geonode:District", vintage: "Published portal", resolution: "District polygons", opacity: 0.72, accent: "#5773a0", tags: ["district", "boundary", "administrative"] }),
  rwbLayer({ id: "rwb-villages", title: "Village Boundaries", shortTitle: "Village boundaries", category: "Settlements", description: "Detailed village boundaries for local settlement and water-resource planning context.", wmsLayer: "geonode:villages", vintage: "Published portal", resolution: "Village polygons", opacity: 0.68, accent: "#916b58", tags: ["village", "settlement", "boundary", "local"] }),
  rsaLayer({ id: "rsa-flood", title: "Revised Flood-Prone Areas", shortTitle: "Flood-prone areas", category: "Risk & terrain", description: "Published flood-prone area screening layer for risk-aware land and infrastructure review.", service: "Revised_flood_prone_areas", vintage: "Current portal", resolution: "National risk zones", opacity: 0.62, accent: "#297ba5", tags: ["flood", "risk", "hazard", "water"] }),
  rsaLayer({ id: "rsa-flood-2025", title: "Flood Susceptibility 2025", shortTitle: "Flood susceptibility", category: "Risk & terrain", description: "2025 flood susceptibility index surface from the national public map service.", service: "FSI_Flood_2025", vintage: "2025", resolution: "National raster", opacity: 0.6, accent: "#3c7da1", tags: ["flood", "susceptibility", "risk", "hazard"] }),
  rsaLayer({ id: "rsa-erosion", title: "Erosion Risk", shortTitle: "Erosion risk", category: "Risk & terrain", description: "National erosion-risk surface for early-stage environmental and land-use screening.", service: "Erosion_Risk", vintage: "Current portal", resolution: "National raster", opacity: 0.62, accent: "#b57535", tags: ["erosion", "soil", "risk", "rusle", "terrain"], availability: "degraded", serviceNote: "The upstream image service timed out during the latest verification; retry remains available." }),
  rsaLayer({ id: "rsa-slope", title: "Slope Analysis", shortTitle: "Slope", category: "Risk & terrain", description: "National terrain-slope analysis for development suitability and hazard context.", service: "Slope_Analysis", vintage: "Current portal", resolution: "National terrain raster", opacity: 0.58, accent: "#8d6b4b", tags: ["slope", "terrain", "topography", "elevation", "dem"] }),
  rsaLayer({ id: "rsa-organic-carbon", title: "Soil Organic Carbon", shortTitle: "Organic carbon", category: "Agriculture & soils", description: "National soil organic-carbon surface for soil-health and agricultural planning context.", service: "Organic_Carbon", vintage: "Current portal", resolution: "National soil raster", opacity: 0.62, accent: "#7e603b", tags: ["soil", "organic carbon", "agriculture", "fertility"] }),
  rsaLayer({ id: "rsa-soil-ph", title: "Rwanda Soil pH", shortTitle: "Soil pH", category: "Agriculture & soils", description: "National soil-acidity and alkalinity surface from the Rwanda Soil Information Service collection.", service: "RwaSIS_pH_level", vintage: "Current portal", resolution: "National soil raster", opacity: 0.62, accent: "#9a6f42", tags: ["soil", "ph", "acidity", "agriculture", "fertility"] }),
  rsaLayer({ id: "rsa-nitrogen", title: "Total Soil Nitrogen", shortTitle: "Total nitrogen", category: "Agriculture & soils", description: "Mapped total-nitrogen conditions for national soil and crop-planning context.", service: "Total_Nitrogen", vintage: "Current portal", resolution: "National soil raster", opacity: 0.62, accent: "#648b3c", tags: ["soil", "nitrogen", "nutrient", "agriculture"] }),
  rsaLayer({ id: "rsa-npk-n", title: "Effective Nitrogen Supply", shortTitle: "Nitrogen supply", category: "Agriculture & soils", description: "Effective soil nitrogen-supply surface from Rwanda's national soil mapping collection.", service: "Effective_soil_NPK_supply_Rwanda_sNS_tif", vintage: "Current portal", resolution: "National soil raster", opacity: 0.62, accent: "#689f4c", tags: ["nitrogen", "npk", "fertilizer", "soil", "agriculture"] }),
  rsaLayer({ id: "rsa-npk-p", title: "Effective Phosphorus Supply", shortTitle: "Phosphorus supply", category: "Agriculture & soils", description: "Effective soil phosphorus-supply surface for crop and fertilizer-planning context.", service: "Effective_soil_NPK_supply_Rwanda_sPS_tif", vintage: "Current portal", resolution: "National soil raster", opacity: 0.62, accent: "#b1843b", tags: ["phosphorus", "npk", "fertilizer", "soil", "agriculture"] }),
  rsaLayer({ id: "rsa-npk-k", title: "Effective Potassium Supply", shortTitle: "Potassium supply", category: "Agriculture & soils", description: "Effective soil potassium-supply surface for crop and fertilizer-planning context.", service: "Effective_soil_NPK_supply_Rwanda_sKS_tif", vintage: "Current portal", resolution: "National soil raster", opacity: 0.62, accent: "#9a7254", tags: ["potassium", "npk", "fertilizer", "soil", "agriculture"] }),
  rsaLayer({ id: "rsa-rice-fertilizer", title: "Rice Fertilizer Recommendation", shortTitle: "Rice fertilizer", category: "Agriculture & soils", description: "Published fertilizer-recommendation surface for rice production planning.", service: "Fertilizer_Recommendation_Rice", vintage: "Current portal", resolution: "Crop recommendation raster", opacity: 0.62, accent: "#b49a36", tags: ["rice", "fertilizer", "agriculture", "crop"] }),
  rsaLayer({ id: "rsa-lst", title: "Land Surface Temperature", shortTitle: "Surface temperature", category: "Climate & atmosphere", description: "Satellite-derived land-surface temperature for heat and environmental context.", service: "LST_07_2025_tif", vintage: "July 2025", resolution: "National satellite raster", opacity: 0.58, accent: "#d65b32", tags: ["temperature", "heat", "climate", "satellite", "lst"] }),
  rsaLayer({ id: "rsa-aqi", title: "Air Quality Index", shortTitle: "Air quality", category: "Climate & atmosphere", description: "Published national air-quality index monitoring layer.", service: "AQI", vintage: "Current portal", resolution: "Monitoring observations", opacity: 0.78, accent: "#8d62a6", tags: ["air", "aqi", "pollution", "environment", "climate"], availability: "degraded", serviceNote: "The upstream monitoring service timed out during the latest verification; retry remains available." }),
  rsaLayer({ id: "rsa-so2", title: "Sulphur Dioxide", shortTitle: "SO₂", category: "Climate & atmosphere", description: "Satellite-derived sulphur-dioxide observation surface for atmospheric screening.", service: "SO2_2025_10", vintage: "October 2025", resolution: "National atmosphere raster", opacity: 0.58, accent: "#7366a7", tags: ["so2", "air", "pollution", "atmosphere", "sentinel"] }),
  rsaLayer({ id: "rsa-road", title: "National Road Network", shortTitle: "Road network", category: "Infrastructure", description: "Public national road network service for accessibility and proximity context.", service: "Road", vintage: "Current portal", resolution: "National vector", opacity: 0.78, accent: "#de7b20", tags: ["road", "transport", "accessibility", "infrastructure"] }),
  rsaLayer({ id: "rsa-health", title: "Health Facilities", shortTitle: "Health facilities", category: "Infrastructure", description: "Published national health-facility locations for service-access screening.", service: "Health_Facilities", vintage: "Current portal", resolution: "Facility points", opacity: 0.86, accent: "#b24962", tags: ["health", "hospital", "clinic", "services"] }),
  rsaLayer({ id: "rsa-education", title: "Education Facilities", shortTitle: "Education facilities", category: "Infrastructure", description: "Published schools and education facilities for accessibility and planning context.", service: "Education_Facilities", vintage: "Current portal", resolution: "Facility points", opacity: 0.86, accent: "#9b6a28", tags: ["school", "education", "facility", "services"] }),
  rsaLayer({ id: "rsa-electricity", title: "Electricity Infrastructure", shortTitle: "Electricity", category: "Infrastructure", description: "National electricity infrastructure published through the Rwanda Space Agency map service.", service: "Electricity", vintage: "Current portal", resolution: "National vector", opacity: 0.76, accent: "#d6a414", tags: ["electricity", "power", "grid", "infrastructure"], availability: "degraded", serviceNote: "The upstream infrastructure service timed out during the latest verification; retry remains available." }),
  rsaLayer({ id: "rsa-telecom", title: "Telecommunications Infrastructure", shortTitle: "Telecom", category: "Infrastructure", description: "Published national telecommunications infrastructure for connectivity context.", service: "Telecom", vintage: "Current portal", resolution: "National vector", opacity: 0.76, accent: "#477ea5", tags: ["telecom", "connectivity", "tower", "infrastructure"] }),
  rsaLayer({ id: "rsa-transport", title: "Transport Accessibility", shortTitle: "Transport access", category: "Infrastructure", description: "National transport-accessibility service for service-area and development context.", service: "Transport_Accessibility", vintage: "Current portal", resolution: "National accessibility", opacity: 0.68, accent: "#c37b30", tags: ["transport", "accessibility", "road", "infrastructure"], availability: "degraded", serviceNote: "The upstream accessibility service timed out during the latest verification; retry remains available." }),
  rsaLayer({ id: "rsa-rural-settlements", title: "Rural Settlement Sites", shortTitle: "Rural settlements", category: "Settlements", description: "Published rural settlement sites for national spatial-planning context.", service: "Rural_Settlement_Sites", vintage: "Current portal", resolution: "Settlement sites", opacity: 0.74, accent: "#8d6454", tags: ["settlement", "rural", "village", "planning"] }),
  rsaLayer({ id: "rsa-house-concentration", title: "Housing Concentration", shortTitle: "Housing concentration", category: "Settlements", description: "Country-wide housing-concentration layer for settlement-pattern screening.", service: "Country_House_Concentration", vintage: "Current portal", resolution: "National settlement layer", opacity: 0.66, accent: "#9b6256", tags: ["housing", "building", "settlement", "density"] }),
  rsaLayer({ id: "rsa-mining", title: "Mining Sites & Buffers", shortTitle: "Mining sites", category: "Land & forests", description: "Mine sites and published mine-site buffer zones for land-use conflict screening.", service: "Mining", layerIds: [5, 6], vintage: "Current portal", resolution: "Sites + buffers", opacity: 0.66, accent: "#806756", tags: ["mining", "mine", "buffer", "land use"], availability: "degraded", serviceNote: "The upstream mining service timed out during the latest verification; retry remains available." }),
  rsaLayer({ id: "rsa-informal-risk", title: "Informal Settlement Risk Zones", shortTitle: "Settlement risk", category: "Risk & terrain", description: "Published informal-settlement risk zones for urban planning context.", service: "Informal_Settlement_Risk_Zones", vintage: "Current portal", resolution: "Risk zones", opacity: 0.62, accent: "#a55e4d", tags: ["settlement", "urban", "risk", "housing"] }),
  rsaLayer({ id: "rsa-earthquakes", title: "Earthquakes & Volcanic Context", shortTitle: "Earthquakes", category: "Risk & terrain", description: "Rwanda earthquake observations and regional volcanic-impact reference layers.", service: "Earthquakes", layerIds: [10], vintage: "Current portal", resolution: "Event points", opacity: 0.86, accent: "#b84a3e", tags: ["earthquake", "seismic", "volcano", "hazard"] }),
];

export const RWANDA_MAP_CATEGORIES: RwandaMapCategory[] = ["Land & forests", "Agriculture & soils", "Climate & atmosphere", "Boundaries", "Water", "Risk & terrain", "Infrastructure", "Settlements", "Conservation"];

export const RWANDA_VERIFIED_MAP_LAYERS = RWANDA_ONLINE_MAP_LAYERS.filter((layer) => layer.availability === "verified");
export const RWANDA_DEGRADED_MAP_LAYERS = RWANDA_ONLINE_MAP_LAYERS.filter((layer) => layer.availability === "degraded");

export const RWANDA_IMAGE_BOUNDS: [[number, number], [number, number]] = [[-2.85, 28.86], [-1.05, 30.9]];

export function buildArcGisExportUrl(layer: RwandaOnlineMapLayer) {
  const endpoint = new URL(`${layer.serviceUrl}/export`);
  endpoint.searchParams.set("bbox", "28.86,-2.85,30.9,-1.05");
  endpoint.searchParams.set("bboxSR", "4326");
  endpoint.searchParams.set("imageSR", "3857");
  endpoint.searchParams.set("size", "1800,1800");
  endpoint.searchParams.set("format", "png32");
  endpoint.searchParams.set("transparent", "true");
  endpoint.searchParams.set("dpi", "120");
  if (layer.layerIds?.length) endpoint.searchParams.set("layers", `show:${layer.layerIds.join(",")}`);
  endpoint.searchParams.set("f", "image");
  return endpoint.toString();
}

export function findRwandaOnlineLayer(id: string) {
  return RWANDA_ONLINE_MAP_LAYERS.find((layer) => layer.id === id);
}
