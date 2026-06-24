import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Runner } from "@workspace/api-client-react";

interface AuthState {
  token: string | null;
  role: "user" | "runner" | "admin" | null;
  user: User | null;
  runner: Runner | null;
}

interface AuthContextType extends AuthState {
  isLoading: boolean;
  login: (token: string, role: string, userData?: User, runnerData?: Runner) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = localStorage.getItem("golineless_auth");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return { token: null, role: null, user: null, runner: null };
      }
    }
    return { token: null, role: null, user: null, runner: null };
  });

  // Mark loading as done after first render (auth initialized from localStorage)
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = (token: string, role: string, userData?: User, runnerData?: Runner) => {
    const newState: AuthState = {
      token,
      role: role as "user" | "runner" | "admin",
      user: userData || null,
      runner: runnerData || null,
    };
    setAuth(newState);
    localStorage.setItem("golineless_auth", JSON.stringify(newState));
    // Also store token in individual keys so customFetch auto-attaches it
    if (role === "admin") localStorage.setItem("golineless_admin_token", token);
    else if (role === "runner") localStorage.setItem("golineless_runner_token", token);
    else localStorage.setItem("golineless_user_token", token);
  };

  const logout = () => {
    setAuth({ token: null, role: null, user: null, runner: null });
    localStorage.removeItem("golineless_auth");
    localStorage.removeItem("golineless_admin_token");
    localStorage.removeItem("golineless_user_token");
    localStorage.removeItem("golineless_runner_token");
  };

  return (
    <AuthContext.Provider value={{ ...auth, isLoading, login, logout }}>
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
