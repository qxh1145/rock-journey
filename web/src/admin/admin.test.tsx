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

afterEach(() => { cleanup(); vi.clearAllMocks() })
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
