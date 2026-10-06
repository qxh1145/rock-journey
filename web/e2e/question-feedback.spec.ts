import { expect, test, type Page } from '@playwright/test'
import { STAGING_REF, createThrowawayPlayer } from './staging-auth'

async function play(page: Page, run: () => Promise<void>) {
  const { session, cleanup } = await createThrowawayPlayer()
  try {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`sb-${STAGING_REF}-auth-token`, JSON.stringify(session)])
    await page.goto('/')
    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    await expect(page.getByText('Câu 1/12')).toBeVisible()
    await run()
  } finally {
    await cleanup()
  }
}

test('double-tap records one answer; feedback uses ×/✓ text; input locked during card transition', async ({ page }) => {
  let rpcs = 0
  page.on('request', (r) => { if (r.url().includes('/rpc/submit_answer')) rpcs++ })
  await play(page, async () => {
    await page.getByRole('radio').first().click()
    // hai lần chạm trong cùng một tick, trước khi React kịp render lại
    await page.getByRole('button', { name: 'Chốt đáp án' }).evaluate((b: HTMLButtonElement) => { b.click(); b.click() })
    await expect(page.getByRole('button', { name: 'Tiếp tục câu 2' })).toBeVisible()
    expect(rpcs).toBe(1)
    await expect(page.locator('.nb-right')).toContainText('✓')
    // đáp án đầu có thể đúng hoặc sai; nếu sai thì dòng sai phải có ×
    if (await page.locator('.nb-wrong').count()) await expect(page.locator('.nb-wrong')).toContainText('×')

    await page.getByRole('button', { name: 'Tiếp tục câu 2' }).click()
    await expect(page.locator('.tear.piece')).toBeVisible()
    for (const r of await page.getByRole('radio').all()) await expect(r).toBeDisabled()
    await expect(page.locator('.tear.piece')).toHaveCount(0)
    await expect(page.getByRole('radio').first()).toBeEnabled()
  })
})

test('reduced motion keeps a short card fade and unlocks input', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await play(page, async () => {
    await page.getByRole('radio').first().click()
    await page.getByRole('button', { name: 'Chốt đáp án' }).click()
    // dừng animation để kiểm tra kiểu đang áp dụng, rồi cho chạy tiếp
    const pause = await page.addStyleTag({ content: '.tear { animation-play-state: paused !important; }' })
    await page.getByRole('button', { name: 'Tiếp tục câu 2' }).click()
    await expect(page.locator('.tear.keep')).toHaveCount(0)
    expect(await page.locator('.tear.piece').evaluate((e) => getComputedStyle(e).animationName)).toBe('swap')
    await pause.evaluate((e) => e.remove())
    await expect(page.locator('.tear.piece')).toHaveCount(0)
    await expect(page.getByRole('radio').first()).toBeEnabled()
  })
})
