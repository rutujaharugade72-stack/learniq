import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore login from a previous session
  useEffect(() => {
    const savedToken = localStorage.getItem("learniq_token");
    const savedUser = localStorage.getItem("learniq_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        /* ignore invalid JSON */
      }
    }
    setLoading(false);
  }, []);

  function login(newToken, newUser) {
    localStorage.setItem("learniq_token", newToken);
    localStorage.setItem("learniq_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function updateUser(partial) {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("learniq_user", JSON.stringify(next));
      return next;
    });
  }

  function logout() {
    localStorage.removeItem("learniq_token");
    localStorage.removeItem("learniq_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}