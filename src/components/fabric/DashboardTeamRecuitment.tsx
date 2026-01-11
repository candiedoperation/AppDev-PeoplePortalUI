import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config";
import React from "react";
import { toast } from "sonner";
import type { TeamInfo, TeamInfoResponse } from "./DashboardTeamInfo";
import { RecruitmentStatistics } from "./RecruitmentStatistics";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { TagInput, type Tag } from 'emblor-maintained';
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2Icon, ExternalLinkIcon } from "lucide-react";
import { KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider } from "../ui/shadcn-io/kanban";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";

const KANBAN_COLUMNS = [
    { id: "applied", name: "New Applicants" },
    { id: "accepted", name: "Accepted" },
    { id: "interviewing", name: "Interviewing" },
    { id: "rejected", name: "Rejected" },
]

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
    rolePreferences: string[];  // Ordered role preferences
    hiredSubteamPk?: string;
    hiredRole?: string;
    appliedAt: string;
    [key: string]: unknown;  // Index signature for Kanban compatibility
}

export const DashboardTeamRecruitment = () => {
    const STAGE_STYLES: { [key: string]: string } = {
        'applied': 'text-blue-700 bg-blue-50 border-blue-200',
        'interviewing': 'text-purple-700 bg-purple-50 border-purple-200',
        'accepted': 'text-green-700 bg-green-50 border-green-200',
        'rejected': 'text-red-700 bg-red-50 border-red-200',
    }
    const params = useParams()
    const [teamInfo, setTeamInfo] = React.useState<TeamInfo>();
    const [subTeams, setSubTeams] = React.useState<TeamInfo[]>([]);

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

    function handleDragStart(event: DragStartEvent) {
        const item = applications.find(a => a.id === event.active.id);
        if (item) setDragStartColumn(item.column);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        const activeId = active.id;
        if (!over) {
            setDragStartColumn(null);
            return;
        }

        // Determine the new column
        // We use the same logic as KanbanProvider to guess where it landed
        // But simpler: checking if over.id is a column or an item in a column



        // If overContainer corresponds to a column ID, use it.
        // But dnd-kit is flexible.

        // Let's rely on checking the item in the 'applications' state
        // Since 'onDataChange' runs during drag, the item might already be in the new column in the state.

        // However, safe approach:
        // Find the application in the *latest* applications state
        const app = applications.find(a => a.id === activeId);

        if (app && app.column !== dragStartColumn) {
            // It changed column!
            // Trigger API update
            // Optimistic update is already done by onDataChange

            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/ats/applications/${activeId}/stage`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ column: app.column })
            })
                .then(res => {
                    if (res.ok) {
                        toast.success("Stage Updated", { description: `Moved ${app.name} to ${KANBAN_COLUMNS.find(c => c.id === app.column)?.name}` })
                    } else {
                        toast.error("Failed to Update Stage");
                        // Revert? (Complex, maybe just reload data)
                    }
                })
                .catch(err => {
                    console.error(err);
                    toast.error("Failed to Update Stage");
                })
        }

        setDragStartColumn(null);
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
                            columns={KANBAN_COLUMNS}
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
                                                                {appItem.rolePreferences && appItem.rolePreferences.map((role, idx) => (
                                                                    <span key={idx} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                                        {role}
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
                            <h3 className="font-semibold text-lg">{selectedApplication?.name}</h3>
                            <p className="text-sm text-muted-foreground">Application Information</p>
                        </div>

                        {/* Application Details */}
                        <div className="flex flex-col gap-4">
                            {/* Social Links */}
                            <div className="flex gap-2">
                                {selectedApplication?.profile?.linkedinUrl && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => window.open(selectedApplication.profile.linkedinUrl, '_blank')}
                                    >
                                        LinkedIn
                                        <ExternalLinkIcon className="ml-1 h-3 w-3" />
                                    </Button>
                                )}

                                {selectedApplication?.profile?.githubUrl && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => window.open(selectedApplication.profile.githubUrl, '_blank')}
                                    >
                                        GitHub
                                        <ExternalLinkIcon className="ml-1 h-3 w-3" />
                                    </Button>
                                )}
                            </div>

                            {/* Subteam Preferences */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Roles in Order of Preference</h4>
                                <div className="flex flex-col gap-2">
                                    {selectedApplication?.rolePreferences?.map((role, idx) => {
                                        return (
                                            <div key={idx} className="bg-muted/50 p-2 rounded border border-border">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">#{idx + 1}</span>
                                                    <span className="text-xs font-medium text-foreground">{role}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Show hired decision if made */}
                                {selectedApplication?.hiredSubteamPk && (
                                    <div className="mt-3 bg-green-50 border border-green-200 p-2 rounded">
                                        <span className="text-xs font-semibold text-green-700">
                                            Hired: {selectedApplication.hiredRole} ({subTeams.find(s => s.pk === selectedApplication.hiredSubteamPk)?.attributes.friendlyName})
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Why AppDev */}
                            {selectedApplication?.profile?.whyAppDev && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Why AppDev?</h4>
                                    <p className="whitespace-pre-wrap text-sm bg-muted/50 p-2 rounded leading-relaxed">{selectedApplication.profile.whyAppDev}</p>
                                </div>
                            )}

                            {/* Additional Info */}
                            {selectedApplication?.profile?.additionalInfo && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Additional Info</h4>
                                    <p className="whitespace-pre-wrap text-sm bg-muted/50 p-2 rounded leading-relaxed">{selectedApplication.profile.additionalInfo}</p>
                                </div>
                            )}

                            {/* Instagram Follow */}
                            {selectedApplication?.profile?.instagramFollow && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Instagram Follow</h4>
                                    <p className="text-sm bg-muted/50 p-2 rounded">{selectedApplication.profile.instagramFollow}</p>
                                </div>
                            )}

                            {/* Role Specific Responses */}
                            {selectedApplication?.responses && Object.keys(selectedApplication.responses).length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Role Specific Responses</h4>
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
                        </div>


                        {/* <div className="flex gap-2">
                            {otherApplications.map((app) => (
                                <div key={app.id} className={`p-3 rounded-md border text-sm ${app.id === selectedApplication?.id ? 'bg-primary/10 border-primary' : 'bg-background hover:bg-muted/50'}`}>
                                    <p className="font-medium truncate">
                                        {app.parentTeamName && <span className="text-muted-foreground">{app.parentTeamName} - </span>}
                                        {app.subteamName}
                                    </p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${STAGE_STYLES[app.stage] || 'text-muted-foreground bg-muted border-border'}`}>
                                            {app.stage}
                                        </span>
                                        {app.id === selectedApplication?.id && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Current</span>}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(app.appliedAt).toLocaleDateString()}</p>
                                </div>
                            ))}
                            {otherApplications.length === 0 && <p className="text-sm text-muted-foreground italic">No other applications found.</p>}
                        </div> */}
                    </div>

                    {/* Right Content: Application Details */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="flex flex-col gap-6 mt-6">
                            {/* Other Applications */}
                            <p className="text-lg text-muted-foreground leading-0">Other Applications</p>
                            <div className="flex gap-2 max-w-full overflow-x-auto">
                                {otherApplications.map((app) => (
                                    <div key={app.id} className={`p-3 rounded-md border text-sm ${app.id === selectedApplication?.id ? 'bg-primary/10 border-primary' : 'bg-background hover:bg-muted/50'}`}>
                                        <p className="font-medium truncate">
                                            {app.teamName || 'Unknown Team'}
                                        </p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${STAGE_STYLES[app.stage] || 'text-muted-foreground bg-muted border-border'}`}>
                                                {app.stage}
                                            </span>
                                            {app.id === selectedApplication?.id && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Current</span>}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(app.appliedAt).toLocaleDateString()}</p>
                                    </div>
                                ))}
                                {otherApplications.length === 0 && <p className="text-sm text-muted-foreground italic">No other applications found.</p>}
                            </div>

                            {/* Applicant Profile Section */}
                            <p className="text-lg text-muted-foreground leading-0 mt-2">{selectedApplication?.name.split(" ")[0]}'s Resume</p>
                            <iframe
                                src={applicantUrls?.resumeUrl}
                                className="w-full min-h-[600px] border rounded-md"
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
        </div>
    )
}