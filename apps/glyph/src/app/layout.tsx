import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "@/styles/globals.css";

export const metadata: Metadata = {
  // Makes every page's openGraph/canonical URL resolve to an absolute
  // https://khamhealth.com address (without this, Next emits relative
  // URLs that crawlers and social cards cannot use).
  metadataBase: new URL("https://khamhealth.com"),
  title: "Glyph — Clinical AI by KhaM Health",
  description:
    "Complete clinical workflow for Bangladeshi doctors: patient intake, AI briefing, ambient scribe, and follow-up.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Glyph",
  },
  openGraph: {
    siteName: "KhaM Health",
    locale: "en_US",
    type: "website",
    images: ["/landing/chamber.webp"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/landing/chamber.webp"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#171a19",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body className="min-h-screen bg-clinical-bg font-sans">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
