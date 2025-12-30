import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api, type User } from "./api";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, schoolSlug?: string) => Promise<void>;
  register: (email: string, password: string, name: string, schoolSlug?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [_, setLocation] = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      api.clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string, schoolSlug?: string) {
    const response = await api.login(email, password, schoolSlug);
    setUser(response.user);
    setLocation("/dashboard");
  }

  async function register(email: string, password: string, name: string, schoolSlug?: string) {
    const response = await api.register(email, password, name, "user", schoolSlug);
    setUser(response.user);
    setLocation("/dashboard");
  }

  function logout() {
    api.clearToken();
    setUser(null);
    setLocation("/");
  }

  async function refreshUser() {
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      // Ignore errors on refresh
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
