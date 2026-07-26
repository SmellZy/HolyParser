import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "@arbitrage/design-tokens/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Arbitrage Platform",
    template: "%s · Arbitrage Platform",
  },
  description:
    "Foundation shell for multi-exchange spread and funding analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${GeistSans.variable} ${GeistMono.variable}`} lang="en">
      <body>{children}</body>
    </html>
  );
}
