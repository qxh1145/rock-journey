// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../game', () => ({ callRpc: rpc, message: (_e: unknown, f: string) => f }))

import { LiveSection } from './LiveSection'
import { emptyFilter, toRpcParams } from './filters'

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers() })
const row = (email: string, answered: number) =>
  ({ session_id: email, email, answered, correct: 1, current_idx: answered + 1, last_activity: '2026-10-06T03:00:00Z' })

it('polls every 5 s and refreshes the table; pauses while hidden', async () => {
  vi.useFakeTimers()
  rpc.mockResolvedValue({ ok: true, code: 'OK', data: [row('a@x.com', 1)] })
  render(<LiveSection onForbidden={vi.fn()} />)
  await act(async () => {})
  expect(screen.getByText('a@x.com')).toBeTruthy()
  expect(screen.getByRole('status').textContent).toMatch(/^cập nhật lúc \d{2}:\d{2}:\d{2}$/)
  expect(rpc).toHaveBeenCalledWith('admin_live_progress', toRpcParams(emptyFilter))

  rpc.mockResolvedValue({ ok: true, code: 'OK', data: [row('b@x.com', 2), row('a@x.com', 1)] })
  await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
  expect(screen.getByText('b@x.com')).toBeTruthy()
  expect(rpc).toHaveBeenCalledTimes(2)

  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
  await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
  expect(rpc).toHaveBeenCalledTimes(2)
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(rpc).toHaveBeenCalledTimes(3)
})

it('FORBIDDEN calls onForbidden', async () => {
  rpc.mockResolvedValue({ ok: false, code: 'FORBIDDEN' })
  const f = vi.fn()
  render(<LiveSection onForbidden={f} />)
  await vi.waitFor(() => expect(f).toHaveBeenCalled())
})
