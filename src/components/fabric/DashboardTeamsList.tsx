import React, { useRef } from "react"
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { toast } from "sonner"
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable, type ColumnDef, type ColumnFiltersState } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useNavigate } from "react-router-dom";
import { Input } from "../ui/input";
import { AlertTriangleIcon, PlusIcon, UsersRound } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Label } from "../ui/label";
import { ORGANIZATION_NAME } from "@/commons/strings";
import { Tooltip } from "../ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";

export interface PaginationDefinition {

}

export interface GetTeamsListResponse {
    pagination: PaginationDefinition,
    teams: TeamInformationBrief[]
}

export interface TeamInformationBrief {
    pk: string,
    name: string,
    friendlyName: string,
    teamType: string,
    seasonType: string,
    seasonYear: number,
}

export const DashboardTeamsList = () => {
    const navigate = useNavigate()
    const [peopleList, setPeopleList] = React.useState<TeamInformationBrief[]>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [createNewTeamDialogOpen, setCreateNewTeamDialogOpen] = React.useState(false);

    const columns: ColumnDef<TeamInformationBrief>[] = [
        { accessorKey: 'friendlyName', header: "Team Name" },
        { accessorKey: 'description', header: "Description" },
        { accessorKey: 'teamType', header: "Team Vertical" },
        { accessorKey: "name", header: "Shared Resources ID" }
    ]

    const table = useReactTable({
        columns,
        data: peopleList,
        getCoreRowModel: getCoreRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            columnFilters
        }
    })

    const refreshList = () => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams`)
            .then(async (response) => {
                const teamlistResponse: GetTeamsListResponse = await response.json()
                setPeopleList(teamlistResponse.teams)
            })

            .catch((e) => {
                toast.error("Failed to Fetch Teams List: " + e.message)
            })
    }

    React.useEffect(() => {
        refreshList()
    }, []);

    return (
        <div className="flex flex-col w-full h-full">
            { /* Attach Dialogs */}
            <CreateNewTeamDialog 
                open={createNewTeamDialogOpen} 
                openChanged={(open, refresh) => {
                    setCreateNewTeamDialogOpen(open)
                    if (refresh) refreshList()
                }} 
            />

            <div className="flex items-center py-4">
                <Input
                    placeholder="Start Typing to Filter by Name"
                    value={(table.getColumn("friendlyName")?.getFilterValue() as string) ?? ""}
                    className="max-w-md"
                    onChange={(event) =>
                        table.getColumn("friendlyName")?.setFilterValue(event.target.value)
                    }
                />

                <div className="flex-grow-1"></div>
                <Button onClick={() => { setCreateNewTeamDialogOpen((open) => !open) }}><PlusIcon /> Create New Team</Button>
            </div>

            <div className="overflow-hidden rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    onClick={() => { navigate(`/org/teams/${row.original.pk}`) }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {row.getVisibleCells().map((cell) => {
                                        return (<TableCell key={cell.id}>
                                            {
                                                flexRender(
                                                    (() => {
                                                        switch (cell.column.id) {
                                                            case "memberSince": {
                                                                return format(cell.getValue() as string, "PPP")
                                                            }

                                                            case "description": {
                                                                const str = cell.getValue() as string
                                                                if (str && str.length > 20)
                                                                    return `${str.slice(0, 20)}...`

                                                                return str
                                                            }

                                                            case "friendlyName": {
                                                                return (
                                                                    <div className="flex items-center">
                                                                        <Avatar className="h-8 w-8 rounded-lg">
                                                                            <AvatarImage />
                                                                            <AvatarFallback className="rounded-lg"><UsersRound size="16" /></AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="flex flex-col ml-2">
                                                                            <span>{cell.getValue() as string}</span>
                                                                            <span className="text-muted-foreground">{`${row.original.seasonType} ${row.original.seasonYear}`}</span>
                                                                        </div>
                                                                    </div>)
                                                            }

                                                            default:
                                                                return cell.column.columnDef.cell;
                                                        }
                                                    })(),
                                                    cell.getContext())
                                            }
                                        </TableCell>)
                                    })}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

interface CreateNewTeamDialogProps {
    open?: boolean,
    openChanged(open: boolean, refresh?: boolean): void
}

const CreateNewTeamDialog = (props: CreateNewTeamDialogProps) => {
    const submitURL = `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams/create`
    const [teamName, setTeamName] = React.useState("")
    const [teamDescription, setTeamDescription] = React.useState("")
    const [teamSeason, setTeamSeason] = React.useState<string>()
    const [teamType, setTeamType] = React.useState("");
    const [teamYear] = React.useState<number>(new Date().getFullYear())
    const [projectLeadConfirmed, setProjectLeadConfirmed] = React.useState(false)

    const handleFormSubmit = () => {
        fetch(submitURL, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                friendlyName: teamName,
                teamType: teamType,
                seasonYear: teamYear,
                seasonType: teamSeason,
                description: teamDescription
            })
        }).then((_res) => {
            toast.success(`New ${teamType.toLowerCase()} team for ${teamName} (${teamSeason} ${teamYear}) successfully created!`)
            props.openChanged(false, true)
        }).catch((err) => {
            toast.error(`Group Creation Failed! Error: ${err.message}`)
            props.openChanged(false)
        })
    }

    return (
        <Dialog open={props.open} onOpenChange={props.openChanged}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Team</DialogTitle>
                        <DialogDescription>
                            We're glad you're at this page to create a new team and to help the {ORGANIZATION_NAME} expand!
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <Alert>
                            <AlertTriangleIcon />
                            <AlertTitle>Please Choose Effective Team Names!</AlertTitle>
                            <AlertDescription><span>If you're leading a project, an effective team name would be like US News or Amazon Kuiper. If you're an internal team, an example team name would be Social Media. Please <b>ensure appropriate capitalization</b> and <b>do not append</b> terms like Fall 2024, etc.</span></AlertDescription>
                        </Alert>
                        <div className="grid gap-3">
                            <Label htmlFor="name-1">Team Name</Label>
                            <Input placeholder="Minimum 3 Characters" required value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="name-1">Team Description</Label>
                            <Textarea maxLength={200} placeholder="Ex. Developing an MLOps pipeline for Brain Tumor Segmentation Models" required value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} />
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="username-1">Team Type</Label>
                            <Select required value={teamType} onValueChange={(val) => setTeamType(val)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Team Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Team Type</SelectLabel>
                                        <SelectItem value="PROJECT">Project (For Project Teams)</SelectItem>
                                        <SelectItem value="BOOTCAMP">Bootcamp (Web Dev, Quantum, etc.)</SelectItem>
                                        <SelectItem value="CORPORATE">Corporate (All Other Teams, Ex. Sponsorhip)</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            <div className={`flex items-center gap-3 ${(teamType == "PROJECT") ? "" : "hidden"}`}>
                                <Checkbox checked={projectLeadConfirmed} onCheckedChange={(checked) => setProjectLeadConfirmed(checked != false)} id="projectlead_confirm" />
                                <Label htmlFor="projectlead_confirm">I confirm that I will be the Project Lead for this team</Label>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="username-1">Team Season</Label>
                            <div className="flex gap-3 w-full">
                                <Select required value={teamSeason} onValueChange={(val) => setTeamSeason(val)}>
                                    <SelectTrigger className="flex-grow-1">
                                        <SelectValue placeholder="Select Term" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Term</SelectLabel>
                                            <SelectItem value="FALL">Fall</SelectItem>
                                            <SelectItem value="SPRING">Spring</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>

                                <Input 
                                    required 
                                    className="max-w-[150px]" 
                                    placeholder="Year" 
                                    value={teamYear}
                                    disabled
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button 
                            onClick={handleFormSubmit} 
                            disabled={(teamName.trim().length < 3) || !teamSeason || !teamType || (teamType == "PROJECT" ? !projectLeadConfirmed : false)}
                        >
                            Create Team
                        </Button>
                    </DialogFooter>
                </DialogContent>
        </Dialog>
    )
}