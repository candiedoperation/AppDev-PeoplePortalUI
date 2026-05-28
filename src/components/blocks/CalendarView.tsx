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

import { cn, formatHour, formatTime } from "@/lib/utils";
import React, { useState, type ComponentType } from "react";

export type CalendarEvent = {
  day: number;
  start: number;
  end: number;
};

type CalendarViewProps<T extends CalendarEvent> = {
  events?: T[];
  editable?: boolean;
  onNewEvent?: (day: number, start: number, end: number) => void;
  options?: {
    start?: number;
    end?: number;
    snapMinutes?: number;
  };
  component?: ComponentType<{ event: T }>;
};

export const CalendarView = <T extends CalendarEvent>({ events = [], editable = true, onNewEvent, options, component: Component }: CalendarViewProps<T>) => {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const START_HOUR = options?.start ?? 8;
  const END_HOUR = options?.end ?? 20;
  const SNAP_MINUTES = options?.snapMinutes ?? 15;
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  const [isDragging, setIsDragging] = useState(false);
  const [newEvent, setNewEvent] = useState<CalendarEvent | null>(null);
  const [dragAnchor, setDragAnchor] = useState<{ day: number; hour: number } | null>(null);

  function getClampedRange(day: number, anchor: number, targetHour: number): [number, number] {
    const dayEvents = events
      .filter(e => e.day === day)
      .sort((a, b) => a.start - b.start);

    if (targetHour >= anchor) {
      const blocking = dayEvents.find(e => e.start >= anchor);
      const maxEnd = blocking ? blocking.start : END_HOUR;
      return [anchor, Math.min(targetHour, maxEnd)];
    } else {
      const blocking = [...dayEvents].reverse().find(e => e.end <= anchor);
      const minStart = blocking ? blocking.end : START_HOUR;
      return [Math.max(targetHour, minStart), anchor];
    }
  }

  function getTimeFromPosition(e: React.MouseEvent<HTMLElement>): { day: number; hour: number } {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const day = Math.min(DAYS.length - 1, Math.max(0, Math.floor((x / rect.width) * DAYS.length)));
    let hour = Math.min(END_HOUR, Math.max(START_HOUR, (y / rect.height) * TOTAL_HOURS + START_HOUR));

    if (e.shiftKey && SNAP_MINUTES > 0) {
      const step = SNAP_MINUTES / 60;
      hour = Math.min(END_HOUR, Math.max(START_HOUR, Math.round(hour / step) * step));
    }

    return { day, hour };
  }

  return (
    <div className="w-full relative">
      {Array.from({ length: TOTAL_HOURS + 1 }).map((_, index) => (
        <div key={index} className={cn("flex gap-2", index === 0 ? "h-14" : "h-10")}>
          <div className="flex items-end justify-end w-12 text-sm">
            {index % 2 === 0 && (
              <p className="translate-y-1/2 select-none">
                {formatHour(index + START_HOUR)}
              </p>
            )}
          </div>
          <div
            className="flex-1 grid border-b border-gray-200/45"
            style={{ gridTemplateColumns: `repeat(${DAYS.length}, minmax(0, 1fr))` }}
          >
            {DAYS.map((day, dayIndex) => (
              <span key={dayIndex} className="flex items-center justify-center select-none">
                {index === 0 && day}
              </span>
            ))}
          </div>
        </div>
      ))}

      <div
        className="absolute top-14 left-14 bottom-0 right-0"
        onMouseDown={(e) => {
          if (!editable) return;
          const { day, hour } = getTimeFromPosition(e);
          const isInsideExisting = events.some(ev => ev.day === day && ev.start <= hour && hour < ev.end);
          if (isInsideExisting) return;
          setDragAnchor({ day, hour });
          setIsDragging(true);
          setNewEvent({ day, start: hour, end: hour });
        }}
        onMouseUp={() => {
          if (!editable) return;
          setIsDragging(false);
          setDragAnchor(null);
          if (!newEvent || newEvent.end <= newEvent.start) {
            setNewEvent(null);
            return;
          }
          onNewEvent?.(newEvent.day, newEvent.start, newEvent.end);
          setNewEvent(null);
        }}
        onMouseLeave={() => {
          if (!editable) return;
          setIsDragging(false);
          setDragAnchor(null);
          if (!newEvent || newEvent.end <= newEvent.start) {
            setNewEvent(null);
            return;
          }
          setNewEvent(null);
        }}
        onMouseMove={(e) => {
          if (!editable || !isDragging || !newEvent || !dragAnchor) return;
          const { hour } = getTimeFromPosition(e);
          const [start, end] = getClampedRange(dragAnchor.day, dragAnchor.hour, hour);
          setNewEvent(prev => prev ? { ...prev, start, end } : null);
        }}
      >
        {editable && newEvent && newEvent.end > newEvent.start && (
          <div
            className="absolute px-0.5 pointer-events-none"
            style={{
              top: `${((newEvent.start - START_HOUR) / TOTAL_HOURS) * 100}%`,
              height: `${((newEvent.end - newEvent.start) / TOTAL_HOURS) * 100}%`,
              left: `${(newEvent.day / DAYS.length) * 100}%`,
              width: `${(1 / DAYS.length) * 100}%`,
            }}
          >
            <div className="h-full w-full rounded border-2 border-dashed border-primary bg-primary/20 text-sm p-1 overflow-hidden select-none">
                {formatTime(newEvent.start)} - {formatTime(newEvent.end)}
            </div>
          </div>
        )}
        {events.map((event, i) => (
          <div
            key={i}
            className="absolute px-0.5 select-none"
            style={{
              top: `${((event.start - START_HOUR) / TOTAL_HOURS) * 100}%`,
              height: `${((event.end - event.start) / TOTAL_HOURS) * 100}%`,
              left: `${(event.day / DAYS.length) * 100}%`,
              width: `${(1 / DAYS.length) * 100}%`,
            }}
          >
            <div className="rounded overflow-hidden h-full">
              {Component && <Component event={event} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
