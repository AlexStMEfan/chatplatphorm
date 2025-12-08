// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAccessToken, isTokenExpired, refreshToken } from "./api/auth";
import { useEffect, useState } from "react";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ChatPage from "./pages/ChatPage";
import WindowChat from "./components/WindowChat";
import WindowNotification from "./components/WindowNotification";
import WindowNews from "./components/WindowNews";
import WindowMeeting from "./components/WindowMeeting";
import WindowCalendar from "./components/WindowCalendar";

// Защищённый layout-компонент
const ProtectedLayout = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      if (isTokenExpired()) {
        try {
          await refreshToken();
          setIsAuthenticated(true);
        } catch {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(true);
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
  }

  if (!isAuthenticated) {
    // Сохраняем URL для редиректа после входа
    const currentPath = window.location.pathname + window.location.search;
    localStorage.setItem('redirect_after_login', currentPath);
    return <Navigate to="/login" replace />;
  }

  return <ChatPage />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        {/* Защищённый layout с вложенными маршрутами */}
        <Route path="/" element={<ProtectedLayout />}>
        <Route path="chats" element={<WindowChat />} />
        <Route path="notifications" element={<WindowNotification />} />
        <Route path="news" element={<WindowNews />} />
        <Route path="calls" element={<WindowMeeting />} />
        <Route path="calendar" element={<WindowCalendar />} />
          
          {/* Основные вложенные маршруты */}
          <Route path="chats/*" element={<Navigate to="" replace />} />
          <Route path="notifications/*" element={<Navigate to="" replace />} />
          <Route path="news/*" element={<Navigate to="" replace />} />
          <Route path="calls/*" element={<Navigate to="" replace />} />
          <Route path="calendar/*" element={<Navigate to="" replace />} />
        </Route>
        
        {/* Обработка 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;