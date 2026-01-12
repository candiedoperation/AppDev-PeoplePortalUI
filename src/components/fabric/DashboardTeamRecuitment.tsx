import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config";
import React from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TeamInfo, TeamInfoResponse } from "./DashboardTeamInfo";
import { RecruitmentStatistics } from "./RecruitmentStatistics";
import { Link, Navigate, NavLink, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { TagInput, type Tag } from 'emblor-maintained';
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2Icon, ExternalLinkIcon, ChevronLeft, ChevronRight, MailIcon, ClipboardCheckIcon, PartyPopperIcon, HeadsetIcon, CopyCheckIcon, ThumbsDownIcon, AlertTriangleIcon } from "lucide-react";
import { KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider } from "../ui/shadcn-io/kanban";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Timeline, TimelineItem } from "../ui/timeline";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";




interface SubteamATSConfig {
    roles: string[]
    roleSpecificQuestions: { [key: string]: string[] },
    isRecruiting: boolean
}

// Type definition for applications returned from backend


interface KanbanApplicationCard {
    id: string;
    name: string;
    column: string;
    applicantId: string;
    email: string;
    profile: { [key: string]: string };
    responses: { [key: string]: string };
    rolePreferences: { role: string, subteamPk: string }[];  // Ordered role preferences
    hiredSubteamPk?: string;
    hiredRole?: string;
    appliedAt: string;
    appDevInternalPk: number;
    stageHistory?: {
        stage: string;
        changedAt: string;
        changedBy?: string;
    }[];
    [key: string]: unknown;  // Index signature for Kanban compatibility
}

interface StageDefinition {
    id: string;
    name: string;
    [key: string]: unknown;  // Index signature for Kanban compatibility
}

export const DashboardTeamRecruitment = () => {
    const STAGE_STYLES: { [key: string]: string } = {
        'Applied': 'text-blue-700 bg-blue-50 border-blue-200',
        'Interview': 'text-purple-700 bg-purple-50 border-purple-200',
        'Hired': 'text-green-700 bg-green-50 border-green-200',
        'Rejected': 'text-red-700 bg-red-50 border-red-200',
        'Potential Hire': 'text-orange-700 bg-orange-50 border-orange-200',
    }
    const params = useParams()
    const [teamInfo, setTeamInfo] = React.useState<TeamInfo>();
    const [subTeams, setSubTeams] = React.useState<TeamInfo[]>([]);
    const [stages, setStages] = React.useState<StageDefinition[]>([]);

    const [roles, setRoles] = React.useState<{ [key: string]: Tag[] }>({});
    const [tagIndex, setTagIndex] = React.useState<{ [key: string]: number | null }>({});

    const [isLoading, setIsLoading] = React.useState(false);
    const [recruitmentEnabled, setRecruitmentEnabled] = React.useState<{ [key: string]: boolean }>({})
    const [roleSpecQuestions, setRoleSpecQuestions] = React.useState<{ [key: string]: { [key: string]: string[] } }>({})

    const [applications, setApplications] = React.useState<KanbanApplicationCard[]>([])  // UPDATED type
    const [selectedApplication, setSelectedApplication] = React.useState<KanbanApplicationCard | null>(null)  // UPDATED type
    const [applicantUrls, setApplicantUrls] = React.useState<any | null>(null)
    const [otherApplications, setOtherApplications] = React.useState<any[]>([])
    const [dragStartColumn, setDragStartColumn] = React.useState<string | null>(null);



    // --- Stage Transition Logic ---
    const VALID_TRANSITIONS: { [key: string]: string[] } = {
        'Applied': ['Interview', 'Rejected'],
        'Interview': ['Potential Hire', 'Hired', 'Rejected', 'Rejected After Interview'],
        'Potential Hire': ['Hired', 'Rejected'],
        // Terminal stages cannot transition anywhere
        'Hired': [],
        'Rejected': [],
        'Rejected After Interview': []
    }

    const [pendingTransition, setPendingTransition] = React.useState<{ applicationId: string, newStage: string, previousStage: string } | null>(null)
    const [actionDialog, setActionDialog] = React.useState<'reject' | 'interview' | 'potential' | 'hired' | null>(null)

    // Dialog Inputs
    const [interviewLink, setInterviewLink] = React.useState("")
    const [saveInteviewLink, setSaveInterviewLink] = React.useState(false)
    const [interviewGuidelines, setInterviewGuidelines] = React.useState("")
    const [saveInterviewGuidelines, setSaveInterviewGuidelines] = React.useState(false)
    const [hiredRole, setHiredRole] = React.useState("")


    // Load saved interview link on mount
    React.useEffect(() => {
        const saved = localStorage.getItem("interviewLink")
        if (saved) {
            setInterviewLink(saved)
            setSaveInterviewLink(true)
        }

        const savedGuidelines = localStorage.getItem("interviewGuidelines")
        if (savedGuidelines) {
            setInterviewGuidelines(savedGuidelines)
            setSaveInterviewGuidelines(true)
        }
    }, [])

    function validateTransition(currentStage: string, newStage: string): boolean {
        // Allow same stage (no-op)
        if (currentStage === newStage) return true;

        const allowed = VALID_TRANSITIONS[currentStage] || [];
        // If current stage isn't in definition, assume it's terminal or stuck (prevent move)
        // Unless it's a super-user/admin override, but we stick to rules:
        return allowed.includes(newStage);
    }

    // Unified handler for both Drag & Drop and Button clicks
    function initiateStageUpdate(applicationId: string, currentStage: string, newStage: string) {
        // 1. Validate
        if (!validateTransition(currentStage, newStage)) {
            toast.error("Invalid Stage Transition", {
                description: `Cannot move from "${currentStage}" to "${newStage}".`
            });
            // If this came from drag-drop, we need to revert the optimistic update.
            // Since we use 'applications' state, simply re-fetching or resetting state would work.
            // For now, let's just trigger a re-fetch of applications to reset UI
            fetchApplications();
            return;
        }

        // 2. Set Pending Transition & Open Appropriate Dialog
        setPendingTransition({ applicationId, newStage, previousStage: currentStage });

        if (newStage === 'Rejected' || newStage === 'Rejected After Interview') {
            setActionDialog('reject');
        } else if (newStage === 'Interview') {
            setActionDialog('interview');
        } else if (newStage === 'Potential Hire') {
            setActionDialog('potential');
        } else if (newStage === 'Hired') {
            setActionDialog('hired');
        } else {
            // No specific dialog for this transition (e.g. unexpected), just do it?
            // Or maybe default to confirmation? For now, we only have these flows.
            // If valid transition but no dialog, maybe just execute.
            executeStageUpdate(applicationId, newStage);
        }
    }

    function executeStageUpdate(applicationId: string, newStage: string, extraData?: any) {
        // Optimistic update locally
        setApplications(apps => apps.map(a => a.id === applicationId ? { ...a, column: newStage, stage: newStage } : a));

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/applications/${applicationId}/stage`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stage: newStage,
                ...extraData
            })
        })
            .then(res => {
                if (res.ok) {
                    const stageName = stages.find(s => s.id === newStage)?.name || newStage;
                    const app = applications.find(a => a.id === applicationId);
                    toast.success("Stage Updated", { description: `Moved ${app?.name} to ${stageName}` })

                    // Close dialogs and reset
                    setPendingTransition(null);
                    setActionDialog(null);

                    // Sync selectedApplication state if it matches
                    if (selectedApplication?.id === applicationId) {
                        setSelectedApplication(prev => prev ? {
                            ...prev,
                            column: newStage,
                            stage: newStage,
                            hiredRole: extraData?.hiredRole ?? prev.hiredRole
                        } : null);
                    }

                    setHiredRole("");


                    // If interview link save was checked
                    if (extraData?.interviewLink && saveInteviewLink) {
                        localStorage.setItem("interviewLink", extraData.interviewLink);
                    } else if (!saveInteviewLink) {
                        localStorage.removeItem("interviewLink");
                    }

                    // If interview guidelines save was checked
                    if (extraData?.interviewGuidelines && saveInterviewGuidelines) {
                        localStorage.setItem("interviewGuidelines", extraData.interviewGuidelines);
                    } else if (!saveInterviewGuidelines) {
                        localStorage.removeItem("interviewGuidelines");
                    }

                    // Refresh app list to ensure consistency
                    fetchApplications();
                } else {
                    toast.error("Failed to Update Stage");
                    // Revert
                    fetchApplications();
                }
            })
            .catch(err => {
                console.error(err);
                toast.error("Failed to Update Stage");
                fetchApplications();
            })
    }

    function cancelStageUpdate() {
        if (pendingTransition) {
            // Revert local state immediately
            setApplications(apps => apps.map(a =>
                a.id === pendingTransition.applicationId
                    ? { ...a, column: pendingTransition.previousStage, stage: pendingTransition.previousStage }
                    : a
            ));
        }
        setPendingTransition(null);
        setActionDialog(null);
        setHiredRole("");
    }

    function handleDragStart(event: DragStartEvent) {
        const item = applications.find(a => a.id === event.active.id);
        if (item) setDragStartColumn(item.column);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        const activeId = active.id;

        setDragStartColumn(null);

        if (!over) return;

        const app = applications.find(a => a.id === activeId);
        // If app exists and column actually changed
        if (app && app.column !== over.id) { // over.id corresponds to column id if dropped on column
            // But Wait! dnd-kit can drop on *items* too. 
            // We need to resolve the target column correctly.
            // The Kanban library handles the visual 'column' determination.
            // We can check the 'applications' state because onDataChange has likely already run 
            // updating the item's column optimistically during the drag!

            // Actually, let's rely on valid transition logic.
            // 'app.column' here references the state *before* the drop if we use 'applications' from closure?
            // No, 'applications' is from state. 

            // The KanbanProvider's onDragEnd (which calls this) has typically *finished* the visual move.
            // But we need to check *where* it landed. The 'over.id' is either a column ID or another card ID.

            // Let's find the column ID:
            let targetColumn = over.id as string;
            // If over.id matches an existing card, find that card's column
            const overItem = applications.find(a => a.id === over.id);
            if (overItem) targetColumn = overItem.column;

            // The dragStartColumn is reliable for previous state.
            if (targetColumn !== dragStartColumn) {
                // Trigger our centralized logic
                initiateStageUpdate(activeId as string, dragStartColumn!, targetColumn);
            }
        }
    }

    // Helper to refresh data
    function fetchApplications() {
        if (!params.teamId) return;
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/applications/${params.teamId}`, { credentials: 'include' })
            .then(async (response) => {
                const data = await response.json();
                if (response.ok) {
                    setApplications(Array.isArray(data) ? data : []);
                }
            })
            .catch(console.error);
    }

    React.useEffect(() => {
        if (selectedApplication?.applicantId) {
            setApplicantUrls(null) // Reset while loading
            setOtherApplications([]) // Reset while loading

            // Fetch secure resume URL
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/applications/applicant/${selectedApplication.applicantId}/resume`)
                .then(async (res) => {
                    if (res.ok) {
                        const urls = await res.json()
                        setApplicantUrls(urls)
                    }
                })
                .catch(err => console.error("Failed to fetch applicant URLs", err))

            // Fetch application history
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/applications/applicant/${selectedApplication.applicantId}/applications`)
                .then(async (res) => {
                    if (res.ok) {
                        const apps = await res.json()
                        setOtherApplications(apps)
                    }
                })
                .catch(err => console.error("Failed to fetch applicant history", err))
        }

        console.log(selectedApplication)
    }, [selectedApplication])

    // Fetch application stages
    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/stages`)
            .then(async (response) => {
                if (response.ok) {
                    const data = await response.json();
                    setStages(data);
                }
            })
            .catch((e) => {
                console.error("Failed to fetch stages:", e);
            });
    }, []);

    // Fetch applications from MongoDB
    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/applications/${params.teamId}`, { credentials: 'include' })
            .then(async (response) => {
                const data = await response.json();
                if (response.ok) {
                    // Ensure data is an array (empty array is valid)
                    setApplications(Array.isArray(data) ? data : []);
                } else {
                    console.error("Server error:", data);
                    toast.error("Failed to Fetch Applications: " + (data.message || "Server Error"));
                }
            })
            .catch((e) => {
                console.error("Fetch error:", e);
                toast.error("Failed to Fetch Applications: Error " + e.message);
            });
    }, [params.teamId]);

    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}`)
            .then(async (response) => {
                const teamlistResponse: TeamInfoResponse = await response.json()
                setTeamInfo(teamlistResponse.team)
                setSubTeams(teamlistResponse.subteams)

                for (const subteam of teamlistResponse.subteams) {
                    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/config/${subteam.pk}`)
                        .then(async (response) => {
                            if (response.ok) {
                                const config: SubteamATSConfig = await response.json()
                                const mappedRoles = config.roles.map((role, index) => ({ id: index.toString(), text: role } as Tag))
                                setRoles(role => ({ ...role, [subteam.pk]: mappedRoles }))
                                setTagIndex(tagIndex => ({ ...tagIndex, [subteam.pk]: null }))
                                setRecruitmentEnabled(enabled => ({ ...enabled, [subteam.pk]: config.isRecruiting }))
                                setRoleSpecQuestions(rsq => ({ ...rsq, [subteam.pk]: config.roleSpecificQuestions }))
                            } else if (response.status == 404) {
                                setRoles(role => ({ ...role, [subteam.pk]: [] }))
                                setTagIndex(tagIndex => ({ ...tagIndex, [subteam.pk]: null }))
                                setRecruitmentEnabled(enabled => ({ ...enabled, [subteam.pk]: false }))
                                setRoleSpecQuestions(rsq => ({ ...rsq, [subteam.pk]: {} }))
                            } else {
                                // toast.error("Failed to Fetch Configuration", "We couldn't ret")
                            }

                            /* Update Role Specific Questions & Enabled Status */
                        })
                }
            })

            .catch((e) => {
                toast.error("Failed to Fetch Team Information: " + e.message)
            })
    }, [params.teamId]);

    function handleSettingsUpdate(subteamPk: string) {
        setIsLoading(true);
        const enabledRoles = roles[subteamPk].map((role) => role.text)
        const questions = enabledRoles.reduce(
            (acc: { [key: string]: string[] }, role) => {
                acc[role] = roleSpecQuestions[subteamPk][role]
                return acc
            }, {}
        )

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/config/${subteamPk}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                isRecruiting: recruitmentEnabled[subteamPk],
                roles: enabledRoles,
                roleSpecificQuestions: questions
            })
        }).then((res) => {
            if (res.ok) {
                toast.success("Configuration Saved", {
                    description: "Subteam Recruitment Settings have been Updated!"
                })
            } else {
                toast.error("Configuration Failure", {
                    description: "Failed to Save Settings: " + res.body
                })
            }
        }).catch((e) => {
            toast.error("Server Failure", {
                description: "Failed to Save Settings: " + e.message
            })
        }).finally(() => {
            /* Stop Button loading */
            setIsLoading(false)
        })
    }

    // --- Navigation Logic ---
    const reviewableStages = ['Applied', 'Interview', 'Potential Hire'];
    const reviewableApps = applications
        .filter(a => reviewableStages.includes(a.column))
        .sort((a, b) => {
            const idxA = reviewableStages.indexOf(a.column);
            const idxB = reviewableStages.indexOf(b.column);
            return idxA - idxB;
        });
    const currentNavIndex = selectedApplication ? reviewableApps.findIndex(a => a.id === selectedApplication.id) : -1;

    function navigateApplicant(direction: 'next' | 'prev') {
        if (currentNavIndex === -1) return;
        const newIndex = direction === 'next' ? currentNavIndex + 1 : currentNavIndex - 1;
        if (newIndex >= 0 && newIndex < reviewableApps.length) {
            setSelectedApplication(reviewableApps[newIndex]);
        }
    }

    // --- MISC UI STUFF ---
    const getTimelineStageIcon = (stage: string) => {
        switch (stage) {
            case 'Applied':
                return <ClipboardCheckIcon />
            case 'Interview':
                return <HeadsetIcon />
            case 'Potential Hire':
                return <CopyCheckIcon />
            case 'Hired':
                return <PartyPopperIcon />
            case 'Rejected':
                return <ThumbsDownIcon />
        }
    }

    return (
        <div className="flex flex-col m-2 h-full">
            <div className="flex items-center">
                <div className="flex flex-col flex-grow-1">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Recruitment Tracker</h1>
                    <h4 className="text-xl text-muted-foreground">{teamInfo?.attributes.friendlyName} {`${teamInfo?.attributes.seasonType} ${teamInfo?.attributes.seasonYear}`}</h4>
                </div>
            </div>

            <Tabs className="mt-5 flex flex-col flex-grow" defaultValue="applications">
                <TabsList>
                    <TabsTrigger value="applications">Applications</TabsTrigger>
                    <TabsTrigger value="statistics">Statistics</TabsTrigger>
                    <TabsTrigger value="settings">Recruitment Settings</TabsTrigger>
                </TabsList>

                <div className="mt-2 flex-grow flex flex-col min-h-0">
                    <TabsContent className="flex flex-col flex-grow h-full" value="applications">
                        <KanbanProvider
                            columns={stages}
                            data={applications}
                            onDataChange={(data) => setApplications(data)}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            className="overflow-x-auto flex h-full"
                        >
                            {(/* column */ col) => (
                                <KanbanBoard id={col.id} className="min-w-[250px] ring-inset">
                                    <KanbanHeader>{col.name} ({applications.filter(a => a.column === col.id).length})</KanbanHeader>
                                    <KanbanCards id={col.id}>
                                        {(item) => {
                                            const appItem = item as unknown as KanbanApplicationCard;
                                            return (
                                                <KanbanCard id={item.id} name={item.name} column={item.column} className="bg-background cursor-grab border-border">
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold">{item.name}</span>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {appItem.rolePreferences && appItem.rolePreferences.map((pref, idx) => (
                                                                    <span key={idx} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                                        {pref.role}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedApplication(item as unknown as KanbanApplicationCard); }}>Open</Button>
                                                    </div>
                                                </KanbanCard>
                                            );
                                        }}
                                    </KanbanCards>
                                </KanbanBoard>
                            )}
                        </KanbanProvider>
                    </TabsContent>

                    <TabsContent className="overflow-y-auto h-full" value="statistics">
                        <RecruitmentStatistics applications={applications} subTeams={subTeams} />
                    </TabsContent>

                    <TabsContent value="settings">
                        <Accordion type="single" collapsible>
                            {
                                subTeams.map((subteam) => {
                                    return (
                                        <AccordionItem value={subteam.pk}>
                                            <AccordionTrigger>{subteam.attributes.friendlyName} Subteam</AccordionTrigger>
                                            <AccordionContent>
                                                <div className="flex flex-col">
                                                    <p className="text-lg text-muted-foreground">Subteam Description</p>
                                                    <p>{subteam.attributes.description}</p>

                                                    <p className="text-lg text-muted-foreground mt-5">Are you Recruiting?</p>
                                                    <div className="flex items-center space-x-2 mt-2">
                                                        <Switch checked={recruitmentEnabled[subteam.pk]} onCheckedChange={(checked) => setRecruitmentEnabled(enabled => ({ ...enabled, [subteam.pk]: checked }))} id="airplane-mode" />
                                                        <Label htmlFor="airplane-mode">Enable Recruiting for the {subteam.attributes.friendlyName.toUpperCase()} subteam</Label>
                                                    </div>

                                                    <p className="text-lg text-muted-foreground mt-5">What roles are you recruiting for?</p>
                                                    <p>Please note that the roles you define below are only for the <b>{subteam.attributes.friendlyName.toUpperCase()}</b> subteam. Here's a quick guide of sample roles, just in case you're stuck!</p>
                                                    <ul className="list-disc pl-8 pt-2">
                                                        <li>Leadership Subteams may recruit <b>Tech Leads</b></li>
                                                        <li>Engineering Subteams may recruit <b>Frontend Engineers, Full Stack Engineers, etc.</b></li>
                                                        <li>Bootcamp's Students Subteam would only recruit for the role of <b>Bootcamp Student</b></li>
                                                        <li>Social Media's Creative Subteam may recruit for <b>Poster Designers</b></li>
                                                    </ul>

                                                    <Label className="mt-5 mb-2">List Roles</Label>
                                                    <TagInput
                                                        textCase="capitalize"
                                                        placeholder="Ex. Software Engineer, ML Engineer, etc."
                                                        size={'sm'}
                                                        tags={roles[subteam.pk] || []}
                                                        setTags={(value: React.SetStateAction<Tag[]>) => {
                                                            setRoles(roles => ({
                                                                ...roles,
                                                                [subteam.pk]: (typeof value == "function") ? value(roles[subteam.pk]) : value
                                                            }))
                                                        }}

                                                        styleClasses={{
                                                            input: "h-7 pl-2 pr-2 shadow-none"
                                                        }}

                                                        activeTagIndex={tagIndex[subteam.pk] ?? null}
                                                        setActiveTagIndex={function (value: React.SetStateAction<number | null>): void {
                                                            setTagIndex(tagIndex => ({
                                                                ...tagIndex,
                                                                [subteam.pk]: (typeof value == "function") ? value(tagIndex[subteam.pk]) : value
                                                            }))
                                                        }} />

                                                    <p className="text-lg text-muted-foreground mt-5">Role Specific Questions</p>
                                                    {
                                                        (roles[subteam.pk] && roles[subteam.pk].length > 0) ?
                                                            roles[subteam.pk].map((role) => (
                                                                <div className="flex flex-col gap-2 mt-2 mb-2">
                                                                    <Label>Question for {role.text} Applicants</Label>
                                                                    <Input
                                                                        value={roleSpecQuestions[subteam.pk][role.text]?.at(0) ?? ""}
                                                                        onChange={(e) => {
                                                                            setRoleSpecQuestions(questions => ({
                                                                                ...questions,
                                                                                [subteam.pk]: {
                                                                                    ...questions[subteam.pk],
                                                                                    [role.text]: [e.target.value]
                                                                                }
                                                                            }))
                                                                        }}
                                                                    />
                                                                </div>
                                                            )) :
                                                            <p>Please Create roles in the previous section to enable Role Specific Questions</p>
                                                    }
                                                </div>

                                                <Button disabled={isLoading} onClick={() => handleSettingsUpdate(subteam.pk)} className="mt-5">
                                                    <Loader2Icon className={`animate-spin ${(!isLoading) ? "hidden" : ""}`} />
                                                    Save Changes
                                                </Button>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })
                            }
                        </Accordion>
                    </TabsContent>
                </div>
            </Tabs>

            {/* Application Details Modal */}
            <Dialog open={selectedApplication !== null} onOpenChange={(open) => !open && setSelectedApplication(null)}>
                <DialogContent className="!max-w-[95vw] !w-[95vw] !h-[95vh] p-0 flex gap-0">

                    {/* Left Sidebar: Application Information */}
                    <div className="w-96 bg-muted/20 border-r p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
                        <div>
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg">{selectedApplication?.name}</h3>
                                <div className="flex gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => navigateApplicant('prev')}
                                        disabled={currentNavIndex <= 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => navigateApplicant('next')}
                                        disabled={currentNavIndex === -1 || currentNavIndex >= reviewableApps.length - 1}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">Application Information</p>
                        </div>

                        {/* Application Details */}
                        <div className="flex flex-col gap-4">
                            {/* Social Links */}
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => selectedApplication?.email && (window.location.href = `mailto:${selectedApplication.email}`)}
                                    disabled={!selectedApplication?.email}
                                >
                                    Email
                                    <MailIcon className="ml-1 h-3 w-3" />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => selectedApplication?.profile?.linkedinUrl && window.open(selectedApplication.profile.linkedinUrl, '_blank')}
                                    disabled={!selectedApplication?.profile?.linkedinUrl}
                                >
                                    LinkedIn
                                    <ExternalLinkIcon className="ml-1 h-3 w-3" />
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => selectedApplication?.profile?.githubUrl && window.open(selectedApplication.profile.githubUrl, '_blank')}
                                    disabled={!selectedApplication?.profile?.githubUrl}
                                >
                                    GitHub
                                    <ExternalLinkIcon className="ml-1 h-3 w-3" />
                                </Button>
                            </div>

                            {/* App Dev History */}
                            {selectedApplication?.appDevInternalPk && (
                                <Alert className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
                                    <AlertTriangleIcon />
                                    <AlertTitle>App Dev History</AlertTitle>
                                    <AlertDescription>
                                        <p>
                                            {selectedApplication?.name.split(" ")[0]} is already in App Dev. To view more about their team history and their internal profile, please <NavLink to={`/org/people/${selectedApplication?.appDevInternalPk}`} className="font-medium hover:underline underline-offset-4">click here</NavLink>.
                                        </p>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Subteam Preferences */}
                            <div>
                                <h4 className="text-md text-muted-foreground mb-2">Roles in Order of Preference</h4>
                                <div className="flex flex-col gap-2">
                                    {selectedApplication?.rolePreferences?.map((pref, idx) => {
                                        return (
                                            <div key={idx} className="bg-muted/50 p-2 rounded border border-border">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">#{idx + 1}</span>
                                                    <span className="text-xs font-medium text-foreground">{pref.role}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Instagram Follow */}
                            <div>
                                <h4 className="text-md text-muted-foreground mb-2">Basic Information</h4>
                                {selectedApplication?.profile?.instagramFollow && (
                                    <div className="bg-muted/50 p-3 rounded">
                                        <p className="text-sm font-medium mb-1">Do you follow App Dev on Instagram?</p>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedApplication.profile.instagramFollow}</p>
                                    </div>
                                )}
                            </div>

                            {/* Why AppDev */}
                            {selectedApplication?.profile?.whyAppDev && (
                                <div className="bg-muted/50 p-3 rounded">
                                    <p className="text-sm font-medium mb-1">Why are you interested in joining App Dev?</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedApplication.profile.whyAppDev}</p>
                                </div>
                            )}

                            {/* Additional Info */}
                            {selectedApplication?.profile?.additionalInfo && (
                                <div>
                                    <div className="bg-muted/50 p-3 rounded">
                                        <p className="text-sm font-medium mb-1">Is there something else you'd like to tell us?</p>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedApplication.profile.additionalInfo}</p>
                                    </div>
                                </div>
                            )}

                            {/* Role Specific Responses */}
                            {selectedApplication?.responses && Object.keys(selectedApplication.responses).length > 0 && (
                                <div>
                                    <h4 className="text-md text-muted-foreground mb-4">Role Specific Responses</h4>
                                    <div className="space-y-3">
                                        {Object.entries(selectedApplication.responses).map(([question, answer]) => (
                                            <div key={question} className="bg-muted/50 p-3 rounded">
                                                <p className="text-sm font-medium mb-1">{question}</p>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{answer as string}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Application Stage History */}
                            <div>
                                <h4 className="text-md text-muted-foreground mb-4">Stage History</h4>
                                <Timeline size="sm">
                                    {selectedApplication?.stageHistory?.slice().map((history, index) => (
                                        <TimelineItem
                                            key={index}
                                            date={new Date(history.changedAt).toLocaleString()}
                                            title={history.stage}
                                            icon={getTimelineStageIcon(history.stage)}
                                            iconColor={STAGE_STYLES[history.stage]}
                                            description={`Changed by ${history.changedBy || 'System'}`}
                                        />
                                    ))}
                                </Timeline>
                            </div>
                        </div>
                    </div>

                    {/* Right Content: Application Details */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="h-full flex flex-col gap-6 pt-2">
                            {/* Stage Movement Controls */}
                            <p className="text-lg text-muted-foreground leading-0">Move to Stage</p>
                            <div className="flex flex-wrap -space-x-px">
                                {stages.map((stage) => (
                                    <Button
                                        key={stage.id}
                                        variant={selectedApplication?.column === stage.id ? "ghost" : "outline"}
                                        size="sm"
                                        className={cn(
                                            "rounded-none first:rounded-l-md last:rounded-r-md transition-all",
                                            selectedApplication?.column === stage.id ?
                                                "bg-primary/10 text-primary border border-primary z-10 disabled:opacity-100 font-medium" :
                                                "text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-100"
                                        )}
                                        onClick={() => selectedApplication && initiateStageUpdate(selectedApplication.id, selectedApplication.column, stage.id)}
                                        disabled={!selectedApplication || selectedApplication.column === stage.id || !validateTransition(selectedApplication.column, stage.id)}
                                    >
                                        {stage.name}
                                    </Button>
                                ))}
                            </div>


                            {/* Other Applications */}
                            <p className="text-lg text-muted-foreground leading-0">Other Applications</p>
                            <div className="flex gap-2 max-w-full overflow-x-auto">
                                {otherApplications.map((app) => (
                                    <div key={app.id} className={`flex gap-6 p-3 rounded-md border text-sm ${app.id === selectedApplication?.id ? 'bg-primary/10 border-primary' : 'bg-background hover:bg-muted/50'}`}>
                                        <div className="flex flex-col leading-[1]">
                                            <p className="font-medium truncate">{app.teamName || 'Unknown Team'}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">Applied {new Date(app.appliedAt).toLocaleDateString()}</p>
                                        </div>

                                        <Badge className={`${STAGE_STYLES[app.stage]} capitalize`} variant="secondary">{app.stage}</Badge>
                                    </div>
                                ))}
                                {otherApplications.length === 0 && <p className="text-sm text-muted-foreground italic">No other applications found.</p>}
                            </div>

                            {/* Applicant Profile Section */}
                            <p className="text-lg text-muted-foreground leading-0">{selectedApplication?.name.split(" ")[0]}'s Resume</p>
                            <iframe
                                src={applicantUrls?.resumeUrl}
                                className="w-full flex-grow-1 border rounded-md"
                                title="Resume"
                            />

                            {/* {selectedApplication.profile.previousInvolvement && (
                                            <div className="col-span-full">
                                                <Label className="text-muted-foreground">Previous Involvement</Label>
                                                <p className="whitespace-pre-wrap text-sm mt-1 bg-muted/50 p-2 rounded">{selectedApplication.profile.previousInvolvement}</p>
                                            </div>
                                        )} */}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* --- Stage Action Dialogs --- */}

            {/* 1. Reject Dialog */}
            <Dialog open={actionDialog === 'reject'} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Rejection</DialogTitle>
                        <DialogDescription>
                            Rejecting an applicant sends a formal email to them. If you're sure they don't meet App Dev expectations or if they can't be accomodated in your team, confirm this action.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={cancelStageUpdate}>Cancel</Button>
                        <Button variant="destructive" onClick={() => pendingTransition && executeStageUpdate(pendingTransition.applicationId, pendingTransition.newStage)}>
                            Reject {applications.find(a => a.id === pendingTransition?.applicationId)?.name.split(" ")[0]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 2. Interview Dialog */}
            <Dialog open={actionDialog === 'interview'} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Schedule an Interview</DialogTitle>
                        <DialogDescription>
                            Yay! We're happy that {applications.find(a => a.id === pendingTransition?.applicationId)?.name.split(" ")[0]} meets our initial expectations. Please provide a Google Calendar link for your availability and we'll email them.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Input
                            placeholder="https://calendar.google.com/..."
                            value={interviewLink}
                            onChange={(e) => setInterviewLink(e.target.value)}
                        />
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="save-link"
                                checked={saveInteviewLink}
                                onCheckedChange={(c) => setSaveInterviewLink(!!c)}
                            />
                            <Label htmlFor="save-link">Use the same link for future invites?</Label>
                        </div>

                        <div className="space-y-2">
                            <Label>Interview Guidelines</Label>
                            <Textarea
                                placeholder="Please provide specific guidelines for the interview..."
                                value={interviewGuidelines}
                                onChange={(e) => setInterviewGuidelines(e.target.value)}
                                className="min-h-[100px]"
                            />
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Min 50, Max 500 characters</span>
                                <span className={cn(
                                    (interviewGuidelines.length < 50 || interviewGuidelines.length > 500) ? "text-destructive" : "text-green-600"
                                )}>
                                    {interviewGuidelines.length} characters
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="save-guidelines"
                                checked={saveInterviewGuidelines}
                                onCheckedChange={(c) => setSaveInterviewGuidelines(!!c)}
                            />
                            <Label htmlFor="save-guidelines">Save guidelines for future invites?</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={cancelStageUpdate}>Cancel</Button>
                        <Button
                            disabled={!interviewLink || interviewGuidelines.length < 50 || interviewGuidelines.length > 500}
                            onClick={() => pendingTransition && executeStageUpdate(pendingTransition.applicationId, pendingTransition.newStage, { interviewLink, interviewGuidelines })}
                        >
                            Invite {applications.find(a => a.id === pendingTransition?.applicationId)?.name.split(" ")[0]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 3. Potential Hire Dialog */}
            <Dialog open={actionDialog === 'potential'} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Move to Potential Hire?</DialogTitle>
                        <DialogDescription>
                            We'll send {applications.find(a => a.id === pendingTransition?.applicationId)?.name.split(" ")[0]} an email to inform they've passed the interview and are on hold considering space availability.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={cancelStageUpdate}>Cancel</Button>
                        <Button onClick={() => pendingTransition && executeStageUpdate(pendingTransition.applicationId, pendingTransition.newStage)}>
                            Move {applications.find(a => a.id === pendingTransition?.applicationId)?.name.split(" ")[0]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 4. Hired Dialog */}
            <Dialog open={actionDialog === 'hired'} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm {applications.find(a => a.id === pendingTransition?.applicationId)?.name.split(" ")[0]}'s Position</DialogTitle>
                        <DialogDescription>
                            We're excited that {applications.find(a => a.id === pendingTransition?.applicationId)?.name.split(" ")[0]} meets App Dev's talent bar. We'll send them a unique onboarding link to officially join the team.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label className="mb-2 block">Please choose the role that you'd like to recruit them for.</Label>
                        <Select value={hiredRole} onValueChange={setHiredRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                                {applications.find(a => a.id === pendingTransition?.applicationId)?.rolePreferences?.map(pref => (
                                    <SelectItem key={pref.role} value={pref.role}>{pref.role}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={cancelStageUpdate}>Cancel</Button>
                        <Button disabled={!hiredRole} onClick={() => {
                            if (!pendingTransition) return;
                            const app = applications.find(a => a.id === pendingTransition?.applicationId);
                            const targetPref = app?.rolePreferences.find(p => p.role === hiredRole);
                            const targetSubteamPk = targetPref?.subteamPk || "";

                            executeStageUpdate(
                                pendingTransition.applicationId,
                                pendingTransition.newStage,
                                { hiredRole, hiredSubteamPk: targetSubteamPk }
                            );
                        }}>
                            Onboard {applications.find(a => a.id === pendingTransition?.applicationId)?.name.split(" ")[0]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}