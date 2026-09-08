import { expect, test } from "@playwright/test";

// Excluded from `npm run test:e2e` (see playwright.config.ts): this one talks
// to the real model through OPENROUTER_API_KEY, so it costs money per run.
// Run it with `npm run test:e2e:llm`.
// A model call and a tool round trip do not fit the default per-test budget.
test.setTimeout(120_000);

test("the tutor puts what it is asked onto the sidebar", async ({ page }) => {
  // Hits data/app.db like tests/e2e/auth.spec.ts, so the email is per-run.
  const email = `e2e-llm-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page).toHaveURL("/");

  const sidebar = page.getByRole("complementary");
  await expect(sidebar.getByText("Nothing on it yet.")).toBeVisible();

  const input = page.getByPlaceholder("Add something to the list…");
  await input.fill("Please add 'buy milk' to my list.");
  // The composer's send button; Enter in the textarea does not submit.
  await page.getByTestId("copilot-send-button").click();

  // Cleared means the composer accepted it and the run is under way.
  await expect(input).toHaveValue("");

  // A model call plus the tool round trip, then the sidebar's own refetch.
  await expect(sidebar.getByText(/buy milk/i)).toBeVisible({ timeout: 90_000 });

  // The transcript shows the tool call itself, not just the reply after it.
  const transcript = page.getByRole("main");
  await expect(transcript.getByText("Added")).toBeVisible();

  // It is the stored list, not just this render: a reload re-reads the table.
  await page.reload();
  await expect(sidebar.getByText(/buy milk/i)).toBeVisible();
});
