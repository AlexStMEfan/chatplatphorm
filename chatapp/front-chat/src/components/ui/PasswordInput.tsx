import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  showStrength?: boolean; // показывать индикатор силы пароля
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  label = "Пароль",
  placeholder = "Введите пароль",
  value = "",
  onChange,
  showStrength = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState<"weak" | "medium" | "strong" | "">("");

  // Вычисление силы пароля
  useEffect(() => {
    const calculateStrength = (pwd: string): "weak" | "medium" | "strong" | "" => {
      if (!pwd) return "";
      let score = 0;
      if (pwd.length >= 8) score++;
      if (/[A-Z]/.test(pwd)) score++;
      if (/[0-9]/.test(pwd)) score++;
      if (/[^A-Za-z0-9]/.test(pwd)) score++;

      if (score <= 1) return "weak";
      if (score === 2 || score === 3) return "medium";
      return "strong";
    };

    setStrength(calculateStrength(value));
  }, [value]);

  // Карта цветов и текста для TypeScript
  const strengthColorMap: Record<"weak" | "medium" | "strong", string> = {
    weak: "bg-danger",
    medium: "bg-accent",
    strong: "bg-success",
  };

  const strengthTextMap: Record<"weak" | "medium" | "strong", string> = {
    weak: "Слабый",
    medium: "Средний",
    strong: "Сильный",
  };

  // fallback на случай пустого пароля
  const strengthColor = strength ? strengthColorMap[strength as "weak" | "medium" | "strong"] : "bg-transparent";
  const strengthText = strength ? strengthTextMap[strength as "weak" | "medium" | "strong"] : "";

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full px-4 py-2 border border-neutral-200 dark:border-white/20 rounded-lg 
          bg-white/60 dark:bg-white/10 text-gray-800 dark:text-white 
          focus:ring-2 focus:ring-primary-hover focus:border-primary-hover 
          outline-none transition-all pr-10"
          placeholder={placeholder}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-2 flex items-center 
          text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white transition"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {showStrength && value && (
        <div className="mt-1 flex items-center justify-between text-xs">
          <div className="flex-1 h-1 rounded-full overflow-hidden bg-neutral-200 dark:bg-white/10">
            <div
              className={`h-1 ${strengthColor} transition-all duration-300`}
              style={{
                width:
                  strength === "weak"
                    ? "33%"
                    : strength === "medium"
                    ? "66%"
                    : "100%",
              }}
            />
          </div>
          <span className="ml-2 text-gray-600 dark:text-gray-300">{strengthText}</span>
        </div>
      )}
    </div>
  );
};

export default PasswordInput;