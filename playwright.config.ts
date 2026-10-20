import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Next.js loads `.env.local` for the app, but Playwright's own process
 * needs the E2E_* credentials too. Merge them in without overriding
 * anything already present in the environment.
 */
function loadLocalEnv() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    if (key in process.env) continue;
    process.env[key] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadLocalEnv();

export default defineConfig({
  testDir: "./e2e",
  // Shared hosted Supabase + shared accounts: keep runs serial and single-worker.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    // Bound every bare click/fill: a popover that never opens would
    // otherwise hang a test until the full test timeout.
    actionTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI builds first and serves the production build; locally we reuse `next dev`.
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
