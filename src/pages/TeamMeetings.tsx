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
import { CalendarView, type CalendarEvent } from "@/components/blocks/CalendarView"
import { NewMeetingDialog } from "@/components/fragments/NewMeetingDialog"
import { Button } from "@/components/ui/button"
import { PlusIcon, XIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

type Meeting = CalendarEvent & {
  _id: string;
  name: string;
  description: string;
};

export const TeamMeetings = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [events, setEvents] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{ day: number; start: number; end: number } | undefined>();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamId}/meetings`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${res.status}`);
        }
        return res.json() as Promise<Meeting[]>;
      })
      .then((data) => setEvents(data))
      .catch((e) => toast.error(`Failed to load meetings: ${e.message}`))
      .finally(() => setLoading(false));
  }, [teamId]);

  const openNewMeeting = (day?: number, start?: number, end?: number) => {
    setEditingMeeting(null);
    setPendingSlot(day !== undefined ? { day, start: start!, end: end! } : undefined);
    setDialogOpen(true);
  };

  const handleMeetingConfirm = (name: string, description: string, day: number, start: number, end: number) => {
    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamId}/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, day, start, end }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${res.status}`);
        }
        return res.json() as Promise<Meeting>;
      })
      .then((meeting) => {
        setEvents((prev) => [...prev, meeting]);
        toast.success(`"${meeting.name}" added to the schedule`);
      })
      .catch((e) => toast.error(`Failed to create meeting: ${e.message}`));
  };

  const handleMeetingEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setPendingSlot(undefined);
    setDialogOpen(true);
  };

  const handleMeetingUpdate = (name: string, description: string, day: number, start: number, end: number) => {
    if (!editingMeeting) return;
    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamId}/meetings/${editingMeeting._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, day, start, end }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${res.status}`);
        }
        return res.json() as Promise<Meeting>;
      })
      .then((updated) => {
        setEvents((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
        toast.success(`"${updated.name}" updated`);
      })
      .catch((e) => toast.error(`Failed to update meeting: ${e.message}`));
  };

  const handleMeetingDelete = (meeting: Meeting) => {
    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamId}/meetings/${meeting._id}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${res.status}`);
        }
        setEvents((prev) => prev.filter((e) => e._id !== meeting._id));
        toast.success(`"${meeting.name}" removed from the schedule`);
      })
      .catch((e) => toast.error(`Failed to delete meeting: ${e.message}`));
  };

  return (
    <div className="flex min-h-full flex-col gap-6">
      <NewMeetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        meetingId={editingMeeting?._id}
        initialName={editingMeeting?.name}
        initialDescription={editingMeeting?.description}
        initialDay={editingMeeting?.day ?? pendingSlot?.day}
        initialStart={editingMeeting?.start ?? pendingSlot?.start}
        initialEnd={editingMeeting?.end ?? pendingSlot?.end}
        onConfirm={editingMeeting ? handleMeetingUpdate : handleMeetingConfirm}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Team Meetings</h1>
          <h4 className="text-xl text-muted-foreground">Set your Team Meetings/Rep Meetings schedule, take attendance, and keep meeting notes</h4>
        </div>
        <Button className="shrink-0" onClick={() => openNewMeeting()}>
          <PlusIcon />
          New Meeting
        </Button>
      </div>

      <div className="flex-1">
        <CalendarView
          events={events}
          onNewEvent={(day, start, end) => openNewMeeting(day, start, end)}
          options={{ start: 8, end: 21, snapMinutes: 15 }}
          component={({ event }) => (
            <div className="relative cursor-pointer h-full bg-primary" onClick={() => handleMeetingEdit(event)}>
              <div className="relative text-center bg-black/30">
                <p>{event.name}</p>
              </div>
              <div className="px-1 py-0.5 text-sm opacity-90 mt-0.5">
                <p>{event.description}</p>
              </div>
              <XIcon
                className="cursor-pointer absolute right-0 top-0 bottom-0 p-0.5 transition-colors hover:bg-black/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMeetingDelete(event);
                }}
              />
            </div>
          )}
        />
      </div>

      {loading && (
        <p className="text-center text-sm text-muted-foreground">Loading meetings…</p>
      )}
    </div>
  )
}
