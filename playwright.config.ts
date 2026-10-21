import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // F9: explicit and stable. The machine has 8 cores and the game renders with software WebGL (SwiftShader), so more
  // workers than this make every test slower instead of the suite faster. A flaky test is a bug: no retries.
  workers: 3,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: { baseURL: 'http://localhost:8080', viewport: { width: 1280, height: 720 } },
  projects: [
    { name: 'chromium', testIgnore: /load\.spec/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    // F9: the @cross subset (boot, flow with download, drag, tabs, a combo, reload, mute, reduced motion) in the other browser and at full HD.
    { name: 'firefox', grep: /@cross/, testIgnore: /load\.spec/, use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 720 } } },
    { name: 'chromium-1920', grep: /@cross/, testIgnore: /load\.spec/, use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    // F9: the load time against the production build, alone at the end (a busy machine would measure the other tests).
    {
      name: 'load',
      testMatch: /load\.spec/,
      dependencies: ['chromium', 'firefox', 'chromium-1920'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, baseURL: 'http://localhost:4173' },
    },
  ],
  webServer: [
    {
      command: 'npx vite --config vite/config.dev.mjs --mode test --port 8080 --strictPort',
      url: 'http://localhost:8080',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run build && npx vite preview --config vite/config.prod.mjs --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
