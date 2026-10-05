import { expect, test } from '@playwright/test'
import { STAGING_REF, createThrowawayPlayer } from './staging-auth'

test('offline answer shows Chưa lưu, resends on reconnect, server holds one answer', async ({ page, context }) => {
  const { session, cleanup, answerCount } = await createThrowawayPlayer()
  try {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`sb-${STAGING_REF}-auth-token`, JSON.stringify(session)])
    await page.goto('/')
    await expect(page.getByText('Câu 1/12')).toBeVisible()

    await context.setOffline(true)
    await page.getByRole('radio').first().click()
    await page.getByRole('button', { name: 'Chốt đáp án' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Chưa lưu' })).toBeVisible()
    expect(await answerCount()).toBe(0)

    await context.setOffline(false)
    await expect(page.getByText('Đã lưu câu trả lời')).toBeVisible()
    expect(await answerCount()).toBe(1)
  } finally {
    await cleanup()
  }
})
