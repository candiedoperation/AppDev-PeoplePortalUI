import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config";
import React from "react";
import { toast } from "sonner";
import type { TeamInfo, TeamInfoResponse } from "./DashboardTeamInfo";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { TagInput, type Tag } from 'emblor-maintained';
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2Icon } from "lucide-react";

interface SubteamATSConfig {
    roles: string[]
    roleSpecificQuestions: { [key: string]: string[] },
    isRecruiting: boolean
}

export const DashboardTeamRecruitment = () => {
    const params = useParams()
    const [teamInfo, setTeamInfo] = React.useState<TeamInfo>();
    const [subTeams, setSubTeams] = React.useState<TeamInfo[]>([]);

    const [roles, setRoles] = React.useState<{ [key: string]: Tag[] }>({});
    const [tagIndex, setTagIndex] = React.useState<{ [key: string]: number | null }>({});

    const [isLoading, setIsLoading] = React.useState(false);
    const [recruitmentEnabled, setRecruitmentEnabled] = React.useState<{ [key: string]: boolean }>({})
    const [roleSpecQuestions, setRoleSpecQuestions] = React.useState<{ [key: string]: { [key: string]: string[] } }>({})

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
    }, []);

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
        <div className="flex flex-col m-2">
            <div className="flex items-center">
                <div className="flex flex-col flex-grow-1">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">Recruitment Tracker</h1>
                    <h4 className="text-xl text-muted-foreground">{teamInfo?.attributes.friendlyName} {`${teamInfo?.attributes.seasonType} ${teamInfo?.attributes.seasonYear}`}</h4>
                </div>
            </div>

            <Tabs className="mt-5" defaultValue="applications">
                <TabsList>
                    <TabsTrigger value="applications">Applications</TabsTrigger>
                    <TabsTrigger value="settings">Recruitment Settings</TabsTrigger>
                </TabsList>

                <div className="mt-2">
                    <TabsContent value="applications">

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
        </div>
    )
}