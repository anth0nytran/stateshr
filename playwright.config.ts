import { defineConfig, devices } from "@playwright/test";

function processEnvAsStrings() {
  return Object.fromEntries(
    Object.entries(process.env).flatMap(([k, v]) => (v === undefined ? [] : [[k, v]]))
  ) as Record<string, string>;
}

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["iPhone 13"],
  },
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/scan`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      ...processEnvAsStrings(),
    },
  },
});
