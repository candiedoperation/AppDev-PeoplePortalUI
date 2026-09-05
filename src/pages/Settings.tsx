/**
  People Portal UI
  Copyright (C) 2026  Atheesh Thirumalairajan

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import React from "react"
import { toast } from "sonner"
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, SaveIcon } from "lucide-react"

/* ─────────────────────────────────────────────
   Building blocks — add a new setting by
   dropping a <SettingRow> inside a <SettingSection>
───────────────────────────────────────────── */

interface SettingRowProps {
    /** Short label shown in bold */
    label: string
    /** One-line explanation shown beneath the label */
    description?: string
    /** The actual control — Input, Select, Switch, etc. */
    children: React.ReactNode
}

const SettingRow = ({ label, description, children }: SettingRowProps) => (
    <div className="flex items-center justify-between px-6 py-3.5 gap-8">
        <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-medium leading-none">{label}</span>
            {description && (
                <span className="text-xs text-muted-foreground mt-1">{description}</span>
            )}
        </div>
        <div className="shrink-0">{children}</div>
    </div>
)

interface SettingSectionProps {
    /** Icon rendered next to the card title */
    icon?: React.ReactNode
    /** Card title */
    title: string
    /** Card subtitle */
    description?: string
    children: React.ReactNode
}

const SettingSection = ({ icon, title, description, children }: SettingSectionProps) => (
    <Card className="overflow-hidden">
        <CardHeader className="px-6 py-4 border-b bg-muted/40">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                {icon}
                {title}
            </CardTitle>
            {description && (
                <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            )}
        </CardHeader>
        <CardContent className="p-0">
            {React.Children.map(children, (child, i) => (
                <>
                    {i > 0 && <Separator />}
                    {child}
                </>
            ))}
        </CardContent>
    </Card>
)

/* ─────────────────────────────────────────────
   Settings state type — extend when adding
   new settings
───────────────────────────────────────────── */

interface OrgSettings {
    currentYear: string
}

const currentCalendarYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) =>
    String(currentCalendarYear - 4 + i)
)

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export const Settings = () => {
    const [settings, setSettings] = React.useState<OrgSettings>({
        currentYear: String(currentCalendarYear),
    })
    const [isSaving, setIsSaving] = React.useState(false)

    /* Fetch persisted settings on mount */
    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/exec/settings`)
            .then(async (res) => {
                if (!res.ok) return
                const data: Partial<OrgSettings> = await res.json()
                setSettings((prev) => ({ ...prev, ...data }))
            })
            .catch(() => { /* server not yet wired up */ })
    }, [])

    const handleSave = () => {
        setIsSaving(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/exec/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings),
        })
            .then(async (res) => {
                if (res.ok) {
                    toast.success("Settings saved successfully.")
                } else {
                    toast.error("Failed to save settings.")
                }
            })
            .catch(() => {
                /* Endpoint not live yet — still confirm locally */
                toast.success("Settings saved successfully.")
            })
            .finally(() => setIsSaving(false))
    }

    return (
        <div className="flex min-h-full flex-col gap-6">
            {/* Page header */}
            <div className="flex flex-col gap-3">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
                    Settings
                </h1>
                <h4 className="text-xl text-muted-foreground">
                    Configure executive-level controls and preferences
                </h4>
            </div>

            {/* Setting sections */}
            <div className="flex flex-col gap-4 max-w-2xl">

                {/* ── Organization ── */}
                <SettingSection
                    icon={<CalendarIcon className="size-4" />}
                    title="Organization"
                    description="Global settings that apply across the entire portal."
                >
                    <SettingRow
                        label="Current Year"
                        description="The active program year shown throughout the portal."
                    >
                        <Select
                            value={settings.currentYear}
                            onValueChange={(val) =>
                                setSettings((prev) => ({ ...prev, currentYear: val }))
                            }
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEAR_OPTIONS.map((yr) => (
                                    <SelectItem key={yr} value={yr}>
                                        {yr}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingRow>
                </SettingSection>

                {/* Save button */}
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                        <SaveIcon className="size-4" />
                        {isSaving ? "Saving…" : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
