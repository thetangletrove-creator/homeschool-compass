import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("text-navy", className)}
      aria-hidden="true"
    >
      {/* Shield body */}
      <path
        d="M16 1.5L4 6.5V15c0 9 6.5 14.5 12 16.5 5.5-2 12-7.5 12-16.5V6.5L16 1.5z"
        fill="currentColor"
      />
      {/* Compass rose — cardinal points inside shield */}
      {/* North point */}
      <path
        d="M16 8.5L18.5 14H13.5L16 8.5z"
        fill="var(--action)"
      />
      {/* South point */}
      <path
        d="M16 23.5L13.5 18H18.5L16 23.5z"
        fill="var(--cream)"
      />
      {/* East point */}
      <path
        d="M23.5 16L18 13.5V18.5L23.5 16z"
        fill="var(--cream)"
      />
      {/* West point */}
      <path
        d="M8.5 16L14 13.5V18.5L8.5 16z"
        fill="var(--cream)"
      />
      {/* Center dot */}
      <circle cx="16" cy="16" r="1.5" fill="var(--cream)" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-7 w-7" />
      <div className="flex flex-col leading-none">
        <span className="font-heading text-base font-semibold tracking-tight text-navy">
          Homeschool Compass
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-meta">
          ESA Compliance
        </span>
      </div>
    </div>
  )
}
