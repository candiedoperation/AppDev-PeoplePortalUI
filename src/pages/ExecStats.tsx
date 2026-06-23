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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    BriefcaseIcon,
    GraduationCapIcon,
    NetworkIcon,
    UsersIcon,
} from "lucide-react"

/* ─────────────────────────────────────────────
   Data types
───────────────────────────────────────────── */

interface PaginationDefinition {
    count: number
    total_pages: number
}

interface UserBrief {
    pk: string
    memberSince: string
    active: boolean
    attributes?: {
        expectedGrad?: string
        alumniAccount?: boolean
        [key: string]: unknown
    }
}

interface GetUserListResponse {
    pagination: PaginationDefinition
    users: UserBrief[]
}

interface OrgSettings {
    currentYear: string
}

interface ClassCounts {
    Freshman: number
    Sophomore: number
    Junior: number
    Senior: number
    Alumni: number
    Other: number
}

interface GetTeamsListResponse {
    teams: { pk: string; name: string; friendlyName: string; teamType: string }[]
    nextCursor?: string
}

interface OpenATSTeam {
    teamPk: string
    isRecruiting: boolean
    recruitingSubteamPks: string[]
}

interface ATSApplication {
    id: string
    stage: string
    [key: string]: unknown
}


/* ─────────────────────────────────────────────
   Stat card
───────────────────────────────────────────── */

interface StatCardProps {
    icon: React.ReactNode
    label: string
    /** null = still loading */
    value: number | string | null
    sub?: string
}

const StatCard = ({ icon, label, value, sub }: StatCardProps) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            <span className="text-muted-foreground">{icon}</span>
        </CardHeader>
        <CardContent className="pt-0">
            {value === null
                ? <Skeleton className="h-9 w-20 mt-0.5" />
                : <div className="text-3xl font-bold tracking-tight">{value}</div>
            }
            {sub && (
                value === null
                    ? <Skeleton className="h-3 w-32 mt-2" />
                    : <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            )}
        </CardContent>
    </Card>
)

/* ─────────────────────────────────────────────
   Section header
───────────────────────────────────────────── */

const SectionHeader = ({ title }: { title: string }) => (
    <h2 className="scroll-m-20 text-xl font-semibold tracking-tight">{title}</h2>
)


const CLASS_YEARS: { key: keyof ClassCounts; label: string; offset: number }[] = [
    { key: "Freshman",  label: "Freshman",  offset: 3 },
    { key: "Sophomore", label: "Sophomore", offset: 2 },
    { key: "Junior",    label: "Junior",    offset: 1 },
    { key: "Senior",    label: "Senior",    offset: 0 },
]

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export const ExecStats = () => {
    /* Stat card state */
    const [activeMembers, setActiveMembers]       = React.useState<number | null>(null)
    const [activeTeams, setActiveTeams]           = React.useState<number | null>(null)
    const [openTeamCount, setOpenTeamCount]       = React.useState<number | null>(null)

    /* Applications state */
    const [appsLoading, setAppsLoading]           = React.useState(true)
    const [allApplications, setAllApplications]   = React.useState<ATSApplication[]>([])

    /* Class breakdown state */
    const [classLoading, setClassLoading]     = React.useState(true)
    const [classCurrentYear, setClassCurrentYear] = React.useState<number | null>(null)
    const [classCounts, setClassCounts]       = React.useState<ClassCounts>({
        Freshman: 0, Sophomore: 0, Junior: 0, Senior: 0, Alumni: 0, Other: 0,
    })

    /* ── Teams ── */
    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams`)
            .then(async (res) => {
                if (!res.ok) throw new Error(res.statusText)
                const data: GetTeamsListResponse = await res.json()
                setActiveTeams(data.teams.length)
            })
            .catch((e) => {
                toast.error("Failed to load team stats: " + e.message)
                setActiveTeams(0)
            })
    }, [])

    /* ── Class breakdown ── */
    React.useEffect(() => {
        const load = async () => {
            setClassLoading(true)
            try {
                /* Fetch settings and first page of members in parallel */
                const [settingsRes, firstPageRes] = await Promise.all([
                    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/exec/settings`),
                    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people?page=1`),
                ])

                const settings: OrgSettings = settingsRes.ok
                    ? await settingsRes.json()
                    : { currentYear: String(new Date().getFullYear()) }

                const currentYear = parseInt(settings.currentYear)
                setClassCurrentYear(currentYear)

                if (!firstPageRes.ok) throw new Error(firstPageRes.statusText)
                const firstData: GetUserListResponse = await firstPageRes.json()
                const { total_pages } = firstData.pagination

                /* Fetch all remaining pages in parallel */
                const remainingData: GetUserListResponse[] = total_pages > 1
                    ? await Promise.all(
                        Array.from({ length: total_pages - 1 }, (_, i) => i + 2).map(async (page) => {
                            const r = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people?page=${page}`)
                            return r.ok ? (await r.json() as GetUserListResponse) : { pagination: firstData.pagination, users: [] }
                        })
                    )
                    : []

                const allUsers: UserBrief[] = [
                    ...firstData.users,
                    ...remainingData.flatMap(d => d.users),
                ]

                /* Active member count */
                setActiveMembers(allUsers.filter(u => u.active).length)

                /* Bucket each member by graduating year */
                const counts: ClassCounts = { Freshman: 0, Sophomore: 0, Junior: 0, Senior: 0, Alumni: 0, Other: 0 }
                for (const user of allUsers) {
                    if (user.attributes?.alumniAccount) {
                        counts.Alumni++
                        continue
                    }
                    if (!user.attributes?.expectedGrad) {
                        counts.Other++
                        continue
                    }
                    const gradYear = new Date(user.attributes.expectedGrad).getFullYear()
                    if      (gradYear === currentYear)     counts.Senior++
                    else if (gradYear === currentYear + 1) counts.Junior++
                    else if (gradYear === currentYear + 2) counts.Sophomore++
                    else if (gradYear === currentYear + 3) counts.Freshman++
                    else if (gradYear <   currentYear)     counts.Alumni++
                    else                                   counts.Other++
                }
                setClassCounts(counts)
            } catch (e: any) {
                toast.error("Failed to load class breakdown: " + e.message)
                setActiveMembers(0)
            } finally {
                setClassLoading(false)
            }
        }
        load()
    }, [])

    /* ── ATS applications ── */
    React.useEffect(() => {
        const load = async () => {
            setAppsLoading(true)
            try {
                const openTeamsRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/openteams`, { credentials: "include" })
                const openTeams: OpenATSTeam[] = openTeamsRes.ok ? await openTeamsRes.json() : []
                setOpenTeamCount(openTeams.length)

                /* Applications for each open team in parallel */
                const appsByTeam = await Promise.all(
                    openTeams.map(async (team) => {
                        const r = await fetch(
                            `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/applications/${team.teamPk}`,
                            { credentials: "include" }
                        )
                        return r.ok ? (await r.json() as ATSApplication[]) : []
                    })
                )
                setAllApplications(appsByTeam.flat())
            } catch (e: any) {
                toast.error("Failed to load recruitment stats: " + e.message)
                setOpenTeamCount(0)
            } finally {
                setAppsLoading(false)
            }
        }
        load()
    }, [])

    return (
        <div className="flex min-h-full flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-3">
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
                    Executive Stats
                </h1>
                <h4 className="text-xl text-muted-foreground">
                    High-level metrics across the club
                </h4>
            </div>

            {/* ── Section: Overview ── */}
            <section className="flex flex-col gap-3">
                <SectionHeader title="Overview" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                        icon={<UsersIcon className="size-4" />}
                        label="Active Members"
                        value={activeMembers}
                        sub="currently active in the org"
                    />
                    <StatCard
                        icon={<NetworkIcon className="size-4" />}
                        label="Active Teams"
                        value={activeTeams}
                        sub="subteams and divisions"
                    />
                    <StatCard
                        icon={<BriefcaseIcon className="size-4" />}
                        label="Recruiting Teams"
                        value={openTeamCount}
                        sub="teams currently open for apps"
                    />
                </div>
            </section>

            {/* ── Section: Applications ── */}
            <section className="flex flex-col gap-3">
                <SectionHeader title="Applications" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        icon={<BriefcaseIcon className="size-4" />}
                        label="Total Applications"
                        value={appsLoading ? null : allApplications.length}
                        sub="across all recruiting teams"
                    />
                    <StatCard
                        icon={<BriefcaseIcon className="size-4" />}
                        label="Not Reviewed"
                        value={appsLoading ? null : allApplications.filter(a => a.stage === "Applied").length}
                        sub="awaiting review"
                    />
                    <StatCard
                        icon={<BriefcaseIcon className="size-4" />}
                        label="Rejected"
                        value={appsLoading ? null : allApplications.filter(a => a.stage === "Rejected" || a.stage === "Rejected After Interview").length}
                        sub="applications declined"
                    />
                    <StatCard
                        icon={<BriefcaseIcon className="size-4" />}
                        label="Accepted"
                        value={appsLoading ? null : allApplications.filter(a => a.stage === "Hired").length}
                        sub="applications accepted"
                    />
                </div>
            </section>

            {/* ── Section: Members ── */}
            <section className="flex flex-col gap-3">
                <SectionHeader title="Members" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {CLASS_YEARS.map(({ key, label, offset }) => (
                        <StatCard
                            key={key}
                            icon={<GraduationCapIcon className="size-4" />}
                            label={label}
                            value={classLoading ? null : classCounts[key]}
                            sub={classCurrentYear !== null ? `Class of ${classCurrentYear + offset}` : undefined}
                        />
                    ))}
                </div>
            </section>
        </div>
    )
}
