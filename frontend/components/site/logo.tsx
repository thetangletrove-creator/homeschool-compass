import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("text-navy dark:text-foreground", className)}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="16" cy="16" r="13.5" stroke="currentColor" strokeWidth="1.5" />

      {/* North point — action blue, always the standout */}
      <path d="M16,3.5 L20,14 L12,14 Z" fill="var(--action)" />

      {/* South point */}
      <path d="M16,28.5 L20,18 L12,18 Z" fill="currentColor" />

      {/* East point */}
      <path d="M28.5,16 L18,12 L18,20 Z" fill="currentColor" />

      {/* West point */}
      <path d="M3.5,16 L14,12 L14,20 Z" fill="currentColor" />

      {/* Center anchor */}
      <circle cx="16" cy="16" r="1.5" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-7 w-7" />
      <div className="flex flex-col leading-none">
        <span className="font-heading text-base font-semibold tracking-tight text-navy dark:text-foreground">
          Homeschool Compass
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-meta">
          ESA Compliance
        </span>
      </div>
    </div>
  )
}
