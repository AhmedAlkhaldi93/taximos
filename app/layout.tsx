import "./globals.css";import {getSettings} from "@/lib/db";export const dynamic="force-dynamic";
export default function RootLayout({children}:{children:React.ReactNode}){const s=getSettings();return <html lang="nl" dir="ltr"><head><title>{s.siteName} — {s.tagline}</title><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body>{children}</body></html>}
