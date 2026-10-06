// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const rpc = vi.hoisted(() => vi.fn())
const auth = vi.hoisted(() => ({
  getSession: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn(),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
}))
vi.mock('../game', () => ({ callRpc: rpc, message: (_e: unknown, f: string) => f }))
vi.mock('../lib/supabase', () => ({ supabase: { auth } }))

import { AdminApp } from './AdminApp'

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })
const signedIn = () => {
  auth.getSession.mockResolvedValue({ data: { session: { user: {} } } })
  rpc.mockResolvedValue({ ok: true, code: 'OK', data: [] })
}
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
  const btn = (await screen.findByText('Tìm')) as HTMLButtonElement
  expect(btn.disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('Email người chơi'), { target: { value: '  ' } })
  expect(btn.disabled).toBe(true)
})

it('no match shows empty message', async () => {
  signedIn()
  rpc.mockResolvedValue({ ok: true, data: [] })
  render(<AdminApp />)
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
  await screen.findByText('Tìm')
  search('p1')
  fireEvent.click(await screen.findByText('Trao quà'))
  expect(await screen.findByText('Người này đã nhận quà trước đó.')).toBeTruthy()
  const call = rpc.mock.calls.find((c) => c[0] === 'admin_claim_reward')!
  expect(call[1].p_session_id).toBe('s1')
  expect(call[1].p_request_id).toBeTruthy()
})
