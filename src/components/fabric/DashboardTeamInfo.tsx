import { Check, ChevronsUpDown, KeyRoundIcon, Loader2Icon, SearchIcon, User2Icon, UserPlus2Icon } from "lucide-react"
import { Button } from "../ui/button"
import React from "react";
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config";
import { useParams } from "react-router-dom";
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

interface TeamInfoResponse {
    team: TeamInfo,
    subteams: TeamInfo[]
}

interface TeamInfo {
    pk: string,
    name: string,
    users: UserInformationBrief[],
    attributes: {
        friendlyName: string,
        teamType: string,
        seasonType: string,
        seasonYear: number,
    }
}

export const DashboardTeamInfo = () => {
    const params = useParams()
    const [teamInfo, setTeamInfo] = React.useState<TeamInfo>();
    const [subTeams, setSubTeams] = React.useState<TeamInfo[]>([]);
    const [addMembersOpen, setAddMembersOpen] = React.useState(false);

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

    return (
        <div className="flex flex-col m-2">
            <AddTeamMembersDialog open={addMembersOpen} openChanged={setAddMembersOpen} subteams={subTeams} />

            <div className="flex items-center">
                <div className="flex flex-col flex-grow-1">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">{teamInfo?.attributes.friendlyName}</h1>
                    <h4 className="text-xl text-muted-foreground">{`${teamInfo?.attributes.seasonType} ${teamInfo?.attributes.seasonYear}`}</h4>
                </div>

                <Button className="cursor-pointer" onClick={() => { setAddMembersOpen(true) }}>
                    <UserPlus2Icon />
                    Add Members
                </Button>
            </div>

            <Tabs className="mt-5" defaultValue="owner">
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
    const [roleTitle, setRoleTitle] = React.useState("")

    React.useEffect(() => {
        setIsFormComplete(selectedSubTeam !== undefined &&
            !!roleTitle.trim() &&
            (
                currentTab === "existing"
                    ? !!selectedExistingMember
                    : !!inviteEmailAddress.trim()
            ))
    }, [
        selectedSubTeam, selectedExistingMember, 
        currentTab, roleTitle
    ])

    const handleMemberAdd = async () => {
        if (!selectedSubTeam || !selectedExistingMember)
            return

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
        })
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
                                <Label className="mt-2">Candidate Email Address</Label>
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
                                                let teamDisplayName = team.name
                                                let teamDisplayDesc = "Non-standard Group"

                                                const subteamFriendlyName = team.attributes.friendlyName
                                                if (subteamFriendlyName.endsWith("Engr")) {
                                                    teamDisplayName = "Engineering Team (UI/UX, PMs, SWEs, etc.)"
                                                    teamDisplayDesc = team.name
                                                }

                                                else if (subteamFriendlyName.endsWith("Lead")) {
                                                    teamDisplayName = "Project Leadership (Project and Tech Leads)"
                                                    teamDisplayDesc = team.name
                                                }

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