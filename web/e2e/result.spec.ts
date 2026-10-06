import { expect, test, type Page } from '@playwright/test'
import { STAGING_REF, createThrowawayPlayer } from './staging-auth'

test.setTimeout(60_000)

// người chơi tạm có lượt chơi COMPLETED với số câu đúng cho trước
async function finished(page: Page, correct: number) {
  const { session, cleanup, setSession } = await createThrowawayPlayer()
  try {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`sb-${STAGING_REF}-auth-token`, JSON.stringify(session)])
    await page.goto('/')
    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    await expect(page.getByText('Câu 1/12')).toBeVisible()
    await setSession({ status: 'COMPLETED', answered_count: 12, correct_count: correct })
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Bạn đã hoàn thành!' })).toBeVisible()
    await expect(page.getByText(`${correct} / 12 câu đúng`)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Chơi lại' })).toHaveCount(0)
  } catch (e) { await cleanup(); throw e }
  return cleanup
}

test('10/12 earns the medal, Mầm Nghề and the prize block', async ({ page }) => {
  const cleanup = await finished(page, 10)
  try {
    const medal = page.getByRole('dialog', { name: 'Danh hiệu Mầm Nghề' })
    await expect(medal).toBeVisible()
    await medal.getByRole('button', { name: 'Tiếp tục' }).click()
    await expect(medal).toHaveCount(0)
    await expect(page.getByText('Mầm Nghề', { exact: true })).toBeVisible()
    await expect(page.getByText('Đủ điều kiện nhận quà')).toBeVisible()
    await expect(page.getByText('Trạng thái: Chưa nhận quà')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Mầm Nghề', { exact: true })).toBeVisible()
    await expect(medal).toHaveCount(0) // chỉ tự mở một lần
  } finally { await cleanup() }
})

for (const correct of [11, 9]) {
  test(`${correct}/12 gets the thank-you, no medal, no prize`, async ({ page }) => {
    const cleanup = await finished(page, correct)
    try {
      await expect(page.getByText('Cám ơn bạn đã tham gia')).toBeVisible()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Xem lại huy chương' })).toHaveCount(0)
      await expect(page.getByText('Mầm Nghề', { exact: true })).toHaveCount(0)
      await expect(page.getByText('Đủ điều kiện nhận quà')).toHaveCount(0)
    } finally { await cleanup() }
  })
}
