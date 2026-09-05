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

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Phone, Calendar, GraduationCap, Briefcase, ShieldCheck, MapPin, Clock, Tag, AlertCircle, Users, Loader2, Star, PenLine, Trash2Icon, SquarePen, ChevronRight, ChevronDown } from 'lucide-react';
import { PEOPLEPORTAL_SERVER_ENDPOINT } from '@/commons/config';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Dialog, DialogClose, DialogContent, DialogContentWide, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { DialogDescription } from '@radix-ui/react-dialog';

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

interface ReviewData { 
  _id: string;
  userId: number;
  creatorId: number;
  teamId: string;
  rating: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
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
    const navigate = useNavigate();
    const [user, setUser] = useState<UserInformationDetail | null>(null);
    const [userTeamsMap, setUserTeamsMap] = useState<Map<string, TeamInformationBrief>>(new Map());
    const [loading, setLoading] = useState(true);

    const [reviewTeams, setReviewTeams] = useState<TeamInformationBrief[]>([]);
    const [reviews, setReviews] = useState<ReviewData[]>([]);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

    const [expandReviewDialogOpen, setExpandReviewDialogOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState<ReviewData | null>(null);

    const [deleteReviewDialogOpen, setDeleteReviewDialogOpen] = useState(false);

    const [isExec, setIsExec] = useState(false);
    const [totalReviews, setTotalReviews] = useState(0);
    const [avgRating, setAvgRating] = useState(0);
    const [allReviewsOpen, setAllReviewsOpen] = useState(false);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [allReviews, setAllReviews] = useState<ReviewData[]>([]);
    const [userInfoCache, setUserInfoCache] = useState<Map<number, UserInformationBrief>>(new Map());
 

    const allReviewsLengthRef = useRef(0);
    useEffect(() => { allReviewsLengthRef.current = allReviews.length; }, [allReviews]);

    const userInfoCacheRef = useRef(userInfoCache);
    useEffect(() => { userInfoCacheRef.current = userInfoCache; }, [userInfoCache]);

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

        const fetchUserReviews = async () => {
            try {
                setAllReviews([]);
                setAllReviewsOpen(false);
                setTotalReviews(0);
                setAvgRating(0);

                setReviews([]);

                const commonTeamsRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${userPk}/commonteams`, {
                    credentials: 'include'
                });
                if (!commonTeamsRes.ok) throw Error("Failed to fetch common teams");
                
                const commonTeams = await commonTeamsRes.json()
                const reviewableTeams: TeamInformationBrief[] = [];
                const existingReviews: ReviewData[] = [];

                

                const results = await Promise.all(
                    commonTeams.teams.map(async (team: TeamInformationBrief) => {
                        const res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${userPk}/reviews/${team.pk}`, {
                            credentials: 'include'
                        });
                        if (!res.ok) return { team: null, review: null };
                        const data = await res.json();
                        return { team, review: data.review };
                    })
                );

                for (const { team, review } of results) {
                    if (team === null) continue;
                    reviewableTeams.push(team);
                    if (review !== null) existingReviews.push(review);
                }
                setReviewTeams(reviewableTeams);
                setReviews(existingReviews);

                // Don't fetch any actual data. Just check if user is authorized to get this data.
                const queryString = new URLSearchParams({ limit: '0', getAggregateData: 'true' }).toString();
                const allReviewsRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${userPk}/reviews?${queryString}`, {
                    credentials: 'include'
                });

                // If true, unauthorized.
                if (!allReviewsRes.ok) {
                    setIsExec(false);
                    return;
                }

                setIsExec(true);
                
                const allReviewsData = await allReviewsRes.json();
                setTotalReviews(allReviewsData.aggregateData.totalReviews ?? 0);
                setAvgRating(allReviewsData.aggregateData.averageRating ?? 0);
            } catch (err) { } finally { } 
            // If an error occured, its likely due to lacking permissions.
            // Dont show error message as to keep reviews hidden from normal user.
        }

        fetchUserReviews();
    }, [userPk]);

    const fetchReviews = useCallback(async () => {
        try {
            setReviewsLoading(true);

            const queryString = new URLSearchParams({
                limit: '12',
                offset: allReviewsLengthRef.current.toString(),
                getAggregateData: 'false',
                sortBy: "updatedAt",
                ascending: "false"
            }).toString();
            const allReviewsRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${userPk}/reviews?${queryString}`, {
                credentials: 'include'
            });

            if (!allReviewsRes.ok) {
                throw new Error(`Failed to fetch reviews: ${allReviewsRes.statusText}`);
            }

            const allReviewsData = await allReviewsRes.json();
            const uniqueCreatorIds: number[] = [...new Set<number>(allReviewsData.reviews.map((r: ReviewData) => r.creatorId))];

            const reviewers = await Promise.all(uniqueCreatorIds.map(async (creatorId) => {
                if (userInfoCacheRef.current.has(creatorId)) return null;
                const userRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${creatorId}`,{
                    credentials: 'include'
                });
                if (!userRes.ok) {
                    toast.error(`Failed to load user information for user ${creatorId}`);
                };
                const userData: UserInformationDetail = await userRes.json();
                return [creatorId, userData];
            }));

            setUserInfoCache(prev => {
                const newUserInfoCache = new Map(prev);
                reviewers.forEach(entry => {
                    if (entry) newUserInfoCache.set(entry[0] as number, entry[1] as UserInformationDetail);
                });
                return newUserInfoCache;
            })
            setAllReviews(prev => [...prev, ...allReviewsData.reviews]);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setReviewsLoading(false);
        }
    }, [userPk]);

    useEffect(() => {
        if (!allReviewsOpen || !isExec || totalReviews === 0 || allReviewsLengthRef.current > 0) return;
        fetchReviews();
    }, [allReviewsOpen, isExec, totalReviews, allReviewsLengthRef.current]);

    const handleAddReview = useCallback((review: ReviewData) => {
        if (isExec) {
            setAllReviews(prev => [review, ...prev]);
            setAvgRating(prev => (prev * totalReviews + review.rating) / (totalReviews + 1));
            setTotalReviews(prev => prev + 1);
        }
        setReviews(prev => [review, ...prev]);
    }, [isExec, totalReviews]);

    const handleEditReview = useCallback((review: ReviewData) => {
        if (isExec) {
            setAllReviews(prev => {
                const idx = prev.findIndex(r => r._id === review._id);
                if (idx === -1) return prev;

                setAvgRating(avg => avg + (review.rating - prev[idx].rating) / totalReviews);
                return [review, ...prev.filter((_, i) => i !== idx)];
            });
        }
        setReviews(prev => [review, ...prev.filter(r => r._id !== review._id)]);
    }, [isExec, totalReviews]);

    const handleDeleteReview = useCallback((review: ReviewData) => {
        if (isExec) {
            setAllReviews(prev => prev.filter(r => r._id !== review._id));
            if (totalReviews == 1) {
                setAvgRating(0);
            } else {
                setAvgRating(prev => (prev * totalReviews - review.rating) / (totalReviews - 1));
            }
            setTotalReviews(prev => prev - 1);
        }
        setReviews(prev => prev.filter(r => r._id !== review._id));
    }, [isExec, totalReviews]);

    const handleExpandOpen = useCallback((review: ReviewData) => {
        setSelectedReview(review);
        setExpandReviewDialogOpen(true);
    }, []);

    const handleEditOpen = useCallback((review: ReviewData) => {
        setSelectedReview(review);
        setReviewDialogOpen(true);
    }, []);

    const handleDeleteOpen = useCallback((review: ReviewData) => {
        setSelectedReview(review);
        setDeleteReviewDialogOpen(true);
    }, []);

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
        <>
            <ReviewUserDialog
                open={reviewDialogOpen}
                openChanged={(open, refresh) => {
                    setReviewDialogOpen(open)
                    if (!open) setSelectedReview(null);
                }}
                reviewTeams={reviewTeams}
                reviews={reviews}
                handleAddReview={handleAddReview}
                handleEditReview={handleEditReview}
                editReview={selectedReview ?? undefined}
            />
            <ExpandReviewDialog
                open={expandReviewDialogOpen}
                openChanged={(open, refresh) => {
                    setExpandReviewDialogOpen(open);
                    if (!open) setSelectedReview(null);
                }}
                review={selectedReview}
                userCache={userInfoCache}
                setUserCache={setUserInfoCache}
                userTeamsMap={userTeamsMap}
            />
            <DeleteReviewDialog
                open={deleteReviewDialogOpen}
                openChanged={(open, refresh) => {
                    setDeleteReviewDialogOpen(open);
                    if (!open) setSelectedReview(null);
                }}
                review={selectedReview}
                handleDeleteReview={handleDeleteReview}
            />
            <div className="flex flex-col md:flex-row gap-8 p-6 h-full overflow-y-auto">
                
                {/* Left Column: User Profile Sidebar (Slim) */}
                <div className="flex flex-col gap-6 lg:w-[260px] shrink-0">
                    <div className="md:sticky md:top-2 flex flex-col gap-5">
                        {/* Avatar & Basic Identity */}
                        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3">
                            <Avatar className="h-32 w-32 md:h-48 md:w-48 lg:h-64 lg:w-64 ring-4 ring-background shadow-xl rounded-full bg-muted">
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
                                    <a href={`tel:${attributes.phoneNumber}`} className="hover:text-primary hover:underline truncate transition-colors" title={attributes.phoneNumber}>
                                        {attributes.phoneNumber}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Main Content */}
                <div className="flex-1 min-w-0 space-y-6 overflow-y-auto scrollbar-hidden">

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
                                    <Card
                                        key={teamPk}
                                        className="hover:border-primary/50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/org/teams/${teamPk}`)}
                                    >
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

                    {reviewTeams.length !== 0 &&
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-base font-semibold flex items-center gap-2 text-muted-foreground">
                                    <PenLine className="h-4 w-4" />
                                    Review User
                                </h2>        
                            </div>

                            {reviews.length > 0 ?
                                <div className="flex flex-col justify-center p-4 border border-dashed rounded-lg bg-muted/7 gap-4">
                                    <h1 className='text-base font-bold tracking-tight'>Your Reviews</h1>
                                    <div className="grid gap-2.5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                                        {reviews.map((review) => (
                                            <ReviewCard 
                                                key={review._id}
                                                review={review}
                                                teamName={userTeamsMap.get(review.teamId)?.friendlyName ?? userTeamsMap.get(review.teamId)?.name}
                                                onExpand={handleExpandOpen}
                                                onEdit={handleEditOpen}
                                                onDelete={handleDeleteOpen}
                                            />
                                        ))}
                                    </div>
                                    <Button variant={"outline"} onClick={() => { setSelectedReview(null); setReviewDialogOpen(true); }}>Write a new review</Button>
                                </div>
                                : <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/5 gap-2">
                                    <p className="text-sm text-muted-foreground font-medium">You have not written an internal review for this user yet.</p>
                                    <Button variant={"outline"} onClick={() => { setSelectedReview(null); setReviewDialogOpen(true); }}>Write a review</Button>
                                </div>
                            }
                        </section>
                    }

                    {isExec &&
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-base font-semibold flex items-center gap-2 text-muted-foreground">
                                    <Star className="h-4 w-4" />
                                    All Reviews
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAllReviewsOpen(!allReviewsOpen) }}>
                                        {allReviewsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                </h2>
                                <div className="flex items-end justify-between gap-6">
                                    <Badge
                                        variant={avgRating === 0 ? "outline" : "secondary"}
                                        className={cn("flex items-center gap-1 text-xs shrink-0", avgRating === 0 ? "text-muted-foreground" : '')}
                                        style={avgRating === 0 ? undefined : {
                                            color: `rgb(${Math.round(230 * (1 - (avgRating - 1) / 4))}, ${Math.round(230 * ((avgRating - 1) / 4))}, 20)`,
                                            backgroundColor: `rgb(${Math.round(255 * (1 - (avgRating - 1) / 4))}, ${Math.round(255 * ((avgRating - 1) / 4))}, 20, 0.1)`,
                                        }}
                                    >
                                        <Star className="h-3 w-3" />
                                        Average rating: {avgRating.toFixed(1)}
                                    </Badge>
                                    <Badge variant="outline" className="text-muted-foreground text-xs">
                                        {totalReviews} Total
                                    </Badge>
                                </div>
                                
                            </div>
                            {allReviewsOpen && (totalReviews > 0 ? 
                                <div className="flex flex-col justify-center p-4 border border-dashed rounded-lg bg-muted/7 gap-4">
                                    <div className="grid gap-2.5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                                        {allReviews.map((review) => (
                                            <ReviewCard 
                                                key={review._id}
                                                review={review}
                                                teamName={userTeamsMap.get(review.teamId)?.friendlyName ?? userTeamsMap.get(review.teamId)?.name}
                                                onExpand={handleExpandOpen}
                                                onEdit={handleEditOpen}
                                                onDelete={handleDeleteOpen}
                                                reviewer={userInfoCache.get(review.creatorId)}
                                            />
                                        ))}
                                        {reviewsLoading &&
                                            Array.from({ length: Math.min(12, totalReviews - allReviews.length)}, (_, i) => (
                                                <Skeleton className="h-40 w-full" key={i} />
                                            ))
                                        }
                                    </div>
                                    {(allReviews.length < totalReviews) && <Button disabled={reviewsLoading} variant="outline" onClick={fetchReviews}>Fetch More Reviews</Button>}
                                </div> : 
                                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/5 gap-2">
                                    <p className="text-sm text-muted-foreground font-medium">This user has not been reviewed.</p>
                                </div>
                            )}

                        </section>
                    }
                </div>
            </div>
        </>
    );
};

const ReviewCard = memo(({ 
    review, 
    teamName,
    onExpand, 
    onEdit, 
    onDelete,
    reviewer
}: { 
    review: ReviewData;
    teamName: string | undefined;
    onExpand: (review: ReviewData) => void;
    onEdit: (review: ReviewData) => void;
    onDelete: (review: ReviewData) => void;
    reviewer?: UserInformationBrief;
}) => {
    const formattedDate = useMemo(() => 
        new Date(review.updatedAt).toLocaleString(), 
        [review.updatedAt]
    );

    const handleExpand = useCallback(() => onExpand(review), [review, onExpand]);
    const handleEdit = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onEdit(review); }, [review, onEdit]);
    const handleDelete = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onDelete(review); }, [review, onDelete]);

    return (
        <Card key={review._id.toString()} className="!bg-card hover:border-primary/50 transition-colors cursor-pointer" onClick={handleExpand}>
            <CardContent className="p-4 !pb-2 !pt-4 h-full flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {reviewer && (
                            <div className="border-r pr-2">
                                <Avatar className="h-7 w-7 shrink-0 border-r">
                                    <AvatarImage src={reviewer.avatar} alt={reviewer.name} />
                                    <AvatarFallback className="text-[10px]">
                                        {reviewer.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        )}
                        
                        <CardTitle className="text-sm font-medium text-foreground truncate" title={review.title}>
                            {review.title}
                        </CardTitle>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 shrink-0">
                        <Star className="h-3 w-3" />
                        {review.rating}
                    </Badge>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500">
                    <Briefcase className="h-3 w-3" />
                    {teamName}
                </div>

                {review.content && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {review.content}
                    </p>
                )}

                <div className="flex justify-end pt-2 border-t border-border mt-auto">
                    <span className="mr-auto">
                        {!reviewer && <Button onClick={handleEdit} variant="ghost" size="icon" className="h-6 w-5 mr-1 hover:text-green-600 hover:bg-green-50">
                            <SquarePen size={12} />
                        </Button>}
                        <Button onClick={handleDelete} variant="ghost" size="icon" className="h-6 w-6 hover:text-red-600 hover:bg-red-50">
                            <Trash2Icon size={12} />
                        </Button>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
                </div>
            </CardContent>
        </Card>
    );
});

interface ReviewUserDialogProps {
    open?: boolean;
    openChanged(open: boolean, refresh?: boolean): void;
    reviewTeams: TeamInformationBrief[];
    reviews: ReviewData[];
    handleAddReview: (r: ReviewData) => void;
    handleEditReview: (r: ReviewData) => void;
    editReview?: ReviewData;
}

const ReviewUserDialog = (props: ReviewUserDialogProps) => {
    const { userPk } = useParams<{ userPk: string }>();
    const reviewURL = `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${userPk}/reviews`;

    const [teamId, setTeamId] = useState<string>('');
    const [rating, setRating] = useState<number>(5);
    const [title, setTitle] = useState<string>('');
    const [content, setContent] = useState<string>('');

    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleFormSubmit = async () => {
        setIsLoading(true);

        const payload = JSON.stringify({
            teamId: teamId,
            rating: rating,
            title: title,
            content: content
        });

        const headers = { "Content-Type": "application/json" };

        try {
            let res: Response;

            if (props.editReview === undefined) {
                res = await fetch(reviewURL, { credentials: 'include', method: 'POST', headers: headers, body: payload });
            } else {
                res = await fetch(`${reviewURL}/${props.editReview._id}`, { credentials: 'include', method: 'PUT', headers: headers, body: payload });
            }

            if (!res.ok) throw new Error((await res.text()));
            const resData = await res.json();

            if (props.editReview === undefined) {
                // props.setReviews([resData.review, ...props.reviews]);
                props.handleAddReview(resData.review);
            } else {
                // const filtered = props.reviews.filter((r) => r._id !== props.editReview!._id);
                // props.setReviews([resData.review, ...filtered]);
                props.handleEditReview(resData.review);
            }
            
            toast.success("Review Submitted");
            props.openChanged(false);
            setContent('');
            setRating(5);
            setTitle('');
            setTeamId('');

        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    const reviewableTeams = useMemo(() => {
        if (props.editReview === undefined) {
            return props.reviewTeams.filter((team) => 
                props.reviews.findIndex((r) => r.teamId === team.pk) === -1
            )
        }
        return [props.reviewTeams.find((team) => team.pk === props.editReview!.teamId)!]
    }, [props.reviewTeams, props.reviews, props.editReview]);

    useEffect(() => {
        if (props.editReview) {
            setTeamId(props.editReview.teamId);
            setTitle(props.editReview.title);
            setContent(props.editReview.content);
            setRating(props.editReview.rating);
        } else {
            setTeamId('');
            setTitle('');
            setContent('');
            setRating(5);
        }
    }, [props.editReview]);


    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <DialogContentWide>
                <DialogHeader>
                    <DialogTitle>{props.editReview === undefined ? "Write a Review" : "Edit Review"}</DialogTitle>
                </DialogHeader>
                <form className="grid gap-4" id="reviewForm">
                    <div className="grid gap-2">
                        <Label>Team</Label>
                        <Select required disabled={props.editReview !== undefined} value={teamId} onValueChange={(val) => { 
                            const idx = reviewableTeams.findIndex((t) => t.pk === val);
                            if (idx === -1) {
                                setTeamId('');
                                return;
                            }
                            setTeamId(val);
                        }}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Team" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Team</SelectLabel>
                                    {reviewableTeams.map((team) => <SelectItem value={team.pk}>{team.friendlyName || team.name}</SelectItem>)}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    {teamId !== '' &&
                        <>
                        <div className="grid gap-2">
                            <Label>Rating</Label>
                            <Input type="number" min={1} max={5} step={0.1} required value={rating} onChange={(e) => setRating(Number(e.target.value))} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Title</Label>
                            <Input maxLength={150} required value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="grid gap-1">
                            <Label className="mb-1">
                                Review Content
                                <span className="text-xs font-normal text-muted-foreground">50–2000 characters</span>
                            </Label>
                            <Textarea 
                                minLength={50} maxLength={2000} 
                                required value={content}
                                onChange={(e) => setContent(e.target.value)}
                                aria-invalid={content.length > 0 && content.length < 50}
                            />
                            <span className={`ml-auto text-sm ${(content.length > 2000 || content.length < 50) ? 'text-destructive' : 'text-muted-foreground'}`}>{`${content.length}/2000`}</span>
                        </div>
                        </>
                    }
                </form>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        onClick={handleFormSubmit}
                        disabled={isLoading || 
                            teamId === '' ||
                            !(title && title.length <= 150) || 
                            !(content.length >= 50 && content.length <= 2000) || 
                            !(rating >= 1 && rating <= 5 && Number.isInteger(rating * 10))
                        }
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit
                    </Button>
                </DialogFooter>
            </DialogContentWide>
        </Dialog>
    )
}


interface ExpandReviewDialogProps {
    open?: boolean;
    openChanged(open: boolean, refresh?: boolean): void;
    review: ReviewData | null;
    userCache: Map<number, UserInformationBrief>;
    setUserCache: (c: Map<number, UserInformationBrief>) => void;
    userTeamsMap: Map<string, TeamInformationBrief>;
}

const ExpandReviewDialog = (props: ExpandReviewDialogProps) => {
    const [reviewer, setReviewer] = useState<UserInformationBrief>();
    const review = props.review;

    useEffect(() => {
        if (!review) return;

        const fetchUserData = async () => {
            const userId = review.creatorId;
            if (props.userCache.has(userId)) {
                setReviewer(props.userCache.get(userId));
                return;
            }

            try {
                const userRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${userId}`,{
                    credentials: 'include'
                });
                if (!userRes.ok) throw new Error(userRes.statusText);
                const userData: UserInformationDetail = await userRes.json();
                setReviewer(userData);
                props.setUserCache(new Map(props.userCache).set(userId, userData));
            } catch (err) {
                toast.error(`Failed to fetch reviewer info: ${err}`);
                console.error(err);
            } finally { }
        }

        fetchUserData();
    }, [review?.creatorId]);
    

    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <DialogContentWide className='sm:max-w-4xl'>
                <DialogHeader>
                    { reviewer !== undefined ?
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={reviewer.avatar} alt={reviewer.name} />
                                <AvatarFallback className="text-sm">
                                    {reviewer.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <DialogTitle className="text-sm font-semibold leading-tight">{reviewer.name}</DialogTitle>
                                <a href={`#`} className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors" onClick={(e) => {
                                    e.preventDefault();
                                    try {
                                        navigator.clipboard.writeText(reviewer.email)
                                        toast.success("Email copied to clipboard.")
                                    } catch (e) {
                                        toast.error("Failed to copy email.")
                                    }
                                }}>
                                    {reviewer.email}
                                </a>
                            </div>
                        </div> : 
                        <Skeleton className="h-12 w-full" />
                    }
                </DialogHeader>

                { review !== null &&
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-semibold text-foreground leading-tight">{review.title}</h3>
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 shrink-0">
                                <Star className="h-3 w-3" />
                                {review.rating}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500">
                            <Briefcase className="h-3 w-3" />
                            {props.userTeamsMap.get(review.teamId)?.friendlyName ?? props.userTeamsMap.get(review.teamId)?.name}
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {review.content}
                        </p>

                        <div className="flex justify-end border-t pt-3 mt-1">
                            <span className="text-[11px] text-muted-foreground">
                                {new Date(review.updatedAt).toLocaleString()}
                            </span>
                        </div>
                    </div>
                }
            </DialogContentWide>
        </Dialog>
    )
}

interface DeleteReviewDialogProps {
    open?: boolean;
    openChanged(open: boolean, refresh?: boolean): void;
    review: ReviewData | null;
    handleDeleteReview: (r: ReviewData) => void;
}

const DeleteReviewDialog = (props: DeleteReviewDialogProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const review = props.review;

    const deleteReview = async () => {
        if (review === null) {
            props.openChanged(false);
            return;
        }

        setIsLoading(true);
        try {
            const userRes = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${review.userId}/reviews/${review._id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!userRes.ok) throw new Error(userRes.statusText);
            
            props.handleDeleteReview(review)
            toast.success("Review Deleted")
        } catch (err) {
            toast.error(`Failed to delete review: ${err}`);
            console.error(err);
        } finally {
            setIsLoading(false);
            props.openChanged(false);
        }
    }


    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <DialogContent>
                <DialogHeader className="min-w-0 w-full">
                    <DialogTitle>Delete Review</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-1 rounded-lg border bg-muted/5 p-4 min-w-0 w-full">
                    <p className="text-sm font-medium text-foreground break-words">{review?.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 break-words">{review?.content}</p>
                </div>

                <DialogFooter className="min-w-0 w-full">
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isLoading}>Cancel</Button>
                    </DialogClose>
                    <Button variant="default" disabled={isLoading} onClick={deleteReview}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Review
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )

}