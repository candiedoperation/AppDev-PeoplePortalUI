import React from "react"
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable, type ColumnDef, type ColumnFiltersState } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useNavigate } from "react-router-dom";
import { Input } from "../ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationEllipsis, PaginationNext } from "../ui/pagination";
import { User2Icon } from "lucide-react";

export interface UserInformationBrief {
    pk: string,
    username: string,
    email: string,
    name: string,
    memberSince?: Date,
    active: boolean,
    attributes: any,
}

export interface UserTableProps {
    users: UserInformationBrief[];
    showPagination?: boolean;
    onUserClick?: (userId: string) => void;
    filterPlaceholder?: string;
    className?: string;
}

export const UserInformationTable: React.FC<UserTableProps> = ({ 
    users, 
    showPagination = false, 
    onUserClick,
    filterPlaceholder = "Start Typing to Filter by Name",
    className = ""
}) => {
    const navigate = useNavigate()
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    const columns: ColumnDef<UserInformationBrief>[] = [
        { accessorKey: 'name', header: "Name" },
        { accessorKey: "username", header: "Alias" },
        { accessorKey: 'email', header: "Contact Information" }
    ]

    const table = useReactTable({
        columns,
        data: users,
        getCoreRowModel: getCoreRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            columnFilters
        }
    })

    const handleRowClick = (userId: string) => {
        if (onUserClick) {
            onUserClick(userId);
        } else {
            navigate(`/org/people/${userId}`);
        }
    }

    return (
        <div className={`flex flex-col w-full h-full ${className}`}>
            <div className="flex items-center py-4">
                <Input
                    placeholder={filterPlaceholder}
                    value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                    className="max-w-md flex-grow-1"
                    onChange={(event) =>
                        table.getColumn("name")?.setFilterValue(event.target.value)
                    }
                />

                {showPagination && (
                    <Pagination className="justify-end">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious href="#" />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#">1</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#" isActive>
                                    2
                                </PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#">3</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext href="#" />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
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
                                    onClick={() => handleRowClick(row.original.pk)}
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
                                                                    <Avatar className="h-8 w-8 rounded-lg">
                                                                        <AvatarImage src="https://githuwb.com/shadcn.png" alt="@shadcn" />
                                                                        <AvatarFallback className="rounded-lg"><User2Icon size="16" /></AvatarFallback>
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
