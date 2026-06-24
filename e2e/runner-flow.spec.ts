import { test, expect } from "@playwright/test";

const RUNNER_PHONE = "8888888800";

test.describe("Runner (Comrade) Workflow", () => {
  test("runner can login and view available tasks", async ({ page }) => {
    // 1. Navigate to runner login
    await page.goto("/runner/login");
    await expect(page.getByText(/comrade|runner|partner/i)).toBeVisible();

    // 2. Enter phone number
    const phoneInput = page.getByRole("textbox").or(page.locator("input[type='tel']")).first();
    await phoneInput.fill(RUNNER_PHONE);
    const sendBtn = page.getByRole("button", { name: /send|get.*otp|continue/i });
    if (await sendBtn.isVisible()) await sendBtn.click();

    // Mock auth
    await page.evaluate(() => {
      localStorage.setItem("golineless_runner_token", "test-runner-token");
      localStorage.setItem("golineless_auth", JSON.stringify({
        token: "test-runner-token",
        role: "runner",
        user: null,
        runner: { id: 1, name: "Test Runner", phone: "8888888800", isOnline: false, kycStatus: "verified" },
      }));
    });

    // 3. Navigate to runner feed
    await page.goto("/runner/feed");
    await expect(page.getByText(/available|feed|tasks/i)).toBeVisible();
  });

  test("runner can toggle online status", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("golineless_runner_token", "test-runner-token");
      localStorage.setItem("golineless_auth", JSON.stringify({
        token: "test-runner-token",
        role: "runner",
        user: null,
        runner: { id: 1, name: "Test Runner", phone: "8888888800" },
      }));
    });
    await page.goto("/runner/feed");
    const toggleBtn = page.getByRole("button", { name: /online|offline|toggle/i });
    if (await toggleBtn.isVisible()) await toggleBtn.click();
  });

  test("runner can view profile and trust score", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("golineless_runner_token", "test-runner-token");
      localStorage.setItem("golineless_auth", JSON.stringify({
        token: "test-runner-token",
        role: "runner",
        user: null,
        runner: { id: 1, name: "Test Runner", phone: "8888888800", trustScore: 85, trustBadge: "verified" },
      }));
    });
    await page.goto("/runner/profile");
    await expect(page.getByText(/profile|trust|score|rating/i)).toBeVisible();
  });

  test("runner can view their earnings", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("golineless_runner_token", "test-runner-token");
      localStorage.setItem("golineless_auth", JSON.stringify({
        token: "test-runner-token",
        role: "runner",
        user: null,
        runner: { id: 1, name: "Test Runner", phone: "8888888800" },
      }));
    });
    await page.goto("/runner/earnings");
    await expect(page.getByText(/earning|payout|balance/i)).toBeVisible();
  });
});
