import { expect, test, type Page } from '@playwright/test'
import { STAGING_REF, createThrowawayPlayer } from './staging-auth'

type Player = Awaited<ReturnType<typeof createThrowawayPlayer>>

async function signedIn(page: Page, run: (p: Player) => Promise<void>) {
  const player = await createThrowawayPlayer()
  try {
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`sb-${STAGING_REF}-auth-token`, JSON.stringify(player.session)])
    await page.goto('/')
    await run(player)
  } finally {
    await player.cleanup()
  }
}

const result = (page: Page) => page.getByRole('heading', { name: 'Bạn đã hoàn thành!' })

test('signed out: start screen offers Google sign-in', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Đăng nhập bằng Google' })).toBeVisible()
})

test('new player starts on CTA, resumes at Q2 after reload', async ({ page }) => {
  await signedIn(page, async () => {
    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    await expect(page.getByText('Câu 1/12')).toBeVisible()
    await page.getByRole('radio').first().click()
    await page.getByRole('button', { name: 'Chốt đáp án' }).click()
    await expect(page.getByRole('button', { name: 'Tiếp tục câu 2' })).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Tiếp tục câu 2' }).click()
    await expect(page.getByText('Câu 2/12')).toBeVisible()
  })
})

test('avatar menu holds only Đăng xuất and signs out to the start screen', async ({ page }) => {
  await signedIn(page, async () => {
    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    const avatar = page.getByRole('button', { name: 'Tài khoản' })
    await avatar.click()
    await expect(avatar).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('menu').getByRole('menuitem')).toHaveCount(1)
    // giữ request logout để thấy menu đã đóng trước khi đăng xuất xong
    let release = () => {}
    await page.route('**/auth/v1/logout*', (r) => new Promise<void>((done) => { release = () => { void r.continue(); done() } }))
    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click()
    await expect(avatar).toHaveAttribute('aria-expanded', 'false')
    release()
    await expect(page.getByRole('button', { name: 'Đăng nhập bằng Google' })).toBeVisible()
  })
})

test('returning finished player lands on result (FR-11), then shows claimed status', async ({ page }) => {
  await signedIn(page, async ({ setSession }) => {
    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    await expect(page.getByText('Câu 1/12')).toBeVisible()
    await setSession({ status: 'COMPLETED', answered_count: 12, correct_count: 7 })
    await page.reload()
    await expect(result(page)).toBeVisible()
    await expect(page.getByText('7 / 12 câu đúng')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Chơi lại' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Tài khoản' })).toBeVisible()

    await setSession({ correct_count: 10, reward_claimed: true })
    await page.reload()
    await expect(page.getByText('Trạng thái: Đã nhận quà')).toBeVisible()
  })
})

test('network failure at start-up shows the fixed message and Thử lại recovers', async ({ page }) => {
  await page.route('**/rpc/get_current_session', (r) => r.abort())
  await signedIn(page, async () => {
    await expect(page.getByRole('alert').filter({ hasText: 'Không có kết nối mạng. Kiểm tra mạng rồi thử lại.' })).toBeVisible()
    await page.unroute('**/rpc/get_current_session')
    await page.getByRole('button', { name: 'Thử lại' }).click()
    await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeVisible()
  })
})

const rpcReply = (code: string, message: string) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, code, message, data: null }) })

test('loading state shows while get_current_session is pending', async ({ page }) => {
  let release = () => {}
  await page.route('**/rpc/get_current_session', (r) => new Promise<void>((done) => { release = () => { void r.continue(); done() } }))
  await signedIn(page, async () => {
    await expect(page.getByRole('status').filter({ hasText: 'Đang tải hành trình…' })).toBeVisible()
    release()
    await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeVisible()
  })
})

test('UNAUTHENTICATED at start-up signs out to the start screen with the login message', async ({ page }) => {
  await page.route('**/rpc/get_current_session', (r) => r.fulfill(rpcReply('UNAUTHENTICATED', 'Chưa đăng nhập')))
  await signedIn(page, async () => {
    await expect(page.getByRole('button', { name: 'Đăng nhập bằng Google' })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' })).toBeVisible()
  })
})

test('ineligible start shows the server message with Đăng xuất and no Thử lại', async ({ page }) => {
  await page.route('**/rpc/start_session', (r) => r.fulfill(rpcReply('FORBIDDEN', 'Tài khoản chưa đủ điều kiện')))
  await signedIn(page, async () => {
    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Tài khoản chưa đủ điều kiện' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Thử lại' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Đăng xuất' }).click()
    await expect(page.getByRole('button', { name: 'Đăng nhập bằng Google' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
})
