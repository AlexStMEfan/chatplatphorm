import { getMonthMatrix } from "./dateUtils";
import type { CalendarEvent } from "./types";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
}

export default function MonthView({ currentDate, events }: MonthViewProps) {
  const matrix = getMonthMatrix(currentDate);
  const todayStr = new Date().toDateString();

  const dateKey = (date: Date) => date.toISOString().split("T")[0];

  /** Фильтрация событий по дню */
  const eventsByDate = (date: Date) => {
    const dayStr = dateKey(date);
    return events.filter((e) => e.date === dayStr);
  };

  return (
    <div className="grid grid-cols-7 grid-rows-6 gap-px bg-gray-200 h-full">
      {matrix.map((week, i) =>
        week.map((dayObj, j) => {
          const dayEvents = eventsByDate(dayObj.date);
          const isToday = todayStr === dayObj.date.toDateString();

          return (
            <div
              key={`${i}-${j}`}
              className={`bg-white dark:bg-[#0F0F0F] px-3 py-2 text-sm min-h-[72px] flex flex-col justify-start`}
            >
              <div className={`text-xs ${dayObj.isCurrentMonth ? "text-text-dark dark:text-white" : "text-gray-400"}`}>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${
                    isToday ? "bg-[#64CD84] text-white" : ""
                  }`}
                >
                  {dayObj.date.getDate()}
                </span>
              </div>

              {/* События для этого дня */}
              <div className="mt-1 flex flex-col gap-1">
                {dayEvents.length > 0 &&
                  dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`px-2 py-1 text-xs rounded-md border text-[11px] ${
                        ev.type === "meeting"
                          ? "bg-primary/10 border-primary/40"
                          : "bg-surface dark:bg-dark-surface border-border dark:border-dark-border"
                      }`}
                    >
                      <div className="font-medium text-text-dark dark:text-white">
                        {ev.title}
                      </div>
                      {(ev.startTime || ev.endTime) && (
                        <div className="text-[10px] text-text-muted dark:text-dark-text-muted">
                          {ev.startTime}
                          {ev.endTime ? `–${ev.endTime}` : ""}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}