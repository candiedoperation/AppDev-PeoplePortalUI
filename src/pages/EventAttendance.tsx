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
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeftIcon, ClockIcon, MapPinIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

interface EventDoc {
    _id: string
    eventName: string
    eventDescription: string
    startTime: string
    endTime: string
    location: string
    public: boolean
}

type RsvpStatus = "Accept" | "Decline" | "Cancel"

interface RsvpDoc {
    _id: string
    eventId: string
    email: string
    status: RsvpStatus
    reason?: string
    createdAt?: string
    updatedAt?: string
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

const statusVariant = (status: RsvpStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case "Accept": return "default"
        case "Decline": return "destructive"
        case "Cancel": return "secondary"
    }
}

export const EventAttendance = () => {
    const { eventId } = useParams()
    const navigate = useNavigate()
    const [event, setEvent] = useState<EventDoc | null>(null)
    const [rsvps, setRsvps] = useState<RsvpDoc[]>([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        if (!eventId) return
        setLoading(true)
        try {
            const [eventRes, rsvpRes] = await Promise.all([
                fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${eventId}`, { credentials: "include" }),
                fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${eventId}/rsvps`, { credentials: "include" }),
            ])

            if (!eventRes.ok) {
                toast.error(`Failed to load event: ${eventRes.statusText}`)
                navigate("/community/events")
                return
            }
            setEvent(await eventRes.json())

            if (rsvpRes.ok) {
                const rsvpData: { data: RsvpDoc[] } = await rsvpRes.json()
                setRsvps(rsvpData.data ?? [])
            } else {
                toast.error(`Failed to load RSVPs: ${rsvpRes.statusText}`)
                setRsvps([])
            }
        } catch (err: any) {
            toast.error(`Error loading attendance: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }, [eventId, navigate])

    useEffect(() => {
        load()
    }, [load])

    return (
        <div className="flex min-h-full flex-col gap-6">
            <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => navigate("/community/events")}>
                    <ArrowLeftIcon />
                    Back
                </Button>
                <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight">Attendance</h1>
            </div>

            {loading || !event ? (
                <Skeleton className="h-40 w-full" />
            ) : (
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
            )}

            <div className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold">RSVPs</h2>
                {loading ? (
                    <Skeleton className="h-48 w-full" />
                ) : rsvps.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
                        No RSVPs yet.
                    </div>
                ) : (
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Responded</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rsvps.map((r) => (
                                    <TableRow key={r._id}>
                                        <TableCell className="font-medium">{r.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{r.reason ?? "—"}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    )
}
