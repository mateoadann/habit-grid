import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, setOnUnauthorized } from "../services/api.js";

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await apiPost("/auth/logout");
    } catch (_) {
      // ignore
    }
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => setUser(null));

    apiGet("/auth/me")
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiPost("/auth/login", { username, password });
    setUser(data);
    return data;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

export { AuthProvider, useAuth };
