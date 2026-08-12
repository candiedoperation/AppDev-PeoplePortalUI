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
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { cn } from "@/lib/utils"
import { CheckIcon, XIcon, Trash2Icon, QrCodeIcon, RefreshCwIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import type { RosterMember, SubteamOption } from "./NewMeetingDialog"

type AttendeeRole = "required" | "optional"

interface Attendee {
  userPk: number
  name: string
  role: AttendeeRole
  present: boolean
  markedBy: number | null
  markedAt: string | null
  /** False when included only via a subteam invite (no own row yet) */
  explicit: boolean
  /** Display name of the invited subteam this person attends through */
  viaSubteam: string | null
}

interface SubteamRef {
  subteamPk: string
  name: string
  role: AttendeeRole
}

interface AttendanceResponse {
  viewerPk: number
  canManage: boolean
  attendees: Attendee[]
  subteams: SubteamRef[]
}

export interface AttendancePanelProps {
  teamId: string
  meetingId: string
  /** Only fetch while truthy, so a closed dialog does no work. Defaults to true. */
  active?: boolean
  /** Used to offer non-attendees for managers to add */
  roster?: RosterMember[]
  /** Used to offer uninvited subteams for managers to add */
  subteams?: SubteamOption[]
  /**
   * When false, hides all invite-management controls (add attendee, invite or
   * uninvite subteams, remove rows) leaving a mark-only sheet — used by the
   * check-in view, where the invite list shouldn't change. Defaults to true.
   */
  manageInvites?: boolean
  /** Height of the scrollable roster. Defaults to "h-72". */
  scrollHeight?: string
  className?: string
}

/**
 * The live attendance sheet for one meeting occurrence: marks people present,
 * adds/removes attendees, and reflects the manager's permissions. Shared by the
 * calendar's AttendanceDialog and the meeting detail page so both stay in sync.
 */
export const AttendancePanel = (props: AttendancePanelProps) => {
  const active = props.active ?? true
  const [data, setData] = React.useState<AttendanceResponse | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [forbidden, setForbidden] = React.useState(false)
  const [addPk, setAddPk] = React.useState<string>("")
  const [addSubteamPk, setAddSubteamPk] = React.useState<string>("")

  const base = `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${props.teamId}/meetings/${props.meetingId}/attendance`

  const load = React.useCallback(() => {
    if (!active) return
    setLoading(true)
    fetch(base, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 403) { setForbidden(true); return null }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.message || `HTTP ${res.status}`)
        }
        setForbidden(false)
        return res.json() as Promise<AttendanceResponse>
      })
      .then((d) => d && setData(d))
      .catch((e) => toast.error(`Failed to load attendance: ${e.message}`))
      .finally(() => setLoading(false))
  }, [base, active])

  React.useEffect(() => { load() }, [load])

  const mark = (userPk: number, present: boolean) => {
    /* Optimistic: reflect the new value immediately, revert on failure. */
    setData((prev) => prev && { ...prev, attendees: prev.attendees.map((a) => a.userPk === userPk ? { ...a, present } : a) })
    fetch(`${base}/${userPk}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ present }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.message || `HTTP ${res.status}`)
        }
      })
      .catch((e) => {
        toast.error(`Failed to update: ${e.message}`)
        /* Revert only this row — a full reload here could clobber other
           marks still in flight with a pre-commit server snapshot. */
        setData((prev) => prev && { ...prev, attendees: prev.attendees.map((a) => a.userPk === userPk ? { ...a, present: !present } : a) })
      })
  }

  const addAttendee = (userPk: number) => {
    fetch(base, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userPk, role: "required" }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.message || `HTTP ${res.status}`)
        }
        setAddPk("")
        load()
      })
      .catch((e) => toast.error(`Failed to add attendee: ${e.message}`))
  }

  const removeAttendee = (userPk: number) => {
    fetch(`${base}/${userPk}`, { method: "DELETE", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.message || `HTTP ${res.status}`)
        }
        load()
      })
      .catch((e) => toast.error(`Failed to remove attendee: ${e.message}`))
  }

  const addSubteam = (subteamPk: string) => {
    fetch(`${base}/subteams`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subteamPk, role: "required" }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.message || `HTTP ${res.status}`)
        }
        setAddSubteamPk("")
        load()
      })
      .catch((e) => toast.error(`Failed to add subteam: ${e.message}`))
  }

  const removeSubteam = (subteamPk: string) => {
    fetch(`${base}/subteams/${subteamPk}`, { method: "DELETE", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.message || `HTTP ${res.status}`)
        }
        load()
      })
      .catch((e) => toast.error(`Failed to remove subteam: ${e.message}`))
  }

  const canManage = data?.canManage ?? false
  const manageInvites = canManage && (props.manageInvites ?? true)
  const viewerPk = data?.viewerPk
  const attendees = data?.attendees ?? []
  const present = attendees.filter((a) => a.present).length

  /* Members not already on the sheet, offered to managers for adding. */
  const invited = new Set(attendees.map((a) => a.userPk))
  const addable = (props.roster ?? []).filter((m) => !invited.has(m.pk))

  /* Subteams not yet invited, offered to managers for adding by reference. */
  const invitedSubteams = data?.subteams ?? []
  const invitedSubteamPks = new Set(invitedSubteams.map((s) => s.subteamPk))
  const addableSubteams = (props.subteams ?? []).filter((s) => !invitedSubteamPks.has(s.pk))

  /* A unified, fixed-size segmented control so toggling never reflows the row. */
  const StatusControl = ({ a }: { a: Attendee }) => {
    const editable = canManage || a.userPk === viewerPk
    if (!editable) {
      return (
        <Badge variant={a.present ? "default" : "outline"}>
          {a.present ? "Present" : "Not marked"}
        </Badge>
      )
    }
    const seg = (present: boolean, Icon: typeof CheckIcon, active: string) => (
      <button
        type="button"
        title={present ? "Present" : "Not marked"}
        onClick={() => mark(a.userPk, present)}
        className={cn(
          "flex size-7 items-center justify-center transition-colors",
          a.present === present ? active : "text-muted-foreground hover:bg-accent",
        )}
      >
        <Icon className="size-4" />
      </button>
    )
    return (
      <div className="inline-flex overflow-hidden rounded-md border divide-x">
        {seg(true, CheckIcon, "bg-green-600 text-white")}
        {seg(false, XIcon, "bg-muted text-foreground")}
      </div>
    )
  }

  if (forbidden) {
    return (
      <p className={cn("py-6 text-center text-sm text-muted-foreground", props.className)}>
        The attendance sheet is visible to meeting managers only.
      </p>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4", props.className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {attendees.length} {attendees.length === 1 ? "attendee" : "attendees"}
        </span>
        <div className="flex items-center gap-3">
          <span className="tabular-nums font-medium">{present} present</span>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={load} title="Refresh">
            <RefreshCwIcon className="size-4" />
          </Button>
        </div>
      </div>

      {manageInvites && (props.roster?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2">
          <Select value={addPk} onValueChange={setAddPk} disabled={addable.length === 0}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={addable.length === 0 ? "All members added" : "Add an attendee"} />
            </SelectTrigger>
            <SelectContent>
              {addable.map((m) => (
                <SelectItem key={m.pk} value={String(m.pk)}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!addPk} onClick={() => addPk && addAttendee(Number(addPk))}>Add</Button>
        </div>
      )}

      {manageInvites && (props.subteams?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2">
          <Select value={addSubteamPk} onValueChange={setAddSubteamPk} disabled={addableSubteams.length === 0}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={addableSubteams.length === 0 ? "All subteams invited" : "Invite a whole subteam"} />
            </SelectTrigger>
            <SelectContent>
              {addableSubteams.map((s) => (
                <SelectItem key={s.pk} value={s.pk}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!addSubteamPk} onClick={() => addSubteamPk && addSubteam(addSubteamPk)}>Invite</Button>
        </div>
      )}

      {invitedSubteams.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Invited subteams:</span>
          {invitedSubteams.map((s) => (
            <Badge key={s.subteamPk} variant={s.role === "required" ? "default" : "secondary"} className="gap-1">
              {s.name}
              {manageInvites && (
                <button type="button" title="Remove subteam invite" onClick={() => removeSubteam(s.subteamPk)}>
                  <XIcon className="size-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      <ScrollArea className={cn("rounded-md border", props.scrollHeight ?? "h-72")}>
        <div className="flex flex-col divide-y">
          {attendees.map((a) => (
            <div key={a.userPk} className="flex h-14 items-center justify-between gap-3 px-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {a.name}{a.userPk === viewerPk && <span className="text-muted-foreground"> (you)</span>}
                </p>
                <span className="text-xs text-muted-foreground">
                  {a.role === "required" ? "Required" : "Optional"}
                  {a.viaSubteam && ` · via ${a.viaSubteam}`}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <StatusControl a={a} />
                {/* Subteam-covered people are removed by uninviting the subteam,
                    never row by row — even after check-in materializes their row,
                    the subteam invite would still cover them. Trash is only for
                    individually invited people. */}
                {manageInvites && a.explicit && !a.viaSubteam && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground"
                    onClick={() => removeAttendee(a.userPk)}
                    title="Remove attendee"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {attendees.length === 0 && (
            <p className="flex h-full items-center justify-center px-3 py-10 text-center text-sm text-muted-foreground">
              {loading ? "Loading attendees" : "No attendees on this meeting yet."}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export interface AttendanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  meetingId: string
  meetingName: string
  /** Used to offer non-attendees for managers to add */
  roster?: RosterMember[]
  /** Used to offer uninvited subteams for managers to add */
  subteams?: SubteamOption[]
}

export const AttendanceDialog = (props: AttendanceDialogProps) => {
  const navigate = useNavigate()

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attendance</DialogTitle>
          <DialogDescription>
            Track who attended {props.meetingName}.
          </DialogDescription>
        </DialogHeader>

        <AttendancePanel
          teamId={props.teamId}
          meetingId={props.meetingId}
          active={props.open}
          roster={props.roster}
          subteams={props.subteams}
        />

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => { props.onOpenChange(false); navigate(`/org/teams/${props.teamId}/meetings/${props.meetingId}`) }}
          >
            <QrCodeIcon className="size-4" /> Check-in QR
          </Button>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
