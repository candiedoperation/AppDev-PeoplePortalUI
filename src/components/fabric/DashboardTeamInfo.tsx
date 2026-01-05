import { Check, ChevronsUpDown, ExternalLinkIcon, KeyRoundIcon, Loader2Icon, NotebookPenIcon, RefreshCcwIcon, SearchIcon, SettingsIcon, TriangleAlertIcon, User2Icon, UserPlus2Icon, Users2Icon, WorkflowIcon } from "lucide-react"
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
    const [settingDefinitions, setSettingDefinitions] = React.useState<RootTeamSettingMap>({});
    const [addMembersOpen, setAddMembersOpen] = React.useState(false);
    const [subteamsOpen, setSubteamsOpen] = React.useState(false);
    const [teamSettingsOpen, setTeamSettingsOpen] = React.useState(false);
    const [isSavingSettings, setIsSavingSettings] = React.useState(false);

    const [syncDialogOpen, setSyncDialogOpen] = React.useState(false);
    const [syncDialogTitle, setSyncDialogTitle] = React.useState("");
    const [syncDialogDescription, setSyncDialogDescription] = React.useState("");
    const [syncDialogProgress, setSyncDialogProgress] = React.useState(0);
    const [syncDialogStatus, setSyncDialogStatus] = React.useState("");



    React.useEffect(() => {
        // Fetch team info and settings definitions in parallel
        Promise.all([
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}`).then(r => r.json()),
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teamsettings`).then(r => r.json())
        ])
            .then(([teamlistResponse, definitions]) => {
                setTeamInfo(teamlistResponse.team)
                setSubTeams(teamlistResponse.subteams)
                setSettingDefinitions(definitions)
            })
            .catch((e) => {
                toast.error("Failed to Fetch Team Information: " + e.message)
            })
    }, []);

    function syncBindles() {
        /* Reset State and Open Sync Dialog */
        setSyncDialogProgress(0)
        setSyncDialogStatus("Connecting to Server...")
        setSyncDialogTitle("Syncing Shared Permissions")
        setSyncDialogDescription("Please wait while the permissions propagate across Shared Resources")
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

    function saveTeamSettings(settings: { [clientName: string]: { [settingKey: string]: boolean } }) {
        setIsSavingSettings(true);

        // Optimistically update local state
        setTeamInfo(prevTeamInfo => {
            if (!prevTeamInfo) return prevTeamInfo;
            return {
                ...prevTeamInfo,
                attributes: {
                    ...prevTeamInfo.attributes,
                    rootTeamSettings: settings
                }
            };
        });

        // Save to server
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}/updateconf`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings)
        }).then(async response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            toast.success("Team settings saved successfully!")
            // Close the dialog on successful save
            setTeamSettingsOpen(false);
        }).catch(e => {
            toast.error(`Failed to save settings: ${e.message}`)
            // Revert optimistic update on error by refetching
            fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}`)
                .then(async (response) => {
                    const teamlistResponse: TeamInfoResponse = await response.json()
                    setTeamInfo(teamlistResponse.team)
                })
        }).finally(() => {
            setIsSavingSettings(false);
        });
    }

    function generateAWSMagicLink() {
        setSyncDialogProgress(0)
        setSyncDialogStatus("Connecting to Server...")
        setSyncDialogTitle("Preparing AWS Console Session")
        setSyncDialogDescription("Please wait while a new AWS Console session is created. You'll be redirected automatically.")
        setSyncDialogOpen(true)

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${params.teamId}/awsaccess`)
            .then(async response => {
                if (!response.body) return console.error("no body");

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const textChunk = decoder.decode(value, { stream: true });
                    const updates: any[] = [];

                    try {
                        updates.push(JSON.parse(textChunk));
                    } catch {
                        (textChunk.match(/\{.*?\}/g) || []).forEach(m => {
                            try { updates.push(JSON.parse(m)); } catch { }
                        });
                    }

                    for (const update of updates) {
                        if (update.error) {
                            toast.error(update.status);
                            setSyncDialogOpen(false);
                            return;
                        }

                        setSyncDialogProgress(update.progressPercent);
                        setSyncDialogStatus(update.status);

                        if (update.link) {
                            setSyncDialogOpen(false);
                            window.open(update.link, "_blank");
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
            <ProgressUpdateDialog open={syncDialogOpen} title={syncDialogTitle} description={syncDialogDescription} status={syncDialogStatus} progressPercent={syncDialogProgress} />
            <SubteamsInfoDialog open={subteamsOpen} openChanged={setSubteamsOpen} subteams={subTeams} />
            <TeamSettingsDialog open={teamSettingsOpen} openChanged={setTeamSettingsOpen} teamInfo={teamInfo} settingDefinitions={settingDefinitions} isSaving={isSavingSettings} onSave={saveTeamSettings} />


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
                        <ExternalLinkIcon />
                        Open AWS Console
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
    const [enabledBindles, setEnabledBindles] = React.useState<{ [key: string]: { [key: string]: boolean } }>({})
    const [isLoadingBindles, setIsLoadingBindles] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);

    const sortedSubteams = React.useMemo(() => {
        return [...props.subteams].sort((a, b) => a.attributes.friendlyName.localeCompare(b.attributes.friendlyName))
    }, [props.subteams])

    React.useEffect(() => {
        if (props.open)
            setCurrentSubTeam(_ => sortedSubteams[0])
    }, [props.open, sortedSubteams])

    React.useEffect(() => {
        if (!currentSubTeam) return;

        setIsLoadingBindles(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${currentSubTeam.pk}/bindles`)
            .then(async (response) => {
                const fetchedBindles = await response.json()
                setEnabledBindles(fetchedBindles)
            })
            .catch((e) => {
                toast.error("Failed to Fetch Team Bindles: " + e.message)
            })
            .finally(() => { setIsLoadingBindles(false) })
    }, [currentSubTeam])

    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/bindles/definitions`)
            .then(async (response) => {
                const fetchedBindleDefinitions = await response.json()
                setBindleDefinitions(_ => (fetchedBindleDefinitions))
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

            case "AppleAccountClient":
                return "Apple Account"

            default:
                return clientName
        }
    }

    function updateSubTeamBindles() {
        if (!currentSubTeam) return

        setIsSaving(true)
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/${currentSubTeam.pk}/bindles`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(enabledBindles)
        }).then(async response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            toast.success(`Bindles updated for ${currentSubTeam.attributes.friendlyName}!`)
        }).catch(e => {
            toast.error(`Failed to update bindles: ${e.message}`)
        }).finally(() => {
            setIsSaving(false);
        });
    }

    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <DialogContent className="min-w-[60%] min-h-[60%] p-0 select-none">
                <div className="flex">
                    <SidebarGroup className="w-[30%] select-none">
                        <SidebarGroupLabel>Subteams and Permissions</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {sortedSubteams.map((subteam) => (
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
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl">{currentSubTeam?.attributes.friendlyName}</h1>
                            {isLoadingBindles && <Loader2Icon className="animate-spin text-muted-foreground" size={20} />}
                        </div>
                        <h3 className="text-muted-foreground">{currentSubTeam?.attributes.description}</h3>

                        <div className="flex flex-col mt-2">
                            {
                                Object.keys(bindleDefinitions).map((sharedResource) => (
                                    <div className="flex flex-col mt-2">
                                        {
                                            Object.keys(bindleDefinitions[sharedResource]).length < 1 ? <></> :
                                                <p className="text-muted-foreground text-sm">{normalizeClientName(sharedResource)}</p>
                                        }

                                        {
                                            Object.keys(bindleDefinitions[sharedResource]).map((bindleEntry) => {
                                                const bindleDefinition = bindleDefinitions[sharedResource][bindleEntry]

                                                return (
                                                    <div className="flex border-1 p-2 rounded-md mt-2 items-center">
                                                        <div className="flex flex-col text-sm flex-grow-1">
                                                            <p>{bindleDefinition.friendlyName}</p>
                                                            <p className="text-muted-foreground text-sm">{bindleDefinition.description}</p>
                                                        </div>

                                                        <Switch
                                                            checked={enabledBindles[sharedResource]?.[bindleEntry] === true}
                                                            onCheckedChange={(checked) => {
                                                                setEnabledBindles(prev => ({
                                                                    ...prev,
                                                                    [sharedResource]: {
                                                                        ...prev[sharedResource],
                                                                        [bindleEntry]: checked
                                                                    }
                                                                }))
                                                            }}
                                                        />
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                ))
                            }
                        </div>

                        <DialogFooter className="absolute bottom-4 right-4 flex gap-2">
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button disabled={isSaving} onClick={updateSubTeamBindles}>
                                <Loader2Icon className={cn("animate-spin", !isSaving ? "hidden" : "")} />
                                Save Changes for {currentSubTeam?.attributes.friendlyName}
                            </Button>
                        </DialogFooter>
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
    settingDefinitions: RootTeamSettingMap,
    isSaving: boolean,
    onSave: (settings: { [clientName: string]: { [settingKey: string]: boolean } }) => void
}) => {
    // Store settings grouped by client name: { "AWSClient": { "awsclient:provision": true } }
    const [changedSettings, setChangedSettings] = React.useState<{ [clientName: string]: { [settingKey: string]: boolean } }>({})

    /* Initialize settings when dialog opens or teamInfo/settingDefinitions change */
    React.useEffect(() => {
        if (!props.open || !props.teamInfo) return;

        const rootTeamSettings = props.teamInfo.attributes.rootTeamSettings || {};

        // Build the initial settings object with all defined settings
        const initialSettings: { [clientName: string]: { [settingKey: string]: boolean } } = {};

        // Iterate through all defined settings and initialize them
        for (const clientName in props.settingDefinitions) {
            initialSettings[clientName] = {};
            for (const settingKey in props.settingDefinitions[clientName]) {
                // Get the value from existing settings, or default to false
                const existingValue = rootTeamSettings[clientName]?.[settingKey];
                initialSettings[clientName][settingKey] = existingValue ?? false;
            }
        }

        setChangedSettings(initialSettings);
    }, [props.open, props.teamInfo, props.settingDefinitions]);


    function normalizeClientName(clientName: string) {
        switch (clientName) {
            case "AWSClient":
                return "Amazon Web Services"
            default:
                return clientName
        }
    }

    const toggleSetting = (clientName: string, settingKey: string, currentValue: boolean) => {
        setChangedSettings(prev => ({
            ...prev,
            [clientName]: {
                ...prev[clientName],
                [settingKey]: !currentValue
            }
        }))
    }

    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
            <DialogContent className="min-w-lg min-h-[60%] p-0 select-none">
                <div className="flex-grow-1 m-4">
                    <h1 className="text-2xl">Team Settings</h1>
                    <h3 className="text-muted-foreground">Configure Root Team Attributes</h3>

                    <div className="flex flex-col mt-2">
                        {
                            Object.keys(props.settingDefinitions).map((clientName) => (
                                <div key={clientName} className="flex flex-col mt-2">
                                    <p className="text-muted-foreground text-sm">{normalizeClientName(clientName)}</p>
                                    {
                                        Object.keys(props.settingDefinitions[clientName]).map((settingKey) => {
                                            const settingDefinition = props.settingDefinitions[clientName][settingKey]
                                            const isChecked = changedSettings[clientName]?.[settingKey] || false;

                                            return (
                                                <div key={settingKey} className="flex border-1 p-2 rounded-md mt-2 items-center">
                                                    <div className="flex flex-col text-sm flex-grow-1">
                                                        <p>{settingDefinition.friendlyName}</p>
                                                        <p className="text-muted-foreground text-sm">{settingDefinition.description}</p>
                                                    </div>

                                                    <Switch checked={isChecked} onCheckedChange={() => toggleSetting(clientName, settingKey, isChecked)} />
                                                </div>
                                            )
                                        })

                                    }
                                </div>
                            ))
                        }
                    </div>
                    <DialogFooter className="absolute bottom-4 right-4 flex gap-2">
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button disabled={props.isSaving} onClick={() => props.onSave(changedSettings)}>
                            <Loader2Icon className={cn("animate-spin", !props.isSaving ? "hidden" : "")} />
                            Save Changes
                        </Button>
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
