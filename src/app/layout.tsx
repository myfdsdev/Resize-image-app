import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PixForge — Bulk image resizer for every platform",
    template: "%s · PixForge",
  },
  description:
    "Resize, convert and compress images in bulk for Instagram, YouTube, Facebook, Google Ads and more. Runs in your browser — your photos never leave your device.",
  openGraph: {
    title: "PixForge — Bulk image resizer for every platform",
    description: "One image in. Every size out. Private, fast and free — processed right in your browser.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-bg text-fg antialiased`}>
        {children}
      </body>
    </html>
  );
}
