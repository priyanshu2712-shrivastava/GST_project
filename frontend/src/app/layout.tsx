import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "GST Bill Digitizer — AI-Powered Invoice Processing",
  description:
    "Digitize purchase bills, classify expenses with AI, validate GST & ITC compliance, and export to Excel / Tally.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-950 text-gray-100 font-sans antialiased">
        <Navbar />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
