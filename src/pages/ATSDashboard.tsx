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
import { ChevronLeftIcon, ExternalLinkIcon, Loader2Icon, UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
    graduationYear?: number
    major?: string
    phone?: string
    resumeUrl?: string
    linkedinUrl?: string
    githubUrl?: string
}

interface PersonalInfoField {
    id: keyof ApplicantProfile
    label: string;
    placeholder?: string;
    type?: string
}

const PERSONAL_INFO_FIELDS: PersonalInfoField[] = [
    { id: "graduationYear", label: "Graduation Year", type: "number" },
    { id: "major", label: "Major" },
    { id: "phone", label: "Phone Number" },
    { id: "resumeUrl", label: "Resume URL" },
    { id: "linkedinUrl", label: "LinkedIn URL" },
    { id: "githubUrl", label: "GitHub URL" }
]
export const ATSDashboard = () => {
    const params = useParams()
    const location = useLocation()
    const navigate = useNavigate()

    return (
        <div className="flex flex-col w-full h-full">
            { /* Minimal, Special Header for Onboarding Page */}
            <header className="flex w-full h-14 shrink-0 items-center gap-2 border-b px-4">
                <img className='h-8' src={logo} />
                <h1>Recruitment</h1>
            </header>

            <div style={{ height: "calc(100% - calc(var(--spacing) * 12))" }} className='flex flex-col w-full p-4 gap-3'>
                <Routes>
                    <Route path="/" element={<ATSApplyList />} />
                    <Route path='/:subteamId' element={<ATSApplyPage />} />
                </Routes>
            </div>
        </div>
    )
}

const ATSApplyPage = () => {
    const navigate = useNavigate()
    const params = useParams()
    const [subteam, setSubteam] = React.useState<ATSSubTeamDesc>()

    const [selectedRoles, setSelectedRoles] = React.useState<string[]>([])

    const [verificationComplete, setVerificationComplete] = React.useState(false)
    const [profile, setProfile] = React.useState<ApplicantProfile>({})
    const [responses, setResponses] = React.useState<{ [question: string]: string }>({})

    const [isSubmitting, setIsSubmitting] = React.useState(false)

    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/config/${params.subteamId}`, { credentials: 'include' })
            .then(async (res) => {
                const team = await res.json()
                setSubteam(_ => team)
            })
    }, [params.subteamId])

    const handleApply = async () => {
        if (selectedRoles.length === 0) {
            return toast.error("Please select at least one role.")
        }

        setIsSubmitting(true)

        try {
            const response = await fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/apply`, {
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

    return (
        <div className='flex flex-col m-3'>
            <AccountLoginAndVerifyDialog onSuccess={(p) => setProfile(prev => ({ ...prev, ...p }))} />
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
                    <Label htmlFor={field.id}>{field.label}</Label>

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
                </div>
            ))}

            <h3 className='text-muted-foreground text-xl mt-3'>Role Specific Questions</h3>
            {selectedRoles.length > 0 && Object.entries(subteam?.roleSpecificQuestions ?? {}).filter(
                ([role]) => selectedRoles.includes(role)
            ).map(([role, questions]) => (
                <div key={role} className="mt-5">
                    <h3 className='text-muted-foreground text-xl'>{role} Questions</h3>
                    {questions.map((question, idx) => (
                        <div key={`${role}-${idx}`} className="grid w-full items-center gap-1.5 mt-4">
                            <Label htmlFor={`${role}-${idx}`}>{question}</Label>
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
            ))}

            <Button
                onClick={handleApply}
                disabled={isSubmitting}
                className="mt-8 w-full md:w-max px-10"
            >
                {isSubmitting && <Loader2Icon className="animate-spin mr-2" />}
                Submit Application
            </Button>


        </div>
    )
}

const ATSApplyList = () => {
    const params = useParams()
    const location = useLocation()
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
                                        <span>{team.teamInfo.friendlyName} ({team.teamInfo.seasonText})</span>
                                        <span className="text-muted-foreground">{team.teamInfo.description}</span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="flex flex-col gap-4 text-balance">
                                <div className="flex flex-col">
                                    <p className="text-lg text-muted-foreground">Currently Recruiting Subteams</p>
                                    <ul className="list-disc pl-8 pt-2">
                                        {Object.values(team.subteamInfo).map((teamInfo) => (
                                            <li><b>{teamInfo.friendlyName}:</b> {teamInfo.description}</li>
                                        ))}
                                    </ul>

                                    {team.recruitingSubteamPks.map((subteamPk) => {
                                        const subteamInfo = team.subteamInfo[subteamPk]
                                        return (<>
                                            <p className="text-lg text-muted-foreground mt-5">Available Roles in the {subteamInfo.friendlyName} Subteam</p>
                                            <div className="flex items-center space-x-2 mt-2">
                                                {subteamInfo.recruitmentInfo?.roles.map((roleName) => (<Badge>{roleName}</Badge>))}
                                            </div>
                                            <Button onClick={() => navigate(`./${subteamPk}`)} variant="outline" className='mt-3 max-w-max'>
                                                Apply to the {subteamInfo.friendlyName} Subteam
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

const AccountLoginAndVerifyDialog = ({ onSuccess }: { onSuccess: (profile: ApplicantProfile) => void }) => {
    const [isLoading, setIsLoading] = React.useState(false)
    const [schoolEmail, setSchoolEmail] = React.useState("")
    const [fullName, setFullName] = React.useState("")
    const [otpPageVisible, setOtpPageVisible] = React.useState(false)
    const [otp, setOtp] = React.useState("")
    const [open, setOpen] = React.useState(true)

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
                    onSuccess(data.profile || {})
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