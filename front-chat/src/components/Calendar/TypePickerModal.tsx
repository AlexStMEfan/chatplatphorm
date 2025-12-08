import { motion, AnimatePresence } from "framer-motion";
import { Video, Calendar } from "lucide-react";
import type { EventType } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectType: (type: EventType) => void;
}

export default function TypePickerModal({ open, onClose, onSelectType }: Props) {
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
            className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 w-[360px] shadow-lg"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2 className="text-xl font-semibold mb-4">Выберите тип события</h2>

            <div className="space-y-3">
              <button
                onClick={() => onSelectType("meeting")}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition"
              >
                <Video className="w-5 h-5" />
                <span>Видеовстреча</span>
              </button>

              <button
                onClick={() => onSelectType("slot")}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition"
              >
                <Calendar className="w-5 h-5" />
                <span>Событие в календарь</span>
              </button>
            </div>

            <button
              className="mt-5 w-full py-2 rounded-xl bg-gray-200 dark:bg-[#2C2C2C] hover:bg-gray-300 dark:hover:bg-[#3A3A3A] transition"
              onClick={onClose}
            >
              Отмена
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}