import { useState } from "react";
import { Building2 } from "lucide-react";
import { auth } from "../firebase"; // твой firebase конфиг
import { sendPasswordResetEmail } from "firebase/auth";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email) {
      setError("Введите ваш email");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Письмо для сброса пароля отправлено на ваш email");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
            Восстановление пароля
          </p>
        </div>

        {/* Divider */}
        <div className="relative flex items-center w-full my-10">
          <div className="grow border-t border-neutral-200 dark:border-white/10"></div>
          <span className="mx-4 text-sm text-neutral-400 dark:text-white/40">•</span>
          <div className="grow border-t border-neutral-200 dark:border-white/10"></div>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleResetPassword}>
          {/* Email Field */}
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
              placeholder="your@email.com"
            />
          </div>

          {/* Error / Success Message */}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-text-light bg-primary font-medium py-2.5 rounded-xl transition-all duration-200
              shadow-[0_4px_20px_rgba(0,0,0,0.12)]
              hover:bg-primary-hover hover:shadow-[0_6px_24px_rgba(0,0,0,0.18)]
              active:scale-[0.97] active:shadow-[0_2px_12px_rgba(0,0,0,0.12)]
              focus:ring-2 focus:ring-primary-hover focus:ring-offset-2 focus:ring-offset-background dark:focus:ring-offset-dark-background"
          >
            {loading ? "Отправка..." : "Отправить письмо"}
          </button>
        </form>

        {/* Bottom Links */}
        <div className="mt-6 flex flex-col lg:flex-row items-center justify-between gap-2">
          <a
            href="/login"
            className="w-full lg:w-1/2 text-center text-sm text-primary hover:text-primary-hover transition"
          >
            Вспомнили пароль?
          </a>

          <a
            href="/register"
            className="w-full lg:w-1/2 text-center text-sm text-primary hover:text-primary-hover transition"
          >
            Зарегистрироваться
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;