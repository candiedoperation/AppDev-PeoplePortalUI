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

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Phone, Calendar, GraduationCap, Briefcase, ShieldCheck, MapPin, Clock, Tag, AlertCircle, Users, PencilIcon, Loader2Icon, Check, ChevronsUpDown, Minus, Plus, UploadCloudIcon, Linkedin } from 'lucide-react';
import { PEOPLEPORTAL_SERVER_ENDPOINT } from '@/commons/config';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Slider } from '@/components/ui/slider';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';
import { LINKEDIN_PROFILE_ERROR, normalizeLinkedInProfileUrl } from '@/lib/linkedin';

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
    linkedinUrl?: string;
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

interface UMDMajor {
    college: string;
    major_id: string;
    name: string;
    url: string;
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

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);

const MonthYearPicker = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
    const [selSeason, setSelSeason] = React.useState(() => {
        if (value) { const idx = SEASONS.indexOf(value.split('-')[0]); return idx >= 0 ? idx : 0; }
        return 0;
    });
    const [selYear, setSelYear] = React.useState(() => {
        if (value) return parseInt(value.split('-')[1]) || new Date().getFullYear();
        return new Date().getFullYear();
    });

    const seasonRefs = useRef<(HTMLDivElement | null)[]>([]);
    const yearRefs = useRef<(HTMLDivElement | null)[]>([]);

    React.useEffect(() => {
        seasonRefs.current[selSeason]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [selSeason]);

    React.useEffect(() => {
        const idx = YEARS.indexOf(selYear);
        if (idx >= 0) yearRefs.current[idx]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [selYear]);

    React.useEffect(() => {
        onChange(`${SEASONS[selSeason]}-${selYear}`);
    }, [selSeason, selYear]);

    const colClass = "h-48 overflow-y-auto scrollbar-none flex flex-col items-center w-1/2 snap-y snap-mandatory";
    const itemClass = (active: boolean) => cn(
        "w-full text-center py-2 text-sm cursor-pointer snap-center rounded-md transition-all select-none",
        active ? "font-bold text-foreground bg-muted" : "text-muted-foreground hover:text-foreground"
    );

    return (
        <div className="flex gap-2 border rounded-md p-2">
            <div className={colClass}>
                {SEASONS.map((s, i) => (
                    <div key={s} ref={el => { seasonRefs.current[i] = el; }} className={itemClass(i === selSeason)} onClick={() => setSelSeason(i)}>
                        {s}
                    </div>
                ))}
            </div>
            <div className="w-px bg-border" />
            <div className={colClass}>
                {YEARS.map((y, i) => (
                    <div key={y} ref={el => { yearRefs.current[i] = el; }} className={itemClass(y === selYear)} onClick={() => setSelYear(y)}>
                        {y}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const DashboardPeopleInfo = () => {
    const { userPk } = useParams<{ userPk: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserInformationDetail | null>(null);
    const [userTeamsMap, setUserTeamsMap] = useState<Map<string, TeamInformationBrief>>(new Map());
    const [loading, setLoading] = useState(true);
    const [loggedInPk, setLoggedInPk] = useState<number | null>(null);

    // Edit modal state
    const [editOpen, setEditOpen] = useState(false);
    const [editPhone, setEditPhone] = useState('');
    const [editMajor, setEditMajor] = useState<UMDMajor | undefined>(undefined);
    const [editGrad, setEditGrad] = useState('');
    const [editLinkedin, setEditLinkedin] = useState('');
    const [editLinkedinError, setEditLinkedinError] = useState('');
    const [editAvatarKey, setEditAvatarKey] = useState<string | undefined>(undefined);
    const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [majors, setMajors] = useState<UMDMajor[]>([]);
    const [majorOpen, setMajorOpen] = useState(false);

    // Crop state
    const [cropImage, setCropImage] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isCropOpen, setIsCropOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Fetch logged-in user's pk
    useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/userinfo`)
            .then(r => r.json())
            .then(d => setLoggedInPk(d.pk))
            .catch(() => {});
    }, []);

    // Fetch UMD majors when edit modal opens
    useEffect(() => {
        if (!editOpen || majors.length > 0) return;
        fetch('https://api.umd.io/v1/majors/list')
            .then(r => r.json())
            .then(setMajors)
            .catch(() => toast.error('Failed to load majors'));
    }, [editOpen]);

    const openEdit = () => {
        if (!user) return;
        setEditPhone(user.attributes?.phoneNumber ?? '');
        setEditGrad(user.attributes?.expectedGrad ?? '');
        setEditLinkedin(user.attributes?.linkedinUrl ?? '');
        setEditLinkedinError('');
        setEditAvatarPreview(user.avatar || null);
        setEditAvatarKey(undefined);
        if (user.attributes?.major) {
            setEditMajor(majors.find(m => m.name === user.attributes.major));
        }
        setEditOpen(true);
    };

    const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = imageSrc;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = pixelCrop.width;
                canvas.height = pixelCrop.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('No 2d context'));
                ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas empty')), 'image/webp', 1.0);
            };
            image.onerror = reject;
        });
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.type)) return toast.error('Invalid file type');
        if (file.size > 20 * 1024 * 1024) return toast.error('File too large (max 20MB)');
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        const reader = new FileReader();
        reader.onload = () => { setCropImage(reader.result as string); setIsCropOpen(true); };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processAndUpload = async () => {
        if (!cropImage || !croppedAreaPixels || !userPk) return;
        toast.info('Processing image...');
        setIsUploading(true);
        setIsCropOpen(false);
        try {
            const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
            const compressed = await imageCompression(new File([croppedBlob], 'avatar.webp', { type: 'image/webp' }), {
                maxSizeMB: 0.45, maxWidthOrHeight: 512, useWebWorker: true, fileType: 'image/webp'
            });
            const uploadFile = new File([compressed], 'avatar.webp', { type: 'image/webp' });
            setEditAvatarPreview(URL.createObjectURL(uploadFile));

            const res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/avatar/profile-upload-url?fileName=${encodeURIComponent(uploadFile.name)}&contentType=${encodeURIComponent(uploadFile.type)}`, { credentials: 'include' });
            if (!res.ok) throw new Error((await res.json()).message || 'Failed to get upload URL');
            const { uploadUrl, key, fields } = await res.json();

            const formData = new FormData();
            Object.entries(fields).forEach(([k, v]) => formData.append(k, v as string));
            formData.append('file', uploadFile);
            const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
            if (!uploadRes.ok) throw new Error('Upload failed');

            setEditAvatarKey(key);
            toast.success('Profile picture uploaded!');
        } catch (e: any) {
            toast.error('Upload failed', { description: e.message });
        } finally {
            setIsUploading(false);
            setCropImage(null);
        }
    };

    const handleSave = async () => {
        if (!userPk) return;

        const normalizedLinkedinUrl = normalizeLinkedInProfileUrl(editLinkedin);
        if (normalizedLinkedinUrl === null) {
            setEditLinkedinError(LINKEDIN_PROFILE_ERROR);
            return;
        }

        setIsSaving(true);
        try {
            const body: Record<string, string> = {};
            if (editPhone !== (user?.attributes?.phoneNumber ?? '')) body.phoneNumber = editPhone;
            if (editGrad !== (user?.attributes?.expectedGrad ?? '')) body.expectedGrad = editGrad;
            if (editMajor && editMajor.name !== user?.attributes?.major) body.major = editMajor.name;
            if (normalizedLinkedinUrl !== (user?.attributes?.linkedinUrl ?? '')) body.linkedinUrl = normalizedLinkedinUrl;
            if (editAvatarKey) body.avatarKey = editAvatarKey;

            if (Object.keys(body).length === 0) { setEditOpen(false); return; }

            const res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${userPk}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to save');
            }

            toast.success('Profile updated!');
            setEditOpen(false);

            // Refresh profile data
            const updated = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people/${userPk}`);
            if (updated.ok) setUser(await updated.json());
        } catch (e: any) {
            toast.error('Failed to save', { description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

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
    const linkedinHref = normalizeLinkedInProfileUrl(attributes?.linkedinUrl ?? '');

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
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground break-words leading-tight">{user.name}</h1>
                                {loggedInPk !== null && Number(userPk) === loggedInPk && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={openEdit}>
                                        <PencilIcon className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
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

                        {linkedinHref && (
                            <div className="flex items-center gap-2">
                                <Linkedin className="h-4 w-4 shrink-0" />
                                <a
                                    href={linkedinHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-primary hover:underline truncate transition-colors"
                                    title={linkedinHref}
                                >
                                    LinkedIn
                                </a>
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
                            <InfoItem icon={Calendar} label="Class of" value={attributes.expectedGrad} />
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
            </div>

            {/* Edit Profile Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-5 py-2">
                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-2">
                            <Avatar
                                className="h-24 w-24 cursor-pointer ring-2 ring-muted hover:ring-primary transition-all"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <AvatarImage src={editAvatarPreview ?? undefined} className="object-cover" />
                                <AvatarFallback>
                                    {isUploading ? <Loader2Icon className="h-6 w-6 animate-spin" /> : <UploadCloudIcon className="h-6 w-6" />}
                                </AvatarFallback>
                            </Avatar>
                            <p className="text-xs text-muted-foreground">Click to change photo</p>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                        </div>

                        {/* Major */}
                        <div className="grid gap-1.5">
                            <Label>Major</Label>
                            <Popover modal open={majorOpen} onOpenChange={setMajorOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="justify-between">
                                        {editMajor ? editMajor.name : 'Select major'}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0 max-h-[32rem] overflow-hidden">
                                    <Command>
                                        <CommandInput placeholder="Search UMD major..." />
                                        <CommandList className="flex-1 min-h-0 max-h-[24rem] overflow-y-auto">
                                            <CommandEmpty>No majors found.</CommandEmpty>
                                            <CommandGroup>
                                                {majors.map(m => (
                                                    <CommandItem key={m.major_id} value={m.name} onSelect={() => { setEditMajor(m); setMajorOpen(false); }}>
                                                        <div className="flex flex-col">
                                                            <span>{m.name}</span>
                                                            <span className="text-xs text-muted-foreground">{m.college}</span>
                                                        </div>
                                                        <Check className={cn('ml-auto h-4 w-4', editMajor?.major_id === m.major_id ? 'opacity-100' : 'opacity-0')} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Expected Graduation */}
                        <div className="grid gap-1.5">
                            <Label>Expected Graduation</Label>
                            <MonthYearPicker value={editGrad} onChange={setEditGrad} />
                        </div>

                        {/* Phone */}
                        <div className="grid gap-1.5">
                            <Label>Phone Number</Label>
                            <PhoneInput defaultCountry="US" value={editPhone} onChange={setEditPhone} placeholder="Enter phone number" />
                        </div>

                        {/* LinkedIn */}
                        <div className="grid gap-1.5">
                            <Label htmlFor="profile-linkedin">
                                LinkedIn Profile <span className="text-muted-foreground font-normal">(Optional)</span>
                            </Label>
                            <Input
                                id="profile-linkedin"
                                type="url"
                                inputMode="url"
                                autoComplete="url"
                                maxLength={300}
                                placeholder="https://www.linkedin.com/in/your-name"
                                value={editLinkedin}
                                aria-invalid={Boolean(editLinkedinError)}
                                onChange={(e) => {
                                    setEditLinkedin(e.target.value);
                                    if (editLinkedinError) setEditLinkedinError('');
                                }}
                                onBlur={() => {
                                    const normalized = normalizeLinkedInProfileUrl(editLinkedin);
                                    if (normalized === null) {
                                        setEditLinkedinError(LINKEDIN_PROFILE_ERROR);
                                    } else {
                                        setEditLinkedin(normalized);
                                        setEditLinkedinError('');
                                    }
                                }}
                            />
                            {editLinkedinError && <p className="text-sm text-destructive">{editLinkedinError}</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving || isUploading}>
                            {isSaving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Crop Dialog */}
            <Dialog open={isCropOpen} onOpenChange={open => { setIsCropOpen(open); if (!open) setCropImage(null); }}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Crop Profile Picture</DialogTitle>
                    </DialogHeader>
                    <div className="relative h-[350px] w-full bg-muted rounded-md overflow-hidden mt-2">
                        {cropImage && (
                            <Cropper image={cropImage} crop={crop} zoom={zoom} aspect={1}
                                onCropChange={setCrop} onZoomChange={setZoom}
                                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                            />
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                        <Minus className="h-4 w-4 cursor-pointer" onClick={() => setZoom(z => Math.max(1, z - 0.1))} />
                        <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={v => setZoom(v[0])} className="flex-1" />
                        <Plus className="h-4 w-4 cursor-pointer" onClick={() => setZoom(z => Math.min(3, z + 0.1))} />
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setIsCropOpen(false)}>Cancel</Button>
                        <Button onClick={processAndUpload}>Crop & Upload</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
