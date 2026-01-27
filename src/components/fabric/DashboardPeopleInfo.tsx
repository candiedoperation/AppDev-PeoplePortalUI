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

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Phone, Calendar, GraduationCap, Briefcase, ShieldCheck, MapPin, Clock, Tag, AlertCircle, Users } from 'lucide-react';
import { PEOPLEPORTAL_SERVER_ENDPOINT } from '@/commons/config';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// --- Interfaces matching the Backend ---

const TeamType = {
    PROJECT: "PROJECT",
    CORPORATE: "CORPORATE",
    BOOTCAMP: "BOOTCAMP",
    SERVICE: "SERVICE"
} as const;
type TeamType = typeof TeamType[keyof typeof TeamType];

const SeasonType = {
    FALL: "FALL",
    SPRING: "SPRING"
} as const;
type SeasonType = typeof SeasonType[keyof typeof SeasonType];

const ServiceSeasonType = {
    ROLLING: "ROLLING"
} as const;
type ServiceSeasonType = typeof ServiceSeasonType[keyof typeof ServiceSeasonType];

interface TeamAttributeDefinition {
    friendlyName: string;
    teamType: TeamType;
    seasonType: SeasonType | ServiceSeasonType;
    seasonYear: number;
    description: string;
}

interface UserAttributeDefinition {
    major: string;
    expectedGrad: string;
    phoneNumber: string;
    roles: { [key: string]: string };
    alumniAccount: boolean;
}

interface UserInformationBrief {
    pk: string;
    username: string;
    name: string;
    email: string;
    memberSince: string;
    active: boolean;
    attributes: UserAttributeDefinition;
    is_superuser: boolean;
    avatar: string;
}

interface UserInformationDetail extends UserInformationBrief {
    groups: string[];
    last_login: string;
    type: string;
    groupsInfo: {
        name: string;
        pk: string;
        attributes: TeamAttributeDefinition;
    }[];
}

// Team info from /api/org/people/{username}/memberof
interface TeamInformationBrief {
    name: string;
    pk: string;
    parent: string | null;
    teamType: TeamType;
    seasonType: SeasonType | ServiceSeasonType;
    seasonYear: number;
    description: string;
    friendlyName: string;
    peoplePortalCreation: boolean;
}

// Reusable Info Card Component
const InfoItem = ({ icon: Icon, label, value, href, className }: { icon: React.ElementType, label: string, value: string | React.ReactNode, href?: string, className?: string }) => (
    <div className={cn("flex flex-col gap-1 p-3 rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Icon className="h-3.5 w-3.5" />
            {label}
        </div>
        <div className="text-sm font-semibold truncate" title={typeof value === 'string' ? value : undefined}>
            {href ? (
                <a href={href} className="hover:text-primary hover:underline transition-colors">
                    {value}
                </a>
            ) : (
                value
            )}
        </div>
    </div>
);

export const DashboardPeopleInfo = () => {
    const { userPk } = useParams<{ userPk: string }>();
    const [user, setUser] = useState<UserInformationDetail | null>(null);
    const [userTeamsMap, setUserTeamsMap] = useState<Map<string, TeamInformationBrief>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userPk) return;

        const fetchData = async () => {
            try {
                // 1. Fetch user info
                const userRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${userPk}`);
                if (!userRes.ok) throw new Error("Failed to fetch user");
                const userData: UserInformationDetail = await userRes.json();
                setUser(userData);

                // 2. Fetch user's root teams using their username
                const teamsRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${userData.username}/memberof`, {
                    credentials: 'include'
                });
                if (teamsRes.ok) {
                    const teamsData = await teamsRes.json();
                    // Build map: teamPk -> TeamInfo
                    const teamsMap = new Map<string, TeamInformationBrief>();
                    for (const team of teamsData.teams || []) {
                        teamsMap.set(team.pk, team);
                    }
                    setUserTeamsMap(teamsMap);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userPk]);

    if (loading) {
        return (
            <div className="flex flex-col md:flex-row gap-8 p-6">
                <div className="flex flex-col gap-4 md:w-1/4 items-center md:items-start">
                    <Skeleton className="h-48 w-48 md:h-56 md:w-56 rounded-full" />
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-32" />
                </div>
                <div className="flex-1 space-y-4">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
            </div>
        );
    }

    if (!user) {
        return <div className="p-8 text-center text-muted-foreground">User not found.</div>;
    }

    const { attributes } = user;
    const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    // Build role entries from attributes.roles, looking up team info from map
    // Filter out entries where team info couldn't be found
    const roleEntries = Object.entries(attributes?.roles || {})
        .map(([teamPk, roleTitle]) => ({
            teamPk,
            roleTitle,
            teamInfo: userTeamsMap.get(teamPk)
        }))
        .filter(entry => entry.teamInfo !== undefined);

    return (
        <div className="flex flex-col md:flex-row gap-8 p-6 h-full overflow-y-auto">
            {/* Left Column: User Profile Sidebar (Slim) */}
            <div className="flex flex-col gap-6 md:w-[260px] shrink-0">
                <div className="md:sticky md:top-2 flex flex-col gap-5">
                    {/* Avatar & Basic Identity */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3">
                        <Avatar className="h-48 w-48 md:h-64 md:w-64 ring-4 ring-background shadow-xl rounded-full bg-muted">
                            <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                            <AvatarFallback className="text-5xl text-muted-foreground">{initials}</AvatarFallback>
                        </Avatar>

                        <div className="space-y-0.5 mt-2 w-full">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground break-words leading-tight">{user.name}</h1>
                            <p className="text-base text-muted-foreground font-mono break-all">{user.username}</p>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-1">
                            <Badge variant={user.active ? "default" : "destructive"} className={cn("px-2 py-0.5 text-xs", user.active ? "bg-emerald-600 hover:bg-emerald-700" : "")}>
                                {user.active ? "Active" : "Inactive"}
                            </Badge>
                            {user.is_superuser && (
                                <Badge variant="secondary" className="gap-1 text-xs border-purple-500/30 text-purple-600 bg-purple-500/10 hover:bg-purple-500/20">
                                    <ShieldCheck className="h-3 w-3" />
                                    Admin
                                </Badge>
                            )}
                            {attributes?.alumniAccount && (
                                <Badge variant="secondary" className="gap-1 text-xs border-amber-500/30 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20">
                                    <GraduationCap className="h-3 w-3" />
                                    Alumni
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Contact Info Only - GitHub Style */}
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground border-t pt-4">
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 shrink-0" />
                            <a href={`mailto:${user.email}`} className="hover:text-primary hover:underline truncate transition-colors" title={user.email}>
                                {user.email}
                            </a>
                        </div>

                        {attributes?.phoneNumber && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 shrink-0" />
                                <span className="font-mono text-xs">{attributes.phoneNumber}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Main Content */}
            <div className="flex-1 min-w-0 space-y-6">

                {/* Section 1: Personal Details Grid */}
                <section>
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Personal Details
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {attributes?.major && (
                            <InfoItem icon={GraduationCap} label="Major" value={attributes.major} />
                        )}
                        {attributes?.expectedGrad && (
                            <InfoItem icon={Calendar} label="Class of" value={format(new Date(attributes.expectedGrad), 'yyyy')} />
                        )}
                        {user.memberSince && (
                            <InfoItem icon={MapPin} label="Joined" value={format(new Date(user.memberSince), 'MMM yyyy')} />
                        )}
                        {user.last_login && (
                            <InfoItem icon={Clock} label="Last Seen" value={formatDistanceToNow(new Date(user.last_login)) + " ago"} />
                        )}
                        {user.type && user.type !== 'internal' && (
                            <InfoItem icon={Tag} label="Account Type" value={<span className="capitalize">{user.type}</span>} />
                        )}
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            Team Memberships
                        </h2>
                        <Badge variant="outline" className="text-muted-foreground text-xs">
                            {roleEntries.length} Total
                        </Badge>
                    </div>

                    {roleEntries.length > 0 ? (
                        <div className="grid gap-2.5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                            {roleEntries.map(({ teamPk, roleTitle, teamInfo }) => (
                                <Card key={teamPk} className="hover:border-primary/50 transition-colors">
                                    <CardContent className="p-3">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <CardTitle className="text-sm font-bold text-foreground truncate" title={teamInfo?.friendlyName || teamPk}>
                                                    {teamInfo?.friendlyName || "Unknown Team"}
                                                </CardTitle>
                                                {teamInfo?.teamType && (
                                                    <Badge variant="secondary" className="text-[9px] h-4 px-1 rounded font-normal text-muted-foreground shrink-0">
                                                        {teamInfo.teamType}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500">
                                                <Briefcase className="h-3 w-3" />
                                                {roleTitle}
                                            </div>

                                            {teamInfo?.description && (
                                                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={teamInfo.description}>
                                                    {teamInfo.description}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between pt-1.5 border-t text-[10px] text-muted-foreground mt-1">
                                                <div className="flex items-center gap-1">
                                                    {(teamInfo?.seasonType || teamInfo?.seasonYear) ? (
                                                        <>
                                                            <Calendar className="h-2.5 w-2.5 opacity-70" />
                                                            <span>{teamInfo.seasonType} {teamInfo.seasonYear}</span>
                                                        </>
                                                    ) : (
                                                        <span>Ongoing</span>
                                                    )}
                                                </div>
                                                <span className="font-mono opacity-50">{teamPk.substring(0, 6)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/5">
                            <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
                            <p className="text-sm text-muted-foreground font-medium">No team memberships found.</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};