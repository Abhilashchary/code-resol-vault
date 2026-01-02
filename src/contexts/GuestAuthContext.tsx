import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const ADMIN_PASSWORD = "coderesol";
const ADMIN_SESSION_KEY = "admin_session";
const USERNAME_KEY = "guest_username";

interface GuestAuthContextType {
  username: string | null;
  isAdmin: boolean;
  loading: boolean;
  setUsername: (name: string) => void;
  loginAsAdmin: (password: string) => boolean;
  logout: () => void;
  logoutAdmin: () => void;
}

const GuestAuthContext = createContext<GuestAuthContextType | undefined>(undefined);

export const GuestAuthProvider = ({ children }: { children: ReactNode }) => {
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

  return (
    <GuestAuthContext.Provider
      value={{
        username,
        isAdmin,
        loading,
        setUsername,
        loginAsAdmin,
        logout,
        logoutAdmin,
      }}
    >
      {children}
    </GuestAuthContext.Provider>
  );
};

export const useGuestAuth = () => {
  const context = useContext(GuestAuthContext);
  if (context === undefined) {
    throw new Error("useGuestAuth must be used within a GuestAuthProvider");
  }
  return context;
};
