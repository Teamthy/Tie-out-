import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "../components/Nav";
import { LinkedInButton, AUTHOR } from "../components/LinkedIn";

export const metadata: Metadata = {
  title: {
    default: "tieout: evidence-grade agent evaluation",
    template: "%s · tieout",
  },
  description:
    "An open harness for agent evaluation and red team runs that emits evidence, not reports. Every verdict is a bound, chained, re-derivable event.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <header className="topbar">
            <a className="brand" href="/">
              tieout
            </a>
            <Nav />
            <span className="tagline">the report is a claim. the bundle is a record.</span>
          </header>
          <main>{children}</main>
          <footer className="footer">
            <div className="footer-pillars">
              p1 verdict event · p2 provenance · p3 negative controls · p4 named gaps · p5
              re-derivation · p6 judge audit
            </div>
            <div className="footer-owner">
              <span>
                built by <span className="footer-name">{AUTHOR}</span>, an independent AI security
                research practice ·{" "}
                <a href="/blog/">notes and articles</a>
              </span>
              <LinkedInButton />
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
