import type { Metadata, Viewport } from "next";
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SafeView - Safe Remote Assistance",
  description: "Privacy-first remote assistance platform with explicit consent. Help family and friends safely.",
  keywords: ["remote assistance", "elder care", "tech support", "screen sharing", "family help"],
  authors: [{ name: "SafeView" }],
  creator: "SafeView",
  publisher: "SafeView",
  applicationName: "SafeView",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SafeView",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "SafeView",
    title: "SafeView - Safe Remote Assistance",
    description: "Privacy-first remote assistance with explicit consent",
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeView - Safe Remote Assistance",
    description: "Privacy-first remote assistance with explicit consent",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover", // iOS safe area support
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* iOS Safe Area */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          {/* Android */}
          <meta name="mobile-web-app-capable" content="yes" />
          {/* Prevent auto-zoom on input focus (iOS) */}
          <meta name="format-detection" content="telephone=no" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          }}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
