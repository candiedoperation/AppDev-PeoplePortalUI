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
import { Accordion } from '@/components/ui/accordion'
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CheckCircle2, ChevronLeftIcon, ExternalLinkIcon, FileIcon, Loader2Icon, UploadCloud, UsersRound } from 'lucide-react'
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { toast } from 'sonner'

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
    resumeUrl?: string
    linkedinUrl?: string
    githubUrl?: string
    whyAppDev?: string
    previousInvolvement?: string;
    instagramFollow?: string;
    additionalInfo?: string
}


interface PersonalInfoField {
    id: keyof ApplicantProfile
    label: string;
    placeholder?: string;
    type?: string
    options?: string[]
    required?: boolean
}

const PERSONAL_INFO_FIELDS: PersonalInfoField[] = [
    { id: "resumeUrl", label: "Resume (PDF)", required: true },
    { id: "linkedinUrl", label: "LinkedIn URL" },
    { id: "githubUrl", label: "GitHub URL" },
    {
        id: "previousInvolvement",
        label: "Please select your previous involvement in App Dev.",
        type: "select",
        options: [
            "I was a member of Fall 2025 Bootcamp",
            "I was a member of Spring 2025 Bootcamp",
            "I previously applied for a project",
            "I previously participated in a project",
            "None of the above"
        ],
        required: true
    },
    {
        id: "instagramFollow",
        label: "Are you following appdev_umd on instagram?",
        type: "select",
        options: [
            "Yes 🎉",
            "No, I don't want to because I am lame ☹️",
            "I don't have instagram"
        ],
        required: true
    },
    { id: "whyAppDev", label: "Explain what you'd like to get out of App Dev Club (200 words or less).", required: true },
    { id: "additionalInfo", label: "Is there anything else you'd like to mention?" }
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
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/verifyotpsession`, {
            method: "GET",
            credentials: 'include'
        })
            .then(async (res) => {
                if (res.ok) {
                    const data: OTPSessionResponse = await res.json()
                    setFullName(data.name)
                    setEmail(data.email)
                    setProfile(data.profile || {})
                    setApplications(data.applications || [])
                }
            })
            .catch(() => {
            })
    }, [location])

    const handleSessionUpdate = (data: OTPSessionResponse) => {
        setFullName(data.name)
        setEmail(data.email)
        setProfile(data.profile || {})
        setApplications(data.applications || [])
    }

    return (
        <div className="flex flex-col w-full h-full">
            { /* Minimal, Special Header for Onboarding Page */}
            <header className="flex w-full h-14 shrink-0 items-center gap-2 border-b px-4">
                <img className="h-8" src={logo} />
                <h1>Recruitment</h1>

                {/* Right-aligned group */}
                <div className="ml-auto flex items-center gap-4">
                    {fullName && <Button
                        onClick={() => navigate('/apply/applications')}
                        variant="secondary"
                    >
                        My Applications
                    </Button>}

                    <div className="flex flex-col items-end">
                        {fullName && <span className="text-sm font-medium">{fullName}</span>}
                        {email && <span className="text-xs text-white-500">{email}</span>}
                    </div>
                </div>
            </header>

            <div style={{ height: "calc(100% - calc(var(--spacing) * 12))" }} className='flex flex-col w-full p-4 gap-3'>
                <Routes>
                    <Route path="/" element={<ATSApplyList applications={applications} />} />
                    <Route path='/:subteamId' element={<ATSApplyPage applications={applications} onSessionUpdate={handleSessionUpdate} />} />
                    <Route path='/applications' element={<ATSApplicationsList applications={applications} profile={profile} fullName={fullName} email={email} />} />
                </Routes>
            </div>
        </div>
    )
}

export const ATSApplicationsList = ({ applications, profile, fullName, email }: { applications: ATSApplication[], profile: ApplicantProfile, fullName: string, email: string }) => {
    const navigate = useNavigate()

    return (
        <div className="flex flex-col gap-6">

            <Button className='max-w-max' onClick={() => navigate("../")} variant="outline">
                <ChevronLeftIcon />
                Back to Open Roles
            </Button>

            <div className="bg-muted/50 rounded-xl p-6 border">
                <h1 className='text-3xl font-extrabold mb-4'>Your Profile</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-muted-foreground">Full Name</Label>
                        <p className="font-medium">{fullName}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium">{email}</p>
                    </div>
                    {PERSONAL_INFO_FIELDS.map(field => (
                        <div key={field.id} className="md:col-span-2">
                            <Label className="text-muted-foreground">{field.label}</Label>
                            {profile[field.id]?.toString().startsWith("http") ? (
                                <a
                                    href={profile[field.id]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block font-medium text-blue-500 hover:underline truncate"
                                >
                                    {profile[field.id]}
                                </a>
                            ) : field.id === "resumeUrl" && profile[field.id] ? (
                                <a
                                    href={`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/resume/download?key=${encodeURIComponent(profile[field.id] as string)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block font-medium text-blue-500 hover:underline truncate"
                                >
                                    View Resume (PDF)
                                </a>
                            ) : (
                                <p className="font-medium whitespace-pre-wrap">{profile[field.id] || "No response provided"}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <h1 className='text-4xl font-extrabold mt-4'>Your Applications</h1>
            {applications.length === 0 ? (
                <p className="text-muted-foreground text-lg mt-4">You haven't submitted any applications yet.</p>
            ) : (
                <div className="grid gap-4">
                    {applications.map((app) => (
                        <div key={app._id} className="border rounded-lg p-6 flex flex-col gap-4 bg-card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-bold">
                                        {app.parentTeamName ? `${app.parentTeamName} - ` : ""}
                                        {app.subteamName || app.subteamPk} Subteam
                                    </h3>
                                    <div className="flex gap-2 mt-2">
                                        {app.roles.map((role) => (
                                            <Badge key={role} variant="secondary" className="text-sm">{role}</Badge>
                                        ))}
                                    </div>
                                </div>
                                {(() => {
                                    const stageMap: { [key: string]: { label: string, className: string, variant?: "default" | "secondary" | "destructive" | "outline" } } = {
                                        'New Applications': { label: 'Under review', className: 'bg-zinc-500 hover:bg-zinc-600', variant: 'default' },
                                        'Rejected': { label: 'Rejected', className: '', variant: 'destructive' },
                                        'Interview': { label: 'Interview', className: 'bg-blue-500 hover:bg-blue-600', variant: 'default' },
                                        'Rejected After Interview': { label: 'Rejected', className: '', variant: 'destructive' },
                                        'Hired': { label: 'Accepted', className: 'bg-green-500 hover:bg-green-600', variant: 'default' }
                                    };

                                    const stageInfo = stageMap[app.stage] || { label: app.stage, className: '', variant: 'secondary' };

                                    return (
                                        <Badge
                                            variant={stageInfo.variant}
                                            className={`px-3 py-1 text-sm ${stageInfo.className}`}
                                        >
                                            {stageInfo.label}
                                        </Badge>
                                    );
                                })()}
                            </div>

                            {app.responses && Object.keys(app.responses).length > 0 && (
                                <div className="mt-2 border-t pt-4">
                                    <h4 className="font-semibold mb-3 text-muted-foreground">Form Responses</h4>
                                    <div className="grid gap-4 text-sm">
                                        {Object.entries(app.responses).map(([question, answer]) => (
                                            <div key={question} className="bg-muted/30 p-3 rounded-md">
                                                <p className="font-medium text-muted-foreground mb-1">{question}</p>
                                                <p className="whitespace-pre-wrap">{answer}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="text-xs text-muted-foreground border-t pt-4">
                                Applied on {new Date(app.appliedAt).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}


const ATSApplyPage = ({ applications, onSessionUpdate }: { applications: ATSApplication[], onSessionUpdate: (data: OTPSessionResponse) => void }) => {
    const navigate = useNavigate()
    const params = useParams()
    const [subteam, setSubteam] = React.useState<ATSSubTeamDesc>()

    const [selectedRoles, setSelectedRoles] = React.useState<string[]>([])

    const [verificationComplete, setVerificationComplete] = React.useState(false)
    const [profile, setProfile] = React.useState<ApplicantProfile>({})
    const [responses, setResponses] = React.useState<{ [question: string]: string }>({})

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
    }, [params.subteamId, applications, navigate, profile, location])

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
    }, [subteam, applications, responses]);

    const handleApply = async () => {
        if (selectedRoles.length === 0) {
            return toast.error("Please select at least one role.")
        }

        if (!profile.resumeUrl) {
            return toast.error("Please upload your resume.")
        }

        if (!profile.previousInvolvement) {
            return toast.error("Please select your previous involvement.")
        }

        if (!profile.instagramFollow) {
            return toast.error("Please answer if you follow us on Instagram.")
        }

        if (!profile.whyAppDev) {
            return toast.error("Please explain what you'd like to get out of App Dev.")
        }

        if (profile.linkedinUrl && profile.linkedinUrl.trim() !== "") {
            if (!profile.linkedinUrl.includes("linkedin.com")) {
                return toast.error("Please enter a valid LinkedIn URL.")
            }
            try {
                new URL(profile.linkedinUrl)
            } catch {
                return toast.error("Please enter a valid URL for LinkedIn (starting with http:// or https://).")
            }
        }

        if (profile.githubUrl && profile.githubUrl.trim() !== "") {
            if (!profile.githubUrl.includes("github.com")) {
                return toast.error("Please enter a valid GitHub URL.")
            }
            try {
                new URL(profile.githubUrl)
            } catch {
                return toast.error("Please enter a valid URL for GitHub (starting with http:// or https://).")
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

            const { uploadUrl, publicUrl, key } = await res.json()

            // 2. Upload to S3
            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    'Content-Type': file.type
                },
                body: file
            })

            if (!uploadRes.ok) throw new Error("Failed to upload to S3")

            // 3. Update profile state
            setProfile(prev => ({ ...prev, resumeUrl: key }))
            toast.success("Resume uploaded successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to upload resume")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className='flex flex-col m-3'>
            <AccountLoginAndVerifyDialog onSuccess={(data) => {
                setProfile(prev => ({ ...prev, ...(data.profile || {}) }))
                onSessionUpdate(data)
            }} />
            <Button className='max-w-max' onClick={() => navigate("../")} variant="outline">
                <ChevronLeftIcon />
                Back to Open Roles
            </Button>

            <h1 className='text-4xl font-semibold mt-3'>{subteam?.parentInfo.friendlyName}</h1>
            <h3 className='text-muted-foreground text-2xl'>{subteam?.subteamInfo.friendlyName} Subteam Application</h3>

            <h3 className='text-muted-foreground text-xl mt-5'>About this Team</h3>
            <p>{subteam?.parentInfo.description}</p>

            <h3 className='text-muted-foreground text-xl mt-3'>Choose Preferred Roles</h3>
            <div className="flex flex-col items-start gap-3 mt-2 ml-2">
                {subteam?.roles.map((role) => (
                    <div className='flex gap-2'>
                        <Checkbox
                            id={role}
                            checked={selectedRoles.includes(role)}
                            onCheckedChange={(checked) => {
                                if (checked) setSelectedRoles(prev => [...prev, role])
                                else setSelectedRoles(prev => prev.filter(r => r !== role))
                            }}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor={role}>{role}</Label>
                            <p className="text-muted-foreground text-sm">
                                {/* future role desc goes here */}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <h3 className='text-muted-foreground text-xl mt-3'>Personal Information</h3>
            {PERSONAL_INFO_FIELDS.map((field) => (
                <div key={field.id} className="grid w-full items-center gap-1.5 mt-4">
                    <Label htmlFor={field.id}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>

                    {field.id === "resumeUrl" ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
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
                                    className="w-full md:w-max"
                                >
                                    {isUploading ? <Loader2Icon className="animate-spin mr-2" /> : <UploadCloud className="mr-2" />}
                                    {profile.resumeUrl ? "Change Resume" : "Upload Resume (PDF)"}
                                </Button>
                                {profile.resumeUrl && (
                                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                        <FileIcon className="h-4 w-4" />
                                        Resume Uploaded
                                    </div>
                                )}
                            </div>
                            {profile.resumeUrl && (
                                <a
                                    href={profile.resumeUrl.startsWith("http") ? profile.resumeUrl : `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/resume/download?key=${encodeURIComponent(profile.resumeUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 hover:underline truncate max-w-xs block"
                                >
                                    {profile.resumeUrl.startsWith("http") ? profile.resumeUrl : "View Uploaded Resume"}
                                </a>
                            )}
                        </div>
                    ) : field.type === "select" ? (
                        <Select
                            value={profile[field.id]?.toString() ?? ""}
                            onValueChange={(value) =>
                                setProfile((prev) => ({
                                    ...prev,
                                    [field.id]: value
                                }))
                            }
                        >
                            <SelectTrigger>
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
                    ) : (
                        <Input
                            id={field.id}
                            type={field.type ?? "text"}
                            placeholder={field.placeholder ?? "Enter your answer"}
                            value={profile[field.id] ?? ""}
                            onChange={(e) =>
                                setProfile((prev) => ({
                                    ...prev,
                                    [field.id]:
                                        field.type === "number"
                                            ? Number(e.target.value)
                                            : e.target.value
                                }))
                            }
                        />
                    )}
                </div>
            ))
            }
            {
                selectedRoles.length > 0 && subteam?.parentInfo && (
                    <div className="mt-5">
                        <h3 className='text-muted-foreground text-xl'>Team Questions</h3>
                        <div className="grid w-full items-center gap-1.5 mt-4">
                            <Label htmlFor="parent-team-interest">
                                Why are you interested in {subteam.parentInfo.friendlyName}?
                                <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <Input
                                id="parent-team-interest"
                                type="text"
                                placeholder="Enter your answer"
                                value={responses[`Why are you interested in ${subteam.parentInfo.friendlyName}?`] ?? ""}
                                onChange={(e) =>
                                    setResponses((prev) => ({
                                        ...prev,
                                        [`Why are you interested in ${subteam.parentInfo.friendlyName}?`]: e.target.value
                                    }))
                                }
                            />
                        </div>
                    </div>
                )
            }
            {
                selectedRoles.length > 0 && Object.entries(subteam?.roleSpecificQuestions ?? {}).filter(
                    ([role]) => selectedRoles.includes(role)
                ).map(([role, questions]) => (
                    <div key={role} className="mt-5">
                        <h3 className='text-muted-foreground text-xl'>{role} Questions</h3>
                        {questions.map((question, idx) => (
                            <div key={`${role}-${idx}`} className="grid w-full items-center gap-1.5 mt-4">
                                <Label htmlFor={`${role}-${idx}`}>
                                    {question}
                                    <span className="text-red-500 ml-1">*</span>
                                </Label>
                                <Input
                                    id={`${role}-${idx}`}
                                    type="text"
                                    placeholder="Enter your answer"
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
                    </div>
                ))
            }

            <Button
                onClick={handleApply}
                disabled={isSubmitting}
                className="mt-8 w-full md:w-max px-10"
            >
                {isSubmitting && <Loader2Icon className="animate-spin mr-2" />}
                Submit Application
            </Button>


        </div >
    )
}

const ATSApplyList = ({ applications }: { applications: ATSApplication[] }) => {
    const navigate = useNavigate()
    const [teams, setTeams] = React.useState<OpenATSTeam[]>([])

    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/openteams`)
            .then(async (res) => {
                const teams = await res.json()
                setTeams(_ => teams)
            })
    }, [])

    return (
        <>
            <h1 className='text-4xl font-extrabold'>Open Roles</h1>
            <Accordion
                type="single"
                collapsible
                className="w-full">
                {
                    teams.map((team) => (
                        <AccordionItem value={team.teamPk}>
                            <AccordionTrigger>
                                <div className="flex items-center">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage />
                                        <AvatarFallback className="rounded-lg"><UsersRound size="16" /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col ml-2">
                                        <div className="flex items-center gap-2">
                                            <span>{team.teamInfo.friendlyName} ({team.teamInfo.seasonText})</span>
                                            {applications.some(app => team.recruitingSubteamPks.includes(app.subteamPk)) && (
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            )}
                                        </div>
                                        <span className="text-muted-foreground">{team.teamInfo.description}</span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="flex flex-col gap-4 text-balance">
                                <div className="flex flex-col">
                                    <p className="text-lg text-muted-foreground">Currently Recruiting Subteams</p>
                                    <ul className="list-disc pl-8 pt-2">
                                        {Object.values(team.subteamInfo).map((teamInfo) => {
                                            const isApplied = applications.some(app => app.subteamPk === teamInfo.pk)
                                            return (
                                                <li className="flex items-center gap-2">
                                                    <b>{teamInfo.friendlyName}:</b> {teamInfo.description}
                                                    {isApplied && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                                </li>
                                            )
                                        })}
                                    </ul>

                                    {team.recruitingSubteamPks.map((subteamPk) => {
                                        const subteamInfo = team.subteamInfo[subteamPk]
                                        const isApplied = applications.some(app => app.subteamPk === subteamPk)
                                        return (<>
                                            <div className="flex items-center gap-2 mt-5">
                                                <p className="text-lg text-muted-foreground">Available Roles in the {subteamInfo.friendlyName} Subteam</p>
                                            </div>
                                            <div className="flex items-center space-x-2 mt-2">
                                                {subteamInfo.recruitmentInfo?.roles.map((roleName) => (<Badge>{roleName}</Badge>))}
                                            </div>
                                            <Button
                                                onClick={() => isApplied ? navigate(`/apply/applications`) : navigate(`./${subteamPk}`)}
                                                variant="outline"
                                                className='mt-3 max-w-max'
                                            >
                                                {isApplied ? `View Applications` : `Apply to the ${subteamInfo.friendlyName} Subteam`}
                                                <ExternalLinkIcon />
                                            </Button>
                                        </>
                                        )
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))
                }
            </Accordion>
        </>
    )
}

const AccountLoginAndVerifyDialog = ({ onSuccess }: { onSuccess: (data: OTPSessionResponse) => void }) => {
    const [isLoading, setIsLoading] = React.useState(false)
    const [schoolEmail, setSchoolEmail] = React.useState("")
    const [fullName, setFullName] = React.useState("")
    const [otpPageVisible, setOtpPageVisible] = React.useState(false)
    const [otp, setOtp] = React.useState("")
    const [open, setOpen] = React.useState(false)
    //
    React.useEffect(() => {
        setIsLoading(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/auth/verifyotpsession`, {
            method: "GET",
            credentials: 'include'
        })
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json()
                    onSuccess(data)
                    setOpen(false)
                }
                else {
                    setOpen(true)
                }
                // If not ok, just leave the dialog open for login
            })
            .catch(() => {
                setOpen(true)
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