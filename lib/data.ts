export type Parcel = {
  upi: string;
  district: string;
  sector: string;
  cell: string;
  area: number;
  landUse: "Residential" | "Agriculture" | "Commercial" | "Mixed Use" | "Conservation";
  zoning: string;
  status: "Registered" | "Under review" | "Survey pending";
  wetlandDistance: number;
  roadDistance: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

const districts = ["Gasabo", "Kicukiro", "Nyarugenge", "Musanze", "Huye", "Bugesera"];
const sectors: Record<string, string[]> = {
  Gasabo: ["Remera", "Kacyiru", "Kimihurura", "Gisozi"],
  Kicukiro: ["Niboye", "Kanombe", "Gatenga", "Gahanga"],
  Nyarugenge: ["Kigali", "Nyamirambo", "Mageragere", "Rwezamenyo"],
  Musanze: ["Muhoza", "Cyuve", "Kinigi", "Musanze"],
  Huye: ["Ngoma", "Tumba", "Mukura", "Gishamvu"],
  Bugesera: ["Nyamata", "Ruhuha", "Juru", "Ntarama"],
};
const cells = ["Amahoro", "Kabeza", "Rukiri", "Kibagabaga", "Gasharu", "Karama"];
const landUses: Parcel["landUse"][] = ["Residential", "Agriculture", "Commercial", "Mixed Use", "Conservation"];
const zonings = ["R1", "R2", "R3", "C1", "AG", "OS"];
const statuses: Parcel["status"][] = ["Registered", "Registered", "Registered", "Under review", "Survey pending"];

export const parcels: Parcel[] = Array.from({ length: 128 }, (_, index) => {
  const district = districts[index % districts.length];
  const sectorList = sectors[district];
  const landUse = landUses[(index * 3 + Math.floor(index / 7)) % landUses.length];
  return {
    upi: `${(index % 5) + 1}/${String((index % 12) + 1).padStart(2, "0")}/${String((index % 8) + 1).padStart(2, "0")}/${String((index % 6) + 1).padStart(2, "0")}/${String(index + 1).padStart(4, "0")}`,
    district,
    sector: sectorList[index % sectorList.length],
    cell: cells[(index * 2) % cells.length],
    area: 850 + ((index * 347) % 8100),
    landUse,
    zoning: zonings[(index + 1) % zonings.length],
    status: statuses[index % statuses.length],
    wetlandDistance: (index * 37) % 540,
    roadDistance: 18 + ((index * 29) % 390),
    x: 7 + ((index * 17) % 82),
    y: 8 + ((index * 23) % 74),
    w: 7 + (index % 6),
    h: 8 + ((index * 2) % 7),
    rotation: -9 + ((index * 5) % 18),
  };
});

parcels[0] = {
  ...parcels[0],
  upi: "1/02/03/04/0012",
  district: "Gasabo",
  sector: "Remera",
  cell: "Rukiri",
  area: 3250,
  landUse: "Residential",
  zoning: "R2",
  status: "Registered",
  wetlandDistance: 312,
  roadDistance: 84,
  x: 47,
  y: 38,
};

export const datasets = [
  { name: "Administrative Boundaries", org: "NLA / NISR", theme: "Boundaries", year: 2025, format: "GeoPackage", access: "Internal", coverage: "National", resolution: "1:50,000", crs: "EPSG:4326", updated: "18 Jul 2026", description: "Province, district, sector and cell reference boundaries." },
  { name: "National Road Network", org: "RTDA", theme: "Transport", year: 2026, format: "GeoJSON", access: "Internal", coverage: "National", resolution: "1:10,000", crs: "EPSG:32736", updated: "02 Aug 2026", description: "Classified national and district road centre lines." },
  { name: "Land Use / Land Cover", org: "NLA", theme: "Land Use", year: 2025, format: "GeoTIFF", access: "Restricted", coverage: "National", resolution: "10 m", crs: "EPSG:32736", updated: "27 Nov 2025", description: "National land-use and land-cover classification mosaic." },
  { name: "National Wetlands", org: "REMA", theme: "Environment", year: 2025, format: "GeoPackage", access: "Internal", coverage: "National", resolution: "1:25,000", crs: "EPSG:4326", updated: "12 Dec 2025", description: "Mapped wetland extents for planning and screening analysis." },
  { name: "Water Bodies", org: "RWB", theme: "Hydrography", year: 2024, format: "GeoJSON", access: "Public", coverage: "National", resolution: "1:25,000", crs: "EPSG:4326", updated: "21 Sep 2024", description: "Lakes, rivers and permanent surface water features." },
  { name: "Protected Areas", org: "RDB", theme: "Environment", year: 2025, format: "Shapefile", access: "Public", coverage: "National", resolution: "1:50,000", crs: "EPSG:4326", updated: "08 Mar 2025", description: "National parks, reserves and other protected areas." },
  { name: "Digital Elevation Model", org: "NLA", theme: "Elevation", year: 2024, format: "GeoTIFF", access: "Internal", coverage: "National", resolution: "30 m", crs: "EPSG:4326", updated: "14 Jun 2024", description: "Terrain elevation surface for analytical modelling." },
  { name: "Building Footprints", org: "City of Kigali", theme: "Built Environment", year: 2026, format: "GeoPackage", access: "Restricted", coverage: "Kigali", resolution: "1:2,000", crs: "EPSG:32736", updated: "30 Jul 2026", description: "Synthetic demonstration building footprint inventory." },
];

export const documents = [
  { title: "Land Administration Procedures — DEMO", category: "SOPs", pages: 48, sections: 126, updated: "04 Aug 2026", status: "Indexed" },
  { title: "Subdivision Review Guide — DEMO", category: "Technical Guidelines", pages: 22, sections: 61, updated: "02 Aug 2026", status: "Indexed" },
  { title: "Land Use Planning Reference — DEMO", category: "Land Use Plans", pages: 76, sections: 203, updated: "29 Jul 2026", status: "Indexed" },
  { title: "NSDI Metadata Manual — DEMO", category: "NSDI Manuals", pages: 34, sections: 88, updated: "25 Jul 2026", status: "Indexed" },
  { title: "Cadastral Survey Checklist — DEMO", category: "Survey Manuals", pages: 18, sections: 45, updated: "21 Jul 2026", status: "Indexed" },
];

export const corsStations = [
  { code: "KGLI", name: "Kigali Reference", location: "Kigali", status: "Online", satellites: 18, latency: 42, stream: "RTCM 3.2", observed: "10 sec ago", power: "Mains + UPS" },
  { code: "HUYE", name: "Huye Reference", location: "Huye", status: "Online", satellites: 16, latency: 58, stream: "RTCM 3.2", observed: "18 sec ago", power: "Solar + battery" },
  { code: "MUSN", name: "Musanze Reference", location: "Musanze", status: "Warning", satellites: 11, latency: 286, stream: "RTCM 3.1", observed: "2 min ago", power: "Mains + UPS" },
  { code: "RUSZ", name: "Rusizi Reference", location: "Rusizi", status: "Offline", satellites: 0, latency: 0, stream: "—", observed: "46 min ago", power: "Battery alert" },
  { code: "NYAG", name: "Nyagatare Reference", location: "Nyagatare", status: "Online", satellites: 17, latency: 51, stream: "RTCM 3.2", observed: "14 sec ago", power: "Solar + battery" },
];

export const auditEvents = [
  { time: "19:36:42", user: "Aline U.", action: "RUN_SPATIAL_ANALYSIS", module: "GIS Analysis", target: "Road buffer · Gasabo", result: "Success" },
  { time: "19:31:08", user: "Jean M.", action: "AI_QUERY", module: "GeoAI Assistant", target: "Subdivision requirements", result: "Success" },
  { time: "19:24:19", user: "Aline U.", action: "VIEW_GIS_LAYER", module: "Interactive Map", target: "National Wetlands", result: "Success" },
  { time: "19:18:54", user: "Eric N.", action: "GENERATE_REPORT", module: "Reports", target: "NLA-GEO-2026-084", result: "Success" },
  { time: "19:03:11", user: "System", action: "LAIS_CONNECTOR_CHECK", module: "System", target: "Mock connector", result: "Success" },
  { time: "18:52:36", user: "Claudine I.", action: "VIEW_RESTRICTED_DATA", module: "Parcels", target: "Permission denied", result: "Blocked" },
];

export const roles = [
  { name: "System Administrator", users: 2, scope: "Full prototype administration" },
  { name: "GIS Officer", users: 12, scope: "Layers, parcels and spatial analysis" },
  { name: "Land Use Officer", users: 9, scope: "Planning, zoning and reports" },
  { name: "Surveyor", users: 14, scope: "Survey and parcel geometry" },
  { name: "NSDI Officer", users: 5, scope: "Catalogue and metadata" },
  { name: "CORS Engineer", users: 4, scope: "Geodetic network monitoring" },
  { name: "Management", users: 7, scope: "Dashboards and approved reports" },
  { name: "Read-only Analyst", users: 18, scope: "Non-sensitive read access" },
];

export const reports = [
  { id: "NLA-GEO-2026-084", title: "KN 5 Road Impact Assessment", type: "Road Impact", author: "Aline U.", date: "10 Aug 2026", status: "Ready" },
  { id: "NLA-GEO-2026-083", title: "Gasabo Parcel Assessment", type: "Parcel", author: "Eric N.", date: "10 Aug 2026", status: "Ready" },
  { id: "NLA-GEO-2026-082", title: "Wetland Intersection Review", type: "Wetland", author: "Jean M.", date: "09 Aug 2026", status: "Review" },
  { id: "NLA-GEO-2026-081", title: "Land-use Distribution — Huye", type: "Land Use", author: "Aline U.", date: "09 Aug 2026", status: "Ready" },
];
