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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArchiveIcon } from "lucide-react"

export const ArchiveTeams = () => {
    return (
        <div className="flex min-h-full flex-col gap-6">
            <div className="flex flex-col gap-3">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Archive Teams</h1>
                <h4 className="text-xl text-muted-foreground">Review and manage teams flagged for archival</h4>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArchiveIcon className="size-4" />
                            Coming soon
                        </CardTitle>
                        <CardDescription>Archived team management will land here.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Wire this page up to the team archival endpoints when they're ready.
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
