/**
  App Dev Club People Portal UI
  Copyright (C) 2025  Atheesh Thirumalairajan

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

import { Route, Router, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import logo from '../assets/logo.svg'
import React from 'react'
import { PEOPLEPORTAL_SERVER_ENDPOINT } from '@/commons/config'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
    AwardIcon,
    CheckCircle2,
    ChevronLeftIcon,
    ExternalLinkIcon,
    FileIcon,
    GithubIcon,
    InfoIcon,
    LinkedinIcon,
    Loader2Icon,
    LogOutIcon,
    MailIcon,
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
import { Checkbox } from '@/components/ui/checkbox'
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
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ATSSubTeamDesc {
    subteamPk: string,
    _id: string,
    roleSpecificQuestions: { [key: string]: string[] },
    roles: string[],
    subteamInfo: OpenATSTeamInfo,
    parentInfo: OpenATSTeamInfo
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
        label: "Do you follow @appdev_umd on Instagram? (We check 👀)",
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
        label: "Explain what you'd like to get out of App Dev Club (200 words or less).",
        required: true,
        multiline: true
    },
    { id: "additionalInfo", label: "Is there anything else you'd like to mention?", multiline: true }
]
interface ATSApplication {
    _id: string;
    subteamPk: string;
    subteamName?: string;
    parentTeamName?: string;
    roles: string[];
    stage: string;
    appliedAt: string;
    responses: { [key: string]: string };
}

interface OTPSessionResponse {
    name: string;
    email: string;
    profile: ApplicantProfile;
    applications: ATSApplication[];
}

export const ATSDashboard = () => {
    const params = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const [fullName, setFullName] = React.useState("")
    const [email, setEmail] = React.useState("")
    const [profile, setProfile] = React.useState<ApplicantProfile>({})
    const [applications, setApplications] = React.useState<ATSApplication[]>([])

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
    }

    return (
        <div className="flex flex-col w-full h-full">
            { /* Polished Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-16 items-center px-6 gap-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/apply")}>
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <img className="h-6 w-6" src={logo} alt="App Dev Logo" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black tracking-tight uppercase">Portal</span>
                            <span className="text-[10px] text-muted-foreground font-bold leading-none tracking-widest uppercase opacity-70">Recruitment</span>
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
                open={!fullName && location.pathname.includes("/apply/") && !location.pathname.endsWith("/apply/")}
                onSuccess={handleSessionUpdate}
                fullName={fullName}
            />

            <div style={{ height: "calc(100% - calc(var(--spacing) * 12))" }} className='flex flex-col w-full p-4 gap-3'>
                <Routes>
                    <Route path="/" element={<ATSApplyList applications={applications} />} />
                    <Route path='/applications' element={<ATSApplicationsList applications={applications} profile={profile} fullName={fullName} email={email} />} />
                    <Route path='/:subteamId' element={<ATSApplyPage applications={applications} profile={profile} onProfileUpdate={setProfile} />} />
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
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-tighter font-black bg-muted/50 py-0 h-5">
                                                        {app.parentTeamName || "Club Wide"}
                                                    </Badge>
                                                </div>
                                                <h3 className="text-2xl font-black tracking-tight">
                                                    {app.subteamName || app.subteamPk}
                                                </h3>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {app.roles.map((role) => (
                                                        <Badge key={role} className="bg-primary/5 text-primary border-primary/10 font-bold px-3">
                                                            {role}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            {(() => {
                                                const stageMap: { [key: string]: { label: string, color: string, icon: any } } = {
                                                    'New Applications': { label: 'UNDER REVIEW', color: 'bg-zinc-100 text-zinc-600 border-zinc-200', icon: InfoIcon },
                                                    'Rejected': { label: 'REJECTED', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: InfoIcon },
                                                    'Interview': { label: 'INTERVIEWING', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: SparklesIcon },
                                                    'Rejected After Interview': { label: 'REJECTED', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: InfoIcon },
                                                    'Hired': { label: 'ACCEPTED', color: 'bg-green-50 text-green-600 border-green-200 font-black', icon: CheckCircle2 }
                                                };

                                                const stageInfo = stageMap[app.stage] || { label: app.stage.toUpperCase(), color: 'bg-muted text-muted-foreground border-border', icon: InfoIcon };
                                                const StatusIcon = stageInfo.icon;

                                                return (
                                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] font-black tracking-widest shadow-sm ${stageInfo.color}`}>
                                                        <StatusIcon className="h-3.5 w-3.5" />
                                                        {stageInfo.label}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {app.responses && Object.keys(app.responses).length > 0 && (
                                            <Accordion type="single" collapsible className="w-full">
                                                <AccordionItem value="responses" className="border-none">
                                                    <AccordionTrigger className="text-xs font-bold text-muted-foreground hover:no-underline py-2 justify-start gap-2">
                                                        VIEW APPLICATION RESPONSES
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-4">
                                                        <div className="grid gap-4">
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


const ATSApplyPage = ({ applications, profile: parentProfile, onProfileUpdate }: { applications: ATSApplication[], profile: ApplicantProfile, onProfileUpdate: (p: ApplicantProfile) => void }) => {
    const navigate = useNavigate()
    const params = useParams()
    const [subteam, setSubteam] = React.useState<ATSSubTeamDesc>()

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

    React.useEffect(() => {
        if (applications.some(app => app.subteamPk === params.subteamId)) {
            toast.error("You've already applied to this subteam.")
            navigate("/apply")
            return
        }

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/config/${params.subteamId}`, { credentials: 'include' })
            .then(async (res) => {
                const team = await res.json()
                setSubteam(team)
                if (team.roles?.length === 1) {
                    setSelectedRoles([team.roles[0]])
                }
            })
    }, [params.subteamId, applications, navigate])

    // Autofill parent team interest question
    React.useEffect(() => {
        if (!subteam || !applications) return;

        const parentName = subteam.parentInfo.friendlyName;
        const questionKey = `Why are you interested in ${parentName}?`;

        // Check if we already have a value entered by the user
        if (responses[questionKey]) return;

        // Verify if the applicant has applied to another subteam under the same parent team
        const previousApp = applications.find(
            app => app.parentTeamName === parentName && app.responses && app.responses[questionKey]
        );

        if (previousApp) {
            setResponses(prev => ({
                ...prev,
                [questionKey]: previousApp.responses[questionKey]
            }));
        }
    }, [subteam, applications]);

    const handleApply = async () => {
        if (selectedRoles.length === 0) {
            return toast.error("Please select at least one role.")
        }

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

            if (field.id === "linkedinUrl" && profile[field.id]?.trim()) {
                if (!profile[field.id]!.includes("linkedin.com")) {
                    return toast.error("Please enter a valid LinkedIn URL.")
                }
                try { new URL(profile[field.id]!) } catch { return toast.error("Please enter a valid URL for LinkedIn.") }
            }

            if (field.id === "githubUrl" && profile[field.id]?.trim()) {
                if (!profile[field.id]!.includes("github.com")) {
                    return toast.error("Please enter a valid GitHub URL.")
                }
                try { new URL(profile[field.id]!) } catch { return toast.error("Please enter a valid URL for GitHub.") }
            }
        }

        if (subteam) {
            const parentInterestKey = `Why are you interested in ${subteam.parentInfo.friendlyName}?`
            if (!responses[parentInterestKey]) {
                return toast.error(`Please explain why you are interested in ${subteam.parentInfo.friendlyName}.`)
            }

            for (const role of selectedRoles) {
                const questions = subteam.roleSpecificQuestions[role] || []
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
                    subteamPk: params.subteamId,
                    roles: selectedRoles,
                    profile: profile,
                    responses: responses,
                })
            })

            if (response.ok) {
                toast.success("Application submitted successfully!")
                navigate("/apply") // Send them back to the list
            } else {
                const err = await response.json()
                toast.error("Submission failed", { description: err.error })
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

        setIsUploading(true)
        try {
            // 1. Get presigned URL
            const res = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/resume/upload-url?fileName=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`, {
                credentials: 'include'
            })

            if (!res.ok) throw new Error("Failed to get upload URL")

            const { uploadUrl, key } = await res.json()

            // 2. Upload to S3
            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    'Content-Type': file.type
                },
                body: file
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
                    <h1 className='text-4xl font-extrabold tracking-tight text-foreground'>{subteam?.parentInfo.friendlyName}</h1>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold bg-primary/10 text-primary border-none">
                            {subteam?.subteamInfo.friendlyName} Subteam
                        </Badge>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-muted-foreground text-sm font-medium">Application Form</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Form Content */}
                <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* About Section */}
                    <Card className="shadow-sm border-border/50">
                        <CardHeader className="bg-muted/30 pb-4">
                            <CardTitle className='text-lg font-bold flex items-center gap-2'>
                                <InfoIcon className="h-5 w-5 text-primary" />
                                About this Team
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <p className="text-muted-foreground leading-relaxed text-sm">{subteam?.parentInfo.description}</p>
                        </CardContent>
                    </Card>

                    {/* Role Selection */}
                    <Card className="shadow-sm border-border/50">
                        <CardHeader className="bg-muted/30 pb-4">
                            <CardTitle className='text-lg font-bold flex items-center gap-2'>
                                <TargetIcon className="h-5 w-5 text-primary" />
                                Preferred Roles
                            </CardTitle>
                            <CardDescription className="text-xs">Select one or more roles you are interested in.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {subteam?.roles.map((role) => (
                                    <Label
                                        key={role}
                                        htmlFor={role}
                                        className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:bg-muted/50 ${selectedRoles.includes(role) ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' : 'border-border/60 bg-card'}`}
                                    >
                                        <Checkbox
                                            id={role}
                                            className="mt-1"
                                            checked={selectedRoles.includes(role)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedRoles(prev => [...prev, role])
                                                else setSelectedRoles(prev => prev.filter(r => r !== role))
                                            }}
                                        />
                                        <div className="space-y-1">
                                            <span className="font-bold text-sm block">{role}</span>
                                            <span className="text-[11px] text-muted-foreground leading-tight block">
                                                Click to select the {role} role.
                                            </span>
                                        </div>
                                    </Label>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Personal Information */}
                    <Card className="shadow-sm border-border/50">
                        <CardHeader className="bg-muted/30 pb-4">
                            <CardTitle className='text-lg font-bold flex items-center gap-2'>
                                <UserIcon className="h-5 w-5 text-primary" />
                                Personal Details
                            </CardTitle>
                            <CardDescription className="text-xs">These details will be used across all your applications.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {PERSONAL_INFO_FIELDS.map((field) => (
                                <div key={field.id} className="space-y-2">
                                    <Label htmlFor={field.id} className="text-sm font-bold flex items-center gap-1.5 text-foreground/80">
                                        {field.label}
                                        {field.required && <span className="text-destructive font-bold">*</span>}
                                    </Label>

                                    {field.id === "resumeUrl" ? (
                                        <div className="flex flex-col gap-3 p-4 border border-border/60 rounded-xl bg-muted/10">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <Input
                                                    id={field.id}
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={handleResumeUpload}
                                                    disabled={isUploading}
                                                    className="hidden"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    disabled={isUploading}
                                                    onClick={() => document.getElementById(field.id)?.click()}
                                                    className="shadow-sm font-bold bg-background"
                                                >
                                                    {isUploading ? <Loader2Icon className="animate-spin mr-2 h-4 w-4" /> : <UploadCloud className="mr-2 h-4 w-4 text-primary" />}
                                                    {profile.resumeUrl ? "Update PDF" : "Upload Resume (PDF)"}
                                                </Button>
                                                {profile.resumeUrl && (
                                                    <div className="flex items-center gap-1.5 text-sm text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Uploaded
                                                    </div>
                                                )}
                                            </div>
                                            {profile.resumeUrl && (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <FileIcon className="h-3 w-3 text-muted-foreground" />
                                                    <a
                                                        href={profile.resumeUrl.startsWith("http") ? profile.resumeUrl : `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/resume/download?key=${encodeURIComponent(profile.resumeUrl)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline font-bold"
                                                    >
                                                        Review Uploaded File
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ) : field.type === "select" ? (
                                        <Select
                                            value={profile[field.id]?.toString() ?? ""}
                                            onValueChange={(value) =>
                                                setProfile((prev) => ({ ...prev, [field.id]: value }))
                                            }
                                        >
                                            <SelectTrigger className="w-full bg-background">
                                                <SelectValue placeholder="Select an option" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {field.options?.map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : field.multiline ? (
                                        <div className="space-y-2">
                                            <Textarea
                                                id={field.id}
                                                placeholder={field.placeholder ?? "Enter your answer"}
                                                value={profile[field.id] ?? ""}
                                                className="min-h-[140px] resize-none focus-visible:ring-primary shadow-sm bg-background"
                                                onChange={(e) =>
                                                    setProfile((prev) => ({ ...prev, [field.id]: e.target.value }))
                                                }
                                            />
                                            {field.id === "whyAppDev" && (
                                                <div className="flex justify-between items-center px-1">
                                                    <span className="text-[10px] text-muted-foreground italic">Tell us what motivates you to join.</span>
                                                    <Badge variant="outline" className={`text-[10px] tabular-nums font-bold border-none bg-muted/30 ${((profile[field.id]?.split(/\s+/).filter(Boolean).length || 0) > 200) ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                        {profile[field.id]?.split(/\s+/).filter(Boolean).length || 0} / 200 words
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <Input
                                            id={field.id}
                                            type={field.type ?? "text"}
                                            placeholder={field.placeholder ?? "Enter your answer"}
                                            value={profile[field.id] ?? ""}
                                            className="focus-visible:ring-primary shadow-sm bg-background"
                                            onChange={(e) =>
                                                setProfile((prev) => ({ ...prev, [field.id]: e.target.value }))
                                            }
                                        />
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Question Sections */}
                    {selectedRoles.length > 0 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {/* Team Interest */}
                            <Card className="shadow-sm border-border/50">
                                <CardHeader className="bg-muted/30 pb-4">
                                    <CardTitle className='text-lg font-bold flex items-center gap-2 text-foreground'>
                                        <Users2Icon className="h-5 w-5 text-primary" />
                                        Team Fit
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="parent-team-interest" className="text-sm font-bold flex items-center gap-1.5 text-foreground/80">
                                            Why are you interested in {subteam?.parentInfo.friendlyName}?
                                            <span className="text-destructive font-bold">*</span>
                                        </Label>
                                        <Textarea
                                            id="parent-team-interest"
                                            placeholder="Tell us what draws you to this specific team..."
                                            className="min-h-[120px] resize-none shadow-sm bg-background focus-visible:ring-primary"
                                            value={responses[`Why are you interested in ${subteam?.parentInfo.friendlyName}?`] ?? ""}
                                            onChange={(e) =>
                                                setResponses((prev) => ({
                                                    ...prev,
                                                    [`Why are you interested in ${subteam?.parentInfo.friendlyName}?`]: e.target.value
                                                }))
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Role Specifics */}
                            {Object.entries(subteam?.roleSpecificQuestions ?? {}).filter(
                                ([role]) => selectedRoles.includes(role)
                            ).map(([role, questions]) => (
                                <Card key={role} className="shadow-sm border-border/50">
                                    <CardHeader className="bg-muted/30 pb-4">
                                        <CardTitle className='text-lg font-bold flex items-center gap-2'>
                                            <AwardIcon className="h-5 w-5 text-primary" />
                                            {role} Specifics
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-8">
                                        {questions.map((question, idx) => (
                                            <div key={`${role}-${idx}`} className="space-y-2">
                                                <Label htmlFor={`${role}-${idx}`} className="text-sm font-bold flex items-center gap-1.5 text-foreground/80">
                                                    {question}
                                                    <span className="text-destructive font-bold">*</span>
                                                </Label>
                                                <Textarea
                                                    id={`${role}-${idx}`}
                                                    placeholder="Enter your detailed response..."
                                                    className="min-h-[120px] resize-none shadow-sm bg-background focus-visible:ring-primary"
                                                    value={responses[question] ?? ""}
                                                    onChange={(e) =>
                                                        setResponses((prev) => ({
                                                            ...prev,
                                                            [question]: e.target.value
                                                        }))
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
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
                                    "Resume reflects recent projects",
                                    "LinkedIn/GitHub links are working",
                                    "Responses address the specific role"
                                ].map((tip, i) => (
                                    <li key={i} className="flex gap-2 text-[11px] text-muted-foreground leading-snug">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 mt-1 shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Card className="shadow-lg border-primary/20 overflow-hidden ring-1 ring-primary/10">
                            <CardHeader className="bg-primary/5 pb-4">
                                <CardTitle className='text-base font-bold text-primary'>Application Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground font-medium">Main Team</span>
                                        <span className="font-bold text-foreground">{subteam?.parentInfo.friendlyName}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground font-medium">Focus Area</span>
                                        <span className="font-bold text-foreground">{subteam?.subteamInfo.friendlyName}</span>
                                    </div>

                                    <Separator className="bg-border/60" />

                                    <div className="space-y-2">
                                        <span className="text-[10px] text-muted-foreground block uppercase tracking-widest font-bold">Target Roles</span>
                                        {selectedRoles.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {selectedRoles.map(role => (
                                                    <Badge key={role} className="bg-primary/10 text-primary border-none text-sm font-bold px-2 py-0.5">
                                                        {role}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-destructive font-bold flex items-center gap-1.5 bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                                                <InfoIcon className="h-3 w-3" />
                                                Please select at least one role
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button
                                        onClick={handleApply}
                                        disabled={isSubmitting || selectedRoles.length === 0}
                                        className="w-full h-11 text-sm font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]"
                                    >
                                        {isSubmitting ? <Loader2Icon className="animate-spin mr-2 h-4 w-4" /> : <SendIcon className="mr-2 h-4 w-4" />}
                                        Submit Application
                                    </Button>
                                    <p className="text-[10px] text-center text-muted-foreground mt-3 leading-relaxed">
                                        Ensure all required fields are filled before submitting.
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
            <div className="flex flex-col gap-2">
                <h1 className='text-4xl font-extrabold tracking-tight'>Open Roles</h1>
                <p className="text-muted-foreground">Join one of our world-class teams and build something amazing.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {teams.map((team) => (
                    <Card key={team.teamPk} className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="bg-muted/30 border-b pb-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-3 rounded-2xl">
                                        <UsersRound className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <CardTitle className="text-2xl font-bold flex items-center gap-3">
                                            {team.teamInfo.friendlyName}
                                            {applications.some(app => team.recruitingSubteamPks.includes(app.subteamPk)) && (
                                                <Badge className="bg-green-500/10 text-green-600 border-green-200/50 hover:bg-green-500/10 gap-1 font-bold">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Applied
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription className="text-sm font-medium flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold h-5">
                                                {team.teamInfo.seasonText}
                                            </Badge>
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <p className="text-muted-foreground leading-relaxed mb-8">{team.teamInfo.description}</p>

                            <div className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/60">Recruiting Subteams</h4>
                                    <Separator className="flex-1" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {team.recruitingSubteamPks.map((subteamPk) => {
                                        const subteamInfo = team.subteamInfo[subteamPk]
                                        const isApplied = applications.some(app => app.subteamPk === subteamPk)

                                        return (
                                            <div
                                                key={subteamPk}
                                                className={`p-5 rounded-2xl border transition-all ${isApplied ? 'bg-green-500/5 border-green-200/50' : 'bg-muted/20 border-border/40 hover:border-primary/30 hover:bg-muted/40'}`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <h5 className="font-bold text-lg">{subteamInfo.friendlyName}</h5>
                                                    {isApplied && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                                                </div>

                                                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                                                    {subteamInfo.description}
                                                </p>

                                                <div className="flex flex-wrap gap-1.5 mb-5">
                                                    {subteamInfo.recruitmentInfo?.roles.map((roleName) => (
                                                        <Badge key={roleName} variant="secondary" className="text-sm font-bold px-2 py-0.5 bg-background/50">
                                                            {roleName}
                                                        </Badge>
                                                    ))}
                                                </div>

                                                <Button
                                                    onClick={() => isApplied ? navigate(`/apply/applications`) : navigate(`./${subteamPk}`)}
                                                    variant={isApplied ? "outline" : "default"}
                                                    size="sm"
                                                    className={`w-full font-bold shadow-sm ${!isApplied ? 'shadow-primary/20' : ''}`}
                                                >
                                                    {isApplied ? "View My Application" : `Apply to ${subteamInfo.friendlyName}`}
                                                    {!isApplied && <ExternalLinkIcon className="ml-2 h-3 w-3" />}
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
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
                    const data = await res.json()
                    onSuccess(data)
                    setOpen(false)
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