import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import type { User, Runner } from "@workspace/api-client-react";

// Helper component that uses useAuth and renders state for testing
function TestConsumer() {
  const { token, role, user, runner, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? "null"}</span>
      <span data-testid="role">{role ?? "null"}</span>
      <span data-testid="user-name">{user?.name ?? "null"}</span>
      <span data-testid="runner-name">{runner?.name ?? "null"}</span>
      <button data-testid="login-btn" onClick={() => login("test-token", "user", { id: 1, name: "Test User", phone: "+911234567890", email: "test@example.com" } as User)}>
        Login
      </button>
      <button data-testid="login-runner-btn" onClick={() => login("runner-token", "runner", undefined, { id: 1, name: "Test Runner", phone: "+911234567891" } as Runner)}>
        Login Runner
      </button>
      <button data-testid="login-admin-btn" onClick={() => login("admin-token-123", "admin")}>
        Login Admin
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

// Component that throws when used outside provider (no wrapping AuthProvider)
function OrphanConsumer() {
  useAuth();
  return <div>Should not render</div>;
}

// Mock user data
const mockUser: User = {
  id: 1,
  name: "Test User",
  phone: "+911234567890",
  email: "test@example.com",
  address: "123 Test St",
  createdAt: new Date("2025-01-01"),
} as User;

const mockRunner: Runner = {
  id: 1,
  name: "Test Runner",
  phone: "+911234567891",
  kycStatus: "verified",
  isOnline: true,
  trustScore: 85,
} as Runner;

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("AuthProvider", () => {
    it("provides default null state when no stored auth", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      expect(screen.getByTestId("token").textContent).toBe("null");
      expect(screen.getByTestId("role").textContent).toBe("null");
      expect(screen.getByTestId("user-name").textContent).toBe("null");
      expect(screen.getByTestId("runner-name").textContent).toBe("null");
    });

    it("restores auth state from localStorage on mount", () => {
      localStorage.setItem(
        "golineless_auth",
        JSON.stringify({
          token: "saved-token",
          role: "user",
          user: { id: 1, name: "Saved User" },
          runner: null,
        })
      );
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      expect(screen.getByTestId("token").textContent).toBe("saved-token");
      expect(screen.getByTestId("role").textContent).toBe("user");
      expect(screen.getByTestId("user-name").textContent).toBe("Saved User");
    });

    it("handles corrupted localStorage gracefully", () => {
      localStorage.setItem("golineless_auth", "not-valid-json{{{");
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      expect(screen.getByTestId("token").textContent).toBe("null");
      expect(screen.getByTestId("role").textContent).toBe("null");
    });

    it("handles empty string in localStorage", () => {
      localStorage.setItem("golineless_auth", "");
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      expect(screen.getByTestId("token").textContent).toBe("null");
    });

    it("handles null stored value (JSON null)", () => {
      localStorage.setItem("golineless_auth", "null");
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      expect(screen.getByTestId("token").textContent).toBe("null");
    });

    it("restores runner auth state from localStorage", () => {
      localStorage.setItem(
        "golineless_auth",
        JSON.stringify({
          token: "runner-token",
          role: "runner",
          user: null,
          runner: { id: 2, name: "Saved Runner" },
        })
      );
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      expect(screen.getByTestId("token").textContent).toBe("runner-token");
      expect(screen.getByTestId("role").textContent).toBe("runner");
      expect(screen.getByTestId("runner-name").textContent).toBe("Saved Runner");
    });

    it("restores admin auth state from localStorage", () => {
      localStorage.setItem(
        "golineless_auth",
        JSON.stringify({
          token: "admin-token",
          role: "admin",
          user: null,
          runner: null,
        })
      );
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      expect(screen.getByTestId("token").textContent).toBe("admin-token");
      expect(screen.getByTestId("role").textContent).toBe("admin");
    });
  });

  describe("login", () => {
    it("updates state with user data on login", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      act(() => {
        fireEvent.click(screen.getByTestId("login-btn"));
      });
      expect(screen.getByTestId("token").textContent).toBe("test-token");
      expect(screen.getByTestId("role").textContent).toBe("user");
      expect(screen.getByTestId("user-name").textContent).toBe("Test User");
    });

    it("persists auth state to localStorage on login", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      act(() => {
        fireEvent.click(screen.getByTestId("login-btn"));
      });
      const stored = JSON.parse(localStorage.getItem("golineless_auth")!);
      expect(stored.token).toBe("test-token");
      expect(stored.role).toBe("user");
      expect(stored.user.name).toBe("Test User");
      expect(stored.runner).toBeNull();
    });

    it("stores role-specific token on user login", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      act(() => {
        fireEvent.click(screen.getByTestId("login-btn"));
      });
      expect(localStorage.getItem("golineless_user_token")).toBe("test-token");
      expect(localStorage.getItem("golineless_admin_token")).toBeNull();
      expect(localStorage.getItem("golineless_runner_token")).toBeNull();
    });

    it("stores role-specific token on runner login", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      act(() => {
        fireEvent.click(screen.getByTestId("login-runner-btn"));
      });
      expect(localStorage.getItem("golineless_runner_token")).toBe("runner-token");
      expect(localStorage.getItem("golineless_user_token")).toBeNull();
    });

    it("stores role-specific token on admin login", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      act(() => {
        fireEvent.click(screen.getByTestId("login-admin-btn"));
      });
      expect(localStorage.getItem("golineless_admin_token")).toBe("admin-token-123");
      expect(localStorage.getItem("golineless_runner_token")).toBeNull();
    });

    it("persists full runner data to localStorage", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      act(() => {
        fireEvent.click(screen.getByTestId("login-runner-btn"));
      });
      const stored = JSON.parse(localStorage.getItem("golineless_auth")!);
      expect(stored.token).toBe("runner-token");
      expect(stored.role).toBe("runner");
      expect(stored.runner.name).toBe("Test Runner");
    });

    it("clears previous user data when logging in with different role", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      // Login as user first
      act(() => {
        fireEvent.click(screen.getByTestId("login-btn"));
      });
      expect(screen.getByTestId("user-name").textContent).toBe("Test User");
      // Then login as runner - should replace state
      act(() => {
        fireEvent.click(screen.getByTestId("login-runner-btn"));
      });
      expect(screen.getByTestId("token").textContent).toBe("runner-token");
      expect(screen.getByTestId("role").textContent).toBe("runner");
      // Runner has no user data
      expect(screen.getByTestId("user-name").textContent).toBe("null");
      expect(screen.getByTestId("runner-name").textContent).toBe("Test Runner");
    });

    it("handles login without user or runner data", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      act(() => {
        fireEvent.click(screen.getByTestId("login-admin-btn"));
      });
      expect(screen.getByTestId("token").textContent).toBe("admin-token-123");
      expect(screen.getByTestId("role").textContent).toBe("admin");
      expect(screen.getByTestId("user-name").textContent).toBe("null");
      expect(screen.getByTestId("runner-name").textContent).toBe("null");
    });
  });

  describe("logout", () => {
    it("clears state on logout", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      // Login first
      act(() => {
        fireEvent.click(screen.getByTestId("login-btn"));
      });
      expect(screen.getByTestId("token").textContent).not.toBe("null");
      // Then logout
      act(() => {
        fireEvent.click(screen.getByTestId("logout-btn"));
      });
      expect(screen.getByTestId("token").textContent).toBe("null");
      expect(screen.getByTestId("role").textContent).toBe("null");
      expect(screen.getByTestId("user-name").textContent).toBe("null");
      expect(screen.getByTestId("runner-name").textContent).toBe("null");
    });

    it("removes main auth from localStorage on logout", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      act(() => {
        fireEvent.click(screen.getByTestId("login-btn"));
      });
      expect(localStorage.getItem("golineless_auth")).not.toBeNull();
      act(() => {
        fireEvent.click(screen.getByTestId("logout-btn"));
      });
      expect(localStorage.getItem("golineless_auth")).toBeNull();
    });

    it("removes all role-specific tokens from localStorage on logout", () => {
      // Set up multiple tokens
      localStorage.setItem("golineless_admin_token", "admin-token");
      localStorage.setItem("golineless_user_token", "user-token");
      localStorage.setItem("golineless_runner_token", "runner-token");
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      act(() => {
        fireEvent.click(screen.getByTestId("logout-btn"));
      });
      expect(localStorage.getItem("golineless_admin_token")).toBeNull();
      expect(localStorage.getItem("golineless_user_token")).toBeNull();
      expect(localStorage.getItem("golineless_runner_token")).toBeNull();
    });

    it("is safe to logout when already logged out", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      expect(screen.getByTestId("token").textContent).toBe("null");
      // Calling logout when already null should not throw
      act(() => {
        fireEvent.click(screen.getByTestId("logout-btn"));
      });
      expect(screen.getByTestId("token").textContent).toBe("null");
    });
  });

  describe("useAuth hook", () => {
    it("throws when used outside AuthProvider", () => {
      // Suppress console.error for expected error
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<OrphanConsumer />)).toThrow(
        "useAuth must be used within an AuthProvider"
      );
      consoleSpy.mockRestore();
    });

    it("provides working context inside AuthProvider", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      // Should render without throwing
      expect(screen.getByTestId("token")).toBeInTheDocument();
      expect(screen.getByTestId("login-btn")).toBeInTheDocument();
      expect(screen.getByTestId("logout-btn")).toBeInTheDocument();
    });
  });
});
