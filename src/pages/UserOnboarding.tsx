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

import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ORGANIZATION_NAME } from '@/commons/strings'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from '@/components/ui/sidebar'
import { CheckCircle2Icon, Loader2Icon, Lock, MessagesSquare, Signature, TriangleAlertIcon, XCircleIcon } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from "sonner"

interface CompleteSetupStageProps {
    stages: { name: string, status: boolean }[],
    stepComplete: () => void
}

interface SlackJoinStageProps {
    email: string,
    inviteUrl: string,
    defaultVerified: boolean,
    stepComplete: (joined: boolean) => void
}

interface CreatePasswordStageProps {
    name: string,
    email: string,
    teamName: string,
    role: string,
    defaultPassword: string,
    stepComplete: (createdPassword: string) => void
}

interface ProprietaryInformationStageProps {
    defaultSigned: boolean,
    stepComplete: (status: boolean) => void
}

export const UserOnboarding = () => {
    const params = useParams()
    const location = useLocation()
    const navigate = useNavigate()

    const slackJoinComplete = React.useRef(false);
    const ipAgreementComplete = React.useRef(false);
    const createdPasswordRef = React.useRef("");
    const currentStepRef = React.useRef(0);

    const basePath = `/onboard/${params.onboardId}`
    const ONBOARDING_FLOWLIST = [
        { title: "Create Password", path: "loginsetup", icon: Lock },
        { title: "Proprietary Information", path: "legal", icon: Signature },
        { title: "Join App Dev Slack", path: "slack", icon: MessagesSquare },
        { title: "Complete Setup", path: "complete", icon: CheckCircle2Icon }
    ]

    const handleNextStep = () => {
        const nextStep = currentStepRef.current + 1
        if (nextStep < ONBOARDING_FLOWLIST.length) {
            currentStepRef.current = currentStepRef.current + 1
            navigate(`${basePath}/${ONBOARDING_FLOWLIST[currentStepRef.current].path}`)
        } else {
            /* Steps are Complete! */
            handleFormSubmit()
        }
    }

    const handlePasswordSetupComplete = (password: string) => {
        createdPasswordRef.current = password
        handleNextStep()
    }

    const handleIPAgreementComplete = (status: boolean) => {
        ipAgreementComplete.current = status;
        handleNextStep()
    }

    const handleSlackJoinComplete = (joined: boolean) => {
        /* Call Backend APIs to Verify Status */
        slackJoinComplete.current = joined
        handleNextStep()
    }

    const handleFormSubmit = () => {
        /* Send a Request to Create the User in Authentik, Setup Accounts, etc. */
    }

    const [passwordStageProps, setPasswordStageProps] = React.useState({
        name: "Loading",
        email: "Loading",
        teamName: "Loading",
        role: "Loading",
        stepComplete: handlePasswordSetupComplete
    })

    const [slackJoinProps, setSlackJoinProps] = React.useState({
        email: "Loading",
        inviteUrl: '#',
        stepComplete: handleSlackJoinComplete
    })

    React.useEffect(() => {
        /* Fetch the Onboarding Information using UUID */
    }, [])

    return (
        <div className="flex flex-col w-full h-full">
            { /* Minimal, Special Header for Onboarding Page */}
            <header className="flex w-full h-14 shrink-0 items-center gap-2 border-b px-4">
                <img className='h-8' src={logo} />
                <h1>Onboarding Portal</h1>
            </header>

            { /* Add Stages Here */}
            <div style={{ height: "calc(100% - calc(var(--spacing) * 12))" }} className='flex flex-col w-full justify-center items-center'>
                <SidebarProvider className='items-start h-full min-h-0'>
                    <Sidebar collapsible="none" className="hidden md:flex">
                        <SidebarContent>
                            <SidebarGroup>
                                <SidebarGroupContent style={{}}>
                                    <SidebarMenu>
                                        {
                                            ONBOARDING_FLOWLIST.map((el, index) => (
                                                <SidebarMenuItem>
                                                    <SidebarMenuButton
                                                        asChild
                                                        isActive={location.pathname.endsWith(el.path)}
                                                    >
                                                        <Link onClick={() => { currentStepRef.current = index }} to={`${basePath}/${el.path}`}>
                                                            <el.icon />
                                                            <span>{el.title}</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            ))
                                        }
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarContent>
                    </Sidebar>

                    <div className='flex flex-col items-center justify-center h-full flex-grow-1'>
                        <Routes>
                            <Route path="/" element={<Navigate to="loginsetup" />} />
                            <Route path="/loginsetup" element={<CreatePasswordStage defaultPassword={createdPasswordRef.current} {...passwordStageProps} />} />
                            <Route path='/legal' element={<ProprietaryInformationStage defaultSigned={ipAgreementComplete.current} stepComplete={handleIPAgreementComplete} />} />
                            <Route path='/slack' element={<SlackJoinStage defaultVerified={slackJoinComplete.current} {...slackJoinProps} />} />
                            <Route path='/complete' element={
                                <CompleteSetupStage 
                                    stepComplete={handleNextStep}
                                    stages={[
                                        { name: "Password Creation", status: createdPasswordRef.current.length >= 8 },
                                        { name: "Intellectual Property Agreement", status: ipAgreementComplete.current },
                                        { name: "Join App Dev Slack", status: slackJoinComplete.current }
                                    ]}
                                />
                            } />
                        </Routes>
                    </div>
                </SidebarProvider>
            </div>
        </div>
    )
}

const CompleteSetupStage = (props: CompleteSetupStageProps) => {
    const [allStepsComplete, setAllComplete] = React.useState(true);

    React.useEffect(() => {
        for (const stage of props.stages) {
            if (!stage.status) {
                setAllComplete(false)
                break;
            }
        }
    }, []);
    
    return (
        <div className='flex flex-col h-full w-full justify-center items-center p-12'>
            <CardTitle>You're almost there!</CardTitle>
            <CardDescription className='text-center'>Please complete any incomplete items and once you're done, smash the button! 💥</CardDescription>

            <div className='flex flex-col items-center gap-4 mt-5 min-w-xl flex-grow-1'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Setup Requirement</TableHead>
                            <TableHead>Completion Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {
                            props.stages.map((stage) => (
                                <TableRow>
                                    <TableCell>{stage.name}</TableCell>
                                    <TableCell>{
                                        stage.status ? 
                                        <span className='flex gap-1 items-center text-green-500'><CheckCircle2Icon size="16" /> Complete</span> : 
                                        <span className='flex gap-1 items-center text-red-400'><XCircleIcon size="16"/> Incomplete</span>
                                    }</TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>

                <Button 
                    className='mt-5' 
                    disabled={!allStepsComplete}
                    onClick={props.stepComplete}
                >
                    Finish Setup
                </Button>
            </div>
        </div>
    )
}

const SlackJoinStage = (props: SlackJoinStageProps) => {
    const [slackJoinVerified, setSlackJoinVerified] = React.useState(props.defaultVerified)
    const [isLoading, setIsLoading] = React.useState(false);

    const verifyJoinStatus = () => {
        setIsLoading(true)
        setTimeout(() => {
            toast.error("Verification Failed!", { 
                description: "We couldn't verify that you're in the App Dev Slack. Please make sure that you used the correct email address and invite link as mentioned in the instructions."
            })
            setIsLoading(false);
        }, 1500);
    }

    return (
        <div className='flex flex-col h-full w-full justify-center items-center p-12'>
            <CardTitle>Join the App Dev Slack!</CardTitle>
            <CardDescription className='text-center'>That's where all the fun stuff cooks 🥘</CardDescription>

            <div className='flex flex-col items-center gap-4 mt-5 w-full flex-grow-1'>
                <Alert variant="default" className='w-lg'>
                    <TriangleAlertIcon />
                    <AlertTitle>Joining Instructions</AlertTitle>
                    <AlertDescription>
                        <span>
                            Please join App Dev's Slack Channel by
                            <a className='text-blue-500' href={props.inviteUrl}> clicking this link</a>.
                            You need to use the email address <b>{props.email}</b> to create or login to slack.
                            This portal validates your slack membership status by verifing your email address.
                        </span>
                    </AlertDescription>
                </Alert>

                <Button onClick={verifyJoinStatus} disabled={isLoading}>
                    <Loader2Icon style={{ display: (isLoading) ? 'block' : 'none' }} className='animate-spin' />
                    Verify and Continue
                </Button>
            </div>
        </div>
    )
}

const ProprietaryInformationStage = (props: ProprietaryInformationStageProps) => {
    const [agreementSigned, setAgreementSigned] = React.useState(props.defaultSigned);

    return (
        <div className='flex flex-col h-full w-full justify-center items-center p-12'>
            <CardTitle>Intellectual Property Agreement</CardTitle>
            <CardDescription className='text-center'>This legal agreement helps us transfer the technology that you've helped develop directly to our sponsor companies.</CardDescription>

            <div className='flex flex-col items-center gap-4 mt-5 w-full flex-grow-1'>
                <iframe
                    className='w-[100%] h-[100%] rounded-md'
                    src='https://www.cte.iup.edu/cte/Resources/PDF_TestPage.pdf'
                    style={{
                        border: 'none'
                    }}
                />
            </div>

            <div className="flex w-full items-start gap-3 mt-5">
                <Checkbox checked={agreementSigned} id="terms" onCheckedChange={(checked) => setAgreementSigned(checked as boolean)} />
                <div className="grid flex-grow-1">
                    <Label htmlFor="terms">Accept Agreement</Label>
                    <p className="text-muted-foreground text-sm">
                        By clicking this checkbox, you agree to have signed the aforementioned Intellectual Property Agreement
                        with App Dev Club LLC.
                    </p>
                </div>

                <Button onClick={() => { props.stepComplete(agreementSigned) }} disabled={!agreementSigned}>Continue</Button>
            </div>
        </div>
    )
}

const CreatePasswordStage = (props: CreatePasswordStageProps) => {
    const [password, setPassword] = React.useState(props.defaultPassword)
    const [confirmPassword, setConfirmPassword] = React.useState(props.defaultPassword)

    return (
        <div className='flex flex-col h-full w-full justify-center items-center p-12'>
            <CardTitle>Welcome to the {ORGANIZATION_NAME}!</CardTitle>
            <CardDescription>Please Follow the Onboarding Process</CardDescription>

            <div className='flex flex-col items-center gap-4 mt-5 w-full'>
                <Alert variant="default" className='w-lg'>
                    <TriangleAlertIcon />
                    <AlertTitle>Confirm Your Information</AlertTitle>
                    <AlertDescription>
                        Hello {props.name}! You will need an App Dev Club account to access internal repositories, resources and people portals. Your login email will be {props.email}.
                        Please confirm that you'll be joining the App Dev's {props.teamName} team as a {props.role}.
                    </AlertDescription>
                </Alert>

                {/* Get Password! */}
                <div className={'grid gap-2 w-lg mt-5'}>
                    <Label htmlFor="password">Create New Password</Label>
                    <Input
                        id="password"
                        type='password'
                        value={password}
                        placeholder='Minimum 8 characters'
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div className={'grid gap-2 w-lg'}>
                    <Label htmlFor="cnfpassword">Confirm Password</Label>
                    <Input
                        id="cnfpassword"
                        type='password'
                        value={confirmPassword}
                        placeholder='Confirm your Password'
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>
            </div>

            {/* Next Step Stuff */}
            <Button
                disabled={password.length < 8 || password != confirmPassword} className='mt-6'
                onClick={() => { props.stepComplete(password) }}
            >
                Continue Account Setup
            </Button>
        </div>
    )
}