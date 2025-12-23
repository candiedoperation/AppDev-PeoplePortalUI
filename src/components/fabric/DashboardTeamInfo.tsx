import { Check, ChevronsUpDown, KeyRoundIcon, Link2Icon, Loader2Icon, NotebookPenIcon, RefreshCcwIcon, SearchIcon, SettingsIcon, TriangleAlertIcon, User2Icon, UserPlus2Icon, Users2Icon, WorkflowIcon } from "lucide-react"
import { Button } from "../ui/button"
import React from "react";
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import { UserInformationTable, type UserInformationBrief } from "../fragments/UserInformationTable";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { ORGANIZATION_NAME } from "@/commons/strings";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "../ui/command";
import { cn } from "@/lib/utils";
import type { GetUserListResponse } from "./DashboardPeopleList";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { ProgressUpdateDialog } from "../fragments/ProgressUpdateDialog";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";

export interface TeamInfoResponse {
    team: TeamInfo,
    subteams: TeamInfo[]
}

export interface TeamInfo {
    pk: string,
    name: string,
    users: UserInformationBrief[],
    attributes: {
        description: any;
        friendlyName: string,
        teamType: string,
        seasonType: string,
        seasonYear: number,
        rootTeamSettings?: any
    }
}

interface BindleInformation {
    friendlyName: string,
    description: string
}

interface RootTeamSettingInfo {
    friendlyName: string,
    description: string
}

interface BindleDefinitionMap {
    /* Client Name */
    [key: string]: {
        /* Bindle ID */
        [key: string]: BindleInformation
    }
}

interface RootTeamSettingMap {
    /* Client Name */
    [key: string]: {
        /* Setting ID */
        [key: string]: RootTeamSettingInfo
    }
}

export const DashboardTeamInfo = () => {
    const params = useParams()
    const navigate = useNavigate()
    const [teamInfo, setTeamInfo] = React.useState<TeamInfo>();
    const [subTeams, setSubTeams] = React.useState<TeamInfo[]>([]);
    const [addMembersOpen, setAddMembersOpen] = React.useState(false);
    const [subteamsOpen, setSubteamsOpen] = React.useState(false);
    const [teamSettingsOpen, setTeamSettingsOpen] = React.useState(false);

    const [syncDialogOpen, setSyncDialogOpen] = React.useState(false);
    const [syncDialogProgress, setSyncDialogProgress] = React.useState(0);
    const [syncDialogStatus, setSyncDialogStatus] = React.useState("");

    const [magicLinkDialogOpen, setMagicLinkDialogOpen] = React.useState(false);
    const [magicLinkUrl, setMagicLinkUrl] = React.useState("");

    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}`)
            .then(async (response) => {
                const teamlistResponse: TeamInfoResponse = await response.json()
                setTeamInfo(teamlistResponse.team)
                setSubTeams(teamlistResponse.subteams)
            })

            .catch((e) => {
                toast.error("Failed to Fetch Team Information: " + e.message)
            })
    }, []);

    function syncBindles() {
        /* Reset State and Open Sync Dialog */
        setSyncDialogProgress(0)
        setSyncDialogStatus("Connecting to Server...")
        setSyncDialogOpen(true)

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}/syncbindles`, {
            method: "PATCH"
        }).then(async response => {
            if (!response.body) {
                console.error("no body")
                return
            }

            const reader = response.body.getReader();
            let decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;

                const update = JSON.parse(decoder.decode(value, { stream: true }));
                setSyncDialogProgress(update.progressPercent)
                setSyncDialogStatus(update.status)
            }

            /* Sync Completed */
            setSyncDialogOpen(false);
            toast.success(`Shared Permissions Synced for the ${teamInfo?.attributes.friendlyName} team!`)
        }).catch(e => {
            toast.error(`Shared Permissions Sync Failure: ${e.message}`)
        });
    }

    function saveTeamSettings(settings: { [key: string]: boolean }) {
        setSyncDialogProgress(0)
        setSyncDialogStatus("Saving Settings...")
        setSyncDialogOpen(true)
        setTeamSettingsOpen(false)

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}/rootsetting`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings)
        }).then(async response => {
            if (!response.body) {
                console.error("no body")
                return
            }

            const reader = response.body.getReader();
            let decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const textChunk = decoder.decode(value, { stream: true });
                const validJSONs = textChunk.match(/\{.*?\}/g);
                if (validJSONs) {
                    validJSONs.forEach(jsonStr => {
                        try {
                            const update = JSON.parse(jsonStr);
                            if (update.error) {
                                toast.error(update.status);
                            } else {
                                setSyncDialogProgress(update.progressPercent);
                                setSyncDialogStatus(update.status);
                            }
                        } catch (e2) { }
                    });
                }
            }
            setSyncDialogOpen(false);
            toast.success("Team settings saved successfully!")

            // Refresh team info to get latest settings
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}`)
                .then(async (response) => {
                    const teamlistResponse: TeamInfoResponse = await response.json()
                    setTeamInfo(teamlistResponse.team)
                })

        }).catch(e => {
            setSyncDialogOpen(false);
            toast.error(`Failed to save settings: ${e.message}`)
        });
    }

    function generateAWSMagicLink() {
        setSyncDialogProgress(0)
        setSyncDialogStatus("Connecting to Server...")
        setSyncDialogOpen(true)

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}/awsaccess`)
            .then(async response => {
                if (!response.body) {
                    console.error("no body")
                    return
                }

                const reader = response.body.getReader();
                let decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const textChunk = decoder.decode(value, { stream: true });


                    // Or simplified parsing if we assume well-formed or simple approach
                    // Actually the standard way is to buffer, but for this simple case:
                    // We'll try to parse the last valid JSON

                    try {
                        const update = JSON.parse(textChunk);
                        if (update.error) {
                            toast.error(update.status);
                            setSyncDialogOpen(false);
                            return;
                        }

                        setSyncDialogProgress(update.progressPercent);
                        setSyncDialogStatus(update.status);

                        if (update.link) {
                            setMagicLinkUrl(update.link);
                            setSyncDialogOpen(false);
                            setMagicLinkDialogOpen(true);
                        }
                    } catch (e) {
                        // split by objects if stuck together
                        const validJSONs = textChunk.match(/\{.*?\}/g);
                        if (validJSONs) {
                            validJSONs.forEach(jsonStr => {
                                try {
                                    const update = JSON.parse(jsonStr);
                                    if (update.error) {
                                        toast.error(update.status);
                                        // Don't return here as loop continues, but maybe break?
                                    } else {
                                        setSyncDialogProgress(update.progressPercent);
                                        setSyncDialogStatus(update.status);
                                        if (update.link) {
                                            setMagicLinkUrl(update.link);
                                            setSyncDialogOpen(false);
                                            setMagicLinkDialogOpen(true);
                                        }
                                    }
                                } catch (e2) { }
                            });
                        }
                    }
                }
            }).catch(e => {
                setSyncDialogOpen(false);
                toast.error(`Failed to generate magic link: ${e.message}`)
            });
    }

    return (
        <div className="flex flex-col m-2">
            <AddTeamMembersDialog open={addMembersOpen} openChanged={setAddMembersOpen} subteams={subTeams} />
            <ProgressUpdateDialog open={syncDialogOpen} title="Syncing Shared Permissions" description="Please wait while the permissions propagate across Shared Resources" status={syncDialogStatus} progressPercent={syncDialogProgress} />
            <SubteamsInfoDialog open={subteamsOpen} openChanged={setSubteamsOpen} subteams={subTeams} />
            <TeamSettingsDialog open={teamSettingsOpen} openChanged={setTeamSettingsOpen} teamInfo={teamInfo} onSave={saveTeamSettings} />
            <MagicLinkDialog open={magicLinkDialogOpen} openChanged={setMagicLinkDialogOpen} url={magicLinkUrl} />

            <div className="flex items-center">
                <div className="flex flex-col flex-grow-1">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">{teamInfo?.attributes.friendlyName} <span className="text-2xl ml-1 text-muted-foreground">{`${teamInfo?.attributes.seasonType} ${teamInfo?.attributes.seasonYear}`}</span></h1>
                    <h4 className="text-xl text-muted-foreground">{teamInfo?.attributes.description}</h4>
                </div>

                <Button className="cursor-pointer" onClick={() => { setAddMembersOpen(true) }}>
                    <UserPlus2Icon />
                    Add Members
                </Button>
            </div>

            <div className="mt-3">
                <h3 className="text-lg">Manage Your Team</h3>
                <div className="flex gap-2 mt-2">
                    <Button onClick={() => navigate("./recruitment")} variant="outline" className="cursor-pointer">
                        <NotebookPenIcon />
                        Recruitment
                    </Button>

                    <Button onClick={() => setSubteamsOpen(true)} variant="outline" className="cursor-pointer">
                        <WorkflowIcon />
                        Manage Subteams
                    </Button>

                    <Button onClick={syncBindles} variant="outline" className="cursor-pointer">
                        <RefreshCcwIcon />
                        Sync Shared Permissions
                    </Button>

                    <Button onClick={() => setTeamSettingsOpen(true)} variant="outline" className="cursor-pointer">
                        <SettingsIcon />
                        Team Settings
                    </Button>
                </div>
            </div>

            <div className="mt-3">
                <h3 className="text-lg">Team Resources</h3>
                <div className="flex gap-2 mt-2">
                    <Button onClick={generateAWSMagicLink} variant="outline" className="cursor-pointer">
                        <Link2Icon />
                        Generate AWS Magic Link
                    </Button>
                </div>
            </div>


            <Tabs className="mt-5" defaultValue="owner">
                <h3 className="text-lg">Who's on my Team?</h3>
                <TabsList>
                    <TabsTrigger value="owner">Team Owners</TabsTrigger>
                    {
                        subTeams?.map((subteam) => {
                            let tabName = subteam.attributes.friendlyName;
                            if (tabName.endsWith("Engr"))
                                tabName = "Engineering Team"

                            else if (tabName.endsWith("Lead"))
                                tabName = "Project Leadership"

                            return (<TabsTrigger value={subteam.name}>{tabName}</TabsTrigger>)
                        })
                    }
                </TabsList>

                <div className="">
                    <TabsContent value="owner">
                        <UserInformationTable users={teamInfo?.users ?? []} />
                    </TabsContent>

                    {
                        subTeams?.map((subteam) => (
                            <TabsContent value={subteam.name}>
                                <UserInformationTable users={subteam.users ?? []} />
                            </TabsContent>
                        ))
                    }
                </div>
            </Tabs>
        </div>
    )
}

const AddTeamMembersDialog = (props: { subteams: TeamInfo[], open: boolean, openChanged: (open: boolean, refresh?: boolean) => void }) => {
    const [currentTab, setCurrentTab] = React.useState("")
    const [selectedSubTeam, setSelectedSubTeam] = React.useState<TeamInfo>()
    const [selectedExistingMember, setSelectedExistingMember] = React.useState<UserInformationBrief>()
    const [subTeamSelectionOpen, setSubTeamSelectionOpen] = React.useState(false)

    const [isLoading, setIsLoading] = React.useState(false);
    const [isFormComplete, setIsFormComplete] = React.useState(false)
    const [inviteEmailAddress, setInviteEmailAddress] = React.useState("")
    const [inviteName, setInviteName] = React.useState("")
    const [roleTitle, setRoleTitle] = React.useState("")

    React.useEffect(() => {
        setIsFormComplete(selectedSubTeam !== undefined &&
            !!roleTitle.trim() &&
            (
                currentTab === "existing"
                    ? !!selectedExistingMember
                    : !!inviteEmailAddress.trim() && !!inviteName.trim()
            ))
    }, [
        selectedSubTeam, selectedExistingMember,
        currentTab, roleTitle, inviteEmailAddress, inviteName
    ])

    const handleMemberAdd = async () => {
        if (currentTab == "existing") {
            if (!selectedSubTeam || !selectedExistingMember)
                return

            setIsLoading(true)
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${selectedSubTeam.pk}/addmember`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userPk: selectedExistingMember.pk })
            }).then((_res) => {
                toast.success(`Added ${selectedExistingMember.name} to your team!`)
                props.openChanged(false, true)
            }).catch((err) => {
                toast.error(`Failed to add ${selectedExistingMember.name} to your team! Error: ${err.message}`)
                props.openChanged(false)
            }).finally(() => { setIsLoading(false) })
        } else if (currentTab == "invite") {
            if (!selectedSubTeam)
                return

            setIsLoading(true)
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/invites/new`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inviteName,
                    inviteEmail: inviteEmailAddress,
                    roleTitle,
                    teamPk: selectedSubTeam.pk,
                    inviterPk: 7 /* Fix this!! */
                })
            }).then((_res) => {
                toast.success(`Invite for ${inviteName} sent to ${inviteEmailAddress}!`)
                props.openChanged(false, true)
            }).catch((err) => {
                toast.error(`Failed to send invite to ${inviteEmailAddress}! Error: ${err.message}`)
                props.openChanged(false)
            }).finally(() => { setIsLoading(false) })
        }
    }

    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <form>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>
                            Yay! We're happy that you're growing your team, thanks for helping the {ORGANIZATION_NAME} grow 🥳
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Tabs onValueChange={(e) => { setCurrentTab(e) }} className="w-full" value={currentTab} defaultValue="existing">
                            <TabsList className="w-full">
                                <TabsTrigger value="existing">Existing Members</TabsTrigger>
                                <TabsTrigger value="invite">Invite Member</TabsTrigger>
                            </TabsList>

                            <TabsContent className="flex flex-col gap-2" value="existing">
                                <Label className="mt-2">Member Name</Label>
                                <MembersFilterPopover handleSelect={(val) => setSelectedExistingMember(val)} />
                            </TabsContent>

                            <TabsContent className="flex flex-col gap-2" value="invite">
                                <Alert>
                                    <TriangleAlertIcon />
                                    <AlertTitle>Recruitment Override Warning</AlertTitle>
                                    <AlertDescription>
                                        By directly adding a member, you're bypassing App Dev's standard recruitment procedures. Please use this feature only if
                                        you are entirely sure that this person would be a great fit for the team and that they would align with App Dev's culture and standards.
                                    </AlertDescription>
                                </Alert>

                                <Label className="mt-2">Candidate's Name</Label>
                                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Ex. Atheesh Thirumalairajan" />

                                <Label className="mt-2">Candidate's Email Address</Label>
                                <Input value={inviteEmailAddress} onChange={(e) => setInviteEmailAddress(e.target.value)} placeholder="Ex. atheesh@terpmail.umd.edu" />
                            </TabsContent>
                        </Tabs>


                        <Label className="mt-2">Role Title</Label>
                        <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Ex. Software Engineer" />

                        <Label className="mt-2">Permissions Group</Label>
                        <Popover modal open={subTeamSelectionOpen} onOpenChange={setSubTeamSelectionOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                >
                                    {selectedSubTeam
                                        ? selectedSubTeam.name
                                        : "Select a Permissions Group"}
                                    <ChevronsUpDown className="opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                                <Command>
                                    <CommandList>
                                        <CommandGroup>
                                            {props.subteams.map((team) => {
                                                let teamDisplayName = `${team.attributes.friendlyName} (${team.attributes.description})`
                                                let teamDisplayDesc = team.name

                                                return (
                                                    <CommandItem
                                                        key={team.name}
                                                        value={team.name}
                                                        onSelect={(_) => {
                                                            setSelectedSubTeam(_ => team)
                                                            setSubTeamSelectionOpen(false)
                                                        }}
                                                    >
                                                        <Avatar className="h-8 w-8 rounded-lg">
                                                            <AvatarFallback className="rounded-lg"><KeyRoundIcon size="16" /></AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span>{teamDisplayName}</span>
                                                            <span className="text-muted-foreground">{teamDisplayDesc}</span>
                                                        </div>
                                                        <Check
                                                            className={cn(
                                                                "ml-auto",
                                                                selectedSubTeam?.name === team.name ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                    </CommandItem>
                                                )
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button disabled={!isFormComplete || isLoading} onClick={handleMemberAdd}>
                            <Loader2Icon className={cn("animate-spin", !isLoading ? "hidden" : "")} />
                            {(currentTab == "existing") ? "Add Member" : "Invite Member"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </form>
        </Dialog>
    )
}

const MembersFilterPopover = (props: { handleSelect: (member: UserInformationBrief) => void }) => {
    const [open, setOpen] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState("")
    const [selected, setSelected] = React.useState<UserInformationBrief>();
    const [filteredMembers, setFilteredMembers] = React.useState<UserInformationBrief[]>([])
    const [isLoading, setIsLoading] = React.useState(false);

    const getFilteredMembersList = (search: string) => {
        setSearchValue(search)
        if (search.trim().length < 3)
            return;

        setIsLoading(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/people?search=${search}`)
            .then(async (response) => {
                const userlistResponse: GetUserListResponse = await response.json()
                setFilteredMembers((_members) => userlistResponse.users)
            })
            .catch((e) => {
                toast.error("Failed to Fetch People List: " + e.message)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }

    return (
        <Popover modal open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selected
                        ? selected.name
                        : "Select an Existing Member"}
                    <ChevronsUpDown className="opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CustomPopoverFilterBox isLoading={isLoading} onChange={(e) => getFilteredMembersList(e.target.value)} />
                    <CommandList>
                        <CommandEmpty>{(searchValue.length < 3) ? "Start Typing to Search..." : "No Members Found!"}</CommandEmpty>
                        <CommandGroup>
                            {filteredMembers.map((member) => (
                                <CommandItem
                                    key={member.pk}
                                    value={`${member.name} (${member.username})`}
                                    onSelect={(_) => {
                                        setSelected(_ => member)
                                        props.handleSelect(member)
                                        setOpen(false)
                                    }}
                                >
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src="https://githuwb.com/shadcn.png" alt="@shadcn" />
                                        <AvatarFallback className="rounded-lg"><User2Icon size="16" /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span>{member.name}</span>
                                        <span className="text-muted-foreground">{member.username}</span>
                                    </div>
                                    <Check
                                        className={cn(
                                            "ml-auto",
                                            selected?.username === member.username ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

const SubteamsInfoDialog = (props: {
    open: boolean,
    openChanged: (open: boolean) => void
    subteams: TeamInfo[]
}) => {
    const [currentSubTeam, setCurrentSubTeam] = React.useState<TeamInfo>()
    const [bindleDefinitions, setBindleDefinitions] = React.useState<BindleDefinitionMap>({})

    React.useEffect(() => {
        if (props.open)
            setCurrentSubTeam(_ => props.subteams[0])
    }, [props.open])

    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/bindles/definitions`)
            .then(async (response) => {
                const fetchedBindleDefinitions = await response.json()
                setBindleDefinitions(_ => ({
                    ...fetchedBindleDefinitions,
                    "SlackClient": {
                        "slack:abbc": {
                            friendlyName: "Enable Ass",
                            description: "Enables ur Ass"
                        }
                    }
                }))
            })
            .catch((e) => {
                toast.error("Failed to Bindle Permissions: " + e.message)
            })
    }, [])

    function normalizeClientName(clientName: string) {
        switch (clientName) {
            case "GiteaClient":
                return "Git Permissions"

            case "SlackClient":
                return "Slack Permissions"
        }
    }

    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <DialogContent className="min-w-[60%] min-h-[60%] p-0 select-none">
                <div className="flex">
                    <SidebarGroup className="w-[30%] select-none">
                        <SidebarGroupLabel>Subteams and Permissions</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {props.subteams.map((subteam) => (
                                    <SidebarMenuItem key={subteam.pk}>
                                        <SidebarMenuButton className="cursor-pointer" onClick={() => { setCurrentSubTeam(_ => subteam) }} isActive={currentSubTeam?.pk == subteam.pk} asChild>
                                            <a>
                                                <Users2Icon />
                                                <span>{subteam.attributes.friendlyName}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <Separator orientation="vertical" />
                    <div className="flex-grow-1 m-4">
                        <h1 className="text-2xl">{currentSubTeam?.attributes.friendlyName}</h1>
                        <h3 className="text-muted-foreground">{currentSubTeam?.attributes.description}</h3>

                        <div className="flex flex-col mt-2">
                            {
                                Object.keys(bindleDefinitions).map((sharedResource) => (
                                    <div className="flex flex-col mt-2">
                                        <p className="text-muted-foreground text-sm">{normalizeClientName(sharedResource)}</p>
                                        {
                                            Object.keys(bindleDefinitions[sharedResource]).map((bindleEntry) => {
                                                const bindleDefinition = bindleDefinitions[sharedResource][bindleEntry]

                                                return (
                                                    <div className="flex border-1 p-2 rounded-md mt-2 items-center">
                                                        <div className="flex flex-col text-sm flex-grow-1">
                                                            <p>{bindleDefinition.friendlyName}</p>
                                                            <p className="text-muted-foreground text-sm">{bindleDefinition.description}</p>
                                                        </div>

                                                        <Switch />
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

const TeamSettingsDialog = (props: {
    open: boolean,
    openChanged: (open: boolean) => void,
    teamInfo?: TeamInfo,
    onSave: (settings: { [key: string]: boolean }) => void
}) => {
    const params = useParams()
    const [settingDefinitions, setSettingDefinitions] = React.useState<RootTeamSettingMap>({})
    const [changedSettings, setChangedSettings] = React.useState<{ [key: string]: boolean }>({})
    const [isLoading, setIsLoading] = React.useState(false)

    /* Fetch fresh team settings when dialog opens */
    React.useEffect(() => {
        if (!props.open) return;

        setIsLoading(true)

        /* Fetch setting definitions and team info in parallel */
        Promise.all([
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teamsettings`).then(r => r.json()),
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}`).then(r => r.json())
        ])
            .then(([definitions, teamResponse]) => {
                setSettingDefinitions(definitions)

                /* Initialize changedSettings from fresh data */
                const initialSettings: { [key: string]: boolean } = {};
                const rootTeamSettings = teamResponse.team.attributes.rootTeamSettings || {};
                for (const resourceName in rootTeamSettings) {
                    const settings = rootTeamSettings[resourceName];
                    for (const key in settings) {
                        initialSettings[key] = settings[key];
                    }
                }
                setChangedSettings(initialSettings);
            })
            .catch((e) => {
                toast.error("Failed to fetch settings: " + e.message)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [props.open, params.teamId]);


    function normalizeClientName(clientName: string) {
        switch (clientName) {
            case "AWSClient":
                return "Amazon Web Services"
            default:
                return clientName
        }
    }

    const toggleSetting = (key: string, currentValue: boolean) => {
        setChangedSettings(prev => ({
            ...prev,
            [key]: !currentValue
        }))
    }

    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <DialogContent className="min-w-lg min-h-[60%] p-0 select-none">
                <div className="flex-grow-1 m-4">
                    <h1 className="text-2xl">Team Settings</h1>
                    <h3 className="text-muted-foreground">Configure Root Team Attributes</h3>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center mt-8 gap-3">
                            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground">Loading settings...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col mt-2">
                            {
                                Object.keys(settingDefinitions).map((sharedResource) => (
                                    <div key={sharedResource} className="flex flex-col mt-2">
                                        <p className="text-muted-foreground text-sm">{normalizeClientName(sharedResource)}</p>
                                        {
                                            Object.keys(settingDefinitions[sharedResource]).map((bindleEntry) => {
                                                const settingDefinition = settingDefinitions[sharedResource][bindleEntry]
                                                const isChecked = changedSettings[bindleEntry] || false;

                                                return (
                                                    <div key={bindleEntry} className="flex border-1 p-2 rounded-md mt-2 items-center">
                                                        <div className="flex flex-col text-sm flex-grow-1">
                                                            <p>{settingDefinition.friendlyName}</p>
                                                            <p className="text-muted-foreground text-sm">{settingDefinition.description}</p>
                                                        </div>

                                                        <Switch checked={isChecked} onCheckedChange={() => toggleSetting(bindleEntry, isChecked)} />
                                                    </div>
                                                )
                                            })

                                        }
                                    </div>
                                ))
                            }
                        </div>
                    )}
                    <DialogFooter className="absolute bottom-4 right-4 flex gap-2">
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button disabled={isLoading} onClick={() => props.onSave(changedSettings)}>Save Changes</Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}

const CustomPopoverFilterBox = (props: React.ComponentProps<"input"> & { isLoading?: boolean }) => {
    return (
        <div
            data-slot="command-input-wrapper"
            className="flex h-9 items-center border-b px-3"
        >
            <SearchIcon className="size-4 shrink-0 opacity-50" />
            <Input
                data-slot="command-input"
                className="focus-visible:ring-0 border-none !bg-transparent placeholder:text-muted-foreground flex h-10 w-full rounded-md py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                {...props}
            />

            <Loader2Icon className={`animate-spin ${(!props.isLoading) ? "invisible" : ""}`} />
        </div>
    )
}

const MagicLinkDialog = (props: { open: boolean, openChanged: (open: boolean) => void, url: string }) => {
    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>AWS Magic Link Generated</DialogTitle>
                    <DialogDescription>
                        Use this link to access the AWS Console. This link will expire in 1 hour.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="link" className="sr-only">
                            Link
                        </Label>
                        <Input
                            id="link"
                            defaultValue={props.url}
                            readOnly
                        />
                    </div>
                    <Button type="submit" size="sm" className="px-3" onClick={() => {
                        navigator.clipboard.writeText(props.url)
                        toast.success("Copied to clipboard!")
                    }}>
                        <span className="sr-only">Copy</span>
                        <Link2Icon className="h-4 w-4" />
                    </Button>
                </div>
                <DialogFooter className="sm:justify-start">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={() => window.open(props.url, "_blank")}>
                        Open Console
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}