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
import { format, isAfter, isBefore, startOfDay } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Checkbox } from "../ui/checkbox"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import { DatePicker } from "./DatePicker"

const DATE_FMT = "yyyy-MM-dd"
const TIME_FMT = "HH:mm"

/** Combines a "yyyy-MM-dd" date and a "HH:mm" time into a local Date. */
const combine = (dateStr: string, timeStr: string): Date => new Date(`${dateStr}T${timeStr}`)

/** A team member selectable as a meeting attendee. */
export interface RosterMember {
  pk: number
  name: string
  username: string
  email: string
}

/** How an attendee is invited; absence from the map means "not invited". */
export type AttendeeRole = "required" | "optional"

/** A subteam selectable as a meeting attendee, invited by reference. */
export interface SubteamOption {
  pk: string
  name: string
}

/** Everything the dialog collects for a create or edit. */
export interface MeetingDraft {
  name: string
  description: string
  start: Date
  end: Date
  recurring?: boolean
  requiredAttendees?: number[]
  optionalAttendees?: number[]
  /** Subteam group PKs invited by reference (membership resolved live) */
  requiredSubteams?: string[]
  optionalSubteams?: string[]
  /** Whether uninvited team members can see this meeting */
  visibleToAll: boolean
}

export interface NewMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog operates in edit mode */
  meetingId?: string
  initialName?: string
  initialDescription?: string
  initialStart?: Date
  initialEnd?: Date
  initialVisibleToAll?: boolean
  /** Inclusive bounds: dates outside the team's lifespan can't be picked. */
  minDate?: Date
  maxDate?: Date
  /** Team members offered in the attendee picker (create mode only) */
  roster?: RosterMember[]
  /** Subteams offered in the attendee picker (create mode only) */
  subteams?: SubteamOption[]
  onConfirm: (draft: MeetingDraft) => void
}

export const NewMeetingDialog = (props: NewMeetingDialogProps) => {
  const isEditing = Boolean(props.meetingId)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [date, setDate] = React.useState("")
  const [startTime, setStartTime] = React.useState("09:00")
  const [endTime, setEndTime] = React.useState("10:00")
  const [repeat, setRepeat] = React.useState(false)
  /** Selected attendees keyed by user pk → invitation role. */
  const [attendees, setAttendees] = React.useState<Map<number, AttendeeRole>>(new Map())
  /** Selected subteams keyed by group pk → invitation role. */
  const [subteamSel, setSubteamSel] = React.useState<Map<string, AttendeeRole>>(new Map())
  const [visibleToAll, setVisibleToAll] = React.useState(false)
  const [memberSearch, setMemberSearch] = React.useState("")

  React.useEffect(() => {
    if (!props.open) return
    const start = props.initialStart ?? new Date()
    const end = props.initialEnd ?? new Date()
    setName(props.initialName ?? "")
    setDescription(props.initialDescription ?? "")
    setDate(format(start, DATE_FMT))
    setStartTime(format(start, TIME_FMT))
    setEndTime(props.initialEnd ? format(end, TIME_FMT) : "10:00")
    setRepeat(false)
    setAttendees(new Map())
    setSubteamSel(new Map())
    setVisibleToAll(props.initialVisibleToAll ?? false)
    setMemberSearch("")
  }, [props.open, props.initialName, props.initialDescription, props.initialStart, props.initialEnd, props.initialVisibleToAll])

  /** Cycles an entry through not-invited → required → optional → not-invited. */
  const cycleRole = <K,>(setter: React.Dispatch<React.SetStateAction<Map<K, AttendeeRole>>>) => (pk: K) =>
    setter((prev) => {
      const next = new Map(prev)
      const current = next.get(pk)
      if (current === undefined) next.set(pk, "required")
      else if (current === "required") next.set(pk, "optional")
      else next.delete(pk)
      return next
    })
  const cycleAttendee = cycleRole(setAttendees)
  const cycleSubteam = cycleRole(setSubteamSel)

  const roster = props.roster ?? []
  const subteams = props.subteams ?? []
  const filteredRoster = roster.filter((m) => {
    const q = memberSearch.trim().toLowerCase()
    return !q || m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q)
  })
  const selectedCount = attendees.size + subteamSel.size

  const startDate = date ? combine(date, startTime) : null
  const endDate = date ? combine(date, endTime) : null

  const inRange =
    !startDate ||
    ((!props.minDate || !isBefore(startOfDay(startDate), startOfDay(props.minDate))) &&
      (!props.maxDate || !isAfter(startOfDay(startDate), startOfDay(props.maxDate))))

  const isValid =
    name.trim().length > 0 &&
    !!startDate && !!endDate && endDate.getTime() > startDate.getTime() &&
    inRange

  const handleConfirm = () => {
    if (!isValid || !startDate || !endDate) return
    const required: number[] = []
    const optional: number[] = []
    attendees.forEach((role, pk) => (role === "required" ? required : optional).push(pk))
    const requiredSubs: string[] = []
    const optionalSubs: string[] = []
    subteamSel.forEach((role, pk) => (role === "required" ? requiredSubs : optionalSubs).push(pk))
    props.onConfirm({
      name: name.trim(),
      description: description.trim(),
      start: startDate,
      end: endDate,
      recurring: !isEditing && repeat,
      requiredAttendees: isEditing ? undefined : required,
      optionalAttendees: isEditing ? undefined : optional,
      requiredSubteams: isEditing ? undefined : requiredSubs,
      optionalSubteams: isEditing ? undefined : optionalSubs,
      visibleToAll,
    })
    props.onOpenChange(false)
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Meeting" : "New Meeting"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the details for this meeting." : "Schedule a new team meeting."}
            </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="meeting-title">Title</Label>
            <Input
              id="meeting-title"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekly Standup"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meeting-date">Date</Label>
            <DatePicker
              id="meeting-date"
              value={date}
              onChange={setDate}
              disabledBefore={props.minDate ? format(props.minDate, DATE_FMT) : undefined}
              disabledAfter={props.maxDate ? format(props.maxDate, DATE_FMT) : undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="meeting-start">Start Time</Label>
              <Input
                id="meeting-start"
                type="time"
                value={startTime}
                className='bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meeting-end">End Time</Label>
              <Input
                id="meeting-end"
                type="time"
                value={endTime}
                className='bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2">
              <Checkbox id="meeting-repeat" checked={repeat} onCheckedChange={(v) => setRepeat(v === true)} />
              <Label htmlFor="meeting-repeat" className="font-normal">Repeat weekly</Label>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="meeting-agenda">Agenda</Label>
            <Textarea
              id="meeting-agenda"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting agenda or notes (optional)"
            />
          </div>

          {!isEditing && (roster.length > 0 || subteams.length > 0) && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Attendees</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{selectedCount} invited</span>
              </div>
              {subteams.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {subteams.map((s) => {
                    const role = subteamSel.get(s.pk)
                    return (
                      <button type="button" key={s.pk} onClick={() => cycleSubteam(s.pk)} title="Invite the whole subteam; people joining later are included automatically">
                        <Badge variant={role === "required" ? "default" : role === "optional" ? "secondary" : "outline"} className={!role ? "text-muted-foreground" : ""}>
                          {s.name}{role === "optional" && " · optional"}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              )}
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search team members"
              />
              <ScrollArea className="h-40 rounded-md border">
                <div className="p-1">
                  {filteredRoster.length === 0 && (
                    <p className="px-2 py-3 text-sm text-muted-foreground">No members found.</p>
                  )}
                  {filteredRoster.map((m) => {
                    const role = attendees.get(m.pk)
                    return (
                      <button
                        type="button"
                        key={m.pk}
                        onClick={() => cycleAttendee(m.pk)}
                        className="flex h-9 w-full items-center justify-between gap-2 rounded px-2 text-left text-sm hover:bg-accent"
                      >
                        <span className="truncate">{m.name}</span>
                        <span className="shrink-0">
                          {role === "required" && <Badge>Required</Badge>}
                          {role === "optional" && <Badge variant="secondary">Optional</Badge>}
                          {!role && <Badge variant="outline" className="text-muted-foreground">Invite</Badge>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">Tap a subteam or member to cycle required, optional, or not invited. Subteams are invited as a whole — their current members always count.</p>
            </div>
          )}

          <div className="flex items-start gap-2">
            <Checkbox id="meeting-visible" checked={visibleToAll} onCheckedChange={(v) => setVisibleToAll(v === true)} />
            <div className="grid gap-1">
              <Label htmlFor="meeting-visible" className="font-normal">Visible to everyone</Label>
              <p className="text-xs text-muted-foreground">
                When off, only invited people/subteams and meeting managers see this event. Events with no invitees are always visible to the whole team.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button disabled={!isValid} onClick={handleConfirm}>{isEditing ? "Save Changes" : "Create Meeting"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
