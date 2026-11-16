// UI polish (#16): every page at 360 px and 1280 px in light and dark has no horizontal scroll and
// text contrast of at least 4.5:1 (3:1 for large text); a fresh user sees an empty state on every
// list; every failed action (network error, 400, 403) shows a message in role="status"; and the app
// works from the keyboard: visible focus ring on every tab stop, labelled controls, Escape closes the
// revoke confirmation, and Tab/Enter alone create a household and record an expense.
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";

const receipt = path.join(__dirname, "fixtures", "receipt.png");
const networkError = /couldn.t reach the server/i;

async function signUp(browser: Browser, name: string, tag: string, page?: Page): Promise<Page> {
  page ??= await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(`e2e-ui-${name.toLowerCase()}-${tag}@test.slashsplit.dev`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create test account" }).click();
  await expect(page).toHaveURL(/\/households$/);
  return page;
}

async function createHousehold(page: Page, name: string) {
  await page.getByLabel("Household name").fill(name);
  await page.getByRole("button", { name: "Create household" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

// Server actions are POSTs that carry a Next-Action header; abort only those.
async function failServerActions(page: Page) {
  await page.route("**/*", (route) =>
    route.request().method() === "POST" && route.request().headers()["next-action"]
      ? route.abort("internetdisconnected")
      : route.continue(),
  );
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `${page.url()} scrolls sideways`).toBeLessThanOrEqual(clientWidth);
}

// Every visible text node and filled input: its color, blended over the backgrounds behind it, must
// reach 4.5:1 (3:1 for 24 px+ or bold 18.66 px+ text). Disabled controls are exempt (WCAG 1.4.3).
async function contrastFailures(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    // Any CSS color (oklch, color-mix, ...) to sRGB 0-255 plus alpha 0-1, via a 1 px canvas.
    const rgba = (css: string): number[] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const over = (top: number[], bottom: number[]) =>
      [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1);
    const luminance = (c: number[]) => {
      const [r, g, b] = c.slice(0, 3).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const background = (el: Element): number[] => {
      const layers: number[][] = [];
      for (let node: Element | null = el; node; node = node.parentElement) {
        const c = rgba(getComputedStyle(node).backgroundColor);
        if (c[3] > 0) layers.push(c);
        if (c[3] === 1) break;
      }
      return layers.reverse().reduce((acc, layer) => over(layer, acc), [255, 255, 255, 1]);
    };
    const opacity = (el: Element) => {
      let o = 1;
      for (let node: Element | null = el; node; node = node.parentElement) {
        o *= Number(getComputedStyle(node).opacity);
      }
      return o;
    };

    const elements = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.textContent?.trim() && n.parentElement) elements.add(n.parentElement);
    }
    document.querySelectorAll("input:not([type=checkbox]):not([type=file]), select").forEach((el) => {
      if ((el as HTMLInputElement).value) elements.add(el);
    });

    const failures: string[] = [];
    for (const el of elements) {
      if (el.closest("script, style, noscript, option, :disabled")) continue;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      if (style.visibility !== "visible" || box.width === 0 || box.height === 0) continue;
      const bg = background(el);
      const fg = rgba(style.color);
      fg[3] *= opacity(el);
      const text = over(fg, bg);
      const [hi, lo] = [luminance(text), luminance(bg)].sort((a, b) => b - a);
      const ratio = (hi + 0.05) / (lo + 0.05);
      const size = parseFloat(style.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) {
        const label = (el.textContent || (el as HTMLInputElement).value || "").trim().slice(0, 40);
        failures.push(`${el.tagName.toLowerCase()} "${label}" ${ratio.toFixed(2)}:1`);
      }
    }
    return failures;
  });
}

async function checkPage(page: Page, { contrast = true } = {}) {
  await expectNoHorizontalScroll(page);
  if (contrast) expect(await contrastFailures(page), `${page.url()} low-contrast text`).toEqual([]);
}

// Press Tab until the locator has focus.
async function tabTo(page: Page, target: ReturnType<Page["locator"]>, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`Tab never reached ${target}`);
}

// Tab through the page; every tab stop must show an outline or a ring (box-shadow).
async function focusRingFailures(page: Page, max = 60): Promise<string[]> {
  const failures: string[] = [];
  const seen = new Set<string>();
  await page.locator("body").focus();
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const result = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el.tagName.includes("-")) return null;
      const s = getComputedStyle(el);
      const outline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0 && s.outlineColor !== "rgba(0, 0, 0, 0)";
      const ring = s.boxShadow !== "none";
      const name = el.getAttribute("aria-label") || el.textContent?.trim() || (el as HTMLInputElement).name || el.tagName;
      const key = `${el.tagName}:${name}:${Array.from(document.querySelectorAll("*")).indexOf(el)}`;
      return { key, label: `${el.tagName.toLowerCase()} "${name.slice(0, 30)}"`, visible: outline || ring };
    });
    if (!result) continue;
    if (seen.has(result.key)) break;
    seen.add(result.key);
    if (!result.visible) failures.push(result.label);
  }
  return failures;
}

async function unlabelledControls(page: Page): Promise<string[]> {
  const controls = page.locator("input:not([type=hidden]), select, textarea, button");
  const missing: string[] = [];
  for (const control of await controls.all()) {
    if (!(await control.isVisible())) continue;
    try {
      await expect(control).toHaveAccessibleName(/\S/, { timeout: 500 });
    } catch {
      missing.push(await control.evaluate((el) => el.outerHTML.slice(0, 80)));
    }
  }
  return missing;
}

const viewports = [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
];

for (const viewport of viewports) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${viewport.width}px ${colorScheme}`, () => {
      test.use({ viewport, colorScheme });
      test.skip(({ isMobile }) => isMobile, "the matrix sets its own viewport, so it runs once");

      test("every page fits the width and keeps text readable", async ({ browser, page }, info) => {
        const tag = `${info.project.name}-${viewport.width}-${colorScheme}-${Date.now()}`;

        await page.goto("/");
        await checkPage(page);
        await page.goto("/sign-in");
        await checkPage(page);

        await signUp(browser, "Uma", tag, page);
        await checkPage(page);

        await createHousehold(page, "Contrast House");
        await checkPage(page);

        // A scanned draft (mismatch fixture) with its red banner.
        const scan = page.getByRole("form", { name: "Scan a receipt" });
        await scan.getByLabel("Receipt image").setInputFiles(receipt);
        await scan.getByRole("button", { name: "Scan receipt" }).click();
        await expect(page.getByRole("form", { name: "Review Costco draft" })).toBeVisible();
        await checkPage(page);

        // A slashed (unticked) member chip is still text someone must read.
        const expense = page.getByRole("form", { name: "Record an expense" });
        await expense.getByRole("group", { name: "Item 1" }).getByRole("checkbox", { name: "Uma" }).uncheck();
        await checkPage(page);

        await page.goto("/households");
        await checkPage(page);

        // Swagger UI is third-party styling: width is checked, its colors are its own.
        await page.goto("/api/docs");
        await expect(page.locator(".swagger-ui .opblock").first()).toBeVisible({ timeout: 30_000 });
        await checkPage(page, { contrast: false });
      });
    });
  }
}

test("a fresh user sees an empty state on every list", async ({ browser }, info) => {
  const page = await signUp(browser, "Eve", `${info.project.name}-empty-${Date.now()}`);
  await expect(page.getByText("You’re not in a household yet. Create one or join with a code.")).toBeVisible();

  await createHousehold(page, "Empty House");
  await expect(page.getByText("No expenses recorded yet.")).toBeVisible();
  await expect(page.getByText("No receipts waiting for review.")).toBeVisible();
  await expect(page.getByText("Everyone is settled up.")).toBeVisible();
});

test.describe("every failed action shows a message in a status region", () => {
  test("sign-in with a wrong password", async ({ page }, info) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(`e2e-ui-nobody-${info.project.name}-${Date.now()}@test.slashsplit.dev`);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in with test account" }).click();
    await expect(page.getByRole("status")).toHaveText(/\S/);
  });

  test("creating a household while offline", async ({ browser }, info) => {
    const page = await signUp(browser, "Oli", `${info.project.name}-offline-${Date.now()}`);
    await failServerActions(page);
    await page.getByLabel("Household name").fill("Offline House");
    await page.getByRole("button", { name: "Create household" }).click();
    const form = page.getByRole("form", { name: "Create a household" });
    await expect(form.getByRole("status")).toHaveText(networkError);
  });

  test("saving an expense while offline", async ({ browser }, info) => {
    const page = await signUp(browser, "Pat", `${info.project.name}-expense-${Date.now()}`);
    await createHousehold(page, "Offline Expense House");
    await failServerActions(page);
    const form = page.getByRole("form", { name: "Record an expense" });
    await form.getByLabel("Merchant").fill("Corner Market");
    await form.getByLabel("Item name").fill("Milk");
    await form.getByLabel("Price ($)").fill("6.00");
    await form.getByRole("button", { name: "Save expense" }).click();
    await expect(form.getByRole("status")).toHaveText(networkError);
  });

  test("scanning a receipt: offline, 400 and 403", async ({ browser }, info) => {
    const page = await signUp(browser, "Quinn", `${info.project.name}-scan-${Date.now()}`);
    await createHousehold(page, "Scan Error House");
    const scan = page.getByRole("form", { name: "Scan a receipt" });
    const status = scan.getByRole("status");

    const replies = [
      { status: 403, error: "You are not a member of this household." },
      { status: 400, error: "Upload a JPG, PNG, HEIC or WebP image." },
    ];
    for (const reply of replies) {
      await page.route("**/receipts/scan", (route) =>
        route.fulfill({ status: reply.status, json: { error: reply.error } }),
      );
      await scan.getByLabel("Receipt image").setInputFiles(receipt);
      await scan.getByRole("button", { name: "Scan receipt" }).click();
      await expect(status).toHaveText(reply.error);
      await page.unroute("**/receipts/scan");
    }

    await page.route("**/receipts/scan", (route) => route.abort("internetdisconnected"));
    await scan.getByLabel("Receipt image").setInputFiles(receipt);
    await scan.getByRole("button", { name: "Scan receipt" }).click();
    await expect(status).toHaveText(networkError);
  });

  test("confirming a draft: offline", async ({ browser }, info) => {
    const page = await signUp(browser, "Rae", `${info.project.name}-confirm-${Date.now()}`);
    await createHousehold(page, "Confirm Error House");
    const scan = page.getByRole("form", { name: "Scan a receipt" });
    await scan.getByLabel("Receipt image").setInputFiles(receipt);
    await scan.getByRole("button", { name: "Scan receipt" }).click();
    const draft = page.getByRole("form", { name: "Review Costco draft" });
    await draft.getByLabel("Receipt total ($)").fill("11.23");
    await page.route("**/confirm", (route) => route.abort("internetdisconnected"));
    await draft.getByRole("button", { name: "Confirm expense" }).click();
    await expect(draft.getByRole("status").filter({ hasText: networkError })).toBeVisible();
  });

  test("marking a transfer paid while offline", async ({ browser }, info) => {
    const tag = `${info.project.name}-paid-${Date.now()}`;
    const owner = await signUp(browser, "Sol", tag);
    await createHousehold(owner, "Paid Error House");
    const inviteCode = (await owner.getByTestId("invite-code").textContent())!.trim();
    const roommate = await signUp(browser, "Tam", tag);
    await roommate.getByLabel("Invite code").fill(inviteCode);
    await roommate.getByRole("button", { name: "Join household" }).click();
    await expect(roommate.getByRole("heading", { level: 1, name: "Paid Error House" })).toBeVisible();

    await owner.reload();
    const form = owner.getByRole("form", { name: "Record an expense" });
    await form.getByLabel("Merchant").fill("Internet");
    await form.getByRole("button", { name: "Split equally" }).click();
    await form.getByLabel("Total ($)").fill("10.00");
    await form.getByRole("button", { name: "Save expense" }).click();
    const markPaid = owner.getByRole("button", { name: "Mark paid" });
    await expect(markPaid).toBeVisible();

    await failServerActions(owner);
    await markPaid.click();
    await expect(owner.getByRole("status").filter({ hasText: networkError })).toBeVisible();
  });
});

test.describe("keyboard and screen reader", () => {
  test("every tab stop shows a focus ring and every control has a name", async ({ browser, page }, info) => {
    const tag = `${info.project.name}-focus-${Date.now()}`;
    const failures: Record<string, string[]> = {};
    const check = async (label: string) => {
      const missing = [...(await focusRingFailures(page)), ...(await unlabelledControls(page)).map((m) => `unlabelled ${m}`)];
      if (missing.length) failures[label] = missing;
    };

    await page.goto("/");
    await check("/");
    await page.goto("/sign-in");
    await check("/sign-in");
    await signUp(browser, "Vic", tag, page);
    await check("/households");
    await createHousehold(page, "Focus House");
    const scan = page.getByRole("form", { name: "Scan a receipt" });
    await scan.getByLabel("Receipt image").setInputFiles(receipt);
    await scan.getByRole("button", { name: "Scan receipt" }).click();
    await expect(page.getByRole("form", { name: "Review Costco draft" })).toBeVisible();
    await check("/households/[id]");
    await page.goto("/settings/tokens");
    await check("/settings/tokens");

    expect(failures).toEqual({});
  });

  test("Escape closes the revoke confirmation", async ({ browser }, info) => {
    const page = await signUp(browser, "Wes", `${info.project.name}-escape-${Date.now()}`);
    await page.goto("/settings/tokens");
    await page.getByLabel("Token name").fill("Laptop script");
    await page.getByRole("button", { name: "Create token" }).click();
    await expect(page.getByTestId("new-token")).toBeVisible();

    const revoke = page.getByRole("button", { name: "Revoke Laptop script" });
    await revoke.click();
    await expect(page.getByRole("button", { name: "Yes, revoke" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Yes, revoke" })).toHaveCount(0);
    await expect(revoke).toBeFocused();
  });

  test("Tab and Enter alone create a household and record an expense", async ({ browser }, info) => {
    const page = await signUp(browser, "Xan", `${info.project.name}-keys-${Date.now()}`);
    await page.locator("body").focus();

    await tabTo(page, page.getByLabel("Household name"));
    await page.keyboard.type("Keyboard House");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Keyboard House" })).toBeVisible();

    const form = page.getByRole("form", { name: "Record an expense" });
    await page.locator("body").focus();
    await tabTo(page, form.getByLabel("Merchant"));
    await page.keyboard.type("Corner Market");
    await tabTo(page, form.getByLabel("Item name"));
    await page.keyboard.type("Milk");
    await tabTo(page, form.getByLabel("Price ($)"));
    await page.keyboard.type("6.00");
    await tabTo(page, form.getByRole("button", { name: "Save expense" }));
    await page.keyboard.press("Enter");

    const list = page.getByRole("list", { name: "Expenses" });
    await expect(list).toContainText("Corner Market");
    await expect(list).toContainText("$6.00");
  });
});
