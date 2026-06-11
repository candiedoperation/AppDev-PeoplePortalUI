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
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeftIcon, ClockIcon, Loader2, MapPinIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useCallback, useEffect, useState, type FormEvent } from "react"
import { redirect, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "../ui/pagination"
import React from "react"


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
    notify: boolean
}

const emptyForm: EventForm = {
    eventName: "",
    eventDescription: "",
    startTime: "",
    endTime: "",
    location: "",
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
    notify: true,
})

interface EventFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: "edit" | "cancel"
    editingEvent?: EventDoc
    onSaved: () => void
}

type RsvpStatus = "Accept" | "Decline" | "Cancel"

interface RsvpDoc {
    _id: string
    eventId: string
    email: string
    status: RsvpStatus
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

const EventFormDialog = ({ open, onOpenChange, mode, editingEvent, onSaved }: EventFormDialogProps) => {
    const [form, setForm] = useState<EventForm>(emptyForm)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return
        if (editingEvent === undefined) return
        setForm(eventToForm(editingEvent))
    }, [open, mode, editingEvent])

    const update = <K extends keyof EventForm>(key: K, value: EventForm[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }))

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
        let exit = false;
        try {
            if (!editingEvent) return
            let res: Response
            if (mode === "edit") {
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
            } else if (mode === "cancel") {
                res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${editingEvent._id}`, {
                    method: "DELETE",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        notify: form.notify
                    }),
                })
            } else {
                return;
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                toast.error(`Failed to ${mode === "edit" ? "update" : "cancel"} event: ${errorData.message || res.statusText}`)
                return
            }

            exit = mode === "cancel"

            const data = await res.json().catch(() => ({}))
            toast.success(mode === "edit" ? "Event updated successfully." : "Event cancelled successfully.")
            if (Array.isArray(data.issues) && data.issues.length > 0) {
                data.issues.forEach((issue: string) => toast.warning(issue))
            }
            onOpenChange(false)
            if (!exit) onSaved()
        } catch (err: any) {
            toast.error(`Error: ${err.message}`)
        } finally {
            setSubmitting(false)
            if (exit) {
                const navigate = useNavigate()
                navigate(`/community/events/`)
            }
        }
    }

    const isEdit = mode === "edit"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Event" : "Cancel Event"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Update the details of this event." : "Cancel the event."}
                    </DialogDescription>
                    {!isEdit && <>
                        <h1><b>WARNING</b></h1>
                        <p>This is an irreversible action. Ensure that this event should be deleted before continuing.</p>    
                    </>}
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {isEdit && <>
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
                    </>}
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
                    
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={submitting}>Close</Button>
                        </DialogClose>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <Loader2 className="animate-spin" />}
                            {isEdit ? "Save Changes" : "Cancel Event"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}


export const EventAttendance = () => {
    const { eventId } = useParams()
    const navigate = useNavigate()
    const [event, setEvent] = useState<EventDoc | null>(null)
    const [rsvp, setRsvp] = useState<RsvpDoc | null>(null)
    const [loading, setLoading] = useState(true)

    const [rsvps, setRsvps] = useState<RsvpDoc[]>([])
    const [page, setPage] = useState<number>(1)
    const [debouncedPage, setDebouncedPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0)
    const [showRsvps, setShowRsvps] = useState(false)
    const [rsvpsLoading, setRsvpsLoading] = useState(false)

    const [accept, setAccept] = useState<boolean>(true)
    const [updating, setUpdating] = useState(false)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"edit" | "cancel">("edit")
    const [editingEvent, setEditingEvent] = useState<EventDoc | undefined>(undefined)

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedPage(page);
        }, 250);
        return () => clearTimeout(handler); 
    }, [page])

    const openEdit = (event: EventDoc) => {
        setEditingEvent(event)
        setDialogMode("edit")
        setDialogOpen(true)
    }

    const openCancel = (event: EventDoc) => {
        setEditingEvent(event)
        setDialogMode("cancel")
        setDialogOpen(true)
    }

    const submitRsvp = async (acceptRsvp: boolean) => {
        
        const res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${eventId}/rsvp`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                accept: acceptRsvp
            }),
        })

        if (!res.ok) {
            toast.error(`Failed to RSVP to event: ${res.statusText}`)
            return
        }

        toast.success("Successfully RSVP'd to event!");

        const rsvpRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${eventId}/rsvp`, { credentials: "include" })
        if (rsvpRes.ok) {
            setRsvp((await rsvpRes.json()).rsvp)
        } else {
            toast.error(`Failed to refresh RSVP: ${rsvpRes.statusText}`)
            return
        }
    }   

    /* Pagination Logic Helpers */
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    const load = useCallback(async () => {
        if (!eventId) return
        setLoading(true)
        try {
            const queryString = new URLSearchParams({
                page: "1",
                pageSize: "25",
            })
            const [eventRes, rsvpRes, allRsvpRes] = await Promise.all([
                fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${eventId}`, { credentials: "include" }),
                fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${eventId}/rsvp`, { credentials: "include" }),
                fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${eventId}/rsvps?${queryString}`, { credentials: "include" }),
            ])

            if (!eventRes.ok) {
                toast.error(`Failed to load event: ${eventRes.statusText}`)
                navigate("/community/events")
                return
            }
            setEvent((await eventRes.json()).data)

            if (!rsvpRes.ok) {
                toast.error(`Failed to fetch RSVP: ${rsvpRes.statusText}`)
                navigate("/community/events")
                return
            }
            setRsvp((await rsvpRes.json()).rsvp)

            if (allRsvpRes.status === 401 || allRsvpRes.status === 403) {
                setShowRsvps(false)
                setRsvps([])
            } else if (allRsvpRes.ok) {
                setShowRsvps(true)
                const rsvpJson = await allRsvpRes.json();
                setRsvps(rsvpJson.data ?? [])
                setTotalPages(rsvpJson.pagination.totalPages)
                setPage(1)
            } else {
                setShowRsvps(true)
                toast.error(`Failed to load RSVPs: ${allRsvpRes.statusText}`)
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

    const refreshList = () => {
        setRsvpsLoading(true)
        const queryString = new URLSearchParams({
                page: debouncedPage.toString(),
                pageSize: "25",
            })
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/events/${eventId}/rsvps?${queryString}`, { credentials: "include" })
            .then(async (res) => {
                const rsvpJson = await res.json()
                if (!res.ok) {
                    throw new Error(rsvpJson.message || "Failed to fetch RSVP data")
                }
                setRsvps(rsvpJson.data ?? [])
                setTotalPages(rsvpJson.pagination.totalPages)
            })
            .catch((e) => {
                toast.error(`Failed to fetch RSVPs: ${e.message}`)
            })
            .finally(() => {
                setRsvpsLoading(false)
            })
    }
    React.useEffect(() => {
        refreshList()
    }, [debouncedPage]);


    return (
        <div className="flex min-h-full flex-col gap-6">
            <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => navigate("/community/events")}>
                    <ArrowLeftIcon />
                    Back
                </Button>
                <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight">Attendance</h1>
            </div>

            <EventFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                mode={dialogMode}
                editingEvent={editingEvent}
                onSaved={load}
            />

            {loading || !event ? (
                <Skeleton className="h-40 w-full" />
            ) : (
                <>
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
                                {event.scope === "exec" ? "Executive" : event.scope.charAt(0).toUpperCase() + event.scope.slice(1)}
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
                            // showRsvps is only true if user has event management perms, so show edit and cancel event buttons.
                            showRsvps && <>
                                <Button variant="outline" size="sm" onClick={() => {openEdit(event)}}>
                                    <PencilIcon />
                                    Edit
                                </Button>
                                <Button
                                    variant="outline" size="sm" onClick={() => {openCancel(event)}}
                                >
                                    <Trash2Icon />
                                    Cancel
                                </Button>
                            </>
                        }
                    </CardFooter>
                </Card>
                </>
            )}

            <div className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold">RSVP</h2>
                {loading ? (
                    <Skeleton className="h-18" />
                ) : rsvp === null ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Will you attend?</CardTitle>
                            <CardDescription>Let us know if you can make it.</CardDescription>
                            <CardDescription>Note: You will be able to update your RSVP later.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Button
                                    variant={accept ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setAccept(true)}
                                >
                                    Accept
                                </Button>
                                <Button
                                    variant={!accept ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setAccept(false)}
                                >
                                    Decline
                                </Button>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant={"secondary"} onClick={() => submitRsvp(accept)}>Submit RSVP</Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <CardTitle className="text-base">Your RSVP</CardTitle>
                                <CardDescription>
                                    {rsvp.updatedAt
                                        ? `Last updated ${new Date(rsvp.updatedAt).toLocaleString()}`
                                        : rsvp.createdAt
                                        ? `Submitted ${new Date(rsvp.createdAt).toLocaleString()}`
                                        : "Submitted"}
                                </CardDescription>
                            </div>
                            <Badge variant={statusVariant(rsvp.status)}>{rsvp.status === "Accept" ? "Accepted" : "Declined"}</Badge>
                        </CardHeader>
                        {updating ? (
                            <>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-3">Update your response:</p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={accept ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setAccept(true)}
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            variant={!accept ? "destructive" : "outline"}
                                            size="sm"
                                            onClick={() => setAccept(false)}
                                        >
                                            Decline
                                        </Button>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    <Button onClick={() => { submitRsvp(accept); setUpdating(false) }}>
                                        Update RSVP
                                    </Button>
                                    <Button variant="outline" onClick={() => setUpdating(false)}>
                                        Cancel
                                    </Button>
                                </CardFooter>
                            </>
                        ) : (
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setAccept(rsvp.status === "Accept"); setUpdating(true) }}
                                >
                                    Update RSVP
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                )}

                { (!loading && showRsvps) &&
                    <>
                    <div className="flex items-center justify-between mt-3">
                    <h2 className="text-xl font-semibold mt-3">All RSVPs</h2>
                    
                    {rsvps.length > 0 && (
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious 
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); if (page > 1) setPage(p => p - 1) }}
                                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                            {getPageNumbers().map(p => (
                                <PaginationItem key={p}>
                                    <PaginationLink
                                        href="#"
                                        isActive={p === page}
                                        onClick={(e) => { e.preventDefault(); setPage(p) }}
                                    >
                                        {p}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(p => p + 1) }}
                                    className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    )}
                    </div>
                    {rsvps.length === 0 ? (
                        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
                            No RSVPs yet.
                        </div>
                    ) : (
                        <div className="rounded-lg border mb-10">
                            <Table>
                                <TableHeader>
                                    <TableRow className="relative">
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Responded</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className={`${rsvpsLoading ? "opacity-50" : ""}`}>
                                    {rsvps.map((r) => (
                                        <TableRow key={r._id}>
                                            <TableCell className="font-medium">{r.email}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    </>
                }
                
            </div>
        </div>
    )
}
