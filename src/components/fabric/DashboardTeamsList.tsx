import React from "react"
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { toast } from "sonner"
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable, type ColumnDef, type ColumnFiltersState } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useNavigate } from "react-router-dom";
import { Input } from "../ui/input";

export interface PaginationDefinition {

}

export interface GetTeamsListResponse {
    pagination: PaginationDefinition,
    teams: TeamInformationBrief[]
}

export interface TeamInformationBrief {
    username: string,
    email: string,
    name: string,
    memberSince: Date,
    active: boolean,
    attributes: any,
}

export const DashboardTeamsList = () => {
    const navigate = useNavigate()
    const [peopleList, setPeopleList] = React.useState<TeamInformationBrief[]>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    const columns: ColumnDef<TeamInformationBrief>[] = [
        { accessorKey: 'name', header: "Name" },
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

    React.useEffect(() => {
        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teams`)
            .then(async (response) => {
                const userlistResponse: GetTeamsListResponse = await response.json()
                setPeopleList(userlistResponse.teams)
            })

            .catch((e) => {
                toast.error("Failed to Fetch Teams List: " + e.message)
            })

    }, []);

    return (
        <div className="flex flex-col w-full h-full">
            <div className="flex items-center py-4">
                <Input
                    placeholder="Start Typing to Filter by Name"
                    value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                    className="max-w-md flex-grow-1"
                    onChange={(event) =>
                        table.getColumn("name")?.setFilterValue(event.target.value)
                    }
                />
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
                                    onClick={() => { navigate(`/org/teams/${row.getValue("username")}`) }}
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

                                                            case "name": {
                                                                const nameArray: string[] = (cell.getValue() as string).split(" ")
                                                                const firstName = nameArray.slice(0, 1)
                                                                const lastName = nameArray.slice(1)

                                                                return (<div className="flex items-center">
                                                                    <Avatar>
                                                                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                                                        <AvatarFallback>{firstName[0].charAt(0).toUpperCase()}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex flex-col ml-2">
                                                                        <span>{firstName}</span>
                                                                        <span className="text-muted-foreground">{lastName}</span>
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