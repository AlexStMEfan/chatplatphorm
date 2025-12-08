import { motion } from "framer-motion";
import { useState } from "react";
import { Phone, Video, Search, PhoneCall } from "lucide-react";

interface CallItem {
  id: string;
  name: string;
  type: "audio" | "video";
  date: string;
  time: string;
  missed?: boolean;
}

const mockCalls: CallItem[] = [
  {
    id: "1",
    name: "Иван Петров",
    type: "video",
    date: "Сегодня",
    time: "14:23",
  },
  {
    id: "2",
    name: "Анна Смирнова",
    type: "audio",
    missed: true,
    date: "Сегодня",
    time: "11:47",
  },
  {
    id: "3",
    name: "Рабочая группа 1",
    type: "video",
    date: "Вчера",
    time: "18:02",
  }
];

export default function WindowMeeting() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filters = [
    { id: "all", label: "Все" },
    { id: "missed", label: "Пропущенные" },
    { id: "groups", label: "Группы" },
  ];

  const filteredCalls = mockCalls.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "missed" && !c.missed) return false;
    if (filter === "groups" && !c.name.toLowerCase().includes("груп")) return false;
    return true;
  });

  return (
    <motion.div
      className="w-full h-full bg-white/50 dark:bg-dark-surface/30 backdrop-blur-2xl border border-white/30 dark:border-dark-border rounded-3xl flex flex-col p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ---------- HEADER ---------- */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-text-dark dark:text-white">
          Вызовы
        </h1>

        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-[#55b977] transition">
          <Phone className="w-4 h-4" />
          Новый вызов
        </button>
      </div>

      {/* ---------- SEARCH ---------- */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          className="w-full pl-10 pr-3 py-2 rounded-xl bg-white dark:bg-[#1E1E1E] border border-border dark:border-dark-border"
          placeholder="Поиск"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ---------- FILTERS ---------- */}
      <div className="flex gap-3 mb-5 overflow-auto">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`
            px-4 py-1.5 rounded-xl text-sm border transition whitespace-nowrap
            ${filter === f.id
              ? "bg-primary text-white border-primary"
              : "bg-white dark:bg-dark-input border-border dark:border-dark-border text-text-dark dark:text-white"
            }
          `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ---------- CALL LIST ---------- */}
      <div className="flex flex-col gap-3 overflow-auto pr-1">
        {filteredCalls.map((call) => (
          <div
            key={call.id}
            className="flex items-center justify-between bg-white dark:bg-[#1E1E1E] border border-border dark:border-dark-border rounded-xl p-3"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-input flex items-center justify-center text-sm font-semibold">
                {call.name[0]}
              </div>

              {/* Info */}
              <div>
                <div className="font-medium text-text-dark dark:text-white">
                  {call.name}
                </div>
                <div className="text-xs text-text-muted dark:text-dark-text-muted">
                  {call.missed && (
                    <span className="text-red-500">Пропущен • </span>
                  )}
                  {call.date} • {call.time}
                </div>
              </div>
            </div>

            {/* Right buttons */}
            <button className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition">
              {call.type === "video" ? (
                <Video className="w-4 h-4" />
              ) : (
                <PhoneCall className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}