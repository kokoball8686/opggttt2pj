import type { Metadata, Viewport } from "next";
import { MotionConfig } from "framer-motion";
import { RouteTransition } from "@/components/layout/AppShell";
import { PwaInstallProvider } from "@/components/pwa/PwaControls";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0b1018",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "TAG2.GG",
  description: "Tekken Tag Tournament 2 커뮤니티 전적과 랭킹을 확인하세요.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TAG2.GG",
  },
  icons: {
    icon: [
      { url: "/app-icon.svg", type: "image/svg+xml" },
      { url: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/app-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <MotionConfig reducedMotion="never">
          <PwaInstallProvider>
            <RouteTransition>{children}</RouteTransition>
          </PwaInstallProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
