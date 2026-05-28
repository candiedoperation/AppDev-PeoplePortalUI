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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

const decimalToTimeStr = (decimal: number): string => {
  const h = Math.floor(decimal)
  const m = Math.round((decimal - h) * 60)
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

const timeStrToDecimal = (time: string): number => {
  const [h, m] = time.split(":").map(Number)
  return h + m / 60
}

export interface NewMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided the dialog operates in edit mode */
  meetingId?: string
  initialName?: string
  initialDescription?: string
  initialDay?: number
  initialStart?: number
  initialEnd?: number
  onConfirm: (name: string, description: string, day: number, start: number, end: number) => void
}

export const NewMeetingDialog = (props: NewMeetingDialogProps) => {
  const isEditing = Boolean(props.meetingId)
  const [name, setName] = React.useState(props.initialName ?? "")
  const [description, setDescription] = React.useState(props.initialDescription ?? "")
  const [day, setDay] = React.useState(props.initialDay ?? 0)
  const [startTime, setStartTime] = React.useState(decimalToTimeStr(props.initialStart ?? 9))
  const [endTime, setEndTime] = React.useState(decimalToTimeStr(props.initialEnd ?? 10))

  React.useEffect(() => {
    if (props.open) {
      setName(props.initialName ?? "")
      setDescription(props.initialDescription ?? "")
      setDay(props.initialDay ?? 0)
      setStartTime(decimalToTimeStr(props.initialStart ?? 9))
      setEndTime(decimalToTimeStr(props.initialEnd ?? 10))
    }
  }, [props.open, props.initialName, props.initialDescription, props.initialDay, props.initialStart, props.initialEnd])

  const isValid =
    name.trim().length > 0 &&
    timeStrToDecimal(endTime) > timeStrToDecimal(startTime)

  const handleConfirm = () => {
    if (!isValid) return
    props.onConfirm(
      name.trim(),
      description.trim(),
      day,
      timeStrToDecimal(startTime),
      timeStrToDecimal(endTime)
    )
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
            <Label>Day</Label>
            <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
