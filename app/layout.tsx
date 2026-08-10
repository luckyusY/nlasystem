import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
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
  return <html lang="en" className={`${dmSans.variable} ${plexMono.variable}`}><body>{children}</body></html>;
}
