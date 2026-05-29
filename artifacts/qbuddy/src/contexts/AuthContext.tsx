import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Runner } from "@workspace/api-client-react";

interface AuthState {
  token: string | null;
  role: "user" | "runner" | "admin" | null;
  user: User | null;
  runner: Runner | null;
}

interface AuthContextType extends AuthState {
  login: (token: string, role: string, userData?: User, runnerData?: Runner) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = localStorage.getItem("qbuddy_auth");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return { token: null, role: null, user: null, runner: null };
      }
    }
    return { token: null, role: null, user: null, runner: null };
  });

  const login = (token: string, role: string, userData?: User, runnerData?: Runner) => {
    const newState: AuthState = {
      token,
      role: role as "user" | "runner" | "admin",
      user: userData || null,
      runner: runnerData || null,
    };
    setAuth(newState);
    localStorage.setItem("qbuddy_auth", JSON.stringify(newState));
  };

  const logout = () => {
    setAuth({ token: null, role: null, user: null, runner: null });
    localStorage.removeItem("qbuddy_auth");
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
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
