import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SmartTicket AI | Intelligent Support Infrastructure",
  description: "Next-generation AI support ticket classification and resolution platform.",
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
        {children}
      </body>
    </html>
  );
}
