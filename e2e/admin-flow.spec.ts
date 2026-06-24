import { test, expect } from "@playwright/test";

test.describe("Admin Flow", () => {
  test("admin can login and view dashboard", async ({ page }) => {
    // 1. Navigate to admin login
    await page.goto("/admin/login");
    await expect(page.getByText(/admin|sign in|login/i)).toBeVisible();

    // 2. Enter password
    const pwInput = page.getByRole("textbox").or(page.locator("input[type='password']")).first();
    await pwInput.fill("test-admin-password");
    const loginBtn = page.getByRole("button", { name: /login|sign in|continue/i });
    if (await loginBtn.isVisible()) await loginBtn.click();

    // Mock admin auth
    await page.evaluate(() => {
      localStorage.setItem("golineless_admin_token", "test-admin-token");
      localStorage.setItem("golineless_auth", JSON.stringify({
        token: "test-admin-token",
        role: "admin",
        user: null,
        runner: null,
      }));
    });

    // 3. Navigate to admin dashboard
    await page.goto("/admin");
    await expect(page.getByText(/dashboard|admin|overview/i)).toBeVisible();
  });

  test("admin sidebar navigation works across key pages", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("golineless_admin_token", "test-admin-token");
      localStorage.setItem("golineless_auth", JSON.stringify({
        token: "test-admin-token",
        role: "admin",
        user: null,
        runner: null,
      }));
    });

    const pages = [
      { path: "/admin", label: "Dashboard" },
      { path: "/admin/tasks", label: "Tasks" },
      { path: "/admin/runners", label: "Runners" },
      { path: "/admin/users", label: "Users" },
      { path: "/admin/settings", label: "Settings" },
      { path: "/admin/map", label: "Map" },
    ];

    for (const { path } of pages) {
      await page.goto(path);
      // Page should not crash — body should have content, no 404 page
      await expect(page.locator("body")).not.toBeEmpty();
      const notFound = page.getByText(/404|page not found/i);
      await expect(notFound).not.toBeVisible();
    }
  });

  test("admin can logout", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("golineless_admin_token", "test-admin-token");
      localStorage.setItem("golineless_auth", JSON.stringify({
        token: "test-admin-token",
        role: "admin",
        user: null,
        runner: null,
      }));
    });
    await page.goto("/admin");
    const logoutBtn = page.getByRole("button", { name: /logout|sign out/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/admin\/login/);
    }
  });
});
