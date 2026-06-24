import { test, expect } from "@playwright/test";

test.describe("Family Tracking", () => {
  test("tracking page renders without errors", async ({ page }) => {
    await page.goto("/family/track/test-token-123");
    // Should not crash — body has content, no React error overlay
    await expect(page.locator("body")).not.toBeEmpty();
    const errorOverlay = page.locator("[role='alert'], .error, .error-boundary");
    await expect(errorOverlay).not.toBeVisible();
  });

  test("expired or invalid token does not crash the app", async ({ page }) => {
    await page.goto("/family/track/expired-token-999");
    // App should gracefully handle — either show a message or just not crash
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("family tracking does not redirect to login", async ({ page }) => {
    // Family tracking is public (no auth required)
    await page.goto("/family/track/public-token-456");
    const currentUrl = page.url();
    expect(currentUrl).toContain("/family/track/");
    expect(currentUrl).not.toContain("/login");
  });
});
