import { expect, test } from '@playwright/test'
import { STAGING_REF, createThrowawayPlayer } from './staging-auth'

test('answer Q1, reload, resume at Q2', async ({ page }) => {
  const { session, cleanup } = await createThrowawayPlayer()
  try {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`sb-${STAGING_REF}-auth-token`, JSON.stringify(session)])
    await page.goto('/')
    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    await expect(page.getByText('Câu 1/12')).toBeVisible()

    await page.getByRole('radio').first().click()
    await page.getByRole('button', { name: 'Chốt đáp án' }).click()
    await expect(page.getByRole('button', { name: 'Tiếp tục câu 2' })).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Tiếp tục câu 2' }).click()
    await expect(page.getByText('Câu 2/12')).toBeVisible()
  } finally {
    await cleanup()
  }
})
