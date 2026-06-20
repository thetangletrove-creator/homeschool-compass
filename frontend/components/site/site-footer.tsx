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
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "For Parents", href: "/for-parents" },
      { label: "Methodology", href: "/methodology" },
      { label: "Scorecard (Free →)", href: "/scorecard" },
      { label: "Data Sources", href: "/methodology" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Disclaimer", href: "/disclaimer" },
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
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-cream/80">
              <span className="font-medium">Not sure where to start?</span>{' '}
              <Link href="/scorecard" className="text-action underline underline-offset-4 hover:no-underline">
                See Your State&rsquo;s Grade →
              </Link>
            </p>
            <p className="mt-1 text-xs text-cream/50">
              ⭐ Accuracy Guaranteed  ·  50 States Tracked  ·  Real-Time Alerts  ·  SSL Secured
            </p>
          </div>
          <div className="mt-4">
            <p className="text-sm text-cream/60">
              This is not legal advice. Consult an attorney for your situation.
            </p>
            <p className="mt-2 text-sm text-cream/50">
              © 2026 The Homeschool Compass. Built with legislative data from LegiScan
              and OpenStates.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
