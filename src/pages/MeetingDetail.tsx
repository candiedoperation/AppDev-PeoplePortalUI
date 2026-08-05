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
import { QRCodeSVG } from "qrcode.react"
import { format } from "date-fns"
import { ChevronLeftIcon } from "lucide-react"
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AttendancePanel } from "@/components/fragments/AttendanceDialog"
import { toast } from "sonner"

type Meeting = { name: string; description: string; start: string; end: string }

/**
 * Manager-facing detail page for one meeting occurrence. Shows a large QR code
 * that members scan to record their own attendance, alongside the live sheet.
 */
export const MeetingDetail = () => {
  const { teamId, meetingId } = useParams<{ teamId: string; meetingId: string }>()
  const navigate = useNavigate()
  const [meeting, setMeeting] = useState<Meeting | null>(null)

  const base = `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamId}/meetings/${meetingId}`
  const checkinUrl = `${window.location.origin}/org/teams/${teamId}/meetings/${meetingId}/checkin`

  useEffect(() => {
    if (!teamId || !meetingId) return
    fetch(base, { credentials: "include" })
      .then((res) => (res.ok ? res.json() as Promise<Meeting> : Promise.reject()))
      .then(setMeeting)
      .catch(() => toast.error("Failed to load meeting"))
  }, [teamId, meetingId, base])

  const when = meeting
    ? `${format(new Date(meeting.start), "EEEE, MMMM d")} · ${format(new Date(meeting.start), "h:mm a")} – ${format(new Date(meeting.end), "h:mm a")}`
    : ""

  return (
    <div className="flex min-h-full flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/org/teams/${teamId}/meetings`)}>
          <ChevronLeftIcon />
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{meeting?.name ?? "Meeting"}</h1>
          {when && <p className="text-muted-foreground">{when}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Check-in code</CardTitle>
            <CardDescription>Members scan this with their phone to record their own attendance.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="rounded-xl bg-white p-4">
              <QRCodeSVG value={checkinUrl} size={232} level="M" />
            </div>
            <p className="break-all text-center text-xs text-muted-foreground">{checkinUrl}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>Mark who on the sheet attended. Manage invites from the calendar.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mark-only here — inviting and removing happen in the calendar's
                attendance dialog, not during check-in. */}
            {teamId && meetingId && (
              <AttendancePanel teamId={teamId} meetingId={meetingId} manageInvites={false} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
