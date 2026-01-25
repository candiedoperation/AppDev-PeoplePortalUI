import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

interface TeamCreationRequest {
    _id: string;
    requestorPk: number;
    requestorName?: string;
    requestorEmail: string;
    createTeamRequest: {
        friendlyName: string;
        teamType: string;
        seasonType: string;
        seasonYear: number;
        description: string;
        requestorRole: string;
    };
    status: string;
    createdAt: string;
}

export const OrgTeamRequestReview = () => {
    const { requestId } = useParams();
    const navigate = useNavigate();
    const [request, setRequest] = React.useState<TeamCreationRequest | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [processingAction, setProcessingAction] = React.useState<'approve' | 'decline' | null>(null);

    React.useEffect(() => {
        if (!requestId) return;

        fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teamrequests/${requestId}`, {
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    setRequest(data);
                } else {
                    toast.error("Failed to fetch request details.");
                    navigate("/org/teams");
                }
            })
            .catch((e) => {
                toast.error("Error loading request: " + e.message);
                navigate("/org/teams");
            })
            .finally(() => {
                setLoading(false);
            });
    }, [requestId, navigate]);

    const handleAction = async (action: 'approve' | 'decline') => {
        if (!requestId || processingAction) return;

        setProcessingAction(action);
        const endpoint = `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/org/teamrequests/${requestId}`;
        const method = action === 'approve' ? 'POST' : 'DELETE';

        try {
            const res = await fetch(endpoint, {
                method: method,
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (res.ok) {
                toast.success(`Request successfully ${action}d!`);
                navigate("/org/teams");
            } else {
                const errorData = await res.json();
                toast.error(`Failed to ${action} request: ${errorData.message || "Unknown error"}`);
            }
        } catch (e: any) {
            toast.error(`Error processing request: ${e.message}`);
        } finally {
            setProcessingAction(null);
        }
    };

    return (
        <Dialog open={true} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-[600px] [&>button]:hidden outline-none">
                <DialogHeader>
                    {loading ? (
                        <>
                            <Skeleton className="h-6 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-1/2" />
                        </>
                    ) : request ? (
                        <>
                            <DialogTitle>Review Team Creation Request</DialogTitle>
                            <DialogDescription>
                                Review the details for the new team request from {request.requestorName ?? request.requestorEmail}
                            </DialogDescription>
                        </>
                    ) : (
                        <DialogTitle>Request Not Found</DialogTitle>
                    )}
                </DialogHeader>

                {loading ? (
                    <div className="grid gap-4 py-2">
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-40 w-full" />
                        </div>
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    </div>
                ) : request ? (
                    <div className="grid gap-4 py-2">
                        <div className="space-y-4">
                            <h4 className="font-medium leading-none">Team Details</h4>
                            <div className="border rounded-md">
                                <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-bold w-1/4 align-top">Team Name</TableCell>
                                            <TableCell>{request.createTeamRequest.friendlyName}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-bold w-1/4 align-top">Team Type</TableCell>
                                            <TableCell>{request.createTeamRequest.teamType}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-bold w-1/4 align-top">Season</TableCell>
                                            <TableCell>{request.createTeamRequest.seasonType} {request.createTeamRequest.seasonYear}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-bold w-1/4 align-top">Description</TableCell>
                                            <TableCell className="whitespace-pre-wrap break-words">{request.createTeamRequest.description}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-medium leading-none">Requester Details</h4>
                            <div className="border rounded-md">
                                <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-bold w-1/4 align-top">Name</TableCell>
                                            <TableCell>{request.requestorName || "N/A"}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-bold w-1/4 align-top">Email</TableCell>
                                            <TableCell>{request.requestorEmail}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium w-1/4">Requested Role</TableCell>
                                            <TableCell>{request.createTeamRequest.requestorRole}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                            Requested on {new Date(request.createdAt).toLocaleString()}
                        </div>
                    </div>
                ) : (
                    <div className="py-4">
                        <p className="text-muted-foreground">The request could not be found or has already been processed.</p>
                    </div>
                )}

                <DialogFooter>
                    {loading ? (
                        <div className="flex gap-2 w-full justify-end">
                            <Skeleton className="h-10 w-20" />
                            <Skeleton className="h-10 w-28" />
                        </div>
                    ) : request ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => handleAction('decline')}
                                disabled={!!processingAction}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/50"
                            >
                                {processingAction === 'decline' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Decline
                            </Button>
                            <Button
                                onClick={() => handleAction('approve')}
                                disabled={!!processingAction}
                            >
                                {processingAction === 'approve' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Approve & Create
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => navigate("/org/teams")}>Back to Teams</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
