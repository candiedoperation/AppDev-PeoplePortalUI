import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"


export interface ProgressUpdateDialogProps {
    open: boolean,
    title: string,
    progressPercent: number,
    description: string,
    status: string,
}

export const ProgressUpdateDialog = (props: ProgressUpdateDialogProps) => {
    return (
        <AlertDialog open={props.open}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{props.title}</AlertDialogTitle>
                    <AlertDialogDescription>{props.description}</AlertDialogDescription>
                </AlertDialogHeader>

                <div className="flex flex-col">
                    <Progress value={props.progressPercent} className="w-full bg-muted" />
                    <div className="flex text-muted-foreground text-xs mt-1">
                        <span className="flex-grow-1">{props.status}</span>
                        <span>{props.progressPercent}% Complete</span>
                    </div>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}