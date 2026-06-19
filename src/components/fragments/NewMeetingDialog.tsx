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
import { DatePicker } from "./DatePicker"

const DATE_FMT = "yyyy-MM-dd"
const TIME_FMT = "HH:mm"

/** Combines a "yyyy-MM-dd" date and a "HH:mm" time into a local Date. */
const combine = (dateStr: string, timeStr: string): Date => new Date(`${dateStr}T${timeStr}`)

export interface NewMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog operates in edit mode */
  meetingId?: string
  initialName?: string
  initialDescription?: string
  initialStart?: Date
  initialEnd?: Date
  /** Inclusive bounds: dates outside the team's lifespan can't be picked. */
  minDate?: Date
  maxDate?: Date
  onConfirm: (name: string, description: string, start: Date, end: Date, recurring?: boolean) => void
}

export const NewMeetingDialog = (props: NewMeetingDialogProps) => {
  const isEditing = Boolean(props.meetingId)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [date, setDate] = React.useState("")
  const [startTime, setStartTime] = React.useState("09:00")
  const [endTime, setEndTime] = React.useState("10:00")
  const [repeat, setRepeat] = React.useState(false)

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
  }, [props.open, props.initialName, props.initialDescription, props.initialStart, props.initialEnd])

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
    props.onConfirm(name.trim(), description.trim(), startDate, endDate, !isEditing && repeat)
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button disabled={!isValid} onClick={handleConfirm}>{isEditing ? "Save Changes" : "Create Meeting"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
