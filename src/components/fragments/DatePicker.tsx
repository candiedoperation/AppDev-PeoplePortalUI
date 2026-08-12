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

import { format, parse } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

/* Date picker backed by a "yyyy-MM-dd" string to preserve the API wire format */
export function DatePicker({
    id,
    value,
    onChange,
    disabledBefore,
    disabledAfter,
}: {
    id?: string
    value: string
    onChange: (value: string) => void
    disabledBefore?: string
    disabledAfter?: string
}) {
    const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
    const minDate = disabledBefore ? parse(disabledBefore, "yyyy-MM-dd", new Date()) : undefined
    const maxDate = disabledAfter ? parse(disabledAfter, "yyyy-MM-dd", new Date()) : undefined
    const disabled = [
        ...(minDate ? [{ before: minDate }] : []),
        ...(maxDate ? [{ after: maxDate }] : []),
    ]

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    data-empty={!selected}
                    className="w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                    <CalendarIcon />
                    {selected ? format(selected, "PPP") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={disabled.length ? disabled : undefined}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    )
}
