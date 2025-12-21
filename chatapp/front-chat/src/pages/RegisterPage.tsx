import { useState } from "react";
import { Building2 } from "lucide-react";
import PasswordInput from "../components/ui/PasswordInput";
import { register } from "../api/auth";

const RegisterPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      await register({ email, password, name: fullName });
      // Перенаправление на страницу входа
      window.location.href = "/login";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    alert("Google registration not implemented yet");
  };


  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background dark:bg-dark-background px-4">
      <div className="max-w-lg w-full bg-white/20 dark:bg-white/10 backdrop-blur-2xl 
      border border-white/25 dark:border-white/20 rounded-3xl 
      shadow-[0_8px_40px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.08)] p-8">

        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex justify-center items-center">
            <Building2 className="text-black dark:text-white" size={30} />
            <span className="flex h-[25px] mx-3 w-0.5 bg-neutral-200 dark:bg-dark-border" />
            <span className="text-lg md:text-2xl text-text-dark dark:text-white font-semibold">
              Добро пожаловать
            </span>
          </div>
          <p className="text-sm md:text-xs text-text-muted dark:text-white/50 mt-1">
            Создание нового аккаунта
          </p>
        </div>

        {/* Divider */}
        <div className="relative flex items-center w-full my-10">
          <div className="grow border-t border-neutral-200 dark:border-white/10"></div>
          <span className="mx-4 text-sm text-neutral-400 dark:text-white/40">•</span>
          <div className="grow border-t border-neutral-200 dark:border-white/10"></div>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleRegister}>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ваше имя
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-white/20 rounded-lg 
              bg-white/60 dark:bg-white/10 text-gray-800 dark:text-white 
              focus:ring-2 focus:ring-primary-hover focus:border-primary-hover 
              outline-none transition-all"
              placeholder="Иван Иванов"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-200 dark:border-white/20 rounded-lg 
              bg-white/60 dark:bg-white/10 text-gray-800 dark:text-white 
              focus:ring-2 focus:ring-primary-hover focus:border-primary-hover 
              outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <PasswordInput label="Пароль" value={password} onChange={setPassword} />

          {/* Confirm Password */}
          <PasswordInput label="Подтверждение пароля" value={confirmPassword} onChange={setConfirmPassword} showStrength={false} />

          {/* Error */}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-text-light bg-primary font-medium py-2.5 rounded-xl transition-all duration-200
            shadow-[0_4px_20px_rgba(0,0,0,0.12)]
            hover:bg-primary-hover hover:shadow-[0_6px_24px_rgba(0,0,0,0.18)]
            active:scale-[0.97] active:shadow-[0_2px_12px_rgba(0,0,0,0.12)]
            focus:ring-2 focus:ring-primary-hover focus:ring-offset-2 
            focus:ring-offset-background dark:focus:ring-offset-dark-background"
          >
            {loading ? "Регистрация..." : "Создать аккаунт"}
          </button>
        </form>

        {/* Social buttons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleRegister}
            className="w-full flex justify-center items-center gap-2 bg-white dark:bg-dark-surface 
            text-gray-700 dark:text-dark-text-light text-sm p-2 rounded-md 
            hover:bg-gray-50 dark:hover:bg-dark-border 
            border border-neutral-200 dark:border-dark-border 
            transition-colors duration-300"
          >
            Войти через Google
          </button>

          <a
            href="/login"
            className="w-full flex justify-center items-center gap-2 bg-white dark:bg-dark-surface
            text-gray-700 dark:text-dark-text-light text-sm p-2 rounded-md
            hover:bg-gray-50 dark:hover:bg-dark-border 
            border border-neutral-200 dark:border-dark-border transition-colors"
          >
            Уже есть аккаунт?
          </a>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;