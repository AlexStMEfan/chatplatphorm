import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { EventType } from "./types";

interface Props {
  open: boolean;
  type: EventType | null;
  onClose: () => void;
  onCreate: (data: any) => void;
  defaultDate?: string;       // дата по умолчанию
  defaultStart?: string;      // время начала по умолчанию
  defaultEnd?: string;        // время окончания по умолчанию
}

export default function CreateEventModal({
  open,
  type,
  onClose,
  onCreate,
  defaultDate,
  defaultStart = "09:00",
  defaultEnd = "10:00",
}: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate || "");
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);

  // Сброс полей после закрытия или при изменении defaultDate / defaultStart / defaultEnd
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDate(defaultDate || "");
      setStart(defaultStart);
      setEnd(defaultEnd);
    } else {
      if (defaultDate) setDate(defaultDate);
      if (defaultStart) setStart(defaultStart);
      if (defaultEnd) setEnd(defaultEnd);
    }
  }, [open, defaultDate, defaultStart, defaultEnd]);

  const submit = () => {
    if (!title.trim()) return;
    if (!date) return;
    if (!start || !end) return;
    if (start >= end) return;

    onCreate({
      id: crypto.randomUUID(),
      type,
      title: title.trim(),
      date,
      startTime: start,
      endTime: end,
    });

    onClose();
  };

  if (!type) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 w-[400px] shadow-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2 className="text-xl font-semibold mb-4">
              {type === "meeting" ? "Создать видеовстречу" : "Создать событие"}
            </h2>

            <div className="space-y-4">
              <input
                className="w-full rounded-xl border p-3 dark:bg-[#2A2A2A] dark:border-gray-700"
                placeholder="Название"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <input
                type="date"
                className="w-full rounded-xl border p-3 dark:bg-[#2A2A2A] dark:border-gray-700"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <div className="flex gap-3">
                <input
                  type="time"
                  className="w-full rounded-xl border p-3 dark:bg-[#2A2A2A] dark:border-gray-700"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
                <input
                  type="time"
                  className="w-full rounded-xl border p-3 dark:bg-[#2A2A2A] dark:border-gray-700"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={submit}
                className="flex-1 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-[#55b977] transition"
              >
                Создать
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-xl bg-gray-200 dark:bg-[#2C2C2C] hover:bg-gray-300 dark:hover:bg-[#3A3A3A] transition"
              >
                Отмена
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}