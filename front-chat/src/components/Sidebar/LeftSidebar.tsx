import { NavLink, useLocation } from "react-router-dom";
import { Bell, MessageCircle, Phone, Calendar, Newspaper } from "lucide-react";

export default function SideBar() {
  const location = useLocation();
  
  const items = [
    { icon: <Bell size={28} />, label: "Уведомления", to: "/notifications" },
    { icon: <MessageCircle size={28} />, label: "Сообщения", to: "/chats" },
    { icon: <Newspaper size={28} />, label: "Новости", to: "/news" },
    { icon: <Phone size={28} />, label: "Звонки", to: "/calls" },
    { icon: <Calendar size={28} />, label: "Календарь", to: "/calendar" },
  ];

  return (
    <div className="flex flex-col items-start gap-6 p-4 h-full bg-background dark:bg-dark-background">
      {items.map((item) => {
        const isActive = location.pathname === item.to;
        
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={`
              relative flex flex-col items-center w-full p-2 rounded-lg transition-colors
              ${isActive
                ? "bg-primary-lite dark:bg-dark-primary-hover"
                : "hover:bg-primary-lite dark:hover:bg-dark-primary-hover"
              }
            `}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-lg bg-primary" />
            )}
            <div className="text-text-dark dark:text-dark-text-light">
              {item.icon}
            </div>
            <span className="text-xs text-text-muted dark:text-dark-text-muted">
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </div>
  );
}