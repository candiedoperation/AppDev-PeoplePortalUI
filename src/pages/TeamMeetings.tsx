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
import { NewMeetingDialog, type MeetingDraft, type RosterMember, type SubteamOption } from "@/components/fragments/NewMeetingDialog"
import { AttendanceDialog } from "@/components/fragments/AttendanceDialog"
import { RecurrenceScopeDialog, type RecurrenceScope } from "@/components/fragments/RecurrenceScopeDialog"
import { Button } from "@/components/ui/button"
import { addDays, clamp, format, isAfter, isBefore, parse, startOfDay, startOfWeek } from "date-fns"
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, UsersIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

type Meeting = CalendarEvent & {
  _id: string;
  recurring: boolean;
  name: string;
  description: string;
  visibleToAll: boolean;
};

type PendingEdit = Omit<Meeting, "_id" | "recurring">;

type PendingRecurringAction =
  | { action: "edit"; meeting: Meeting; edit: PendingEdit }
  | { action: "delete"; meeting: Meeting };

type RawMeeting = Omit<Meeting, "start" | "end"> & { start: string; end: string };

const parseMeeting = (raw: RawMeeting): Meeting => ({
  ...raw,
  start: new Date(raw.start),
  end: new Date(raw.end),
});

/* The Monday that opens the week containing `date`. */
const mondayOf = (date: Date) => startOfWeek(date, { weekStartsOn: 1 });

/* Parse a "yyyy-MM-dd" wire date as local midnight; undefined when absent. */
const parseDay = (value?: string) => (value ? parse(value, "yyyy-MM-dd", new Date()) : undefined);

export const TeamMeetings = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [events, setEvents] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [minDate, setMinDate] = useState<Date | undefined>();
  const [maxDate, setMaxDate] = useState<Date | undefined>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftSlot, setDraftSlot] = useState<{ start: Date; end: Date } | undefined>();
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [subteams, setSubteams] = useState<SubteamOption[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [attendanceMeeting, setAttendanceMeeting] = useState<Meeting | null>(null);

  const [pendingAction, setPendingAction] = useState<PendingRecurringAction | null>(null);

  const meetingsUrl = `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamId}/meetings`;

  /* The 5 weekday columns the calendar renders, derived from the scrubbed week. */
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const monthLabel = format(addDays(weekStart, 2), "MMMM yyyy");

  const teamStartWeek = minDate ? mondayOf(minDate) : null;
  const maxWeek = maxDate ? mondayOf(maxDate) : null;
  /* Never navigate into past weeks: floor at the later of this week and the team start. */
  const minWeek = teamStartWeek && teamStartWeek.getTime() > mondayOf(new Date()).getTime()
    ? teamStartWeek
    : mondayOf(new Date());
  const canGoPrev = weekStart.getTime() > minWeek.getTime();
  const canGoNext = !maxWeek || weekStart.getTime() < maxWeek.getTime();
  const shiftWeek = (deltaDays: number) => setWeekStart((prev) => {
    const next = addDays(prev, deltaDays);
    return clamp(next, { start: minWeek, end: maxWeek && maxWeek.getTime() > minWeek.getTime() ? maxWeek : minWeek });
  });

  const isDateDisabled = useCallback((date: Date) => {
    const day = startOfDay(date);
    if (minDate && isBefore(day, startOfDay(minDate))) return true;
    if (maxDate && isAfter(day, startOfDay(maxDate))) return true;
    return false;
  }, [minDate, maxDate]);

  const fetchWeek = useCallback(() => {
    if (!teamId) return;
    setLoading(true);
    const from = weekStart.toISOString();
    const to = addDays(weekStart, 5).toISOString();
    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamId}/meetings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${res.status}`);
        }
        return res.json() as Promise<RawMeeting[]>;
      })
      .then((data) => setEvents(data.map(parseMeeting)))
      .catch((e) => toast.error(`Failed to load meetings: ${e.message}`))
      .finally(() => setLoading(false));
  }, [teamId, weekStart]);

  useEffect(() => {
    fetchWeek();
  }, [fetchWeek]);

  /* Load the team's start/end dates to bound the calendar to the team's lifespan */
  useEffect(() => {
    if (!teamId) return;
    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{
          team?: { attributes?: { teamStartDate?: string; teamEndDate?: string } };
          subteams?: Array<{ pk: string; name: string; attributes?: { friendlyName?: string; flaggedForDeletion?: boolean } }>;
        }>;
      })
      .then(({ team, subteams: rawSubteams }) => {
        setSubteams((rawSubteams ?? [])
          .filter((s) => !s.attributes?.flaggedForDeletion)
          .map((s) => ({ pk: s.pk, name: s.attributes?.friendlyName ?? s.name })));
        const start = parseDay(team?.attributes?.teamStartDate);
        const end = parseDay(team?.attributes?.teamEndDate);
        setMinDate(start);
        setMaxDate(end);
        /* Snap the visible week into the team's lifespan if it falls outside */
        setWeekStart((prev) => clamp(prev, {
          start: start ? mondayOf(start) : prev,
          end: end ? mondayOf(end) : prev,
        }));
      })
      .catch(() => { /* non-fatal: leave the calendar unbounded */ });
  }, [teamId]);

  /* Load the team roster once so the create dialog can offer attendees. */
  useEffect(() => {
    if (!teamId) return;
    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamId}/meetings/roster`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() as Promise<RosterMember[]> : Promise.reject()))
      .then(setRoster)
      .catch(() => { /* non-fatal: dialog simply omits the attendee picker */ });
  }, [teamId]);

  /* Whether this user may manage meetings; gates the create/edit/delete controls.
     The backend enforces this regardless — this only hides controls that would 403. */
  useEffect(() => {
    if (!teamId) return;
    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${teamId}/meetings/capabilities`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() as Promise<{ canManageMeetings: boolean }> : Promise.reject()))
      .then((d) => setCanManage(d.canManageMeetings))
      .catch(() => setCanManage(false));
  }, [teamId]);

  const openNewMeeting = (start?: Date, end?: Date) => {
    setEditingMeeting(null);
    setDraftSlot(start && end ? { start, end } : undefined);
    setDialogOpen(true);
  };

  const handleMeetingConfirm = (draft: MeetingDraft) => {
    fetch(meetingsUrl, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, recurring: !!draft.recurring }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${res.status}`);
        }
        toast.success(`"${draft.name}" added to the schedule`);
        fetchWeek();
      })
      .catch((e) => toast.error(`Failed to create meeting: ${e.message}`));
  };

  const handleMeetingEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setDraftSlot(undefined);
    setDialogOpen(true);
  };

  const applyEdit = (meeting: Meeting, edit: PendingEdit, scope: RecurrenceScope) => {
    fetch(`${meetingsUrl}/${meeting._id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...edit, scope }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${res.status}`);
        }
        toast.success(`"${edit.name}" updated`);
        fetchWeek();
      })
      .catch((e) => toast.error(`Failed to update meeting: ${e.message}`));
  };

  const handleMeetingUpdate = (draft: MeetingDraft) => {
    if (!editingMeeting) return;
    const edit: PendingEdit = {
      name: draft.name,
      description: draft.description,
      start: draft.start,
      end: draft.end,
      visibleToAll: draft.visibleToAll,
    };
    if (editingMeeting.recurring) {
      setPendingAction({ action: "edit", meeting: editingMeeting, edit });
      return;
    }
    applyEdit(editingMeeting, edit, "this");
  };

  const applyDelete = (meeting: Meeting, scope: RecurrenceScope) => {
    fetch(`${meetingsUrl}/${meeting._id}?scope=${scope}`, { method: "DELETE", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `HTTP ${res.status}`);
        }
        toast.success(`"${meeting.name}" removed from the schedule`);
        fetchWeek();
      })
      .catch((e) => toast.error(`Failed to delete meeting: ${e.message}`));
  };

  const handleMeetingDelete = (meeting: Meeting) => {
    if (meeting.recurring) {
      setPendingAction({ action: "delete", meeting });
      return;
    }
    applyDelete(meeting, "this");
  };

  const handleScopeSelect = (scope: RecurrenceScope) => {
    if (!pendingAction) return;
    if (pendingAction.action === "edit") {
      applyEdit(pendingAction.meeting, pendingAction.edit, scope);
    } else {
      applyDelete(pendingAction.meeting, scope);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-6">
      <NewMeetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        meetingId={editingMeeting?._id}
        initialName={editingMeeting?.name}
        initialDescription={editingMeeting?.description}
        initialStart={editingMeeting?.start ?? draftSlot?.start}
        initialEnd={editingMeeting?.end ?? draftSlot?.end}
        initialVisibleToAll={editingMeeting?.visibleToAll}
        minDate={minDate}
        maxDate={maxDate}
        roster={roster}
        subteams={subteams}
        onConfirm={editingMeeting ? handleMeetingUpdate : handleMeetingConfirm}
      />

      {attendanceMeeting && teamId && (
        <AttendanceDialog
          open={attendanceMeeting !== null}
          onOpenChange={(open) => { if (!open) setAttendanceMeeting(null); }}
          teamId={teamId}
          meetingId={attendanceMeeting._id}
          meetingName={attendanceMeeting.name}
          roster={roster}
          subteams={subteams}
        />
      )}

      <RecurrenceScopeDialog
        open={pendingAction !== null}
        onOpenChange={(open) => { if (!open) setPendingAction(null); }}
        action={pendingAction?.action ?? "edit"}
        onSelect={handleScopeSelect}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Team Meetings</h1>
          <h4 className="text-xl text-muted-foreground">Set your Team Meetings/Rep Meetings schedule, take attendance, and keep meeting notes</h4>
        </div>
        {canManage && (
          <Button className="shrink-0" onClick={() => openNewMeeting()}>
            <PlusIcon />
            New Meeting
          </Button>
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between pl-14 pr-1 pb-3">
          <Button variant="ghost" size="icon" disabled={!canGoPrev} onClick={() => shiftWeek(-7)}>
            <ChevronLeftIcon />
          </Button>
          <p className="text-sm font-medium select-none">{monthLabel}</p>
          <Button variant="ghost" size="icon" disabled={!canGoNext} onClick={() => shiftWeek(7)}>
            <ChevronRightIcon />
          </Button>
        </div>
        <CalendarView
          days={days}
          events={events}
          editable={canManage}
          isDateDisabled={isDateDisabled}
          onNewEvent={canManage ? (start, end) => openNewMeeting(start, end) : undefined}
          options={{ start: 8, end: 21, snapMinutes: 15 }}
          previewComponent={({ event }) => (
            <div className="h-full w-full border-2 border-dashed border-primary bg-primary/20 text-sm p-1 overflow-hidden select-none rounded">
              <p>{format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}</p>
            </div>
          )}
          component={({ event }) => (
            <div
              className={`relative h-full bg-primary mx-0.5 rounded overflow-hidden ${canManage ? "cursor-pointer" : ""}`}
              onClick={canManage ? () => handleMeetingEdit(event) : undefined}
            >
              <div className="relative text-center bg-black/30">
                <p>{event.name}</p>
              </div>
              <div className="px-1 py-0.5 text-sm opacity-90 mt-0.5">
                <p>{event.description}</p>
              </div>
              {canManage && (
                <>
                  <UsersIcon
                    className="cursor-pointer absolute left-0 top-0 size-6 p-0.5 transition-colors hover:bg-black/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttendanceMeeting(event);
                    }}
                  />
                  <XIcon
                    className="cursor-pointer absolute right-0 top-0 size-6 p-0.5 transition-colors hover:bg-black/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMeetingDelete(event);
                    }}
                  />
                </>
              )}
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
