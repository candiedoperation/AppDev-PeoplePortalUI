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
import { toast } from "sonner"
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ArchiveIcon, SearchIcon, UsersRound } from "lucide-react"

/* ─────────────────────────────────────────────
   Data types
───────────────────────────────────────────── */

interface TeamInformationBrief {
    pk: string
    name: string
    friendlyName: string
    teamType: string
    seasonType: string
    seasonYear: number
    description?: string
}

interface GetTeamsListResponse {
    teams: TeamInformationBrief[]
    nextCursor?: string
}

interface OrgSettings {
    currentYear: string
}

/* ─────────────────────────────────────────────
   Teams table (shared by both tabs)
───────────────────────────────────────────── */

interface TeamsTableProps {
    loading: boolean
    teams: TeamInformationBrief[]
    search: string
    onSearchChange: (value: string) => void
    emptyLabel: string
}

const TeamsTable = ({ loading, teams, search, onSearchChange, emptyLabel }: TeamsTableProps) => {
    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return teams
        return teams.filter(t =>
            t.friendlyName.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            (t.description?.toLowerCase().includes(q) ?? false)
        )
    }, [teams, search])

    return (
        <div className="flex flex-col gap-4">
            <div className="relative max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by name..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9"
                />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Team Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Vertical</TableHead>
                            <TableHead>Season</TableHead>
                            <TableHead>Shared Resources ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-9 w-9 rounded-lg" />
                                            <div className="flex flex-col gap-1.5">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-3 w-20" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                </TableRow>
                            ))
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <ArchiveIcon className="size-8" />
                                        <span>{search.trim() ? "No teams match your search." : emptyLabel}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((team) => (
                                <TableRow key={team.pk}>
                                    <TableCell>
                                        <div className="flex items-center">
                                            <div className="flex size-9 items-center justify-center rounded-lg border bg-orange-100 text-orange-600">
                                                <UsersRound size={18} />
                                            </div>
                                            <div className="ml-3 flex flex-col">
                                                <span className="text-sm font-medium">{team.friendlyName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {`${team.seasonType} ${team.seasonYear}`}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {team.description
                                            ? <span className="line-clamp-1 max-w-[300px] text-sm text-muted-foreground" title={team.description}>{team.description}</span>
                                            : <span className="text-sm text-muted-foreground">No description</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{team.teamType}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                            {`${team.seasonType} ${team.seasonYear}`}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs text-muted-foreground">
                                            {team.name}
                                        </code>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {!loading && (
                <div className="flex justify-end rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    <span>{filtered.length} team{filtered.length !== 1 ? "s" : ""}</span>
                </div>
            )}
        </div>
    )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export const ArchiveTeams = () => {
    const [loading, setLoading] = React.useState(true)
    const [currentYear, setCurrentYear] = React.useState<number | null>(null)
    const [teams, setTeams] = React.useState<TeamInformationBrief[]>([])
    const [activeSearch, setActiveSearch] = React.useState("")
    const [archivedSearch, setArchivedSearch] = React.useState("")

    React.useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                /* Resolve the current program year from settings (fall back to calendar year) */
                const settingsRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/exec/settings`)
                const settings: OrgSettings = settingsRes.ok
                    ? await settingsRes.json()
                    : { currentYear: String(new Date().getFullYear()) }
                const year = parseInt(settings.currentYear) || new Date().getFullYear()
                setCurrentYear(year)

                /* Walk the cursor-paginated teams list to collect every team */
                const allTeams: TeamInformationBrief[] = []
                let cursor = ""
                /* Guard against runaway loops */
                for (let i = 0; i < 100; i++) {
                    const params = new URLSearchParams({ limit: "50" })
                    if (cursor) params.append("cursor", cursor)

                    const res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams?${params.toString()}`)
                    if (!res.ok) throw new Error(res.statusText)

                    const data: GetTeamsListResponse = await res.json()
                    allTeams.push(...data.teams)

                    if (!data.nextCursor) break
                    cursor = data.nextCursor
                }

                setTeams(allTeams)
            } catch (e: any) {
                toast.error("Failed to load teams: " + e.message)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    /* Active = rolling or current/future-season teams; Archived = past-season, non-rolling */
    const { active, archived } = React.useMemo(() => {
        const year = currentYear ?? new Date().getFullYear()
        const active: TeamInformationBrief[] = []
        const archived: TeamInformationBrief[] = []
        for (const team of teams) {
            if (team.seasonType !== "ROLLING" && team.seasonYear < year) archived.push(team)
            else active.push(team)
        }
        const byNameThenYear = (a: TeamInformationBrief, b: TeamInformationBrief) =>
            b.seasonYear - a.seasonYear || a.friendlyName.localeCompare(b.friendlyName)
        active.sort(byNameThenYear)
        archived.sort(byNameThenYear)
        return { active, archived }
    }, [teams, currentYear])

    return (
        <div className="flex min-h-full flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-3">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Archive Teams</h1>
                <h4 className="text-xl text-muted-foreground">Browse active and archived teams</h4>
            </div>

            <Tabs defaultValue="active" className="flex flex-1 flex-col gap-4">
                <TabsList>
                    <TabsTrigger value="active">
                        Active{!loading && ` (${active.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="archived">
                        Archived{!loading && ` (${archived.length})`}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                    <TeamsTable
                        loading={loading}
                        teams={active}
                        search={activeSearch}
                        onSearchChange={setActiveSearch}
                        emptyLabel="No active teams."
                    />
                </TabsContent>

                <TabsContent value="archived">
                    <TeamsTable
                        loading={loading}
                        teams={archived}
                        search={archivedSearch}
                        onSearchChange={setArchivedSearch}
                        emptyLabel="No archived teams."
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
