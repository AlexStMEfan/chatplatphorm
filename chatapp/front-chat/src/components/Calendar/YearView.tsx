import type { FC } from "react";
import type { CalendarEvent } from "./types";

interface YearViewProps {
  currentDate: Date;
  events: CalendarEvent[];
}

const monthNames = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"
];

const weekDays = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

const YearView: FC<YearViewProps> = ({ currentDate }) => {
  const year = currentDate.getFullYear();

  const generateMonthDays = (month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: number[] = [];

    // смещение для первого дня недели (понедельник = 0)
    const startOffset = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startOffset; i++) days.push(0);

    for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
    return days;
  };

  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-auto h-full">
      {monthNames.map((monthName, idx) => {
        const days = generateMonthDays(idx);
        return (
          <div
            key={monthName}
            className="bg-white dark:bg-dark-surface rounded-xl border border-border dark:border-dark-border shadow-sm p-2 flex flex-col"
          >
            <div className="text-center text-sm font-semibold text-text-dark dark:text-white mb-2">{monthName}</div>
            
            {/* Дни недели */}
            <div className="grid grid-cols-7 gap-px mb-1">
              {weekDays.map((d) => (
                <div key={d} className="text-xs text-center font-medium text-text-muted dark:text-dark-text-muted">{d}</div>
              ))}
            </div>

            {/* Дни месяца */}
            <div className="grid grid-cols-7 gap-px flex-1">
              {days.map((day, i) => (
                <div
                  key={i}
                  className={`h-6 flex items-center justify-center text-xs rounded-sm ${
                    day === 0 ? "bg-gray-100 dark:bg-dark-input" : "bg-white dark:bg-dark-surface"
                  }`}
                >
                  {day !== 0 ? day : ""}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default YearView;