import { defineConfig } from '@playwright/test'

const PORT = 4173
const STAGING_URL = 'https://awvaujmkbstkpsbaxpku.supabase.co'

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${PORT}`, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    // Always build against staging, regardless of .env.local.
    env: { VITE_SUPABASE_URL: STAGING_URL, VITE_SUPABASE_KEY: process.env.VITE_SUPABASE_KEY ?? '' },
  },
})
