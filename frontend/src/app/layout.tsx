import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import AppProviders from "@/components/AppProviders";
import { InstallPrompt } from "@/components/pwa";
import { AgentDock } from "@/components/agent/AgentDock";
import "./globals.css";

const geistSans = localFont({
  src: "../../public/fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: {
    default: "Defrag — Personal Integration Through Ancient Wisdom & Modern Psychology",
    template: "%s | Defrag",
  },
  description: "Synthesize astrology, Human Design, and Gene Keys into structured self-reflection. Understand your patterns, timing, and relationships without predictions or diagnoses.",
  keywords: [
    "self-reflection app",
    "personal integration",
    "astrology synthesis",
    "Human Design",
    "Gene Keys",
    "self-understanding",
    "pattern recognition",
    "timing optimization",
    "relationship dynamics",
    "individuation",
    "symbolic psychology",
    "birth chart analysis",
    "personal development",
    "mindfulness tool",
    "psychological frameworks",
  ],
  authors: [{ name: "Defrag" }],
  creator: "Defrag",
  publisher: "Defrag",
  metadataBase: new URL("https://defrag.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://defrag.app",
    siteName: "Defrag",
    title: "Defrag — Personal Integration Through Ancient Wisdom",
    description: "Synthesize astrology, Human Design, and Gene Keys into structured self-reflection. Signal first. Action second.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Defrag — Personal Integration",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Defrag — Personal Integration",
    description: "Synthesize ancient wisdom into structured self-reflection. Understand your patterns without predictions.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Defrag",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Theme initialization script prevents flash of wrong theme
  const themeScript = `
    (function() {
      try {
        const stored = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = stored || 'system';
        if (theme === 'dark' || (theme === 'system' && prefersDark)) {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    })();
  `;

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Defrag",
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Web",
    "description": "Synthesize astrology, Human Design, and Gene Keys into structured self-reflection. Personal integration through ancient wisdom and modern psychology.",
    "url": "https://defrag.app",
    "offers": {
      "@type": "AggregateOffer",
      "lowPrice": "15",
      "highPrice": "59",
      "priceCurrency": "USD",
      "offerCount": "3"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "100"
    }
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <AppProviders>
          {children}
          <AgentDock />
          <InstallPrompt />
        </AppProviders>
      </body>
    </html>
  );
}
