import { useState, useEffect, useCallback } from "react";

const ADMIN_PASSWORD = "coderesol";
const ADMIN_SESSION_KEY = "admin_session";
const USERNAME_KEY = "guest_username";

export const useGuestAuth = () => {
  const [username, setUsernameState] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load username from localStorage
    const storedUsername = localStorage.getItem(USERNAME_KEY);
    const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);
    
    if (storedUsername) {
      setUsernameState(storedUsername);
    }
    
    if (adminSession) {
      // Verify admin session is still valid (24 hours)
      try {
        const session = JSON.parse(adminSession);
        if (session.expiresAt > Date.now()) {
          setIsAdmin(true);
        } else {
          localStorage.removeItem(ADMIN_SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
    }
    
    setLoading(false);
  }, []);

  const setUsername = useCallback((name: string) => {
    localStorage.setItem(USERNAME_KEY, name);
    setUsernameState(name);
  }, []);

  const loginAsAdmin = useCallback((password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      const session = {
        token: crypto.randomUUID(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
      setIsAdmin(true);
      // Also set admin as username if not already set
      if (!localStorage.getItem(USERNAME_KEY)) {
        setUsername("Admin");
      }
      return true;
    }
    return false;
  }, [setUsername]);

  const logout = useCallback(() => {
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setUsernameState(null);
    setIsAdmin(false);
  }, []);

  const logoutAdmin = useCallback(() => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAdmin(false);
  }, []);

  return {
    username,
    isAdmin,
    loading,
    setUsername,
    loginAsAdmin,
    logout,
    logoutAdmin,
  };
};
