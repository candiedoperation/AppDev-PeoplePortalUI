import React from "react"
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable, type ColumnDef, type ColumnFiltersState } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useNavigate } from "react-router-dom";
import { Input } from "../ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationEllipsis, PaginationNext } from "../ui/pagination";
import { Trash2Icon, User2Icon } from "lucide-react";

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
    onRemove?: (user: UserInformationBrief) => void;
    filterPlaceholder?: string;
    className?: string;
}

export const UserInformationTable: React.FC<UserTableProps> = ({
    users,
    showPagination = false,
    onUserClick,
    onRemove,
    filterPlaceholder = "Start Typing to Filter by Name",
    className = ""
}) => {
    const navigate = useNavigate()
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    const columns: ColumnDef<UserInformationBrief>[] = [
        { accessorKey: 'name', header: "Name", size: 100 },
        { accessorKey: "username", header: "Alias", size: 120 },
        { accessorKey: 'email', header: "Contact Information", size: 180 },
        ...(onRemove ? [{
            id: 'actions',
            header: 'Actions',
            size: 70,
            cell: ({ row }: { row: { original: UserInformationBrief } }) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(row.original);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full text-muted-foreground hover:text-red-600 transition-colors"
                    title="Remove member"
                >
                    <Trash2Icon size={16} />
                </button>
            )
        }] : [])
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
                <Table className="table-fixed">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const widthClass =
                                        header.id === 'name' ? 'w-[100px]' :
                                            header.id === 'username' ? 'w-[120px]' :
                                                header.id === 'email' ? 'w-[250px]' :
                                                    header.id === 'actions' ? 'w-[70px]' : '';
                                    return (
                                        <TableHead key={header.id} className={widthClass}>
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
                                        const widthClass =
                                            cell.column.id === 'name' ? 'w-[100px]' :
                                                cell.column.id === 'username' ? 'w-[120px]' :
                                                    cell.column.id === 'email' ? 'w-[250px]' :
                                                        cell.column.id === 'actions' ? 'w-[70px]' : '';
                                        return (<TableCell key={cell.id} className={widthClass}>
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

                                                            case "email": {
                                                                const email = cell.getValue() as string;
                                                                return (
                                                                    <div className="truncate" title={email}>
                                                                        {email}
                                                                    </div>
                                                                )
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
