import { expect, test } from '@playwright/test'

for (const path of ['/admin', '/admin/']) {
  test(`${path} keeps the original admin route and six sections`, async ({ page }) => {
    await page.route('**/auth/v1/**', async route => {
      await route.fulfill({ json: { user: { id: 'test-admin', email: 'admin@example.test' } } })
    })
    await page.route('**/rest/v1/rpc/**', async route => {
      const name = route.request().url().split('/').pop()
      const data = name === 'admin_search_users' ? { total: 1, page: 1, page_size: 20, rows: [
        { player_id: 'test-player', email: 'player@example.test', status: 'COMPLETED', correct_count: 10, answered_count: 12 },
      ] } : name === 'admin_get_dashboard' ? {} : []
      await route.fulfill({ json: { ok: true, code: 'OK', data } })
    })
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'Quản trị', exact: true })).toBeVisible()
    await expect(page.getByLabel('Mật khẩu')).toBeVisible()
    await page.evaluate(() => {
      const payload = JSON.stringify({
        access_token: 'test-token', refresh_token: 'test-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer', user: { id: 'test-admin', email: 'admin@example.test' },
      })
      localStorage.setItem('sb-127-auth-token', payload)
      localStorage.setItem('sb-awvaujmkbstkpsbaxpku-auth-token', payload)
    })
    await page.reload()
    for (const name of ['Tổng quan', 'Trực tiếp', 'Người dùng', 'Tra cứu', 'Xuất danh sách', 'Bộ câu hỏi']) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
    }
    await page.getByRole('button', { name: 'Người dùng', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Reset lượt chơi' })).toBeVisible()
  })
}

test('root remains the player game without admin UI', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Quản trị', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reset lượt chơi' })).toHaveCount(0)
  await expect(page.locator('main')).toBeVisible()
})
