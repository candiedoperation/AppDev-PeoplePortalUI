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
import { ArrowLeftIcon, PlusIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"

export const TeamMeetings = () => {
    const navigate = useNavigate()

    return (
        <div className="flex min-h-full flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-3">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Team Meetings</h1>
                    <h4 className="text-xl text-muted-foreground">Set your Team Meetings/Rep Meetings schedule, take attendance, and keep meeting notes</h4>
                </div>
                <Button className="shrink-0" onClick={() => {}}>
                    <PlusIcon />
                    New Meeting
                </Button>
            </div>
            <div className="flex-1" />
        </div>
    )
}