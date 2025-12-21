// src/components/ProtectedRoute.tsx
import { useEffect, useState } from "react";
import { isTokenExpired, refreshToken, getAccessToken } from "../api/auth";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!getAccessToken()) {
        window.location.href = "/login";
        return;
      }

      if (isTokenExpired()) {
        try {
          await refreshToken();
        } catch {
          window.location.href = "/login";
          return;
        }
      }

      setAuthenticated(true);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) return <div>Loading...</div>;
  return authenticated ? <>{children}</> : null;
};

export default ProtectedRoute;