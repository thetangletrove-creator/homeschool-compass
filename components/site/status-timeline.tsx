import { cn } from "@/lib/utils"
import { BILL_STEPS } from "@/lib/data"

const SHORT_LABELS = [
  "Introduced",
  "Committee",
  "Chamber",
  "Other Chamber",
  "Governor",
  "Law",
]

export function StatusTimeline({ activeStep }: { activeStep: number }) {
  return (
    <ol className="flex w-full items-start justify-between">
      {BILL_STEPS.map((_, i) => {
        const completed = i < activeStep
        const active = i === activeStep
        return (
          <li
            key={i}
            className="relative flex flex-1 flex-col items-center text-center"
          >
            {i < BILL_STEPS.length - 1 && (
              <span
                className={cn(
                  "absolute left-1/2 top-[7px] h-0.5 w-full",
                  completed ? "bg-safe" : "bg-border",
                )}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2",
                completed && "border-safe bg-safe",
                active && "border-navy bg-navy",
                !completed && !active && "border-border bg-background",
              )}
            />
            <span
              className={cn(
                "mt-2 text-[10px] font-medium uppercase tracking-[0.04em]",
                active ? "text-navy" : "text-meta",
              )}
            >
              {SHORT_LABELS[i]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
