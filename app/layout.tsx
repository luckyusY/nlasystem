import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Serif, Manrope } from "next/font/google";
import SmoothScroll from "@/components/smooth-scroll";
import "leaflet/dist/leaflet.css";
import "lenis/dist/lenis.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "swiper/css";
import "swiper/css/pagination";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  weight: ["500", "600"],
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NLA GeoAI — Intelligent Land & Geospatial Assistant",
  description: "A secure internal GeoAI decision-support prototype for land and geospatial workflows in Rwanda.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://nla-geoai.vercel.app"),
  openGraph: {
    title: "NLA GeoAI",
    description: "Intelligent Land & Geospatial Assistant — Prototype internal concept",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "NLA GeoAI prototype social preview" }],
  },
  twitter: { card: "summary_large_image", title: "NLA GeoAI", description: "Intelligent Land & Geospatial Assistant", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${manrope.variable} ${plexSerif.variable} ${plexMono.variable}`}><body><SmoothScroll />{children}</body></html>;
}
