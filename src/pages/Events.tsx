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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { CalendarX2Icon, ClockIcon, Loader2, MapPinIcon, PlusIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"

const EventsEmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <CalendarX2Icon className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">{label}</p>
    </div>
)

interface EventDoc {
    _id: string
    eventName: string
    eventDescription: string
    startTime: string
    endTime: string
    location: string
    public: boolean
    slack?: boolean
    discord?: boolean
}

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

const EventCard = ({ event }: { event: EventDoc }) => (
    <Card>
        <CardHeader>
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <CardTitle>{event.eventName}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5">
                        <ClockIcon className="size-3.5" />
                        {formatRange(event.startTime, event.endTime)}
                    </CardDescription>
                </div>
                <Badge variant={event.public ? "default" : "secondary"} className="shrink-0">
                    {event.public ? "Public" : "Internal"}
                </Badge>
            </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
            <p className="text-sm whitespace-pre-wrap">{event.eventDescription}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPinIcon className="size-3.5" />
                {event.location}
            </div>
        </CardContent>
    </Card>
)

const EventList = ({ events }: { events: EventDoc[] }) => (
    <div className="flex flex-col gap-3">
        {events.map((event) => (
            <EventCard key={event._id} event={event} />
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

type Visibility = "public" | "internal"

interface NewEventForm {
    eventName: string
    eventDescription: string
    startTime: string
    endTime: string
    location: string
    visibility: Visibility
    slack: boolean
    discord: boolean
}

const emptyForm: NewEventForm = {
    eventName: "",
    eventDescription: "",
    startTime: "",
    endTime: "",
    location: "",
    visibility: "internal",
    slack: false,
    discord: false,
}

export const Events = () => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState<NewEventForm>(emptyForm)
    const [events, setEvents] = useState<EventDoc[]>([])
    const [loadingEvents, setLoadingEvents] = useState(true)

    const update = <K extends keyof NewEventForm>(key: K, value: NewEventForm[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }))

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
                    return (await r.json()) as EventDoc
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

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (submitting) return

        const start = new Date(form.startTime)
        const end = new Date(form.endTime)
        if (end < start) {
            toast.error("End time can't be before start time.")
            return
        }

        const payload = {
            title: form.eventName,
            description: form.eventDescription,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            location: form.location,
            public: form.visibility === "public",
            slack: form.slack,
            discord: form.discord,
        }

        setSubmitting(true)
        try {
            const res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/createevent`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                toast.error(`Failed to create event: ${errorData.message || res.statusText}`)
                return
            }

            const data = await res.json()
            toast.success("Event created successfully.")
            if (Array.isArray(data.issues) && data.issues.length > 0) {
                data.issues.forEach((issue: string) => toast.warning(issue))
            }
            setForm(emptyForm)
            setDialogOpen(false)
            refreshEvents()
        } catch (err: any) {
            toast.error(`Error creating event: ${err.message}`)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex min-h-full flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-3">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Events</h1>
                    <h4 className="text-xl text-muted-foreground">Create club events, manage RSVPs, and track attendance</h4>
                </div>
                <Button className="shrink-0" onClick={() => setDialogOpen(true)}>
                    <PlusIcon />
                    New Event
                </Button>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>New Event</DialogTitle>
                        <DialogDescription>Fill in the details below to create a new event.</DialogDescription>
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
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="visibility">Visibility</Label>
                            <Select
                                value={form.visibility}
                                onValueChange={(v) => update("visibility", v as Visibility)}
                            >
                                <SelectTrigger id="visibility">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="internal">Internal — visible to members only</SelectItem>
                                    <SelectItem value="public">Public — visible to everyone</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-3 rounded-md border p-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="slack">Announce on Slack</Label>
                                <Switch
                                    id="slack"
                                    checked={form.slack}
                                    onCheckedChange={(v) => update("slack", v)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="discord">Announce on Discord</Label>
                                <Switch
                                    id="discord"
                                    checked={form.discord}
                                    onCheckedChange={(v) => update("discord", v)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={submitting}>Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="animate-spin" />}
                                Create Event
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
                        <EventList events={upcoming} />
                    )}
                </TabsContent>
                <TabsContent value="past" className="flex flex-1 flex-col">
                    {loadingEvents ? (
                        <EventListSkeleton />
                    ) : past.length === 0 ? (
                        <EventsEmptyState label="No past events to show." />
                    ) : (
                        <EventList events={past} />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
