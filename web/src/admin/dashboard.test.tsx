// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../game', () => ({ callRpc: rpc, message: (_e: unknown, f: string) => f }))

import { DashboardSection } from './DashboardSection'
import { emptyFilter, toRpcParams } from './filters'

afterEach(() => { cleanup(); vi.clearAllMocks() })
const kpis = { total: 4, in_progress: 1, completed: 3, resume_rate: 0.25, avg_score: null, eligible: 2, unclaimed: 1, claimed: 1 }

it('renders 8 tiles from the RPC and refetches with mapped params on filter change', async () => {
  rpc.mockResolvedValue({ ok: true, code: 'OK', data: kpis })
  render(<DashboardSection onForbidden={() => {}} />)
  expect(await screen.findByText('25%')).toBeTruthy()
  expect(screen.getAllByRole('listitem')).toHaveLength(8)
  expect(screen.getByText('—')).toBeTruthy() // avg_score null
  expect(rpc).toHaveBeenLastCalledWith('admin_get_dashboard', toRpcParams(emptyFilter))

  fireEvent.change(screen.getByLabelText('Quà'), { target: { value: 'CLAIMED' } })
  fireEvent.change(screen.getByLabelText('Điểm từ'), { target: { value: '6' } })
  await waitFor(() => expect(rpc).toHaveBeenLastCalledWith('admin_get_dashboard',
    { p_from: null, p_to: null, p_status: null, p_score_min: 6, p_score_max: null, p_prize: 'CLAIMED' }))
})

it('FORBIDDEN calls onForbidden', async () => {
  rpc.mockResolvedValue({ ok: false, code: 'FORBIDDEN' })
  const onForbidden = vi.fn()
  render(<DashboardSection onForbidden={onForbidden} />)
  await waitFor(() => expect(onForbidden).toHaveBeenCalled())
})

it('toRpcParams: to-date is inclusive (next local midnight)', () => {
  const p = toRpcParams({ ...emptyFilter, from: '2026-10-01', to: '2026-10-01' })
  expect(new Date(p.p_to!).getTime() - new Date(p.p_from!).getTime()).toBe(86400000)
})
