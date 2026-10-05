import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { STAGING_REF, createThrowawayPlayer } from './staging-auth'

const SAMPLE = fileURLToPath(new URL('../public/audio/music/Duolingo Correct Sound Effect.mp3', import.meta.url))
const TRACKS = [{ title: 'Bài một', asset_url: '/audio/music/e2e-1.mp3' }, { title: 'Bài hai', asset_url: '/audio/music/e2e-2.mp3' }]

test('music starts on first tap, sheet returns focus, track choice survives reload', async ({ page }) => {
  const { session, cleanup } = await createThrowawayPlayer()
  try {
    // playlist cố định (file mp3 ngắn có sẵn) để test không phụ thuộc seed staging; giữ tham chiếu audio nhạc nền
    await page.route('**/rest/v1/music_playlist*', (r) => r.fulfill({ json: TRACKS }))
    await page.route('**/audio/music/e2e-*.mp3', (r) => r.fulfill({ path: SAMPLE }))
    await page.addInitScript(([key, value]) => {
      localStorage.setItem(key, value)
      const w = window as unknown as { music: HTMLMediaElement[] }
      w.music = []
      // giả lập chính sách autoplay chặt (iOS): play() bị từ chối cho tới tương tác đầu tiên
      let gesture = false
      document.addEventListener('pointerdown', () => { gesture = true }, { capture: true })
      const play = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function () {
        if (this.src.includes('/audio/music/') && !w.music.includes(this)) w.music.push(this)
        return gesture ? play.call(this) : Promise.reject(new DOMException('blocked', 'NotAllowedError'))
      }
    }, [`sb-${STAGING_REF}-auth-token`, JSON.stringify(session)])
    const playing = () => page.evaluate(() => (window as unknown as { music: HTMLMediaElement[] }).music.some((a) => !a.paused && a.src.includes('e2e-1')))

    await page.goto('/')
    await expect(page.getByText('Câu 1/12')).toBeVisible()
    await page.waitForTimeout(500)
    expect(await playing()).toBe(false)
    await page.getByRole('radio').first().click()
    await expect.poll(playing).toBe(true)

    const opener = page.getByRole('button', { name: /Đổi nhạc/ })
    await opener.click()
    const sheet = page.getByRole('dialog', { name: 'Nhạc nền' })
    await expect(sheet).toBeVisible()
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
    await expect(sheet.locator(':focus')).toHaveCount(1)
    await sheet.getByRole('radio', { name: 'Bài hai' }).click()
    await sheet.getByRole('button', { name: 'Xong' }).click()
    await expect(sheet).toBeHidden()
    await expect(opener).toBeFocused()

    await page.reload()
    await opener.click()
    await expect(page.getByRole('radio', { name: 'Bài hai' })).toHaveAttribute('aria-checked', 'true')
    await page.keyboard.press('Escape')
    await expect(opener).toBeFocused()
  } finally {
    await cleanup()
  }
})
