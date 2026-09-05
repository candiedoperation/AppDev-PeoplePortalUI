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
import { Button } from "@/components/ui/button"
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArchiveIcon, Loader2, SearchIcon, UsersRound } from "lucide-react"
import { partitionByLifecycle } from "@/lib/season"

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
    /* ISO timestamp set when the team has been archived; absent means active */
    archivedAt?: string
}

interface GetTeamsListResponse {
    teams: TeamInformationBrief[]
    nextCursor?: string
}

/* ─────────────────────────────────────────────
   Teams table (shared by the tabs)
───────────────────────────────────────────── */

interface TeamsTableProps {
    loading: boolean
    teams: TeamInformationBrief[]
    search: string
    onSearchChange: (value: string) => void
    emptyLabel: string
    /* When provided, renders an Actions column with an Archive button per row */
    onArchive?: (team: TeamInformationBrief) => Promise<void>
    archivingPk?: string | null
}

const TeamsTable = ({ loading, teams, search, onSearchChange, emptyLabel, onArchive, archivingPk }: TeamsTableProps) => {
    const showActions = !!onArchive
    const columnCount = showActions ? 5 : 4
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

            <div className="w-full rounded-md border">
                <Table className="w-full table-fixed">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30%]">Team Name</TableHead>
                            <TableHead className="w-[32%]">Description</TableHead>
                            <TableHead className="w-[14%]">Vertical</TableHead>
                            <TableHead className="w-[16%]">Shared Resources ID</TableHead>
                            {showActions && <TableHead className="w-[10%] text-right">Actions</TableHead>}
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
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    {showActions && <TableCell><Skeleton className="ml-auto h-8 w-20" /></TableCell>}
                                </TableRow>
                            ))
                        ) : filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columnCount} className="h-32 text-center">
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
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-orange-100 text-orange-600">
                                                <UsersRound size={18} />
                                            </div>
                                            <div className="ml-3 flex min-w-0 flex-col">
                                                <span className="truncate text-sm font-medium" title={team.friendlyName}>{team.friendlyName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {`${team.seasonType} ${team.seasonYear}`}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {team.description
                                            ? <span className="block truncate text-sm text-muted-foreground" title={team.description}>{team.description}</span>
                                            : <span className="text-sm text-muted-foreground">No description</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{team.teamType}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <code className="block truncate rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs text-muted-foreground" title={team.name}>
                                            {team.name}
                                        </code>
                                    </TableCell>
                                    {showActions && (
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        disabled={archivingPk === team.pk}
                                                        aria-label={`Archive ${team.friendlyName}`}
                                                        title={`Archive ${team.friendlyName}`}
                                                    >
                                                        {archivingPk === team.pk
                                                            ? <Loader2 className="size-4 animate-spin" />
                                                            : <ArchiveIcon className="size-4" />}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Archive {team.friendlyName}?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This makes the team's shared resources (Gitea repositories,
                                                            Slack channels) read-only while preserving all data. The team
                                                            will move to the Archived tab. This can be undone later.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => onArchive!(team)}>
                                                            Archive
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    )}
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
    const [teams, setTeams] = React.useState<TeamInformationBrief[]>([])
    const [activeSearch, setActiveSearch] = React.useState("")
    const [expiredSearch, setExpiredSearch] = React.useState("")
    const [archivedSearch, setArchivedSearch] = React.useState("")
    const [archivingPk, setArchivingPk] = React.useState<string | null>(null)

    React.useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                /* Walk the cursor-paginated teams list to collect every team */
                const allTeams: TeamInformationBrief[] = []
                let cursor = ""
                /* Guard against runaway loops */
                for (let i = 0; i < 100; i++) {
                    const params = new URLSearchParams({ limit: "50", includeArchived: "true" })
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

    /* Three buckets:
         Archived - explicitly archived (archivedAt set)
         Expired  - season has passed but nobody archived it yet
         Active   - current season, still running                       */
    const { active, expired, archived } = React.useMemo(() => {
        const { active, expired, archived } = partitionByLifecycle(teams)
        const byNameThenYear = (a: TeamInformationBrief, b: TeamInformationBrief) =>
            b.seasonYear - a.seasonYear || a.friendlyName.localeCompare(b.friendlyName)
        active.sort(byNameThenYear)
        expired.sort(byNameThenYear)
        archived.sort(byNameThenYear)
        return { active, expired, archived }
    }, [teams])

    /* Archive a root team, then mark it archived locally so it moves tabs */
    const handleArchive = async (team: TeamInformationBrief) => {
        setArchivingPk(team.pk)
        try {
            const res = await fetch(
                `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${team.pk}/archive`,
                { method: "POST" }
            )
            if (!res.ok) throw new Error(res.statusText)

            setTeams(prev => prev.map(t =>
                t.pk === team.pk ? { ...t, archivedAt: new Date().toISOString() } : t
            ))
            toast.success(`${team.friendlyName} has been archived.`)
        } catch (e: any) {
            toast.error("Failed to archive team: " + e.message)
        } finally {
            setArchivingPk(null)
        }
    }

    return (
        <div className="flex min-h-full flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-3">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Archive Teams</h1>
                <h4 className="text-xl text-muted-foreground">Browse active, expired and archived teams</h4>
            </div>

            <Tabs defaultValue="active" className="flex flex-1 flex-col gap-4">
                <TabsList>
                    <TabsTrigger value="active">
                        Active{!loading && ` (${active.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="expired">
                        Expired{!loading && ` (${expired.length})`}
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
                        onArchive={handleArchive}
                        archivingPk={archivingPk}
                    />
                </TabsContent>

                <TabsContent value="expired">
                    <TeamsTable
                        loading={loading}
                        teams={expired}
                        search={expiredSearch}
                        onSearchChange={setExpiredSearch}
                        emptyLabel="No expired teams."
                        onArchive={handleArchive}
                        archivingPk={archivingPk}
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
