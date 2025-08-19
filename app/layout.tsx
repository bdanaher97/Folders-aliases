// =========================================
// AGENTS guardrails are active
// =========================================

import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Portfolio",
  description: "Photography by …",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-dvh flex flex-col">
          {/* Header stays full-width; small padding on phones */}
          <header className="px-2 sm:px-6 py-4 border-b border-black/10 sticky top-0 bg-paper/80 backdrop-blur z-10">
            <div className="w-full flex flex-col">
              {/* Top row: site name + nav */}
              <div className="flex items-center justify-between">
                <a href="/" className="text-xl tracking-tight font-medium">
                  <span className="site-name"></span>
                  <span className="sr-only">Your Name</span>
                </a>
                <nav className="text-sm opacity-70 hover:opacity-100 transition">
                  <a href="/contact" className="hover:underline">
                    Contact
                  </a>
                </nav>
              </div>

              {/* Breadcrumbs slot (no hard-coded items) */}
              <div id="crumbs-slot" className="mx-auto w-full px-0 pt-1 pb-0" />
            </div>
          </header>

          {/* Single site container for all pages */}
          <main className="flex-1">
            <div className="mx-auto max-w-7xl w-full px-0 sm:px-6 lg:px-10">
              {children}
            </div>
          </main>

          <footer className="px-2 sm:px-6 py-10 border-t border-black/10 mt-16">
            <div className="mx-auto max-w-7xl w-full text-sm opacity-70">
              © {new Date().getFullYear()} <span className="site-name"></span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
