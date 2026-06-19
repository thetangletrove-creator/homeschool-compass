import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("text-navy", className)}
      aria-hidden="true"
    >
      {/* Shield silhouette */}
      <path
        d="M16 2 L28 6 V15 C28 23 22.5 28 16 30.5 C9.5 28 4 23 4 15 V6 Z"
        fill="currentColor"
      />
      {/* Checkmark cut-out */}
      <path
        d="M11 16.2 L14.5 19.8 L21.5 11.5"
        stroke="var(--cream)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-7 w-7" />
      <div className="flex flex-col leading-none">
        <span className="font-heading text-base font-semibold tracking-tight text-navy">
          Tangle Trove
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-meta">
          Regulation Tracker
        </span>
      </div>
    </div>
  )
}
