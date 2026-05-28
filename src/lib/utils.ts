import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getGPLv3License() {
  return `People Portal UI
Copyright (C) ${new Date().getFullYear()}  Atheesh Thirumalairajan

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.`;
}

export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  return `${h % 12 || 12} ${h >= 12 ? "PM" : "AM"}`;
};

export function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  return `${h % 12 || 12}${m > 0 ? `:${m.toString().padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
}
