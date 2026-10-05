import { expect, test, type Page } from '@playwright/test'
import { STAGING_REF, createThrowawayPlayer } from './staging-auth'

async function answerFirst(page: Page) {
  await expect(page.getByText('Câu 1/12')).toBeVisible()
  let calls = 0
  page.on('request', (r) => { if (r.url().includes('/rpc/submit_answer')) calls++ })
  await page.getByRole('radio').first().click()
  // hai click cùng tick, trước khi React kịp render nút disabled → chỉ guard inFlight chặn được
  await page.getByRole('button', { name: 'Chốt đáp án' }).evaluate((b: HTMLButtonElement) => { b.click(); b.click() })
  await expect(page.getByText('Đã lưu câu trả lời')).toBeVisible()
  return () => calls
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`double-tap records once; input locked during tear (${reducedMotion})`, async ({ page }) => {
    const { session, cleanup, answerCount } = await createThrowawayPlayer()
    try {
      await page.emulateMedia({ reducedMotion })
      await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`sb-${STAGING_REF}-auth-token`, JSON.stringify(session)])
      await page.goto('/')
      const calls = await answerFirst(page)
      expect(calls()).toBe(1)
      expect(await answerCount()).toBe(1)

      await page.getByRole('button', { name: /Tiếp tục câu 2/ }).click()
      // chụp một lần khi trang còn đang xé (fade reduce chỉ 0,3s)
      const snap = await page.locator('.tear.piece').evaluate((e) => ({
        anim: getComputedStyle(e).animationName,
        keepHidden: getComputedStyle(document.querySelector('.tear.keep')!).display === 'none',
        locked: [...document.querySelectorAll<HTMLButtonElement>('[role=radio]')].every((r) => r.disabled),
      }))
      // CAP-4: không chọn được đáp án khi trang đang xé
      expect(snap.locked).toBe(true)
      if (reducedMotion === 'reduce') expect(snap).toMatchObject({ anim: 'swap', keepHidden: true })
      await expect(page.locator('.tear')).toHaveCount(0)
      await expect(page.getByText('Câu 2/12')).toBeVisible()
      await expect(page.getByRole('radio').first()).toBeEnabled()
    } finally {
      await cleanup()
    }
  })
}
