// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../game', () => ({ callRpc: rpc, message: (_e: unknown, f: string) => f }))

import { UsersSection } from './UsersSection'
import { emptyFilter, toRpcParams } from './filters'

afterEach(() => { cleanup(); vi.clearAllMocks() })
const row = { player_id: 'u1', email: 'p1@mail.com', display_name: null, locked: false, status: 'COMPLETED', correct_count: 10, answered_count: 12, prize: 'CLAIMED' }
const list = { ok: true, code: 'OK', data: { total: 45, page: 1, page_size: 20, rows: [row] } }
const detail = { ok: true, code: 'OK', data: {
  profile: { email: 'p1@mail.com', display_name: null, locked: false, first_seen_at: '2026-10-01T00:00:00Z', last_seen_at: '2026-10-01T00:00:00Z' },
  session: { status: 'COMPLETED', answered_count: 12, correct_count: 10, started_at: '2026-10-01T00:00:00Z', completed_at: null, resume_count: 0, qualified_for_reward: true, reward_claimed: true, reward_claimed_at: null },
  answers: [{ question_index: 3, prompt: 'Câu ba', selected_text: 'B', is_correct: false, answered_at: '2026-10-01T00:00:00Z' }],
} }
const last = () => rpc.mock.lastCall

it('renders the list; filter change reloads from page 1; Sau requests page 2', async () => {
  rpc.mockResolvedValue(list)
  render(<UsersSection onForbidden={() => {}} />)
  expect(await screen.findByText('p1@mail.com')).toBeTruthy()
  expect(screen.getByText('Trang 1/3 · 45 người')).toBeTruthy()
  expect(last()).toEqual(['admin_search_users', { ...toRpcParams(emptyFilter), p_q: null, p_page: 1 }])

  fireEvent.click(screen.getByText('Sau'))
  await waitFor(() => expect(last()![1]).toMatchObject({ p_page: 2 }))

  fireEvent.change(screen.getByLabelText('Quà'), { target: { value: 'CLAIMED' } })
  await waitFor(() => expect(last()).toEqual(['admin_search_users', { ...toRpcParams({ ...emptyFilter, prize: 'CLAIMED' }), p_q: null, p_page: 1 }]))
  fireEvent.change(screen.getByLabelText('Email người chơi'), { target: { value: 'p3' } })
  await waitFor(() => expect(last()![1]).toMatchObject({ p_q: 'p3', p_page: 1 }))
})

it('row click shows detail with answers; back keeps the list', async () => {
  rpc.mockImplementation((fn: string) => Promise.resolve(fn === 'admin_get_user_detail' ? detail : list))
  render(<UsersSection onForbidden={() => {}} />)
  fireEvent.click(await screen.findByText('p1@mail.com'))
  expect(await screen.findByText('Câu ba')).toBeTruthy()
  expect(screen.getByText('Sai')).toBeTruthy()
  expect(rpc).toHaveBeenCalledWith('admin_get_user_detail', { p_user_id: 'u1' })
  fireEvent.click(screen.getByText('← Danh sách'))
  expect(await screen.findByText('Trang 1/3 · 45 người')).toBeTruthy()
})

it('FORBIDDEN calls onForbidden', async () => {
  rpc.mockResolvedValue({ ok: false, code: 'FORBIDDEN' })
  const onForbidden = vi.fn()
  render(<UsersSection onForbidden={onForbidden} />)
  await waitFor(() => expect(onForbidden).toHaveBeenCalled())
})
