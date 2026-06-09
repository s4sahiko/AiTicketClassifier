import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PWARegister from "./pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SmartTicket AI | Intelligent Support Infrastructure",
  description: "Next-generation AI support ticket classification and resolution platform.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SmartTicket AI",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased selection:bg-blue-500/30`}>
        <div className="fixed inset-0 -z-10 bg-[#020617]" />
        <PWARegister />
        {children}
      </body>
    </html>
  );
}

