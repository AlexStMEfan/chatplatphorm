import { getWeekDays } from "./dateUtils";
import type { CalendarEvent } from "./types";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onHourClick?: (dateISO: string) => void;
}

export default function WeekView({ currentDate, events, onHourClick }: WeekViewProps) {
  const days = getWeekDays(currentDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const now = new Date();
  const todayStr = now.toDateString();
  const currentHour = now.getHours();

  const dateKey = (date: Date) => date.toISOString().split("T")[0];

  /** Фильтрация событий по дню и часу */
  const eventsByHourAndDay = (dayDate: Date, hour: number) => {
    const dayStr = dateKey(dayDate);
    return events.filter((e) => {
      if (e.date !== dayStr) return false;
      if (!e.startTime) return false;
      const [h] = e.startTime.split(":").map(Number);
      return h === hour;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Общая прокрутка */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[900px] md:min-w-0 grid grid-cols-[4rem_repeat(7,1fr)]">

          {/* ----------- STICKY HEADER ROW ----------- */}
          <div className="sticky top-0 z-20 bg-white dark:bg-[#0F0F0F] border-b border-border dark:border-dark-border"></div>

          {/* Заголовки дней */}
          {days.map((day, i) => {
            const isToday = day.date.toDateString() === todayStr;
            return (
              <div
                key={i}
                className="sticky top-0 z-20 bg-white dark:bg-[#0F0F0F] px-3 py-2 border-b border-border dark:border-dark-border"
              >
                <div className="text-xs text-text-muted dark:text-dark-text-muted">
                  {day.weekdayShort}
                </div>
                <div
                  className={`w-7 h-7 mt-1 rounded-full flex items-center justify-center text-sm 
                    ${isToday ? "bg-[#64CD84] text-white" : "text-text-dark dark:text-white"}`}
                >
                  {day.date.getDate()}
                </div>
              </div>
            );
          })}

          {/* ----------- BODY (ЧАСЫ + ДНИ) ----------- */}

          {/* Левая колонка с часами */}
          <div className="flex flex-col bg-white dark:bg-[#0F0F0F] border-r border-border dark:border-dark-border">
            {hours.map((h) => (
              <div
                key={h}
                className="h-14 sm:h-16 md:h-20 flex items-start justify-end pr-2 text-[11px] 
                           text-text-muted dark:text-dark-text-muted select-none"
              >
                {h.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* 7 колонок дней */}
          {days.map((day, dayIndex) => {
            const isToday = day.date.toDateString() === todayStr;

            return (
              <div
                key={dayIndex}
                className="flex flex-col border-r last:border-r-0 border-border dark:border-dark-border bg-white dark:bg-[#0F0F0F]"
              >
                {hours.map((h) => {
                  const isCurrentHour = isToday && h === currentHour;
                  const hourEvents = eventsByHourAndDay(day.date, h);

                  return (
                    <div
                      key={h} 
                      className="h-14 sm:h-16 md:h-20 border-b border-border dark:border-dark-border relative cursor-pointer"
                      onClick={() => {
                        if (onHourClick) {
                          const clickedDate = new Date(day.date);
                          clickedDate.setHours(h, 0, 0, 0);
                          onHourClick(clickedDate.toISOString().split("T")[0]);
                        }
                      }}
                    >
                      {/* Подсветка текущего часа */}
                      {isCurrentHour && (
                        <div className="absolute inset-0 bg-[#64cd8420] dark:bg-[#64cd8430] pointer-events-none z-0 rounded-md"></div>
                      )}

                      <div className="absolute inset-0 px-2 py-1 flex flex-col z-10">
                        {hourEvents.length === 0 ? (
                          <div className="text-[10px] text-text-muted dark:text-dark-text-muted">
                            —
                          </div>
                        ) : (
                          hourEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className={`mb-1 rounded-md px-2 py-1 text-xs border text-[11px] ${
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
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}