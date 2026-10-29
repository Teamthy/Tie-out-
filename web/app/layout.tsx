import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tieout: evidence-grade agent evaluation",
  description:
    "An open harness for agent evaluation and red team runs that emits evidence, not reports. Every verdict is a bound, chained, re-derivable event.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
