import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Apache Nomad — Trip Planner",
  description: "Greedy multi-city planner powered by Amadeus Self-Service APIs.",
};

const navItems = [
  { label: "Planner", href: "/#planner" },
  { label: "Bookings", href: "/bookings" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen bg-black text-yellow-50">
          <header className="sticky top-0 z-20 border-b border-yellow-400/20 bg-black/70 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 text-sm font-semibold text-black shadow-lg shadow-yellow-500/30">
                  AN
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-200">
                    Apache Nomad
                  </p>
                  <p className="text-xs text-yellow-100/70">Trip orchestration suite</p>
                </div>
              </div>

              <nav className="hidden items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-50/5 p-1.5 text-sm text-yellow-100/80 md:flex">
                {navItems.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2 transition ${
                      index === 0
                        ? "bg-yellow-400/20 text-yellow-50 shadow-inner"
                        : "text-yellow-100/70 hover:bg-yellow-400/15 hover:text-yellow-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-3">
                <button className="hidden rounded-full border border-yellow-400/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-100/80 transition hover:border-yellow-300 hover:text-yellow-50 md:inline-flex">
                  Docs
                </button>
                <button className="rounded-full bg-yellow-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-lg shadow-yellow-500/30 transition hover:-translate-y-0.5 hover:bg-yellow-300">
                  New plan
                </button>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
