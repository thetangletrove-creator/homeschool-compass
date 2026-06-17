"use client"

import type React from "react"
import { useState, useTransition } from "react"
import type { StateData } from "@/lib/types"
import { updateAlertPreferences } from "@/lib/actions/alerts"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type Prefs = {
  userId: string
  states: string[]
  impactTypes: string[]
  esaOnly: boolean
  channelEmail: boolean
  channelSms: boolean
  weeklyDigest: boolean
}

const ALL_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
]

const IMPACT_TYPES = [
  { value: "increase", label: "Increase regulation" },
  { value: "decrease", label: "Decrease regulation" },
  { value: "neutral", label: "Neutral / administrative" },
]

export function SettingsForm({ prefs }: { prefs: Prefs }) {
  const [states, setStates] = useState<string[]>(prefs.states)
  const [impactTypes, setImpactTypes] = useState<string[]>(prefs.impactTypes)
  const [esaOnly, setEsaOnly] = useState(prefs.esaOnly)
  const [channelEmail, setChannelEmail] = useState(prefs.channelEmail)
  const [channelSms, setChannelSms] = useState(prefs.channelSms)
  const [weeklyDigest, setWeeklyDigest] = useState(prefs.weeklyDigest)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggleState(code: string) {
    setSaved(false)
    setStates((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    )
  }

  function toggleImpact(type: string) {
    setSaved(false)
    setImpactTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    )
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        await updateAlertPreferences({
          states,
          impactTypes: impactTypes.length > 0 ? impactTypes : ["increase"],
          esaOnly,
          channelEmail,
          channelSms,
          weeklyDigest,
        })
        setSaved(true)
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-10">
      {/* State picker */}
      <fieldset>
        <legend className="mb-1 text-lg font-semibold text-navy">
          States to monitor
        </legend>
        <p className="mb-4 text-sm text-muted-foreground">
          We&rsquo;ll alert you when bills are introduced or advance in these states.
          Leave empty to monitor all states.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStates([])}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-cream"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => setStates(ALL_STATES.map((s) => s.code))}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-cream"
          >
            All 50
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {ALL_STATES.map((s) => {
            const checked = states.includes(s.code)
            return (
              <label
                key={s.code}
                htmlFor={`state-${s.code}`}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                  checked
                    ? "bg-navy/10 text-navy font-medium"
                    : "text-muted-foreground hover:bg-cream"
                }`}
              >
                <input
                  id={`state-${s.code}`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleState(s.code)}
                  className="h-3.5 w-3.5 rounded border-border text-navy accent-navy"
                />
                {s.code}
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* Impact types */}
      <fieldset>
        <legend className="mb-1 text-lg font-semibold text-navy">
          Impact types
        </legend>
        <p className="mb-3 text-sm text-muted-foreground">
          Which bill impacts should trigger an alert?
        </p>
        <div className="flex flex-wrap gap-3">
          {IMPACT_TYPES.map((it) => (
            <label
              key={it.value}
              htmlFor={`impact-${it.value}`}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-cream"
            >
              <input
                id={`impact-${it.value}`}
                type="checkbox"
                checked={impactTypes.includes(it.value)}
                onChange={() => toggleImpact(it.value)}
                className="h-3.5 w-3.5 rounded border-border accent-navy"
              />
              {it.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Channels */}
      <fieldset className="flex flex-col gap-4">
        <legend className="text-lg font-semibold text-navy">
          Alert channels
        </legend>
        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <Label htmlFor="channelEmail" className="text-sm font-medium">
              Email alerts
            </Label>
            <p className="text-xs text-muted-foreground">
              Real-time alerts sent to your email address
            </p>
          </div>
          <Switch
            id="channelEmail"
            checked={channelEmail}
            onCheckedChange={(c) => {
              setSaved(false)
              setChannelEmail(c)
            }}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <Label htmlFor="channelSms" className="text-sm font-medium">
              SMS alerts
            </Label>
            <p className="text-xs text-muted-foreground">
              Text message for urgent bill changes (requires phone number)
            </p>
          </div>
          <Switch
            id="channelSms"
            checked={channelSms}
            onCheckedChange={(c) => {
              setSaved(false)
              setChannelSms(c)
            }}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <Label htmlFor="weeklyDigest" className="text-sm font-medium">
              Weekly digest
            </Label>
            <p className="text-xs text-muted-foreground">
              A Sunday summary of all bill activity in your monitored states
            </p>
          </div>
          <Switch
            id="weeklyDigest"
            checked={weeklyDigest}
            onCheckedChange={(c) => {
              setSaved(false)
              setWeeklyDigest(c)
            }}
          />
        </div>
      </fieldset>

      {/* ESA only */}
      <fieldset className="flex items-center justify-between rounded-md border border-border px-4 py-3">
        <div>
          <Label htmlFor="esaOnly" className="text-sm font-medium">
            ESA-related bills only
          </Label>
          <p className="text-xs text-muted-foreground">
            Only alert on bills that affect Education Savings Accounts / vouchers
          </p>
        </div>
        <Switch
          id="esaOnly"
          checked={esaOnly}
          onCheckedChange={(c) => {
            setSaved(false)
            setEsaOnly(c)
          }}
        />
      </fieldset>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={pending}
          className="bg-navy text-primary-foreground hover:bg-navy/90"
        >
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save preferences
        </Button>
        {saved && (
          <span className="text-sm font-medium text-safe">Saved ✓</span>
        )}
        {error && (
          <span className="text-sm text-reg-up" role="alert">
            {error}
          </span>
        )}
      </div>
    </form>
  )
}
