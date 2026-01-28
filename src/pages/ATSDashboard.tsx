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

import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import logo from '../assets/logo.svg'
import React from 'react'
import { PEOPLEPORTAL_SERVER_ENDPOINT } from '@/commons/config'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
    CheckCircle2,
    ChevronLeftIcon,
    CircleXIcon,
    ExternalLinkIcon,
    FileIcon,
    GithubIcon,
    InfoIcon,
    LinkedinIcon,
    Loader2Icon,
    LogOutIcon,
    MailIcon,
    NotepadText,
    PlusIcon,
    SendIcon,
    SparklesIcon,
    TargetIcon,
    UploadCloud,
    UserIcon,
    Users2Icon,
    UsersRound
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Type for subteam preference (internal mapping)


// Team data from backend
interface ATSTeamData {
    teamPk: string;
    teamInfo: {
        name: string;
        friendlyName: string;
        description: string;
        seasonText: string;
        pk: string;
    };
    recruitingSubteams: Array<{
        subteamPk: string;
        friendlyName: string;
        description: string;
        roles: string[];
        roleSpecificQuestions: { [key: string]: string[] };
    }>;
}

interface OpenATSTeamInfo {
    name: string,
    friendlyName: string,
    description: string,
    seasonText: string,
    pk: string,
    recruitmentInfo?: {
        roles: string[]
    }
}

interface OpenATSTeam {
    teamPk: string,
    isRecruiting: boolean,
    recruitingSubteamPks: string[],
    teamInfo: OpenATSTeamInfo,
    subteamInfo: { [key: string]: OpenATSTeamInfo }
}

interface ApplicantProfile {
    [key: string]: string | undefined
}

interface PersonalInfoField {
    id: string
    label: string;
    placeholder?: string;
    type?: string
    options?: string[]
    required?: boolean
    multiline?: boolean
}

const PERSONAL_INFO_FIELDS: PersonalInfoField[] = [
    { id: "linkedinUrl", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/username" },
    { id: "githubUrl", label: "GitHub URL", placeholder: "https://github.com/username" },
    { id: "resumeUrl", label: "Resume (Upload PDF Only)", type: "file", required: true },
    {
        id: "instagramFollow",
        label: "Do you follow App Dev (@appdev_umd) on Instagram?",
        type: "select",
        options: [
            "Yes 🥳",
            "No, I don't want to because I am lame ☹️",
            "I don't have Instagram"
        ],
        required: true
    },
    {
        id: "whyAppDev",
        label: "Explain what you'd like to get out of App Dev Club",
        required: true,
        multiline: true
    },
    { id: "additionalInfo", label: "Is there anything else you'd like to mention?", multiline: true }
]

// Updated application interface - team-level
interface ApplicationRolePreference {
    role: string;
    subteamPk: string;
    subteamName?: string;
}

interface ATSApplication {
    _id: string;
    teamPk: string;
    teamName?: string;
    rolePreferences: ApplicationRolePreference[];
    stage: string;
    appliedAt: string;
    responses: { [key: string]: string };
    hiredSubteamPk?: string;
    hiredRole?: string;
}

interface OTPSessionResponse {
    name: string;
    email: string;
    profile: ApplicantProfile;
    applications: ATSApplication[];
}

export const ATSDashboard = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const [fullName, setFullName] = React.useState("")
    const [email, setEmail] = React.useState("")
    const [profile, setProfile] = React.useState<ApplicantProfile>({})
    const [applications, setApplications] = React.useState<ATSApplication[]>([])
    const [triggerLogin, setTriggerLogin] = React.useState(false)

    React.useEffect(() => {
        window.scrollTo(0, 0)
    }, [location.pathname])

    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/verifyotpsession`, {
            method: "GET",
            credentials: 'include'
        })
            .then(async (res) => {
                const data = await res.json()
                if (res.ok && !data.error) {
                    setFullName(data.name)
                    setEmail(data.email)
                    setProfile(data.profile || {})
                    setApplications(data.applications || [])
                }
            })
            .catch(() => {
            })
    }, [location.key])

    const handleLogout = async () => {
        try {
            const res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/logout`, {
                method: "POST",
                credentials: "include"
            })
            if (res.ok) {
                setFullName("")
                setEmail("")
                setProfile({})
                setApplications([])
                toast.success("Logged out successfully")
                navigate("/apply")
            }
        } catch (e) {
            toast.error("Failed to logout")
        }
    }

    const handleSessionUpdate = (data: OTPSessionResponse) => {
        setFullName(data.name)
        setEmail(data.email)
        setProfile(data.profile || {})
        setApplications(data.applications || [])

        // If we are on an apply page and the user has already applied, redirect to view
        if (location.pathname.startsWith('/apply/') && !location.pathname.endsWith('/applications')) {
            const pathParts = location.pathname.split('/');
            const possibleTeamId = pathParts[pathParts.length - 1]; // /apply/:teamId

            if (possibleTeamId && data.applications && data.applications.some(app => app.teamPk === possibleTeamId)) {
                toast.info("You have already applied to this team. Redirecting to your application...");
                navigate("/apply/applications");
            }
        }
    }

    return (
        <div className="flex flex-col w-full h-full">
            { /* Polished Header */}
            <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-16 items-center px-6 gap-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/apply")}>
                        <img className="h-8 w-8" src={logo} alt="App Dev Logo" />
                        <div className="flex flex-col">
                            Recruitment
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-6 ml-8">
                        <Button
                            variant="link"
                            className={`px-0 py-0 h-auto text-xs font-bold uppercase tracking-widest transition-colors ${location.pathname === "/apply" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                            onClick={() => navigate("/apply")}
                        >
                            Open Roles
                        </Button>
                        <Button
                            variant="link"
                            className={`px-0 py-0 h-auto text-xs font-bold uppercase tracking-widest transition-colors ${location.pathname === "/apply/applications" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                            onClick={() => navigate("/apply/applications")}
                        >
                            My Applications
                        </Button>
                    </nav>

                    {/* Right-aligned group */}
                    <div className="ml-auto flex items-center gap-4">
                        {fullName ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-offset-background transition-all hover:ring-2 hover:ring-primary/20">
                                        <Avatar className="h-10 w-10 border border-border/50">
                                            <AvatarImage src="" alt={fullName} />
                                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                                {fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-40" align="end" forceMount>
                                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer py-2.5 text-destructive focus:text-destructive focus:bg-destructive/5">
                                        <LogOutIcon className="mr-2 h-4 w-4" />
                                        <span className="font-medium text-sm">Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : null}
                    </div>
                </div>
            </header>


            <AccountLoginAndVerifyDialog
                open={(!fullName && location.pathname.includes("/apply/") && !location.pathname.endsWith("/apply/")) || triggerLogin}
                onSuccess={(data) => {
                    setTriggerLogin(false);
                    handleSessionUpdate(data);
                }}
                fullName={fullName}
            />

            <div className='flex flex-col w-full px-4 pb-4 pt-20 gap-3'>
                <Routes>
                    <Route path="/" element={<ATSApplyList applications={applications} />} />
                    <Route path='/applications' element={<ATSApplicationsList applications={applications} profile={profile} fullName={fullName} email={email} />} />
                    <Route path='/:teamId' element={<ATSApplyPage applications={applications} profile={profile} onProfileUpdate={setProfile} fullName={fullName} onRequestLogin={() => setTriggerLogin(true)} />} />
                </Routes>
            </div>
        </div>
    )
}

export const ATSApplicationsList = ({ applications, profile, fullName, email }: { applications: ATSApplication[], profile: ApplicantProfile, fullName: string, email: string }) => {
    const navigate = useNavigate()

    if (!fullName) return null

    return (
        <div className="flex flex-col gap-10 max-w-5xl mx-auto w-full px-4 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-6">
                <Button className='max-w-max h-8 text-muted-foreground hover:text-foreground' onClick={() => navigate("../")} variant="ghost" size="sm">
                    <ChevronLeftIcon className="h-4 w-4 mr-1" />
                    Back to Open Roles
                </Button>

                <div className="flex flex-col gap-2">
                    <h1 className='text-4xl font-extrabold tracking-tight'>Member Dashboard</h1>
                    <p className="text-muted-foreground">Manage your applicant profile and track your active applications.</p>
                </div>
            </div>

            {/* Profile Section */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b pb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-2xl">
                            <UserIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">Your Professional Profile</CardTitle>
                            <CardDescription>This information is shared across all your applications.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <div className="space-y-1.5 p-4 rounded-xl bg-muted/20 border border-border/40">
                            <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                                <UserIcon className="h-3 w-3" /> Full Name
                            </Label>
                            <p className="font-bold text-lg text-foreground">{fullName}</p>
                        </div>
                        <div className="space-y-1.5 p-4 rounded-xl bg-muted/20 border border-border/40">
                            <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                                <MailIcon className="h-3 w-3" /> Email Address
                            </Label>
                            <p className="font-bold text-lg text-foreground">{email}</p>
                        </div>

                        {PERSONAL_INFO_FIELDS.map(field => {
                            const value = profile[field.id];
                            if (!value && !field.required) return null;

                            return (
                                <div key={field.id} className="md:col-span-2 space-y-3 p-5 rounded-2xl border border-border/40 bg-card">
                                    <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                                        {field.id === "linkedinUrl" && <LinkedinIcon className="h-3 w-3 text-primary/60" />}
                                        {field.id === "githubUrl" && <GithubIcon className="h-3 w-3 text-primary/60" />}
                                        {field.id === "resumeUrl" && <FileIcon className="h-3 w-3 text-primary/60" />}
                                        {field.label}
                                    </Label>

                                    <div className="flex items-start">
                                        {value?.toString().startsWith("http") ? (
                                            <a
                                                href={value}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 font-bold text-primary hover:underline bg-primary/5 px-4 py-2 rounded-full border border-primary/10 transition-colors hover:bg-primary/10"
                                            >
                                                {value}
                                                <ExternalLinkIcon className="h-3 w-3" />
                                            </a>
                                        ) : field.id === "resumeUrl" && value ? (
                                            <a
                                                href={value.startsWith("http") ? value : `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/resume/download?key=${encodeURIComponent(value as string)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-3 font-bold text-primary hover:underline bg-primary/5 px-5 py-3 rounded-2xl border border-primary/20 shadow-sm transition-all hover:scale-[1.01]"
                                            >
                                                <FileIcon className="h-5 w-5" />
                                                View Current Resume (PDF)
                                            </a>
                                        ) : (
                                            <div className="w-full bg-muted/30 p-4 rounded-xl border border-border/20">
                                                <p className="font-medium text-sm whitespace-pre-wrap leading-relaxed">
                                                    {value || "No response provided"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Applications List */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                    <h2 className='text-2xl font-bold tracking-tight'>Active Applications</h2>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">
                        {applications.length} Submitted
                    </Badge>
                </div>

                {applications.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed rounded-3xl border-border/60 bg-muted/10">
                        <p className="text-muted-foreground text-lg italic">You haven't submitted any applications yet.</p>
                        <Button variant="link" onClick={() => navigate("/apply")} className="mt-2 font-bold">
                            Browse open roles <ExternalLinkIcon className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {applications.map((app) => (
                            <Card key={app._id} className="border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="p-6 md:p-8 flex flex-col gap-6">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-black tracking-tight">
                                                    {app.teamName || app.teamPk}
                                                </h3>
                                                {/* Show hired status if applicable */}
                                                <div className="flex flex-col gap-2 pt-1">
                                                    {app.hiredSubteamPk && (
                                                        <Badge className="bg-green-500/10 text-green-600 border-green-200 w-max">
                                                            Hired: {app.hiredRole}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {app.responses && Object.keys(app.responses).length > 0 && (
                                            <Accordion type="single" collapsible className="w-full">
                                                <AccordionItem value="responses" className="border-none">
                                                    <AccordionTrigger className="text-xs font-bold text-muted-foreground hover:no-underline py-2 justify-start gap-2">
                                                        VIEW APPLICATION RESPONSES
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-4">
                                                        <div className="grid gap-4">
                                                            {/* Preferred Roles List */}
                                                            <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Priority Roles</p>
                                                                <div className="space-y-2">
                                                                    {app.rolePreferences?.map((pref, idx) => (
                                                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                                                            <Badge variant="outline" className="text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full p-0 shrink-0">
                                                                                {idx + 1}
                                                                            </Badge>
                                                                            <span className="font-bold">{pref.role}</span>
                                                                            <span className="text-muted-foreground text-xs">
                                                                                ({pref.subteamName || pref.subteamPk})
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {Object.entries(app.responses).map(([question, answer]) => (
                                                                <div key={question} className="p-4 rounded-xl bg-muted/20 border border-border/30">
                                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{question}</p>
                                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        )}

                                        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground border-t border-border/40 pt-6">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-primary/40" />
                                                Submitted on {new Date(app.appliedAt).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                            <div className="italic opacity-60">ID: {app._id.slice(-8).toUpperCase()}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}


// Sortable Item Component
const SortableRoleItem = ({ id, onRemove }: { id: string, onRemove: (id: string) => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`flex items-center justify-between p-3 bg-secondary/30 border border-border/50 rounded-lg group hover:bg-secondary/50 transition-colors ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''} touch-none`}>
            <div className="flex items-center gap-3">
                <div className="cursor-grab text-muted-foreground/50 group-hover:text-muted-foreground p-1">
                    <Users2Icon className="h-4 w-4" />
                </div>
                <span className="font-medium text-sm">{id}</span>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <CircleXIcon />
            </Button>
        </div>
    );
};

// Role Preference Selector Component
const RolePreferenceSelector = ({
    allRoles,
    selectedRoles,
    onChange
}: {
    allRoles: string[],
    selectedRoles: string[],
    onChange: (roles: string[]) => void
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const availableRoles = allRoles.filter(role => !selectedRoles.includes(role));

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (active.id !== over.id) {
            const oldIndex = selectedRoles.indexOf(active.id);
            const newIndex = selectedRoles.indexOf(over.id);
            onChange(arrayMove(selectedRoles, oldIndex, newIndex));
        }
    };

    const addRole = (role: string) => {
        onChange([...selectedRoles, role]);
    };

    const removeRole = (role: string) => {
        onChange(selectedRoles.filter(r => r !== role));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
            {/* Left: Available Roles */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Available Roles</Label>
                    <Badge variant="outline" className="text-[10px]">{availableRoles.length}</Badge>
                </div>
                <div className="grid gap-2">
                    {availableRoles.length === 0 ? (
                        <div className="p-8 border border-dashed rounded-lg text-center text-sm text-muted-foreground bg-muted/20">
                            {selectedRoles.length > 0 ? "All roles selected." : "No roles available."}
                        </div>
                    ) : (
                        availableRoles.map(role => (
                            <div key={role} className="flex items-center justify-between p-3 bg-card border border-border/50 rounded-lg hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => addRole(role)}>
                                <span className="font-bold text-sm">{role}</span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground/60"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Selected Roles (Sortable) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-primary uppercase tracking-wider">Your Preferences (Ranked)</Label>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none">{selectedRoles.length}</Badge>
                </div>
                <div className="bg-muted/10 rounded-xl border border-border/50 p-4 min-h-[200px]">
                    {selectedRoles.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground opacity-60 gap-2">
                            <TargetIcon className="h-8 w-8 mb-2" />
                            <p className="text-sm font-medium">No roles selected</p>
                            <p className="text-xs">
                                Select roles from the left to add them here.<br />
                                <span className="opacity-70 mt-1 block">Your first choice is the most important!</span>
                            </p>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                            onDragStart={handleDragStart}
                        >
                            <SortableContext
                                items={selectedRoles}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2">
                                    {selectedRoles.map(role => (
                                        <SortableRoleItem key={role} id={role} onRemove={removeRole} />
                                    ))}
                                </div>
                            </SortableContext>
                            <DragOverlay>
                                {activeId ? (
                                    <div className="flex items-center justify-between p-3 bg-secondary border border-primary/50 rounded-lg shadow-xl ring-2 ring-primary opacity-90 cursor-grabbing w-full max-w-[300px]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1">
                                                <Users2Icon className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-sm">{activeId}</span>
                                        </div>
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
                {selectedRoles.length > 0 && (
                    <p className="text-[10px] text-muted-foreground text-center animate-pulse">
                        Drag items to reorder your preference
                    </p>
                )}
            </div>
        </div>
    );
};


const ATSApplyPage = ({
    applications,
    profile: parentProfile,
    onProfileUpdate,
    fullName,
    onRequestLogin
}: {
    applications: ATSApplication[],
    profile: ApplicantProfile,
    onProfileUpdate: (p: ApplicantProfile) => void,
    fullName: string,
    onRequestLogin: () => void
}) => {
    const navigate = useNavigate()
    const params = useParams()

    // NEW: Trigger login if not authenticated
    React.useEffect(() => {
        if (!fullName) {
            onRequestLogin();
        }
    }, [fullName]);

    // NEW: Team data state
    const [teamData, setTeamData] = React.useState<ATSTeamData | null>(null)
    const [allRoles, setAllRoles] = React.useState<string[]>([])
    const [roleToSubteamMap, setRoleToSubteamMap] = React.useState<Map<string, string>>(new Map())

    const [selectedRoles, setSelectedRoles] = React.useState<string[]>([])
    const [profile, setProfile] = React.useState<ApplicantProfile>(parentProfile)
    const [responses, setResponses] = React.useState<{ [question: string]: string }>({})

    // Initial sync - only sync if local profile is empty to prevent overwriting user input
    React.useEffect(() => {
        if (Object.keys(profile).length === 0 && Object.keys(parentProfile).length > 0) {
            setProfile(parentProfile)
        }
    }, [parentProfile])

    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [isUploading, setIsUploading] = React.useState(false)

    // NEW: Fetch team data and build role mappings
    React.useEffect(() => {
        // Check if already applied to this TEAM
        if (applications.some(app => app.teamPk === params.teamId)) {
            toast.error("You've already applied to this team.")
            navigate("/apply")
            return
        }

        // Fetch team data with all subteam configs
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/openteams/${params.teamId}`, { credentials: 'include' })
            .then(async (res) => {
                if (!res.ok) {
                    const err = await res.json()
                    toast.error(err.message || "Failed to load team data")
                    navigate("/apply")
                    return
                }

                const data: ATSTeamData = await res.json()
                setTeamData(data)

                // Build flat role list and mapping
                const roles: string[] = []
                const mapping = new Map<string, string>()

                data.recruitingSubteams.forEach(subteam => {
                    subteam.roles.forEach(role => {
                        roles.push(role)
                        mapping.set(role, subteam.subteamPk)  // Map role -> subteam (hidden from user)
                    })
                })

                setAllRoles(roles)
                setRoleToSubteamMap(mapping)
            })
            .catch(err => {
                console.error(err)
                toast.error("Failed to load team information")
                navigate("/apply")
            })
    }, [params.teamId, applications, navigate])

    // Autofill team interest question if previously applied to this team
    React.useEffect(() => {
        if (!teamData || !applications) return;

        const teamName = teamData.teamInfo.friendlyName;
        const questionKey = `Why are you interested in ${teamName}?`;

        // Check if we already have a value entered by the user
        if (responses[questionKey]) return;

        // Check if applicant previously applied to this team
        const previousApp = applications.find(
            app => app.teamPk === teamData.teamPk && app.responses && app.responses[questionKey]
        );

        if (previousApp) {
            setResponses(prev => ({
                ...prev,
                [questionKey]: previousApp.responses[questionKey]
            }));
        }
    }, [teamData, applications, responses]);

    const handleApply = async () => {
        if (selectedRoles.length === 0) {
            return toast.error("Please select at least one role.")
        }

        // Validate profile fields
        for (const field of PERSONAL_INFO_FIELDS) {
            if (field.required && !profile[field.id]) {
                return toast.error(`Please provide your ${field.label.toLowerCase()}.`)
            }

            if (field.id === "whyAppDev" && profile[field.id]) {
                const words = profile[field.id]!.trim().split(/\s+/).filter(Boolean).length;
                if (words > 200) {
                    return toast.error("Your 'Why App Dev' response must be 200 words or less.")
                }
            }

            if ((field.id === "linkedinUrl" || field.id === "githubUrl") && profile[field.id]?.trim()) {
                try {
                    new URL(profile[field.id]!)
                } catch {
                    return toast.error(`Please enter a valid URL for ${field.id === "linkedinUrl" ? "LinkedIn" : "GitHub"}.`)
                }
            }
        }

        // Validate team question and role-specific questions
        if (teamData) {
            const teamQuestionKey = `Why are you interested in ${teamData.teamInfo.friendlyName}?`
            if (!responses[teamQuestionKey]) {
                return toast.error(`Please explain why you are interested in ${teamData.teamInfo.friendlyName}.`)
            }

            // Validate role-specific questions
            for (const role of selectedRoles) {
                const subteamPk = roleToSubteamMap.get(role)!
                const subteam = teamData.recruitingSubteams.find(s => s.subteamPk === subteamPk)
                const questions = subteam?.roleSpecificQuestions[role] || []
                for (const q of questions) {
                    if (!responses[q]) {
                        return toast.error(`Please answer: ${q}`)
                    }
                }
            }
        }

        setIsSubmitting(true)

        try {
            const response = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/applications/apply`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    teamPk: params.teamId,
                    rolePreferences: selectedRoles.map(role => ({
                        role: role,
                        subteamPk: roleToSubteamMap.get(role) || ""
                    })), // Send ordered roles directly
                    profile: profile,
                    responses: responses,
                })
            })

            if (response.ok) {
                toast.success("Application submitted successfully!")
                navigate("/apply")
            } else {
                const err = await response.json()
                toast.error("Submission failed", { description: err.message || err.error })
            }
        } catch (error) {
            toast.error("An error occurred while submitting.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.type !== "application/pdf") {
            return toast.error("Please upload a PDF file.")
        }

        if (file.size > 10 * 1024 * 1024) {
            return toast.error("Resume file is too large. Maximum size is 10MB.")
        }

        // Verify magic numbers (%PDF-)
        const isActualPDF = await new Promise<boolean>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = (e) => {
                const arr = new Uint8Array(e.target?.result as ArrayBuffer).subarray(0, 5);
                const header = String.fromCharCode(...arr);
                resolve(header === "%PDF-");
            };
            reader.onerror = () => resolve(false);
            reader.readAsArrayBuffer(file.slice(0, 5));
        });

        if (!isActualPDF) {
            return toast.error("The uploaded file does not appear to be a valid PDF. Please check the file and try again.");
        }

        setIsUploading(true)
        try {
            // 1. Get presigned POST data
            const res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/resume/upload-url?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`, {
                credentials: 'include'
            })

            if (!res.ok) throw new Error("Failed to get upload URL")

            const { uploadUrl, fields, key } = await res.json()

            // 2. Upload to S3 using FormData for Presigned POST
            const formData = new FormData();
            Object.entries(fields).forEach(([k, v]) => {
                formData.append(k, v as string);
            });
            formData.append("file", file);

            const uploadRes = await fetch(uploadUrl, {
                method: "POST",
                body: formData
            })

            if (!uploadRes.ok) throw new Error("Failed to upload to S3")

            // 3. Update profile state and persist to backend
            const updatedProfile = { ...profile, resumeUrl: key };
            setProfile(updatedProfile);
            onProfileUpdate(updatedProfile);

            // 4. Persist to backend without blocking UI
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/profile`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ resumeUrl: key })
            }).catch(e => console.error("Failed to persist resume URL", e));

            toast.success("Resume uploaded successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to upload resume")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className='flex flex-col max-w-5xl mx-auto w-full pb-12 px-4'>
            {/* Navigation and Title */}
            <div className="flex flex-col gap-6 py-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <Button className='max-w-max h-8 text-muted-foreground hover:text-foreground' onClick={() => navigate("../")} variant="ghost" size="sm">
                    <ChevronLeftIcon className="h-4 w-4 mr-1" />
                    Back to Open Roles
                </Button>

                <div className="flex flex-col gap-2">
                    <h1 className='text-4xl font-extrabold tracking-tight text-foreground'>{teamData?.teamInfo.friendlyName}</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm font-medium">Application Form</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Form Content */}
                <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* About Section */}
                    <Card className="shadow-sm border-border/50 overflow-hidden">
                        <CardHeader className="pt-0 flex bg-muted/40" style={{ padding: "15px" }}>
                            <CardTitle className='pt-0 text-sm font-bold flex items-center gap-2.5 text-foreground/80'>
                                <InfoIcon className="h-4 w-4 text-primary" />
                                About this Team
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground leading-relaxed text-sm">{teamData?.teamInfo.description}</p>
                        </CardContent>
                    </Card>

                    {/* Role Selection */}
                    <Card className="shadow-sm border-border/50 overflow-hidden">
                        <CardHeader className="pt-0 flex bg-muted/40" style={{ padding: "15px" }}>
                            <CardTitle className='pt-0 text-sm font-bold flex items-center gap-2.5 text-foreground/80'>
                                <TargetIcon className="h-5 w-5 text-primary" />
                                <div className="flex flex-col">
                                    <p>Preferred Roles</p>
                                    <p className='text-xs text-muted-foreground'>Select one or more roles you are interested in.</p>
                                </div>
                            </CardTitle>
                            <CardDescription className="text-xs"></CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RolePreferenceSelector
                                allRoles={allRoles}
                                selectedRoles={selectedRoles}
                                onChange={setSelectedRoles}
                            />
                        </CardContent>
                    </Card>

                    {/* Personal Information */}
                    <Card className="shadow-sm border-border/50 overflow-hidden">
                        <CardHeader className="pt-0 flex bg-muted/40" style={{ padding: "15px" }}>
                            <CardTitle className='pt-0 text-sm font-bold flex items-center gap-2.5 text-foreground/80'>
                                <UserIcon className="h-5 w-5 text-primary" />
                                <div className="flex flex-col">
                                    <p>Basic Information</p>
                                    <p className='text-xs text-muted-foreground'>We'd love to know a bit about you!</p>
                                </div>
                            </CardTitle>
                            <CardDescription className="text-xs"></CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Resume Upload - Simplified and moved to top */}
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <Label htmlFor="resumeUrl" className="text-sm font-bold flex items-center gap-1.5 text-foreground/80">
                                        Resume (PDF)
                                        <span className="text-destructive font-bold">*</span>
                                    </Label>
                                    {profile.resumeUrl && (
                                        <div className="flex ml-4 items-center gap-1.5 text-[11px] text-green-600 font-bold">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Uploaded
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <Input
                                            id="resumeUrl"
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleResumeUpload}
                                            disabled={isUploading}
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isUploading}
                                            onClick={() => document.getElementById("resumeUrl")?.click()}
                                            className="font-bold bg-background h-9 px-4"
                                        >
                                            {isUploading ? <Loader2Icon className="animate-spin mr-2 h-4 w-4" /> : <UploadCloud className="mr-2 h-4 w-4 text-primary" />}
                                            {profile.resumeUrl ? "Update Resume" : "Upload Resume"}
                                        </Button>

                                        {profile.resumeUrl && (
                                            <Button variant="link" size="sm" asChild className="h-9 px-0 text-primary font-bold">
                                                <a
                                                    href={profile.resumeUrl.startsWith("http") ? profile.resumeUrl : `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/resume/download?key=${encodeURIComponent(profile.resumeUrl)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5"
                                                >
                                                    View Uploaded Resume
                                                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Other Personal Info Fields */}
                            {PERSONAL_INFO_FIELDS.filter(f => f.id !== "resumeUrl").map((field) => {
                                const fieldValue = profile[field.id] ?? "";

                                return (
                                    <div key={field.id} className="space-y-2">
                                        <Label htmlFor={field.id} className="text-sm font-bold flex items-center gap-1.5 text-foreground/80">
                                            {field.label}
                                            {field.required && <span className="text-destructive font-bold">*</span>}
                                        </Label>

                                        {field.type === "select" ? (
                                            <Select
                                                value={fieldValue.toString()}
                                                onValueChange={(value) => setProfile((prev) => ({ ...prev, [field.id]: value }))}
                                            >
                                                <SelectTrigger className="w-full bg-background">
                                                    <SelectValue placeholder="Select an option" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {field.options?.map((option) => (
                                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : field.multiline ? (
                                            <div className="space-y-2">
                                                <Textarea
                                                    id={field.id}
                                                    placeholder={field.placeholder ?? "Enter your answer"}
                                                    value={fieldValue.toString()}
                                                    className="min-h-[140px] resize-none focus-visible:ring-primary shadow-sm bg-background mt-2"
                                                    onChange={(e) => setProfile((prev) => ({ ...prev, [field.id]: e.target.value }))}
                                                />
                                                {field.id === "whyAppDev" && (
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-[10px] text-muted-foreground italic">Tell us what motivates you to join.</span>
                                                        <Badge variant="outline" className={`text-[10px] tabular-nums font-bold border-none bg-muted/30 ${((fieldValue.toString().split(/\s+/).filter(Boolean).length || 0) > 200) ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                            {fieldValue.toString().split(/\s+/).filter(Boolean).length || 0} / 200 words
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <Input
                                                id={field.id}
                                                type={field.type ?? "text"}
                                                placeholder={field.placeholder ?? "Enter your answer"}
                                                value={fieldValue.toString()}
                                                className="focus-visible:ring-primary shadow-sm bg-background mt-2"
                                                onChange={(e) => setProfile((prev) => ({ ...prev, [field.id]: e.target.value }))}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Question Sections */}
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Team Interest */}
                        <Card className="shadow-sm border-border/50 overflow-hidden">
                            <CardHeader className="pt-0 flex bg-muted/40" style={{ padding: "15px" }}>
                                <CardTitle className='pt-0 text-sm font-bold flex items-center gap-2.5 text-foreground/80'>
                                    <Users2Icon className="h-5 w-5 text-primary" />
                                    <div className="flex flex-col">
                                        <p>Team Fit & Technical Evaluation</p>
                                        <p className='text-xs text-muted-foreground'>Share your skills and expectations</p>
                                    </div>
                                </CardTitle>
                                <CardDescription className="text-xs"></CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4 pt-0">
                                <div className="space-y-2">
                                    <Label htmlFor="parent-team-interest" className="text-sm font-bold flex items-center gap-1.5 text-foreground/80">
                                        Why are you interested in {teamData?.teamInfo.friendlyName}?
                                        <span className="text-destructive font-bold">*</span>
                                    </Label>
                                    <Textarea
                                        id="parent-team-interest"
                                        placeholder="Tell us what draws you to this specific team..."
                                        className="min-h-[120px] resize-none shadow-sm bg-background focus-visible:ring-primary"
                                        value={responses[`Why are you interested in ${teamData?.teamInfo.friendlyName}?`] ?? ""}
                                        onChange={(e) =>
                                            setResponses((prev) => ({
                                                ...prev,
                                                [`Why are you interested in ${teamData?.teamInfo.friendlyName}?`]: e.target.value
                                            }))
                                        }
                                    />
                                </div>

                                {teamData && selectedRoles.map(role => {
                                    const subteamPk = roleToSubteamMap.get(role)!
                                    const subteam = teamData.recruitingSubteams.find(s => s.subteamPk === subteamPk)
                                    const roleQuestions = subteam?.roleSpecificQuestions[role] || []

                                    if (roleQuestions.length === 0) return null

                                    return (
                                        <>
                                            {roleQuestions.map((question, idx) => (
                                                <div key={idx} className="space-y-2">
                                                    <Label htmlFor={`q-${role}-${idx}`} className="text-sm font-bold flex items-center gap-1.5 text-foreground/80">
                                                        {question}
                                                        <span className="text-destructive font-bold">*</span>
                                                    </Label>
                                                    <Textarea
                                                        id={`q-${role}-${idx}`}
                                                        placeholder="Enter your response..."
                                                        className="min-h-[120px] resize-none shadow-sm bg-background focus-visible:ring-primary"
                                                        value={responses[question] ?? ""}
                                                        onChange={(e) =>
                                                            setResponses((prev) => ({ ...prev, [question]: e.target.value }))
                                                        }
                                                    />
                                                </div>
                                            ))}
                                        </>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Side: Sticky Summary / Submit Card */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        {/* Tips Card */}
                        <div className="bg-muted/40 rounded-2xl p-6 border border-border/50 border-dashed animate-in fade-in duration-1000">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                <SparklesIcon className="h-3.5 w-3.5" />
                                Review Checklist
                            </h4>
                            <ul className="space-y-3">
                                {[
                                    "Uploaded your most recent resume",
                                    "LinkedIn/GitHub links are working",
                                    "Responses address the specific roles"
                                ].map((tip, i) => (
                                    <li key={i} className="flex gap-2 text-[11px] text-muted-foreground leading-snug">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 mt-1 shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Card className="shadow-lg border-primary/20 overflow-hidden ring-1 ring-primary/10">
                            <CardHeader className="pt-0 flex bg-primary/5" style={{ padding: "15px" }}>
                                <CardTitle className='pt-0 text-sm font-bold flex items-center gap-2.5 text-primary'>
                                    <NotepadText />
                                    Application Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex flex-col text-sm">
                                        <span className="text-muted-foreground">Team</span>
                                        <span className="font-bold text-foreground">{teamData?.teamInfo.friendlyName}</span>
                                    </div>

                                    <div>
                                        <span className="text-muted-foreground text-sm">Selected Roles</span>
                                        {selectedRoles.length > 0 ? (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {selectedRoles.map(role => (
                                                    <Badge key={role} className="bg-primary/10 text-primary">
                                                        {role}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-[11px] mt-2 text-destructive font-bold flex items-center gap-1.5 bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                                                <InfoIcon className="h-3 w-3" />
                                                Please select at least one role
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <Button
                                        onClick={handleApply}
                                        disabled={isSubmitting || selectedRoles.length === 0}
                                        className="w-full h-11 text-sm font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
                                    >
                                        {isSubmitting ? <Loader2Icon className="animate-spin mr-2 h-4 w-4" /> : <SendIcon className="mr-2 h-4 w-4" />}
                                        Submit Application
                                    </Button>
                                    <p className="text-[10px] text-center text-muted-foreground mt-3 leading-relaxed">
                                        We'll get back to you within 10 days!
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

const ATSApplyList = ({ applications }: { applications: ATSApplication[] }) => {
    const navigate = useNavigate()
    const [teams, setTeams] = React.useState<OpenATSTeam[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        setIsLoading(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/openteams`)
            .then(async (res) => {
                const teams = await res.json()
                setTeams(teams)
            })
            .finally(() => setIsLoading(false))
    }, [])

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium animate-pulse">Loading open roles...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full pb-12 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-2 mt-8">
                <h1 className='text-4xl font-extrabold tracking-tight'>Open Roles</h1>
                <p className="text-muted-foreground">Join one of our world-class teams and build something amazing.</p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
                {teams.map((team) => {
                    const totalRoles = team.recruitingSubteamPks.reduce((acc, pk) => acc + (team.subteamInfo[pk]?.recruitmentInfo?.roles.length || 0), 0)
                    const isRecruiting = team.recruitingSubteamPks.length > 0
                    const hasApplied = applications.some(app => app.teamPk === team.teamPk)

                    return (
                        <AccordionItem
                            key={team.teamPk}
                            value={team.teamPk}
                            className="border border-border/50 rounded-xl bg-card shadow-sm px-2 data-[state=open]:ring-1 data-[state=open]:ring-primary/20 transition-all"
                        >
                            <AccordionTrigger className="w-full hover:no-underline px-4 py-4 items-center [&>svg]:translate-y-0">
                                <div className="flex items-center gap-4 w-full text-left">
                                    <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                                        <UsersRound className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex flex-col items-start min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-lg font-bold">
                                                {team.teamInfo.friendlyName}
                                            </span>
                                            {hasApplied && (
                                                <Badge className="bg-green-500/10 text-green-600 border-none font-bold text-[10px] h-5 px-1.5 flex gap-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Applied
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-md font-medium line-clamp-1 pr-4">
                                            {team.teamInfo.description}
                                        </p>
                                    </div>

                                    <div className="ml-auto mr-4 flex items-center gap-4 hidden sm:flex shrink-0">
                                        {isRecruiting ? (
                                            <div className="flex flex-col items-end">
                                                <Badge variant="secondary" className="font-bold">
                                                    {totalRoles} {totalRoles === 1 ? "Role" : "Roles"} Available
                                                </Badge>
                                            </div>
                                        ) : (
                                            <Badge variant="outline" className="text-muted-foreground">Not Recruiting</Badge>
                                        )}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pt-1 px-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2">
                                    <div className='flex-grow ml-[3.5rem]'>
                                        <p className='text-muted-foreground'>Available Roles</p>
                                        <div className='flex flex-wrap gap-1.5 mt-2'>
                                            {team.recruitingSubteamPks.flatMap(pk =>
                                                team.subteamInfo[pk]?.recruitmentInfo?.roles || []
                                            ).map((role, idx) => (
                                                <Badge variant="secondary" key={idx}>
                                                    {role}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Single apply button for the team */}
                                    <Button
                                        variant={hasApplied ? "outline" : "outline"}
                                        className={`self-end px-8 ${hasApplied ? 'w-full sm:w-auto border-dashed' : 'w-full sm:w-auto'}`}
                                        onClick={() => hasApplied ? navigate(`/apply/applications`) : navigate(`./${team.teamPk}`)}
                                    >
                                        {hasApplied ? "View Application" : `Apply to ${team.teamInfo.friendlyName}`}
                                        <ChevronLeftIcon className="h-4 w-4 rotate-180" />
                                    </Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </div>
    )
}

const AccountLoginAndVerifyDialog = ({ onSuccess, fullName: parentFullName, open: controlledOpen, onOpenChange }: { onSuccess: (data: OTPSessionResponse) => void, fullName?: string, open?: boolean, onOpenChange?: (open: boolean) => void }) => {
    const [isLoading, setIsLoading] = React.useState(false)
    const [schoolEmail, setSchoolEmail] = React.useState("")
    const [fullName, setFullName] = React.useState("")
    const [otpPageVisible, setOtpPageVisible] = React.useState(false)
    const [otp, setOtp] = React.useState("")
    const [internalOpen, setInternalOpen] = React.useState(false)

    const open = controlledOpen ?? internalOpen
    const setOpen = onOpenChange ?? setInternalOpen
    //
    React.useEffect(() => {
        if (parentFullName) {
            return;
        }
        setIsLoading(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/verifyotpsession`, {
            method: "GET",
            credentials: 'include'
        })
            .then(async (res) => {
                const data = await res.json()
                if (res.ok && !data.error) {
                    onSuccess(data)
                    setOpen(false)
                }
                // If not ok or has error, we don't auto-open anymore. User must click "Log In"
            })
            .catch(() => {
                // Session check failed, user needs to log in - this is expected
            })
            .finally(() => setIsLoading(false))
    }, [])
    //
    const handleLogin = () => {
        setIsLoading(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/otpinit`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                name: fullName,
                email: schoolEmail
            })
        })
            .then(async (res) => {
                if (res.ok)
                    setOtpPageVisible(true)

                else {
                    toast.error("Failed to Verify Account", {
                        description: (await res.json()).error
                    })
                }
            })

            .finally(() => setIsLoading(false))
    }

    const handleOtpVerify = () => {
        setIsLoading(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/otpverify`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                email: schoolEmail,
                otp: otp
            })
        })
            .then(async (res) => {
                if (res.ok) {
                    // Fetch full session data including applications
                    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/verifyotpsession`, {
                        method: "GET",
                        credentials: 'include'
                    })
                        .then(async (sessionRes) => {
                            const data = await sessionRes.json()
                            if (sessionRes.ok && !data.error) {
                                onSuccess(data)
                                setOpen(false)
                            } else {
                                toast.error("Failed to load session data")
                            }
                        })
                        .catch(() => {
                            toast.error("Network error while loading session")
                        })
                }

                else {
                    toast.error("Failed to Verify OTP", {
                        description: (await res.json()).error
                    })
                }
            })

            .finally(() => setIsLoading(false))
    }

    return (
        <AlertDialog open={open}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Verify Information</AlertDialogTitle>
                    <AlertDialogDescription>
                        We need to verify your email to prevent spam and streamline the recruitment process.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className={`flex flex-col gap-2 ${otpPageVisible ? "hidden" : ""}`}>
                    <Label>Full Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder='Ex. Aidan Melvin' />

                    <Label className='mt-2'>School Email Address</Label>
                    <Input value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} placeholder='Ex. atheesh@terpmail.umd.edu' />

                    <Button
                        onClick={handleLogin}
                        className='mt-4'
                        disabled={isLoading || !((schoolEmail.endsWith("@umd.edu") || schoolEmail.endsWith("@terpmail.umd.edu")) &&
                            fullName.split(" ").length > 1)}>
                        <Loader2Icon className={`animate-spin ${(!isLoading) ? "hidden" : ""}`} />
                        Continue</Button>
                </div>

                <div className={`flex flex-col gap-2 ${!otpPageVisible ? "hidden" : ""}`}>
                    <InputOTP value={otp} onChange={(otp) => setOtp(otp)} maxLength={6}>
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                    <p className='text-xs'>Please enter the Verification Code sent to <b>{schoolEmail}</b></p>
                    <Button
                        onClick={handleOtpVerify}
                        className='mt-2'
                        disabled={otp.length != 6}>
                        <Loader2Icon className={`animate-spin ${(!isLoading) ? "hidden" : ""}`} />
                        Verify and Continue</Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}