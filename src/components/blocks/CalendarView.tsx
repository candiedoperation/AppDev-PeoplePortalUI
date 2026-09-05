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

import { cn } from "@/lib/utils";
import { format, isSameDay, set } from "date-fns";
import React, { useMemo, useState, type ComponentType } from "react";

export type CalendarEvent = {
  start: Date;
  end: Date;
};

/* Drag math is easiest in decimal hours; everything the consumer sees is a Date. */
const dateToDecimalHour = (date: Date): number => date.getHours() + date.getMinutes() / 60;

const decimalHourToDate = (base: Date, decimal: number): Date =>
  set(base, {
    hours: Math.floor(decimal),
    minutes: Math.round((decimal - Math.floor(decimal)) * 60),
    seconds: 0,
    milliseconds: 0,
  });

type CalendarViewProps<T extends CalendarEvent> = {
  /** Visible day columns, controlled by the parent. */
  days: Date[];
  events?: T[];
  editable?: boolean;
  onNewEvent?: (start: Date, end: Date) => void;
  /** Dims a column and blocks editing on it (e.g. days outside the team's lifespan). */
  isDateDisabled?: (date: Date) => boolean;
  options?: {
    start?: number;
    end?: number;
    snapMinutes?: number;
  };
  component?: ComponentType<{ event: T }>;
  previewComponent?: ComponentType<{ event: CalendarEvent }>;
};

export const CalendarView = <T extends CalendarEvent>({ days, events = [], editable = true, onNewEvent, isDateDisabled, options, component, previewComponent }: CalendarViewProps<T>) => {
  const START_HOUR = options?.start ?? 8;
  const END_HOUR = options?.end ?? 20;
  const SNAP_MINUTES = options?.snapMinutes ?? 15;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  const dayCount = days.length;

  const [isDragging, setIsDragging] = useState(false);
  const [newEvent, setNewEvent] = useState<{ day: number; start: number; end: number } | null>(null);
  const [dragAnchor, setDragAnchor] = useState<{ day: number; hour: number } | null>(null);

  const positionedEvents = useMemo(() => {
    const positioned: Array<{ event: T; day: number; start: number; end: number; column: number; columnCount: number }> = [];

    for (let day = 0; day < dayCount; day += 1) {
      const date = days[day];
      const dayEvents = events
        .map((event, index) => ({ event, index }))
        .filter(({ event }) => isSameDay(event.start, date))
        .map(({ event, index }) => ({ event, index, start: dateToDecimalHour(event.start), end: dateToDecimalHour(event.end) }))
        .sort((a, b) => a.start - b.start || a.end - b.end || a.index - b.index);

      let group: Array<{ event: T; day: number; start: number; end: number; column: number }> = [];
      let columnEnds: number[] = [];
      let groupEnd = -Infinity;

      const flush = () => {
        const columnCount = columnEnds.length;
        positioned.push(...group.map(item => ({ ...item, columnCount })));
      };

      for (const { event, start, end } of dayEvents) {
        const startsNewGroup = group.length > 0 && start >= groupEnd;
        if (startsNewGroup) {
          flush();
          group = [];
          columnEnds = [];
          groupEnd = -Infinity;
        }

        let column = columnEnds.findIndex(columnEnd => start >= columnEnd);
        if (column < 0) {
          column = columnEnds.length;
          columnEnds.push(end);
        } else {
          columnEnds[column] = end;
        }

        group.push({ event, day, start, end, column });
        groupEnd = Math.max(groupEnd, end);
      }

      flush();
    }

    return positioned;
  }, [days, dayCount, events]);

  function getDragRange(anchor: number, targetHour: number): [number, number] {
    return targetHour >= anchor ? [anchor, targetHour] : [targetHour, anchor];
  }

  function getTimeFromPosition(e: React.MouseEvent<HTMLElement>): { day: number; hour: number } {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const day = Math.min(dayCount - 1, Math.max(0, Math.floor((x / rect.width) * dayCount)));
    let hour = Math.min(END_HOUR, Math.max(START_HOUR, (y / rect.height) * TOTAL_HOURS + START_HOUR));

    if (e.shiftKey && SNAP_MINUTES > 0) {
      const step = SNAP_MINUTES / 60;
      hour = Math.min(END_HOUR, Math.max(START_HOUR, Math.round(hour / step) * step));
    }

    return { day, hour };
  }

  return (
    <div className="w-full">
      <div className="relative">
      {Array.from({ length: TOTAL_HOURS + 1 }).map((_, index) => (
        <div key={index} className={cn("flex gap-2", index === 0 ? "h-14" : "h-10")}>
          <div className="flex items-end justify-end w-12 text-sm">
            {index % 2 === 0 && (
              <p className="translate-y-1/2 select-none">
                {format(new Date(0, 0, 0, 0, (index + START_HOUR) * 60), "h a")}
              </p>
            )}
          </div>
          <div
            className="flex-1 grid border-b border-gray-200/45"
            style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}
          >
            {days.map((date, dayIndex) => (
              <span key={dayIndex} className={cn("flex flex-col items-center justify-center leading-tight select-none", isDateDisabled?.(date) && "opacity-40")}>
                {index === 0 && (
                  <>
                    <span>{format(date, "EEE")}</span>
                    <span className={cn(
                      "text-xs",
                      isSameDay(date, new Date())
                        ? "font-semibold text-primary"
                        : "text-muted-foreground"
                    )}>
                      {format(date, "MMM d")}
                    </span>
                  </>
                )}
              </span>
            ))}
          </div>
        </div>
      ))}

      <div
        className="absolute top-14 left-14 bottom-0 right-0"
        onMouseDown={(e) => {
          if (!editable) return;
          if (e.target !== e.currentTarget) return;
          const { day, hour } = getTimeFromPosition(e);
          if (isDateDisabled?.(days[day])) return;
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
          const base = days[newEvent.day];
          onNewEvent?.(decimalHourToDate(base, newEvent.start), decimalHourToDate(base, newEvent.end));
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
          const [start, end] = getDragRange(dragAnchor.hour, hour);
          setNewEvent(prev => prev ? { ...prev, start, end } : null);
        }}
      >
        {positionedEvents.map(({ event, day, start, end, column, columnCount }, idx) => {
          const slotWidth = 100 / columnCount;

          return (
          <div
            key={`${day}-${idx}-${start}-${end}`}
            className="absolute select-none pointer-events-none"
            style={{
              top: `${((start - START_HOUR) / TOTAL_HOURS) * 100}%`,
              height: `${((end - start) / TOTAL_HOURS) * 100}%`,
              left: `${(day / dayCount) * 100}%`,
              width: `${(1 / dayCount) * 100}%`,
            }}
          >
            <div
              className="h-full pointer-events-auto"
              style={{
                width: `${slotWidth}%`,
                marginLeft: `${slotWidth * column}%`,
              }}
            >
              {component && React.createElement(component, { event })}
            </div>
          </div>
          );
        })}
        {previewComponent && editable && newEvent && newEvent.end > newEvent.start && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: `${((newEvent.start - START_HOUR) / TOTAL_HOURS) * 100}%`,
              height: `${((newEvent.end - newEvent.start) / TOTAL_HOURS) * 100}%`,
              left: `${(newEvent.day / dayCount) * 100}%`,
              width: `${(1 / dayCount) * 100}%`,
            }}
          >
            {React.createElement(previewComponent, {
              event: {
                start: decimalHourToDate(days[newEvent.day], newEvent.start),
                end: decimalHourToDate(days[newEvent.day], newEvent.end),
              },
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
