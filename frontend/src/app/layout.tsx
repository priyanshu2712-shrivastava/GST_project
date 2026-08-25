import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "GST Ledger — Purchase-bill automation for Indian businesses",
  description:
    "Extract, classify, and GST-check purchase invoices, then export to Excel or Tally. Section 17(5) ITC rules applied automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#f5f0eb] text-[#0a0a0a] font-sans antialiased">
        <Navbar />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
