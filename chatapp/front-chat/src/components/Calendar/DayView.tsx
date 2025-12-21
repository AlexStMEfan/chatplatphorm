import type { FC } from "react";
import type { CalendarEvent } from "./types";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onHourClick?: (dateISO: string) => void;
}

const DayView: FC<DayViewProps> = ({ currentDate, events, onHourClick }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const currentHour = new Date().getHours();
  const isToday = currentDate.toDateString() === new Date().toDateString();
  const currentDateKey = currentDate.toISOString().split("T")[0];

  const eventsByHour = (hour: number) =>
    events.filter((e) => {
      if (e.date !== currentDateKey) return false;
      if (!e.startTime) return false;
      const [h] = e.startTime.split(":").map(Number);
      return h === hour;
    });

  const handleClick = (hour: number) => {
    if (onHourClick) {
      const d = new Date(currentDate);
      d.setHours(hour, 0, 0, 0);
      onHourClick(d.toISOString().split("T")[0]); // передаем дату
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto px-2 sm:px-4 py-2">
      {/* Заголовок дня */}
      <div className="text-center text-lg font-semibold mb-4 text-text-dark dark:text-white capitalize">
        {currentDate.toLocaleDateString("ru-RU", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </div>

      {/* Сетка часов */}
      <div className="flex flex-col border-l border-border dark:border-dark-border">
        {hours.map((hour) => {
          const isCurrent = isToday && hour === currentHour;
          const hourEvents = eventsByHour(hour);

          return (
            <div
              key={hour}
              className="relative flex h-14 sm:h-16 md:h-20 border-b border-border dark:border-dark-border cursor-pointer"
              onClick={() => handleClick(hour)}
            >
              {/* Метка времени */}
              <div className="w-12 text-right text-xs text-text-muted dark:text-dark-text-muted select-none flex-shrink-0 px-1 py-1">
                {hour.toString().padStart(2, "0")}:00
              </div>

              {/* Подсветка текущего часа */}
              {isCurrent && (
                <div className="absolute inset-0 bg-[#64CD8433] dark:bg-[#64CD8444] rounded-md z-0 pointer-events-none" />
              )}

              {/* События */}
              <div className="flex-1 pl-2 pr-1 flex flex-col z-10">
                {hourEvents.length === 0 ? (
                  <div className="text-xs text-text-muted dark:text-dark-text-muted">—</div>
                ) : (
                  hourEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`mb-1 rounded-md px-2 py-1 text-sm border ${
                        ev.type === "meeting"
                          ? "bg-primary/10 border-primary/40"
                          : "bg-surface dark:bg-dark-surface border-border dark:border-dark-border"
                      }`}
                    >
                      <div className="font-medium text-text-dark dark:text-white">{ev.title}</div>
                      {(ev.startTime || ev.endTime) && (
                        <div className="text-xs text-text-muted dark:text-dark-text-muted">
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
    </div>
  );
};

export default DayView;