import Link from "next/link"
import { LogoMark } from "./logo"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Scorecard", href: "/scorecard" },
      { label: "Alerts", href: "/dashboard" },
      { label: "ESA Guide", href: "/esa" },
      { label: "API Docs", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Methodology", href: "/about" },
      { label: "Data Sources", href: "/about" },
      { label: "HSLDA Partnership", href: "/about" },
      { label: "Blog", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Disclaimer", href: "#" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-navy text-cream">
      <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-7 w-7 text-cream" />
              <span className="font-heading text-base font-semibold tracking-tight">
                Homeschool Compass
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/70">
              Regulatory intelligence for homeschool families. Track legislation
              before it affects your filing deadline.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-medium uppercase tracking-[0.05em] text-cream/50">
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-cream/80 transition-colors hover:text-cream"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-cream/15 pt-6">
          <p className="text-sm text-cream/60">
            This is not legal advice. Consult an attorney for your situation.
          </p>
          <p className="mt-2 text-sm text-cream/50">
            © 2026 The Homeschool Compass. Built with legislative data from LegiScan
            and OpenStates.
          </p>
        </div>
      </div>
    </footer>
  )
}
