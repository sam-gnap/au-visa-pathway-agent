import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AU Visa Pathway Agent",
  description:
    "Answer a few questions and see which Australian visas fit your situation, with step-by-step pathways to permanent residence. Portfolio/demo tool — not migration advice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable}`}
    >
      <body>
        <div className="site">
          <header className="site__header">
            <Link href="/" className="site__wordmark">
              <span className="site__wordmark-mark" aria-hidden>
                AU
              </span>
              Visa Pathway Agent
            </Link>
            <span className="site__tagline">
              Your pathway to Australia, mapped
            </span>
          </header>
          <main className="site__main">{children}</main>
          <footer className="site__footer">
            <span className="site__footer-rule" aria-hidden>
              &sect;
            </span>
            This is not migration advice. Verify with Home Affairs or a
            MARN-registered migration agent. Portfolio/demo tool.
          </footer>
        </div>
      </body>
    </html>
  );
}
