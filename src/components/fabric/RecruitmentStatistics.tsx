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

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { TeamInfo } from "./DashboardTeamInfo";
import { Progress } from "../ui/progress";

interface StatisticsProps {
    applications: any[];
    subTeams: TeamInfo[];
}

export const RecruitmentStatistics = ({ applications, subTeams }: StatisticsProps) => {

    /* --- Derived Statistics --- */
    const stats = useMemo(() => {
        const total = applications.length;
        const newApps = applications.filter(a => a.column === 'applied').length;
        const interviewing = applications.filter(a => a.column === 'interviewing').length;
        const accepted = applications.filter(a => a.column === 'accepted').length;
        const rejected = applications.filter(a => a.column === 'rejected').length;

        // Group by Subteam data
        const bySubteam: { [key: string]: number } = {};
        subTeams.forEach(st => bySubteam[st.pk] = 0); // Init
        applications.forEach(app => {
            if (bySubteam[app.subteamPk] !== undefined) {
                bySubteam[app.subteamPk]++;
            } else {
                // If subteam info missing (maybe deleted subteam or cross-team data?), tally elsewhere or ignore
                bySubteam[app.subteamPk] = (bySubteam[app.subteamPk] || 0) + 1;
            }
        });

        // Group by Role
        const byRole: { [key: string]: number } = {};
        applications.forEach(app => {
            const role = app.role as string || "Unknown";
            byRole[role] = (byRole[role] || 0) + 1;
        });

        return { total, newApps, interviewing, accepted, rejected, bySubteam, byRole };
    }, [applications, subTeams]);

    return (
        <div className="flex flex-col gap-6 p-1">
            {/* Top Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Applications" value={stats.total} icon="📄" />
                <StatCard title="New Applicants" value={stats.newApps} icon="🔵" className="text-blue-600" />
                <StatCard title="Interviewing" value={stats.interviewing} icon="🟣" className="text-purple-600" />
                <StatCard title="Accepted" value={stats.accepted} icon="🟢" className="text-green-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Breakdown by Subteam */}
                <Card>
                    <CardHeader>
                        <CardTitle>By Subteam</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {subTeams.length === 0 && <p className="text-muted-foreground">No subteam information available.</p>}
                        {subTeams.map(subteam => {
                            const count = stats.bySubteam[subteam.pk] || 0;
                            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                            return (
                                <div key={subteam.pk} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium">{subteam.attributes.friendlyName}</span>
                                        <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                                    </div>
                                    <Progress value={percentage} className="h-2" />
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

                {/* Breakdown by Role */}
                <Card>
                    <CardHeader>
                        <CardTitle>By Role</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 max-h-[400px] overflow-y-auto">
                        {Object.keys(stats.byRole).length === 0 && <p className="text-muted-foreground">No role information available.</p>}
                        {Object.entries(stats.byRole)
                            .sort(([, a], [, b]) => b - a) // Sort desc by count
                            .map(([role, count]) => {
                                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                return (
                                    <div key={role} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium truncate pr-2" title={role}>{role}</span>
                                            <span className="text-muted-foreground whitespace-nowrap">{count}</span>
                                        </div>
                                        <Progress value={percentage} className="h-2" />
                                    </div>
                                )
                            })}
                    </CardContent>
                </Card>
            </div>

            {/* Rejected Count (Subtle) */}
            <div className="text-sm text-muted-foreground text-right border-t pt-2">
                Rejected Applicants: {stats.rejected}
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, className = "" }: { title: string, value: number, icon?: string, className?: string }) => (
    <Card>
        <CardContent className={`flex flex-col items-center justify-center p-6 ${className}`}>
            <div className="text-2xl mb-2">{icon}</div>
            <span className="text-4xl font-bold">{value}</span>
            <span className="text-sm text-muted-foreground mt-1 text-center">{title}</span>
        </CardContent>
    </Card>
);
