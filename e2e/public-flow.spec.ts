import { expect, test } from "@playwright/test";

test("public flow exposes the real onboarding and verifier paths", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /KYC,/ })).toBeVisible();
  await page.getByRole("link", { name: /Start real onboarding/ }).click();
  await expect(page.getByRole("heading", { name: "Establish your private identity." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect MetaMask" })).toBeVisible();

  await page.goto("/verifier");
  await expect(page.getByRole("heading", { name: "Request claims, not documents." })).toBeVisible();
  await expect(page.getByText("Allowed egress")).toBeVisible();
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
