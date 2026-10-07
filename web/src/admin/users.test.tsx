// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../game', () => ({ callRpc: rpc, message: (_e: unknown, f: string) => f }))

import { UsersSection } from './UsersSection'
import { emptyFilter, toRpcParams } from './filters'

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })
const row = { player_id: 'u1', email: 'p1@mail.com', display_name: null, locked: false, status: 'COMPLETED', correct_count: 10, answered_count: 12, prize: 'CLAIMED' }
const list = { ok: true, code: 'OK', data: { total: 45, page: 1, page_size: 20, rows: [row] } }
const detail = { ok: true, code: 'OK', data: {
  profile: { email: 'p1@mail.com', display_name: null, locked: false, first_seen_at: '2026-10-01T00:00:00Z', last_seen_at: '2026-10-01T00:00:00Z' },
  session: { session_id: 'exact-session', status: 'COMPLETED', answered_count: 12, correct_count: 10, started_at: '2026-10-01T00:00:00Z', completed_at: null, resume_count: 0, qualified_for_reward: true, reward_claimed: true, reward_claimed_at: null },
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

const resetCalls = () => rpc.mock.calls.filter(([name]) => name === 'admin_reset_player_progress')
function setupReset(result: unknown = { ok: true, code: 'OK' }) {
  vi.stubGlobal('confirm', vi.fn(() => true))
  rpc.mockImplementation(async (name: string) => name === 'admin_get_user_detail' ? detail
    : name === 'admin_reset_player_progress' ? result : list)
}

it('reset confirms the email and clears score/reward warning; preserves filters/page on refresh', async () => {
  setupReset()
  render(<UsersSection onForbidden={() => {}} />)
  await screen.findByText(row.email)
  fireEvent.change(screen.getByLabelText('Quà'), { target: { value: 'CLAIMED' } })
  fireEvent.click(screen.getByText('Sau'))
  fireEvent.click(screen.getByText('Reset lượt chơi'))
  await screen.findByText(`Đã reset lượt chơi cho ${row.email}.`)
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining(row.email))
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Điểm và trạng thái quà'))
  expect(resetCalls()[0][1]).toEqual({ p_session_id: 'exact-session', p_request_id: expect.any(String) })
  expect(last()![1]).toMatchObject({ p_page: 2, p_prize: 'CLAIMED' })
})

it('cancel and missing session never mutate', async () => {
  setupReset()
  vi.stubGlobal('confirm', () => false)
  render(<UsersSection onForbidden={() => {}} />)
  fireEvent.click(await screen.findByText('Reset lượt chơi'))
  await waitFor(() => expect((screen.getByText('Reset lượt chơi') as HTMLButtonElement).disabled).toBe(false))
  expect(resetCalls()).toHaveLength(0)
  rpc.mockImplementation(async (name: string) => name === 'admin_get_user_detail' ? { ...detail, data: { ...detail.data, session: null } } : list)
  fireEvent.click(screen.getByText('Reset lượt chơi'))
  await screen.findByText('Người dùng chưa có lượt chơi.')
  expect(resetCalls()).toHaveLength(0)
})

it('no-progress rows disable reset', async () => {
  rpc.mockResolvedValue({ ...list, data: { ...list.data, rows: [{ ...row, status: 'NONE' }] } })
  render(<UsersSection onForbidden={() => {}} />)
  expect((await screen.findByText('Reset lượt chơi') as HTMLButtonElement).disabled).toBe(true)
})

it('lost response retries identical target/key without fetching a replacement; double click is guarded', async () => {
  setupReset()
  let reject!: (error: Error) => void
  rpc.mockImplementation((name: string) => name === 'admin_get_user_detail' ? Promise.resolve(detail)
    : name === 'admin_reset_player_progress' ? new Promise((_resolve, rej) => { reject = rej }) : Promise.resolve(list))
  render(<UsersSection onForbidden={() => {}} />)
  const button = await screen.findByText('Reset lượt chơi')
  fireEvent.click(button)
  fireEvent.click(button)
  await waitFor(() => expect(resetCalls()).toHaveLength(1))
  reject(new Error('lost'))
  await screen.findByRole('alert')
  rpc.mockImplementation(async (name: string) => name === 'admin_reset_player_progress' ? { ok: true } : list)
  fireEvent.click(button)
  await screen.findByText(`Đã reset lượt chơi cho ${row.email}.`)
  expect(resetCalls()).toHaveLength(2)
  expect(resetCalls()[1]).toEqual(resetCalls()[0])
  expect(rpc.mock.calls.filter(([name]) => name === 'admin_get_user_detail')).toHaveLength(1)
})

it.each(['FORBIDDEN', 'CONFLICT'])('reset handles %s without false success', async (code) => {
  setupReset({ ok: false, code, message: 'Lượt chơi đã thay đổi.' })
  const onForbidden = vi.fn()
  render(<UsersSection onForbidden={onForbidden} />)
  fireEvent.click(await screen.findByText('Reset lượt chơi'))
  if (code === 'FORBIDDEN') await waitFor(() => expect(onForbidden).toHaveBeenCalled())
  else {
    await screen.findByRole('alert')
    await waitFor(() => expect(rpc.mock.calls.filter(([name]) => name === 'admin_search_users')).toHaveLength(2))
  }
  expect(screen.queryByText(`Đã reset lượt chơi cho ${row.email}.`)).toBeNull()
})

it('successful list recovery clears load errors after changing search', async () => {
  rpc.mockRejectedValue(new Error('offline'))
  render(<UsersSection onForbidden={() => {}} />)
  await screen.findByRole('alert')
  rpc.mockResolvedValue(list)
  fireEvent.change(screen.getByLabelText('Email người chơi'), { target: { value: 'p1' } })
  await screen.findByText(row.email)
  expect(screen.queryByRole('alert')).toBeNull()
})
