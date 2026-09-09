export type GovernmentUpdateCategory =
  | "All channels"
  | "Leadership"
  | "Land & planning"
  | "Environment & climate"
  | "Infrastructure & utilities"
  | "Agriculture"
  | "Local government"
  | "Digital & regulation";

export type GovernmentSocialAccount = {
  id: string;
  name: string;
  shortName: string;
  handle: string;
  description: string;
  categories: Exclude<GovernmentUpdateCategory, "All channels">[];
  websiteUrl: string;
  officialSourceUrl: string;
  accent: string;
  featured?: boolean;
};

export const GOVERNMENT_UPDATE_CATEGORIES: GovernmentUpdateCategory[] = [
  "All channels",
  "Leadership",
  "Land & planning",
  "Environment & climate",
  "Infrastructure & utilities",
  "Agriculture",
  "Local government",
  "Digital & regulation",
];

/**
 * Accounts are included only when the handle is linked or named by an official
 * Rwanda government website. The officialSourceUrl is retained so officers can
 * independently verify the account instead of trusting a social badge alone.
 */
export const RWANDA_GOVERNMENT_SOCIAL_ACCOUNTS: GovernmentSocialAccount[] = [
  {
    id: "nla",
    name: "National Land Authority",
    shortName: "NLA",
    handle: "Lands_Rwanda",
    description: "Land administration, registration, surveying and land-use updates.",
    categories: ["Land & planning"],
    websiteUrl: "https://www.lands.rw/",
    officialSourceUrl: "https://www.lands.rw/home",
    accent: "#179bd3",
    featured: true,
  },
  {
    id: "government",
    name: "Government of Rwanda",
    shortName: "GoR",
    handle: "RwandaGov",
    description: "National announcements, policies, public services and cross-government updates.",
    categories: ["Leadership"],
    websiteUrl: "https://www.gov.rw/",
    officialSourceUrl: "https://www.gov.rw/",
    accent: "#1d6a44",
    featured: true,
  },
  {
    id: "presidency",
    name: "Office of the President",
    shortName: "Presidency",
    handle: "UrugwiroVillage",
    description: "Official coverage of the President’s public work and national priorities.",
    categories: ["Leadership"],
    websiteUrl: "https://www.presidency.gov.rw/",
    officialSourceUrl: "https://www.gov.rw/president",
    accent: "#174e70",
    featured: true,
  },
  {
    id: "primature",
    name: "Office of the Prime Minister",
    shortName: "Primature",
    handle: "PrimatureRwanda",
    description: "Cabinet resolutions, government programmes and implementation updates.",
    categories: ["Leadership"],
    websiteUrl: "https://www.primature.gov.rw/",
    officialSourceUrl: "https://www.primature.gov.rw/",
    accent: "#315f87",
  },
  {
    id: "environment",
    name: "Ministry of Environment",
    shortName: "MoE",
    handle: "EnvironmentRw",
    description: "Environment, forests, climate action and natural-resource policy.",
    categories: ["Environment & climate", "Land & planning"],
    websiteUrl: "https://www.environment.gov.rw/",
    officialSourceUrl: "https://www.environment.gov.rw/",
    accent: "#2f7b49",
    featured: true,
  },
  {
    id: "rema",
    name: "Rwanda Environment Management Authority",
    shortName: "REMA",
    handle: "REMA_Rwanda",
    description: "Wetlands, biodiversity, environmental compliance and restoration activity.",
    categories: ["Environment & climate", "Land & planning"],
    websiteUrl: "https://www.rema.gov.rw/",
    officialSourceUrl: "https://www.rema.gov.rw/",
    accent: "#27714a",
    featured: true,
  },
  {
    id: "rwb",
    name: "Rwanda Water Resources Board",
    shortName: "RWB",
    handle: "RwandaWater",
    description: "Catchments, flood risk, water allocation and water-resource monitoring.",
    categories: ["Environment & climate", "Land & planning"],
    websiteUrl: "https://www.rwb.rw/",
    officialSourceUrl: "https://www.rwb.rw/about-us/overview",
    accent: "#1684b0",
    featured: true,
  },
  {
    id: "meteo",
    name: "Rwanda Meteorology Agency",
    shortName: "Meteo Rwanda",
    handle: "MeteoRwanda",
    description: "Weather warnings, rainfall, seasonal forecasts and climate services.",
    categories: ["Environment & climate", "Agriculture"],
    websiteUrl: "https://www.meteorwanda.gov.rw/",
    officialSourceUrl: "https://www.meteorwanda.gov.rw/",
    accent: "#2378a0",
    featured: true,
  },
  {
    id: "forestry",
    name: "Rwanda Forestry Authority",
    shortName: "RFA",
    handle: "RwandaForestry",
    description: "Forest restoration, tree cover, agroforestry and forest management.",
    categories: ["Environment & climate", "Land & planning", "Agriculture"],
    websiteUrl: "https://www.rfa.rw/",
    officialSourceUrl: "https://www.rfa.rw/",
    accent: "#25623c",
  },
  {
    id: "mininfra",
    name: "Ministry of Infrastructure",
    shortName: "MININFRA",
    handle: "RwandaInfra",
    description: "Transport, energy, water, sanitation, housing and major public works.",
    categories: ["Infrastructure & utilities", "Land & planning"],
    websiteUrl: "https://www.mininfra.gov.rw/",
    officialSourceUrl: "https://www.mininfra.gov.rw/",
    accent: "#a86e13",
    featured: true,
  },
  {
    id: "reg",
    name: "Rwanda Energy Group",
    shortName: "REG",
    handle: "reg_rwanda",
    description: "Electricity access, grid works, outages and energy projects.",
    categories: ["Infrastructure & utilities"],
    websiteUrl: "https://www.reg.rw/",
    officialSourceUrl: "https://www.reg.rw/public-information/faqs/",
    accent: "#d28c13",
    featured: true,
  },
  {
    id: "wasac",
    name: "Water and Sanitation Corporation",
    shortName: "WASAC",
    handle: "wasac_rwanda",
    description: "Water supply, interruptions, sanitation services and infrastructure works.",
    categories: ["Infrastructure & utilities", "Environment & climate"],
    websiteUrl: "https://www.wasac.rw/",
    officialSourceUrl: "https://www.wasac.rw/",
    accent: "#168cb8",
    featured: true,
  },
  {
    id: "rha",
    name: "Rwanda Housing Authority",
    shortName: "RHA",
    handle: "Rwanda_Housing",
    description: "Housing, construction standards, urbanisation and building safety.",
    categories: ["Land & planning", "Infrastructure & utilities"],
    websiteUrl: "https://www.rha.gov.rw/",
    officialSourceUrl: "https://www.rha.gov.rw/about-rha/overview",
    accent: "#976b20",
  },
  {
    id: "rtda",
    name: "Rwanda Transport Development Agency",
    shortName: "RTDA",
    handle: "RTDARwanda",
    description: "National roads, bridges, feeder roads and transport projects.",
    categories: ["Infrastructure & utilities", "Land & planning"],
    websiteUrl: "https://www.rtda.gov.rw/",
    officialSourceUrl: "https://www.rtda.gov.rw/home",
    accent: "#a56219",
  },
  {
    id: "rura",
    name: "Rwanda Utilities Regulatory Authority",
    shortName: "RURA",
    handle: "RURA_RWANDA",
    description: "Utility regulation, tariffs, transport and communications notices.",
    categories: ["Infrastructure & utilities", "Digital & regulation"],
    websiteUrl: "https://www.rura.rw/",
    officialSourceUrl: "https://www.rura.rw/",
    accent: "#8b6424",
  },
  {
    id: "kigali",
    name: "City of Kigali",
    shortName: "Kigali",
    handle: "CityofKigali",
    description: "City planning, construction, roads, public realm and resident notices.",
    categories: ["Local government", "Land & planning", "Infrastructure & utilities"],
    websiteUrl: "https://www.kigalicity.gov.rw/",
    officialSourceUrl: "https://www.kigalicity.gov.rw/",
    accent: "#6d5b2b",
    featured: true,
  },
  {
    id: "minagri",
    name: "Ministry of Agriculture and Animal Resources",
    shortName: "MINAGRI",
    handle: "RwandaAgri",
    description: "Agricultural policy, land productivity, irrigation and farmer programmes.",
    categories: ["Agriculture", "Land & planning"],
    websiteUrl: "https://www.minagri.gov.rw/",
    officialSourceUrl: "https://www.minagri.gov.rw/",
    accent: "#477729",
    featured: true,
  },
  {
    id: "rab",
    name: "Rwanda Agriculture and Animal Resources Development Board",
    shortName: "RAB",
    handle: "RwandaAgriBoard",
    description: "Crop monitoring, research, extension, inputs and climate-smart farming.",
    categories: ["Agriculture", "Environment & climate"],
    websiteUrl: "https://www.rab.gov.rw/",
    officialSourceUrl: "https://www.rab.gov.rw/",
    accent: "#5e7f25",
  },
  {
    id: "risa",
    name: "Rwanda Information Society Authority",
    shortName: "RISA",
    handle: "RISARwanda",
    description: "Digital-government platforms, public technology and cyber-awareness updates.",
    categories: ["Digital & regulation"],
    websiteUrl: "https://www.risa.gov.rw/",
    officialSourceUrl: "https://www.risa.gov.rw/about/overview",
    accent: "#534d8d",
  },
  {
    id: "mines",
    name: "Rwanda Mines, Petroleum and Gas Board",
    shortName: "RMB",
    handle: "RwandaMinesB",
    description: "Mining, quarrying, geological resources and sector regulation.",
    categories: ["Land & planning", "Digital & regulation"],
    websiteUrl: "https://www.rmb.gov.rw/",
    officialSourceUrl: "https://www.rmb.gov.rw/",
    accent: "#765d48",
  },
];

export const OFFICIAL_UPDATE_HUBS = [
  { name: "NLA land news", detail: "Land registration, governance, surveying and institutional notices.", url: "https://www.lands.rw/home", category: "Land" },
  { name: "Government updates", detail: "National press releases and cross-government announcements.", url: "https://www.gov.rw/news", category: "National" },
  { name: "REMA latest updates", detail: "Wetland restoration, environment and climate programme updates.", url: "https://www.rema.gov.rw/updates/latest-updates", category: "Environment" },
  { name: "MININFRA latest updates", detail: "Infrastructure, energy, water, housing and transport projects.", url: "https://www.mininfra.gov.rw/", category: "Infrastructure" },
  { name: "WASAC announcements", detail: "Public water and sanitation service announcements.", url: "https://www.wasac.rw/en/public-information/announcements", category: "Utilities" },
  { name: "Meteo Rwanda warnings", detail: "Weather warnings, forecasts and climate bulletins.", url: "https://www.meteorwanda.gov.rw/climate-warning/weather-warnings", category: "Climate" },
  { name: "City of Kigali updates", detail: "Planning, construction, city services and local notices.", url: "https://www.kigalicity.gov.rw/", category: "City" },
] as const;

export const SOCIAL_ACCOUNT_VERIFIED_AT = "11 August 2026";
