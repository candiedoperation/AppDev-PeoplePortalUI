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

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarX2Icon, PlusIcon } from "lucide-react"

const EventsEmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <CalendarX2Icon className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">{label}</p>
    </div>
)

export const Events = () => {
    return (
        <div className="flex min-h-full flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-3">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Events</h1>
                    <h4 className="text-xl text-muted-foreground">Create club events, manage RSVPs, and track attendance</h4>
                </div>
                <Button className="shrink-0" onClick={() => {}}>
                    <PlusIcon />
                    New Event
                </Button>
            </div>

            <Tabs defaultValue="upcoming" className="flex flex-1 flex-col gap-4">
                <TabsList>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming" className="flex flex-1 flex-col">
                    <EventsEmptyState label="No upcoming events yet. Create one to get started." />
                </TabsContent>
                <TabsContent value="past" className="flex flex-1 flex-col">
                    <EventsEmptyState label="No past events to show." />
                </TabsContent>
            </Tabs>
        </div>
    )
}
