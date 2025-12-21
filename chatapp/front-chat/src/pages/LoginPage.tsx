import { useState } from "react";
import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../components/ui/PasswordInput";
import { login } from "../api/auth";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
      navigate("/"); // ← SPA-навигация без перезагрузки
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Уберите Google-авторизацию, пока не реализуете её в бэкенде
  const handleGoogleLogin = () => {
    alert("Google login not implemented yet");
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background dark:bg-dark-background">
      <div className="max-w-lg w-full bg-white/20 dark:bg-dark-surface/30 backdrop-blur-2xl 
        border border-white/30 dark:border-dark-border rounded-3xl 
        shadow-[0_8px_40px_rgba(0,0,0,0.15),_0_4px_16px_rgba(0,0,0,0.08)] p-8">

        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="text-text-dark dark:text-dark-text-light" size={32} />
            <span className="h-6 w-px bg-neutral-300 dark:bg-dark-border"></span>
            <span className="text-xl font-semibold text-text-dark dark:text-dark-text-light">
              Добро пожаловать
            </span>
          </div>
          <p className="mt-2 text-sm text-text-muted dark:text-dark-text-muted">
            Войти в аккаунт
          </p>
        </div>

        {/* Divider */}
        <div className="w-full border-t border-neutral-100 dark:border-white/10 my-8"></div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleLogin}>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-dark dark:text-dark-text-light mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-dark-border
              bg-white dark:bg-dark-input text-text-dark dark:text-dark-text-light
              focus:ring-2 focus:ring-primary-hover focus:border-primary-hover outline-none transition-all"
            />
          </div>

          {/* Password */}
          <PasswordInput value={password} onChange={setPassword} showStrength={false}/>

          {/* Error */}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {/* Remember + Link */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-neutral-300 dark:border-dark-border 
                text-primary focus:ring-primary-hover"
              />
              <span className="ml-2 text-sm text-text-dark dark:text-dark-text-muted">
                Запомнить меня
              </span>
            </label>

            <a
              href="/forgot-password"
              className="text-sm text-primary hover:text-primary-hover transition-colors"
            >
              Забыли пароль?
            </a>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary text-text-light font-medium
            shadow-[0_4px_20px_rgba(0,0,0,0.12)]
            hover:bg-primary-hover hover:shadow-[0_6px_26px_rgba(0,0,0,0.18)]
            active:scale-[0.97] active:shadow-[0_2px_12px_rgba(0,0,0,0.12)]
            transition-all"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        {/* Divider “или” */}
        <div className="relative flex items-center w-full my-8">
          <span className="flex-grow border-t border-neutral-100 dark:border-white/10"></span>
          <span className="mx-4 text-sm text-neutral-400 dark:text-dark-text-muted">или</span>
          <span className="flex-grow border-t border-neutral-100 dark:border-white/10"></span>
        </div>

        {/* Social buttons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Google */}
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 bg-white dark:bg-dark-surface 
            text-gray-700 dark:text-dark-text-light text-sm p-2 rounded-md 
            hover:bg-gray-50 dark:hover:bg-dark-border 
            border border-neutral-200 dark:border-dark-border 
            transition-colors duration-300"
          >
            <svg className="w-4" viewBox="0 0 512 512">
              <path fill="#fbbb00" d="M113.47 309.408 95.648 375.94..."></path>
            </svg>
            Войти через Google
          </button>

          {/* GitHub (пока без Firebase) */}
          <button className="w-full flex justify-center items-center gap-2 bg-white dark:bg-dark-surface 
            text-gray-700 dark:text-dark-text-light text-sm p-2 rounded-md 
            hover:bg-gray-50 dark:hover:bg-dark-border 
            border border-neutral-200 dark:border-dark-border 
            transition-colors duration-300"
          >
            <svg viewBox="0 0 16 16" className="w-4"><path d="M7.999 0C3.582..." /></svg>
            Войти через Github
          </button>
        </div>

        {/* SSO + Register */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
          <button className="w-full flex justify-center items-center gap-2 bg-white dark:bg-dark-surface
            text-gray-700 dark:text-dark-text-light text-sm p-2 rounded-md
            hover:bg-gray-50 dark:hover:bg-dark-border 
            border border-neutral-200 dark:border-dark-border transition-colors">
            SSO
          </button>

          <a href="/register" className="w-full flex justify-center items-center gap-2 bg-white dark:bg-dark-surface
            text-gray-700 dark:text-dark-text-light text-sm p-2 rounded-md
            hover:bg-gray-50 dark:hover:bg-dark-border 
            border border-neutral-200 dark:border-dark-border transition-colors">
            Регистрация
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;