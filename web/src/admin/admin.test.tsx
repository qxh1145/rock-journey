// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

const rpc = vi.hoisted(() => vi.fn())
const authListener = vi.hoisted(() => ({ current: (_event: string, _session: unknown) => {} }))
const auth = vi.hoisted(() => ({
  getSession: vi.fn(), signInWithPassword: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn(),
  onAuthStateChange: (listener: typeof authListener.current) => { authListener.current = listener; return { data: { subscription: { unsubscribe() {} } } } },
}))
vi.mock('../game', () => ({ callRpc: rpc, message: (_e: unknown, f: string) => f }))
vi.mock('../lib/supabase', () => ({ supabase: { auth } }))

import { AdminApp } from './AdminApp'

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })
const signedIn = () => {
  auth.getSession.mockResolvedValue({ data: { session: { user: {} } } })
  rpc.mockResolvedValue({ ok: true, code: 'OK', data: [] })
}
const toLookup = async () => fireEvent.click(await screen.findByText('Tra cứu'))
const search = (q: string) => {
  fireEvent.change(screen.getByLabelText('Email người chơi'), { target: { value: q } })
  fireEvent.click(screen.getByText('Tìm'))
}

it('signed out: prompts Google sign-in returning to /admin', async () => {
  auth.getSession.mockResolvedValue({ data: { session: null } })
  render(<AdminApp />)
  fireEvent.click(await screen.findByText('Đăng nhập bằng Google'))
  expect(auth.signInWithOAuth.mock.calls[0][0].options.redirectTo).toMatch(/\/admin$/)
})

it('empty query disables search', async () => {
  signedIn()
  render(<AdminApp />)
  await toLookup()
  const btn = (await screen.findByText('Tìm')) as HTMLButtonElement
  expect(btn.disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('Email người chơi'), { target: { value: '  ' } })
  expect(btn.disabled).toBe(true)
})

it('no match shows empty message', async () => {
  signedIn()
  rpc.mockResolvedValue({ ok: true, data: [] })
  render(<AdminApp />)
  await toLookup()
  await screen.findByText('Tìm')
  search('nobody@x')
  expect(await screen.findByText('Không tìm thấy người chơi')).toBeTruthy()
})

it('FORBIDDEN shows no-access screen without search UI', async () => {
  signedIn()
  rpc.mockResolvedValue({ ok: false, code: 'FORBIDDEN' })
  render(<AdminApp />)
  expect(await screen.findByText('Không có quyền truy cập')).toBeTruthy()
  expect(screen.queryByLabelText('Email người chơi')).toBeNull()
})

it('claim: confirm then RPC, ALREADY_CLAIMED shown as notice', async () => {
  signedIn()
  const row = { player_id: 'p', email: 'p1@x', session_id: 's1', status: 'COMPLETED', correct_count: 10, answered_count: 12,
    completed_at: null, qualified_for_reward: true, reward_claimed: false, reward_claimed_at: null }
  rpc.mockImplementation(async (name: string) =>
    name === 'admin_claim_reward' ? { ok: true, code: 'ALREADY_CLAIMED' } : { ok: true, code: 'OK', data: [row] })
  vi.stubGlobal('confirm', () => true)
  render(<AdminApp />)
  await toLookup()
  await screen.findByText('Tìm')
  search('p1')
  fireEvent.click(await screen.findByText('Trao quà'))
  expect(await screen.findByText('Người này đã nhận quà trước đó.')).toBeTruthy()
  const call = rpc.mock.calls.find((c) => c[0] === 'admin_claim_reward')!
  expect(call[1].p_session_id).toBe('s1')
  expect(call[1].p_request_id).toBeTruthy()
})

it('password login opens all six original sections', async () => {
  auth.getSession.mockResolvedValue({ data: { session: null } })
  auth.signInWithPassword.mockResolvedValue({ data: { session: { user: { id: 'admin' } } }, error: null })
  rpc.mockResolvedValue({ ok: true, data: [] })
  render(<AdminApp />)
  fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'admin@example.test' } })
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'test-only-password' } })
  fireEvent.click(screen.getByText('Đăng nhập'))
  for (const label of ['Tổng quan', 'Trực tiếp', 'Người dùng', 'Tra cứu', 'Xuất danh sách', 'Bộ câu hỏi']) {
    expect(await screen.findByText(label)).toBeTruthy()
  }
  expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'admin@example.test', password: 'test-only-password' })
})

it('password login failure stays on login and displays an error', async () => {
  auth.getSession.mockResolvedValue({ data: { session: null } })
  auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: new Error('Invalid login') })
  render(<AdminApp />)
  fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'admin@example.test' } })
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'test-only-password' } })
  fireEvent.click(screen.getByText('Đăng nhập'))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByText('Đăng nhập bằng Google')).toBeTruthy()
})

it('a new authentication session clears the prior forbidden screen', async () => {
  signedIn()
  rpc.mockResolvedValue({ ok: false, code: 'FORBIDDEN' })
  render(<AdminApp />)
  await screen.findByText('Không có quyền truy cập')
  rpc.mockResolvedValue({ ok: true, data: [] })
  act(() => authListener.current('SIGNED_IN', { user: { id: 'different-admin' } }))
  expect(await screen.findByText('Người dùng')).toBeTruthy()
  expect(screen.queryByText('Không có quyền truy cập')).toBeNull()
})

it.each([false, true])('unresolved reset survives navigation; account change clears it: %s', async (changeAccount) => {
  signedIn()
  vi.stubGlobal('confirm', () => true)
  let resetCount = 0
  rpc.mockImplementation(async (name: string) => {
    if (name === 'admin_search_users') return { ok: true, data: { total: 1, page: 1, page_size: 20,
      rows: [{ player_id: 'p1', email: 'player@example.test', status: 'COMPLETED' }] } }
    if (name === 'admin_get_user_detail') return { ok: true, data: { session: { session_id: 'original-session' } } }
    if (name === 'admin_reset_player_progress') {
      if (++resetCount === 1) throw new Error('lost response')
      return { ok: true }
    }
    return { ok: true, data: [] }
  })
  render(<AdminApp />)
  fireEvent.click(await screen.findByText('Người dùng'))
  fireEvent.click(await screen.findByText('Reset lượt chơi'))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByText('Tra cứu'))
  if (changeAccount) act(() => authListener.current('SIGNED_IN', { user: { id: 'new-admin' } }))
  fireEvent.click(screen.getByText('Người dùng'))
  fireEvent.click(await screen.findByText('Reset lượt chơi'))
  await screen.findByText('Đã reset lượt chơi cho player@example.test.')
  const resets = rpc.mock.calls.filter(([name]) => name === 'admin_reset_player_progress')
  expect(resets).toHaveLength(2)
  if (changeAccount) expect(resets[1][1].p_request_id).not.toBe(resets[0][1].p_request_id)
  else expect(resets[1]).toEqual(resets[0])
  expect(rpc.mock.calls.filter(([name]) => name === 'admin_get_user_detail')).toHaveLength(changeAccount ? 2 : 1)
})
