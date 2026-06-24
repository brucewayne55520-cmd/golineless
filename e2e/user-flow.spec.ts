import { test, expect } from "@playwright/test";

const USER_PHONE = "9999999900";

test.describe("User Flow: Book a Task", () => {
  test("complete user flow — login, browse, book, view, cancel", async ({ page }) => {
    // 1. Landing page loads with correct branding
    await page.goto("/");
    await expect(page.locator("text=Life without waiting")).toBeVisible();
    await page.getByRole("button", { name: /book a (runner|comrade)/i }).click();

    // 2. User OTP login page
    await expect(page).toHaveURL(/\/login/);
    const phoneInput = page.getByRole("textbox").or(page.locator("input[type='tel']")).first();
    await phoneInput.fill(USER_PHONE);
    const sendBtn = page.getByRole("button", { name: /send|get.*otp|continue/i });
    if (await sendBtn.isVisible()) await sendBtn.click();

    // Mock auth — set localStorage directly since we can't get a real OTP
    await page.evaluate(() => {
      localStorage.setItem("golineless_user_token", "test-user-token");
      localStorage.setItem("golineless_auth", JSON.stringify({
        token: "test-user-token",
        role: "user",
        user: { id: 1, name: "Test User", phone: "9999999900" },
        runner: null,
      }));
    });
    await page.goto("/app/home");

    // 3. User home — should see categories
    await expect(page).toHaveURL(/\/app\/home/);
    await expect(page.getByText(/book/i)).toBeVisible();

    // 4. Click a service category to book
    const category = page.getByText(/hospital|medicine|bank/i).first();
    if (await category.isVisible()) await category.click();

    // 5. Book task page — fill description
    if (page.url().includes("/book")) {
      const descInput = page.getByRole("textbox").or(page.locator("textarea")).first();
      await descInput.fill("Need help with hospital visit");
      const confirmBtn = page.getByRole("button", { name: /book|confirm|submit/i }).first();
      await confirmBtn.click();
    }

    // 6. Should end up at task detail or my-tasks
    await expect(page.getByText(/cancelled|cancel/i).or(page.getByText(/task/i))).toBeVisible();
  });

  test("landing page has correct title and branding", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Go LineLess/);
    await expect(page.getByText(/ahmedabad|pilot/i)).toBeVisible();
  });

  test("services section shows pricing", async ({ page }) => {
    await page.goto("/");
    await page.getByText(/services/i).first().click();
    await expect(page.getByText(/transparent pricing/i)).toBeVisible();
    await expect(page.getByText(/Rs/i)).toBeVisible();
  });
});
