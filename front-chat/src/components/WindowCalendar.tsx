import { useState } from "react";
import CalendarHeader from "./Calendar/CalendarHeader";
import MonthView from "./Calendar/MonthView";
import WeekView from "./Calendar/WeekView";
import DayView from "./Calendar/DayView";
import YearView from "./Calendar/YearView";
import { motion, AnimatePresence } from "framer-motion";
import type { ViewMode, CalendarEvent, EventType } from "./Calendar/types";
import TypePickerModal from "./Calendar/TypePickerModal";
import CreateEventModal from "./Calendar/CreateEventModal";

export default function WindowCalendar() {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  
  // Дата и время для автозаполнения в CreateEventModal
  const [selectedDateForEvent, setSelectedDateForEvent] = useState<string | null>(null);
  const [defaultStart, setDefaultStart] = useState("09:00");
  const [defaultEnd, setDefaultEnd] = useState("10:00");

  // Клик на кнопку "Добавить событие" в хедере
  const handleCreateEvent = () => {
    const todayISO = currentDate.toISOString().split("T")[0];
    setSelectedDateForEvent(todayISO);
    setDefaultStart("09:00");
    setDefaultEnd("10:00");
    setShowTypePicker(true);
  };

  // Клик на конкретный час в DayView или WeekView
  const handleHourClick = (dateISO: string, hour?: number) => {
    setSelectedDateForEvent(dateISO);

    if (hour !== undefined) {
      const h = hour.toString().padStart(2, "0");

      setDefaultStart(`${h}:00`);

      const nextHour = hour + 1 < 24 ? hour + 1 : 23;
      const nextHourStr = nextHour.toString().padStart(2, "0");

      setDefaultEnd(`${nextHourStr}:00`);
    } else {
      setDefaultStart("09:00");
      setDefaultEnd("10:00");
    }

    setShowTypePicker(true);
  };

  return (
    <motion.div
      className="w-full h-full bg-white/50 dark:bg-dark-surface/30 backdrop-blur-2xl border border-white/30 dark:border-dark-border rounded-3xl flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <CalendarHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        onCreateEvent={handleCreateEvent}
      />

      <AnimatePresence mode="wait">
        {viewMode === "month" && (
          <motion.div key="month" className="flex-1">
            <MonthView currentDate={currentDate} events={events} />
          </motion.div>
        )}
        {viewMode === "week" && (
          <motion.div key="week" className="flex-1">
            <WeekView
              currentDate={currentDate}
              events={events}
              onHourClick={handleHourClick} // передаем функцию клика
            />
          </motion.div>
        )}
        {viewMode === "day" && (
          <motion.div key="day" className="flex-1">
            <DayView
              currentDate={currentDate}
              events={events}
              onHourClick={handleHourClick} // передаем функцию клика
            />
          </motion.div>
        )}
        {viewMode === "year" && (
          <motion.div key="year" className="flex-1">
            <YearView currentDate={currentDate} events={events} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal для выбора типа события */}
      <TypePickerModal
        open={showTypePicker}
        onClose={() => setShowTypePicker(false)}
        onSelectType={(type) => {
          setSelectedType(type);
          setShowTypePicker(false);
          setShowCreateModal(true);
        }}
      />

      {/* Modal для создания события */}
      <CreateEventModal
        open={showCreateModal}
        type={selectedType}
        defaultDate={selectedDateForEvent || undefined} // дата подставляется автоматически
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        onClose={() => setShowCreateModal(false)}
        onCreate={(event) => setEvents((prev) => [...prev, event])}
      />
    </motion.div>
  );
}