import { expect, test } from "@playwright/test";

// Runs against the real dev server and data/app.db, so the email has to be
// unique per run rather than a fixture. No model is involved: the wizard is
// still the scaffold, and a submit only writes the status line.
test("the wizard is gated, shows the card, and answers a submit", async ({
  page,
}) => {
  // The gate is server-side, so a direct visit bounces.
  await page.goto("/projects/new");
  await expect(page).toHaveURL("/login");

  const email = `e2e-wizard-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page).toHaveURL("/");
  await page.getByRole("link", { name: "New project" }).click();
  await expect(page).toHaveURL("/projects/new");

  await expect(
    page.getByRole("heading", { name: "Project card" }),
  ).toBeVisible();
  await expect(page.getByText("Criticality")).toBeVisible();
  await expect(page.getByText("medium")).toBeVisible();

  const instruction = page.getByLabel("Instruction");
  await instruction.fill("Plan a six month website relaunch");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Not connected to an agent yet.")).toBeVisible();
  await expect(instruction).toHaveValue("");

  // The link back reaches the chat.
  await page.getByRole("link", { name: "To-do chat" }).click();
  await expect(page).toHaveURL("/");
});
