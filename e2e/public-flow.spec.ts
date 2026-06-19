import { expect, test } from "@playwright/test";

test("public flow exposes onboarding and the relying-party bank demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /KYC,/ })).toBeVisible();
  await page.getByRole("link", { name: /Start real onboarding/ }).click();
  await expect(page.getByRole("heading", { name: "Establish your private identity." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect MetaMask" })).toBeVisible();

  await page.goto("/northstar");
  await expect(page.getByRole("heading", { name: "Complete your banking profile." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Set up KYCPass" })).toBeVisible();
  await expect(page.getByText("Northstar Digital Bank is a demonstration relying party.")).toBeVisible();
});

test("navigation remains usable on a mobile viewport", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile project only");
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("link", { name: "Credentials" }).click();
  await expect(page.getByRole("heading", { name: "Only genuine issuance counts." })).toBeVisible();
});
