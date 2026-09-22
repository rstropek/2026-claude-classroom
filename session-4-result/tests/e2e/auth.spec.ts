import { expect, test } from "@playwright/test";

// Runs against the real dev server and data/app.db, so the email has to be
// unique per run rather than a fixture.
test("sign up, land on the gated home page, sign out, and get redirected", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Grace Hopper");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Grace Hopper")).toBeVisible();

  // The chat is client-rendered against /api/copilotkit; an input means the
  // CopilotKit provider mounted and reached the runtime.
  await expect(
    page.getByPlaceholder("Add something to the list\u2026"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");

  // The gate is server-side, so a direct visit bounces too.
  await page.goto("/");
  await expect(page).toHaveURL("/login");
});
