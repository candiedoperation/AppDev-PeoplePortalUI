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

import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { CalendarX2Icon, ClipboardListIcon, ClockIcon, Loader2, MapPinIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"


type Visibility = "public" | "internal" | "exec"
type MarketingChannels = "email" | "slack" | "discord"

interface EventDoc {
    _id: string
    eventName: string
    eventDescription: string
    startTime: string
    endTime: string
    location: string
    scope: Visibility
    marketingChannels: MarketingChannels[]
}

interface EventForm {
    eventName: string
    eventDescription: string
    startTime: string
    endTime: string
    location: string
    scope: Visibility
    marketingChannels: Set<MarketingChannels>
    notify: boolean
}

const emptyForm: EventForm = {
    eventName: "",
    eventDescription: "",
    startTime: "",
    endTime: "",
    location: "",
    scope: "internal",
    marketingChannels: new Set<MarketingChannels>(),
    notify: true,
}

const toLocalInput = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const eventToForm = (event: EventDoc): EventForm => ({
    eventName: event.eventName,
    eventDescription: event.eventDescription,
    startTime: toLocalInput(event.startTime),
    endTime: toLocalInput(event.endTime),
    location: event.location,
    scope: event.scope,
    marketingChannels: new Set(event.marketingChannels),
    notify: true,
})

const formatRange = (startISO: string, endISO: string) => {
    const start = new Date(startISO)
    const end = new Date(endISO)
    const sameDay = start.toDateString() === end.toDateString()
    const dateOpts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" }
    const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" }
    if (sameDay) {
        return `${start.toLocaleDateString(undefined, dateOpts)} · ${start.toLocaleTimeString(undefined, timeOpts)} – ${end.toLocaleTimeString(undefined, timeOpts)}`
    }
    return `${start.toLocaleString(undefined, { ...dateOpts, ...timeOpts })} → ${end.toLocaleString(undefined, { ...dateOpts, ...timeOpts })}`
}

const EventsEmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <CalendarX2Icon className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">{label}</p>
    </div>
)

const EventCard = ({ event, onEdit }: { event: EventDoc; onEdit?: (e: EventDoc) => void }) => {
    const navigate = useNavigate()
    return (
        <Card className="gap-0 [&>*:first-child]:pt-4 [&>*:last-child]:pb-3">
            <CardHeader className="pt-1 pb-0">
                <div className="flex items-start justify-between gap-0">
                    <div className="flex flex-col items-baseline gap-x-2 gap-y-0.5">
                        <CardTitle className="text-base">{event.eventName}</CardTitle>
                        <CardDescription className="flex items-center gap-1 text-m text-muted-foreground">
                            <ClockIcon className="size-3" />
                            {formatRange(event.startTime, event.endTime)}
                        </CardDescription>
                    </div>
                    <Badge variant={event.scope === "public" ? "default" : "secondary"} className="shrink-0">
                        {event.scope === "exec" ? "Executive" : event.scope ? event.scope.charAt(0).toUpperCase() + event.scope.slice(1) : "Internal"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pb-2">
                <p className="text-sm whitespace-pre-wrap">{event.eventDescription}</p>
            </CardContent>
            <CardFooter className="justify-end gap-2">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-auto">
                    <MapPinIcon className="size-3.5" />
                    {event.location}
                </div>
                {
                    onEdit !== undefined && <>
                        <Button variant="outline" size="sm" onClick={() => onEdit(event)}>
                            <PencilIcon />
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/community/events/${event._id}/attendance`)}
                        >
                            <ClipboardListIcon />
                            Attendance
                        </Button>
                    </>
                }
            </CardFooter>
        </Card>
    )
}

const EventList = ({ events, onEdit }: { events: EventDoc[]; onEdit: (e: EventDoc) => void }) => (
    <div className="flex flex-col gap-3">
        {events.map((event) => (
            <EventCard key={event._id} event={event} onEdit={onEdit} />
        ))}
    </div>
)

const EventListSkeleton = () => (
    <div className="flex flex-col gap-3">
        {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
        ))}
    </div>
)

interface EventFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "create" | "edit"
    editingEvent?: EventDoc
    onSaved: () => void
}

const EventFormDialog = ({ open, onOpenChange, mode, editingEvent, onSaved }: EventFormDialogProps) => {
    const [form, setForm] = useState<EventForm>(emptyForm)
    const [submitting, setSubmitting] = useState(false)

    type SetKeys<T> = {
        [K in keyof T]: T[K] extends Set<any> ? K : never;
    }[keyof T];

    useEffect(() => {
        if (!open) return
        setForm(mode === "edit" && editingEvent ? eventToForm(editingEvent) : emptyForm)
    }, [open, mode, editingEvent])

    const update = <K extends keyof EventForm>(key: K, value: EventForm[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const updateSet = <K extends SetKeys<EventForm>>(
        key: K,
        item: EventForm[K] extends Set<infer U> ? U : never, // Automatically gets the type inside the Set (e.g., string)
        action: 'add' | 'remove'
    ) => {
        setForm((prev) => {
            // Create a new Set instance from the existing one to trigger a re-render
            const newSet = new Set(prev[key] as Set<any>);

            if (action === 'add') {
                newSet.add(item);
            } else if (action === 'remove') {
                newSet.delete(item);
            }

            return {
                ...prev,
                [key]: newSet,
            };
        });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (submitting) return

        const start = new Date(form.startTime)
        const end = new Date(form.endTime)


        if (end < start) {
            toast.error("End time can't be before start time.")
            return
        }

        setSubmitting(true)
        try {
            let res: Response
            if (mode === "create") {
                res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: form.eventName,
                        description: form.eventDescription,
                        startTime: start.toISOString(),
                        endTime: end.toISOString(),
                        location: form.location,
                        scope: form.scope,
                        marketingChannels: [...form.marketingChannels],
                    }),
                })
            } else {
                if (!editingEvent) return
                res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${editingEvent._id}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        notify: form.notify,
                        eventName: form.eventName,
                        eventDescription: form.eventDescription,
                        startTime: start.toISOString(),
                        endTime: end.toISOString(),
                        location: form.location,
                    }),
                })
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                toast.error(`Failed to ${mode === "create" ? "create" : "update"} event: ${errorData.message || res.statusText}`)
                return
            }

            const data = await res.json().catch(() => ({}))
            toast.success(mode === "create" ? "Event created successfully." : "Event updated successfully.")
            if (Array.isArray(data.issues) && data.issues.length > 0) {
                data.issues.forEach((issue: string) => toast.warning(issue))
            }
            onOpenChange(false)
            onSaved()
        } catch (err: any) {
            toast.error(`Error: ${err.message}`)
        } finally {
            setSubmitting(false)
        }
    }

    const isEdit = mode === "edit"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Event" : "New Event"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Update the details of this event." : "Fill in the details below to create a new event."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="eventName">Name</Label>
                        <Input
                            id="eventName"
                            value={form.eventName}
                            onChange={(e) => update("eventName", e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="eventDescription">Description</Label>
                        <Textarea
                            id="eventDescription"
                            value={form.eventDescription}
                            onChange={(e) => update("eventDescription", e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="startTime">Start time</Label>
                            <Input
                                id="startTime"
                                type="datetime-local"
                                className="dark:[&::-webkit-calendar-picker-indicator]:invert"
                                value={form.startTime}
                                onChange={(e) => update("startTime", e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="endTime">End time</Label>
                            <Input
                                id="endTime"
                                type="datetime-local"
                                className="dark:[&::-webkit-calendar-picker-indicator]:invert"
                                value={form.endTime}
                                onChange={(e) => update("endTime", e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            value={form.location}
                            onChange={(e) => update("location", e.target.value)}
                            required
                        />
                    </div>
                    {!isEdit && (
                        <>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="visibility">Visibility</Label>
                                <Select
                                    value={form.scope}
                                    onValueChange={(v) => update("scope", v as Visibility)}
                                >
                                    <SelectTrigger id="visibility">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="exec">Executive — visible to Executive Board Members only</SelectItem>
                                        <SelectItem value="internal">Internal — visible to members only</SelectItem>
                                        <SelectItem value="public">Public — visible to everyone</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-3 rounded-md border p-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="slack">Announce via Email</Label>
                                    <Switch
                                        id="email"
                                        checked={form.marketingChannels.has("email")}
                                        onCheckedChange={(v) => updateSet("marketingChannels", "email", v ? "add" : "remove")}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="slack">Announce on Slack</Label>
                                    <Switch
                                        id="slack"
                                        checked={form.marketingChannels.has("slack")}
                                        onCheckedChange={(v) => updateSet("marketingChannels", "slack", v ? "add" : "remove")}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="discord">Announce on Discord</Label>
                                    <Switch
                                        id="discord"
                                        checked={form.marketingChannels.has("discord")}
                                        onCheckedChange={(v) => updateSet("marketingChannels", "discord", v ? "add" : "remove")}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                    {isEdit && (
                        <div className="flex items-center justify-between rounded-md border p-3">
                            <div className="flex flex-col">
                                <Label htmlFor="notify">Notify invitees</Label>
                                <span className="text-xs text-muted-foreground">Send an update email / Slack / Discord announcement.</span>
                            </div>
                            <Switch
                                id="notify"
                                checked={form.notify}
                                onCheckedChange={(v) => update("notify", v)}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={submitting}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <Loader2 className="animate-spin" />}
                            {isEdit ? "Save Changes" : "Create Event"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export const Events = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
    const [editingEvent, setEditingEvent] = useState<EventDoc | undefined>(undefined)
    const [events, setEvents] = useState<EventDoc[]>([])
    const [loadingEvents, setLoadingEvents] = useState(true)

    const refreshEvents = useCallback(async () => {
        setLoadingEvents(true)
        try {
            const listRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/`, {
                credentials: "include",
            })
            if (!listRes.ok) {
                toast.error(`Failed to load events: ${listRes.statusText}`)
                setEvents([])
                return
            }
            const listData: { data: string[] } = await listRes.json()
            const docs = await Promise.all(
                listData.data.map(async (id) => {
                    const r = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${id}`, {
                        credentials: "include",
                    })
                    if (!r.ok) return null
                    return (await r.json()).data as EventDoc
                })
            )
            setEvents(docs.filter((d): d is EventDoc => d !== null))
        } catch (err: any) {
            toast.error(`Error loading events: ${err.message}`)
            setEvents([])
        } finally {
            setLoadingEvents(false)
        }
    }, [])

    useEffect(() => {
        refreshEvents()
    }, [refreshEvents])

    const { upcoming, past } = useMemo(() => {
        const now = Date.now()
        const upcoming: EventDoc[] = []
        const past: EventDoc[] = []
        for (const ev of events) {
            if (new Date(ev.endTime).getTime() >= now) upcoming.push(ev)
            else past.push(ev)
        }
        upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        past.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        return { upcoming, past }
    }, [events])

    const openCreate = () => {
        setEditingEvent(undefined)
        setDialogMode("create")
        setDialogOpen(true)
    }

    const openEdit = (event: EventDoc) => {
        setEditingEvent(event)
        setDialogMode("edit")
        setDialogOpen(true)
    }

    return (
        <div className="flex min-h-full flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-3">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Events</h1>
                    <h4 className="text-xl text-muted-foreground">Create club events, manage RSVPs, and track attendance</h4>
                </div>
                <Button className="shrink-0" onClick={openCreate}>
                    <PlusIcon />
                    New Event
                </Button>
            </div>

            <EventFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                mode={dialogMode}
                editingEvent={editingEvent}
                onSaved={refreshEvents}
            />

            <Tabs defaultValue="upcoming" className="flex flex-1 flex-col gap-4">
                <TabsList>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming" className="flex flex-1 flex-col">
                    {loadingEvents ? (
                        <EventListSkeleton />
                    ) : upcoming.length === 0 ? (
                        <EventsEmptyState label="No upcoming events yet. Create one to get started." />
                    ) : (
                        <EventList events={upcoming} onEdit={openEdit} />
                    )}
                </TabsContent>
                <TabsContent value="past" className="flex flex-1 flex-col">
                    {loadingEvents ? (
                        <EventListSkeleton />
                    ) : past.length === 0 ? (
                        <EventsEmptyState label="No past events to show." />
                    ) : (
                        <EventList events={past} onEdit={openEdit} />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
