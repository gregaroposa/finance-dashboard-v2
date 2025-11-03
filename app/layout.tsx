import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { QueryProvider } from "@/providers/query-provider";
import { SheetProvider } from "@/providers/sheet-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/theme-provider";

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
  title: "Finance Dashboard",
  description: "A dashboard for managing finances",
  icons: {
    icon: [
      { url: "/icons/icon-32px.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icons/icon-48px.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icons/icon-64px.ico", sizes: "64x64", type: "image/x-icon" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon-120x120.png?v=1", sizes: "120x120" },
      { url: "/icons/apple-touch-icon-152x152.png?v=1", sizes: "152x152" },
      { url: "/icons/apple-touch-icon-167x167.png?v=1", sizes: "167x167" },
      { url: "/icons/apple-touch-icon.png?v=1", sizes: "180x180" },
    ],
    other: [
      { rel: "apple-touch-icon-precomposed", url: "/icons/apple-touch-icon.png?v=1" },
    ],
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider>
            <QueryProvider>
              <SheetProvider />
              <Toaster />
              {children}
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
