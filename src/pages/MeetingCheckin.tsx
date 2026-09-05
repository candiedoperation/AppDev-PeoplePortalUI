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

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { format } from "date-fns"
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react"
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type Meeting = { name: string; start: string; end: string }
type State =
  | { kind: "checking" }
  | { kind: "success" }
  | { kind: "error"; message: string }

/**
 * The QR-code target. On load it records the signed-in user's attendance for the
 * meeting and reports the result. Auth is handled by the dashboard shell, which
 * bounces unauthenticated visitors through login and back to this URL.
 */
export const MeetingCheckin = () => {
  const { teamId, meetingId } = useParams<{ teamId: string; meetingId: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: "checking" })
  const [meeting, setMeeting] = useState<Meeting | null>(null)

  useEffect(() => {
    if (!teamId || !meetingId) return
    const base = `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamId}/meetings/${meetingId}`

    fetch(base, { credentials: "include" })
      .then((res) => (res.ok ? res.json() as Promise<Meeting> : Promise.reject()))
      .then(setMeeting)
      .catch(() => { /* non-fatal: result card simply omits the meeting name */ })

    fetch(`${base}/checkin`, { method: "POST", credentials: "include" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
        setState({ kind: "success" })
      })
      .catch((e) => setState({ kind: "error", message: e.message }))
  }, [teamId, meetingId])

  const when = meeting ? `${format(new Date(meeting.start), "EEEE, MMM d")} · ${format(new Date(meeting.start), "h:mm a")} to ${format(new Date(meeting.end), "h:mm a")}` : ""

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-5 py-8 text-center">
          {state.kind === "checking" && <Loader2Icon className="size-14 animate-spin text-muted-foreground" />}
          {state.kind === "success" && <CheckCircle2Icon className="size-14 text-green-600" />}
          {state.kind === "error" && <XCircleIcon className="size-14 text-destructive" />}

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">
              {state.kind === "checking" && "Checking you in"}
              {state.kind === "success" && "You're checked in"}
              {state.kind === "error" && "Couldn't check you in"}
            </h2>
            {meeting && (
              <p className="text-sm text-muted-foreground">
                {meeting.name}{when && <><br />{when}</>}
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {state.kind === "checking" && "Recording your attendance."}
            {state.kind === "success" && "Your attendance has been recorded as present."}
            {state.kind === "error" && state.message}
          </p>

          <Button variant="outline" onClick={() => navigate(`/org/teams/${teamId}/meetings`)}>
            Back to meetings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
