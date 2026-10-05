import { expect, test } from '@playwright/test'
import { STAGING_REF, createThrowawayPlayer } from './staging-auth'

test('carve plays on even answers to stage 3/7 at Q4, and a reload does not replay it', async ({ page }) => {
  const { session, cleanup } = await createThrowawayPlayer()
  try {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`sb-${STAGING_REF}-auth-token`, JSON.stringify(session)])
    await page.goto('/')
    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    const stone = page.getByRole('img', { name: /^Tác phẩm: hình thái/ })
    for (let n = 1; n <= 4; n++) {
      await expect(page.getByText(`Câu ${n}/12`)).toBeVisible()
      await page.getByRole('radio').first().click()
      await page.getByRole('button', { name: 'Chốt đáp án' }).click()
      // CAP-5: câu chẵn → chuỗi đục chạy, xong thì lên hình thái n/2 + 1
      if (n % 2 === 0) {
        await expect(page.locator('.mascot.carving')).toBeVisible()
        // FX phải thật sự chạy trên bản build (minify từng gộp animation thành `none`)
        await expect(page.locator('.fx.hammer')).toHaveCSS('opacity', '1')
        await expect(page.locator('.mascot.carving')).toHaveCount(0)
      } else {
        await expect(page.locator('.mascot.carving')).toHaveCount(0)
      }
      await expect(stone).toHaveAttribute('aria-label', `Tác phẩm: hình thái ${Math.floor(n / 2) + 1}/7`)
      if (n < 4) {
        await page.getByRole('button', { name: `Tiếp tục câu ${n + 1}` }).click()
        await expect(page.locator('.tear.piece')).toHaveCount(0)
      }
    }

    await page.reload()
    await page.getByRole('button', { name: 'Tiếp tục câu 5' }).click()
    await expect(stone).toHaveAttribute('aria-label', 'Tác phẩm: hình thái 3/7')
    await expect(page.locator('.mascot.carving')).toHaveCount(0)
  } finally {
    await cleanup()
  }
})
