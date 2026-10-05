import { expect, test, type Page } from '@playwright/test'
import { STAGING_REF, createThrowawayPlayer } from './staging-auth'

test.setTimeout(120_000)

// đăng nhập người chơi tạm, trả lời đủ 12 câu rồi bấm sang showcase
async function finishGame(page: Page, run: () => Promise<void>) {
  const { session, cleanup } = await createThrowawayPlayer()
  try {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`sb-${STAGING_REF}-auth-token`, JSON.stringify(session)])
    await page.goto('/')
    for (let n = 1; n <= 12; n++) {
      await expect(page.getByText(`Câu ${n}/12`)).toBeVisible()
      await page.getByRole('radio').first().click()
      await page.getByRole('button', { name: 'Chốt đáp án' }).click()
      await expect(page.locator('.mascot.carving')).toHaveCount(0)
      if (n < 12) {
        await page.getByRole('button', { name: `Tiếp tục câu ${n + 1}` }).click()
        await expect(page.locator('.tear.piece')).toHaveCount(0)
      }
    }
    await page.getByRole('button', { name: 'Xem kết quả' }).click()
    await run()
  } finally {
    await cleanup()
  }
}

const showcase = (page: Page) => page.locator('main.showcase')
const result = (page: Page) => page.getByRole('heading', { name: 'Bạn đã hoàn thành!' })

test('showcase plays 4 states after Q12, its CTA opens the result, and a reload skips it', async ({ page }) => {
  await finishGame(page, async () => {
    await expect(showcase(page)).toBeVisible()
    const shownAt = Date.now()
    for (const step of ['0', '1', '2', '3']) await expect(showcase(page)).toHaveAttribute('data-step', step, { timeout: 3000 })
    expect(Date.now() - shownAt).toBeLessThan(6500) // AC: ends on the last state within ~6s
    await expect(page.getByRole('heading', { name: 'Từ đá thô đến tác phẩm' })).toBeVisible()
    await page.getByRole('button', { name: 'Xem kết quả & nhận quà' }).click()
    await expect(result(page)).toBeVisible()

    await page.reload()
    await expect(result(page)).toBeVisible()
    await expect(showcase(page)).toHaveCount(0)
  })
})

test('CTA tapped mid-animation opens the result and the showcase does not come back', async ({ page }) => {
  await finishGame(page, async () => {
    await expect(showcase(page)).toBeVisible()
    await page.getByRole('button', { name: 'Xem kết quả & nhận quà' }).click()
    await expect(result(page)).toBeVisible()
    await page.waitForTimeout(4000)
    await expect(showcase(page)).toHaveCount(0)
    await expect(result(page)).toBeVisible()
  })
})

test('reduced motion shows the last state immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await finishGame(page, async () => {
    await expect(showcase(page)).toHaveAttribute('data-step', '3', { timeout: 500 })
  })
})
