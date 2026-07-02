import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AU Visa Pathway Agent",
  description:
    "Portfolio/demo tool that returns rule-based Australian visa pathway suggestions. Not migration advice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site">
          <main className="site__main">{children}</main>
          <footer className="site__footer">
            This is not migration advice. Verify with Home Affairs or a
            MARN-registered migration agent. Portfolio/demo tool.
          </footer>
        </div>
      </body>
    </html>
  );
}
