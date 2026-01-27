/**
  People Portal UI
  Copyright (C) 2026  Atheesh Thirumalairajan

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog"
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