import type { Dispatch, SetStateAction } from "react";
import { Menu } from "@headlessui/react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion } from "framer-motion";
import type { ViewMode } from "./types"; // create types file or inline type

interface CalendarHeaderProps {
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  currentDate: Date;
  setCurrentDate: Dispatch<SetStateAction<Date>>;
  onCreateEvent: () => void;
}

export default function CalendarHeader({
  viewMode,
  setViewMode,
  currentDate,
  setCurrentDate,
  onCreateEvent,
}: CalendarHeaderProps) {
  const goToday = () => setCurrentDate(new Date());

  const goPrev = () =>
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month") d.setMonth(d.getMonth() - 1);
      else if (viewMode === "week") d.setDate(d.getDate() - 7);
      else if (viewMode === "day") d.setDate(d.getDate() - 1);
      return d;
    });

  const goNext = () =>
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month") d.setMonth(d.getMonth() + 1);
      else if (viewMode === "week") d.setDate(d.getDate() + 7);
      else if (viewMode === "day") d.setDate(d.getDate() + 1);
      return d;
    });

  const monthYear = currentDate.toLocaleString("ru-RU", { month: "long", year: "numeric" });

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4 lg:flex-none bg-surface dark:bg-dark-surface">
      <h1 className="text-base font-semibold leading-6 text-text-dark dark:text-white">
        <time dateTime={currentDate.toISOString()}>{monthYear}</time>
      </h1>

      <div className="flex items-center gap-3">
        {/* Nav buttons */}
        <div className="relative flex items-center rounded-md bg-white dark:bg-[#1E1E1E] shadow-sm">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-9 w-10 items-center justify-center rounded-l-md border-y border-l border-border text-text-muted hover:text-text-dark transition"
            aria-label="previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={goToday}
            className="flex h-9 px-3 items-center justify-center text-sm font-semibold text-text-dark dark:text-white border-y border-border hover:bg-gray-50 transition"
          >
            Сегодня
          </button>

          <button
            type="button"
            onClick={goNext}
            className="flex h-9 w-10 items-center justify-center rounded-r-md border-y border-r border-border text-text-muted hover:text-text-dark transition"
            aria-label="next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* View mode dropdown */}
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-2 rounded-md bg-white dark:bg-[#1E1E1E] px-3 py-2 text-sm font-semibold text-text-dark dark:text-white shadow-sm ring-1 ring-inset ring-border hover:bg-gray-50 transition">
            <span className="capitalize">{viewMode}</span>
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </Menu.Button>
          
            <Menu.Items 
              as={motion.div} 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-dark-surface border border-border dark:border-dark-border shadow-lg z-50 overflow-hidden"
            >
              {([
                ["day", "День"],
                ["week", "Неделя"],
                ["month", "Месяц"],
                ["year", "Год"],
              ] as const).map(([value, label]) => (
                <Menu.Item key={value}>
                  {({ active }) => (
                    <button
                      onClick={() => setViewMode(value as ViewMode)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-lite ${
                        active ? "bg-surface-hover dark:bg-dark-hover" : ""
                      }`}
                    >
                      {label}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
        </Menu>

        {/* Add event */}
        <button
            className="ml-2 flex items-center gap-2 justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#55b977] transition"
            onClick={onCreateEvent}
        >
        Добавить событие
        <Plus className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}