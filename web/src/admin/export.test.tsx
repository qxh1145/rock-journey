// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const rpc = vi.hoisted(() => vi.fn())
const dl = vi.hoisted(() => ({ csv: vi.fn(), xlsx: vi.fn() }))
vi.mock('../game', () => ({ callRpc: rpc, message: (_e: unknown, f: string) => f }))
vi.mock('./fileExport', async (orig) => ({
  ...(await orig<typeof import('./fileExport')>()), downloadCsv: dl.csv, downloadXlsx: dl.xlsx,
}))

import { ExportSection } from './ExportSection'
import { parseCsv } from './fileExport'

afterEach(() => { cleanup(); vi.clearAllMocks() })

it('parseCsv handles quoted commas, quotes and CRLF', () => {
  expect(parseCsv('a,b\r\n"x,y","he said ""hi"""\n')).toEqual([['a', 'b'], ['x,y', 'he said "hi"']])
})

it('CSV export calls RPC with reward filter and downloads', async () => {
  rpc.mockResolvedValue({ ok: true, code: 'OK', data: { csv: 'h', row_count: 0 } })
  render(<ExportSection onForbidden={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Bộ lọc quà'), { target: { value: 'claimed' } })
  fireEvent.click(screen.getByText('Tải CSV'))
  expect(await screen.findByText('0 dòng')).toBeTruthy()
  expect(rpc.mock.calls[0][0]).toBe('admin_export_report')
  expect(rpc.mock.calls[0][1].p_reward).toBe('CLAIMED')
  expect(dl.csv.mock.calls[0][0]).toMatch(/^prize-list-claimed-\d{8}\.csv$/)
  expect(dl.csv.mock.calls[0][1]).toBe('h')
})

it('all qualified: two calls, one header; XLSX gets parsed rows', async () => {
  rpc.mockResolvedValueOnce({ ok: true, data: { csv: 'h\n"a,1"', row_count: 1 } })
    .mockResolvedValueOnce({ ok: true, data: { csv: 'h\n"b"', row_count: 1 } })
  render(<ExportSection onForbidden={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Bộ lọc quà'), { target: { value: 'qualified' } })
  fireEvent.click(screen.getByText('Tải XLSX'))
  expect(await screen.findByText('2 dòng')).toBeTruthy()
  expect(rpc.mock.calls.map((c) => c[1].p_reward)).toEqual(['QUALIFIED_UNCLAIMED', 'CLAIMED'])
  expect(dl.xlsx.mock.calls[0][1]).toEqual([['h'], ['a,1'], ['b']])
})

it('FORBIDDEN calls onForbidden, no file', async () => {
  rpc.mockResolvedValue({ ok: false, code: 'FORBIDDEN' })
  const f = vi.fn()
  render(<ExportSection onForbidden={f} />)
  fireEvent.click(screen.getByText('Tải CSV'))
  await vi.waitFor(() => expect(f).toHaveBeenCalled())
  expect(dl.csv).not.toHaveBeenCalled()
})

it('RPC failure shows alert, no file', async () => {
  rpc.mockResolvedValue({ ok: false, code: 'X', message: 'lỗi' })
  render(<ExportSection onForbidden={vi.fn()} />)
  fireEvent.click(screen.getByText('Tải XLSX'))
  expect((await screen.findByRole('alert')).textContent).toBe('lỗi')
  expect(dl.xlsx).not.toHaveBeenCalled()
})

it('all qualified with empty first call: no blank line', async () => {
  rpc.mockResolvedValueOnce({ ok: true, data: { csv: 'h\n', row_count: 0 } })
    .mockResolvedValueOnce({ ok: true, data: { csv: 'h\n"b"', row_count: 1 } })
  render(<ExportSection onForbidden={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Bộ lọc quà'), { target: { value: 'qualified' } })
  fireEvent.click(screen.getByText('Tải CSV'))
  await screen.findByText('1 dòng')
  expect(dl.csv.mock.calls[0][1]).toBe('h\n"b"')
  rpc.mockResolvedValueOnce({ ok: true, data: { csv: 'h\n', row_count: 0 } })
    .mockResolvedValueOnce({ ok: true, data: { csv: 'h\n"b"', row_count: 1 } })
  fireEvent.click(screen.getByText('Tải XLSX'))
  await vi.waitFor(() => expect(dl.xlsx).toHaveBeenCalled())
  expect(dl.xlsx.mock.calls[0][1]).toEqual([['h'], ['b']])
})
