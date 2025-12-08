import { useEffect, useState } from "react";
import { Building2, Ellipsis } from "lucide-react";
import { fetchProfile, logout } from "../api/auth"; // ← ваш API
import { type User } from "../api/auth";
import GlassDropdown from "./ui/GlassDropdown";

const statusOptions = [
  { label: "Свободен", color: "#00A676", value: "online" },
  { label: "Отошел", color: "#FFD369", value: "away" },
  { label: "На звонке", color: "#D72638", value: "call" },
  { label: "Демонстрирует экран", color: "#D72638", value: "screen", stripe: true },
  { label: "Не доступен", color: "#FFFFFF", border: "#E0E0E0", value: "offline" },
];

export default function Header() {
  const [userData, setUserData] = useState<User | null>(null);
  const [userStatus, setUserStatus] = useState(statusOptions[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await fetchProfile();
        setUserData(profile);
      } catch (error) {
        console.error("Failed to load profile:", error);
        // Пользователь не авторизован — перенаправление будет в App.tsx
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleStatusChange = (option: typeof statusOptions[0]) => {
    setUserStatus(option);
  };

  const handleLogout = async () => {
    logout(); // Очищает localStorage
    window.location.href = "/login"; // Перенаправление на логин
  };

  // Пока загружаемся — показываем placeholder
  if (loading) {
    return (
      <header className="w-full h-14 px-4 flex items-center justify-between gap-4 bg-white/80 dark:bg-dark-bg/70 border-b border-neutral-200 dark:border-dark-border backdrop-blur-xl transition-all sticky top-0 z-50">
        <div className="flex items-center gap-2 shrink-0">
          <Building2 size={22} className="text-text-dark dark:text-dark-text-light" />
          <span className="hidden sm:block text-lg font-semibold text-text-dark dark:text-dark-text-light">
            CorpChat
          </span>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-xl h-10 bg-neutral-200 dark:bg-dark-input rounded-xl animate-pulse" />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 bg-neutral-200 dark:bg-dark-input rounded-full animate-pulse" />
        </div>
      </header>
    );
  }

  // Если пользователь не залогинен — не рендерим Header (App.tsx перенаправит)
  if (!userData) {
    return null;
  }

  // Генерация инициалов из имени пользователя
  const initials = userData.name
    ? userData.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : userData.email
      ? userData.email[0].toUpperCase()
      : "U";

  return (
    <header
      className="
        w-full h-14 px-4 flex items-center justify-between gap-4
        bg-white/80 dark:bg-dark-bg/70 border-b border-neutral-200 dark:border-dark-border
        backdrop-blur-xl transition-all sticky top-0 z-50
      "
    >
      {/* ЛОГО */}
      <div className="flex items-center gap-2 shrink-0">
        <Building2
          size={22}
          className="text-text-dark dark:text-dark-text-light"
        />
        <span className="hidden sm:block text-lg font-semibold text-text-dark dark:text-dark-text-light">
          CorpChat
        </span>
      </div>

      {/* ПОИСК */}
      <div className="flex-1 flex justify-center">
        <input
          type="search"
          placeholder="Поиск..."
          className="
            w-full max-w-xl px-4 py-2 rounded-xl
            border border-neutral-200 dark:border-dark-border
            bg-white dark:bg-dark-input
            text-neutral-800 dark:text-dark-text-light
            placeholder:text-neutral-400 dark:placeholder:text-neutral-500
            focus:ring-2 focus:ring-primary-hover focus:border-primary-hover
            outline-none transition-all
          "
        />
      </div>

      {/* ПРАВАЯ СТОРОНА */}
      <div className="flex items-center gap-3 shrink-0">

        {/* === Eclipse Dropdown === */}
        <GlassDropdown
          button={<Ellipsis size={20} className="text-text-dark dark:text-dark-text-light" />}
          items={[
            { label: "Сменить тему", onClick: () => {} },
            { label: "Уведомления", onClick: () => {} },
            { label: "Горячие клавиши", onClick: () => {} },
          ]}
        />

        {/* === User Dropdown с выбором статуса === */}
        <GlassDropdown
  button={
    <div className="relative w-9 h-9">
      {userData?.avatar_url ? (
        <img
          src={userData.avatar_url}
          className="w-9 h-9 rounded-full object-cover border border-white/30 dark:border-dark-border"
          alt="avatar"
        />
      ) : (
        <div className="w-9 h-9 rounded-full flex items-center justify-center
                        bg-neutral-200 dark:bg-dark-input text-neutral-700 dark:text-white
                        text-sm font-medium">
          {userData.name
  ? userData.name.split(" ").map(n => n[0]).join("").toUpperCase()
  : userData.email[0].toUpperCase()}
        </div>
      )}
      <span
        className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-dark-border"
        style={{
          background: userStatus.color,
          borderColor: userStatus.border || (userStatus.color === "#FFFFFF" ? "#E0E0E0" : "white"),
        }}
      />
    </div>
  }
  items={[
    // Статусы
    ...statusOptions.map((s) => ({
      label: (
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              s.stripe
                ? "relative bg-red-600 before:absolute before:top-1/2 before:left-0 before:w-full before:h-0.5 before:bg-white before:-translate-y-1/2"
                : ""
            }`}
            style={{
              backgroundColor: s.color,
              border: s.border ? `1px solid ${s.border}` : undefined,
            }}
          />
          {s.label}
        </div>
      ),
      onClick: () => handleStatusChange(s),
    })),
    { divider: true }, // Divider после блока статусов
    { label: "Профиль", onClick: () => {} },
    { label: "Настройки", onClick: () => {} },
    { divider: true }, // Divider перед выходом
    {
      label: "Выйти",
      danger: true,
      onClick: handleLogout,
    },
  ]}
/>
      </div>
    </header>
  );
}