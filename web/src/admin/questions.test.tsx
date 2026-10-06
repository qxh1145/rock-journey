// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const rpc = vi.hoisted(() => vi.fn())
const read = vi.hoisted(() => vi.fn())
vi.mock('../game', () => ({ callRpc: rpc, message: (_e: unknown, f = 'x') => f }))
vi.mock('./fileExport', async (orig) => ({ ...(await orig<typeof import('./fileExport')>()), readXlsx: read }))

import { QuestionsSection } from './QuestionsSection'

afterEach(() => { cleanup(); vi.clearAllMocks() })
const head = ['idx', 'prompt', 'a', 'b', 'c', 'd', 'correct', 'explanation']
const sheet = (n = 12) => [head, ...Array.from({ length: n }, (_, i) => [String(i + 1), `Câu ${i + 1}`, 'Đá', 'B', 'C', 'D', 'B', 'Vì'])]
const sets = { ok: true, code: 'OK', data: [{ version: 'v1', active: true, count: 12 }, { version: 'v2', active: false, count: 12 }] }
const upload = () => fireEvent.change(screen.getByLabelText('File câu hỏi'), { target: { files: [new File(['x'], 'q.xlsx')] } })

it('lists sets; valid file previews and imports with normalised rows', async () => {
  rpc.mockResolvedValue(sets)
  read.mockResolvedValue(sheet())
  render(<QuestionsSection onForbidden={vi.fn()} />)
  expect(await screen.findByText('Đang dùng')).toBeTruthy()
  upload()
  expect(await screen.findByText('Câu 12')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Phiên bản mới'), { target: { value: ' v3 ' } })
  rpc.mockResolvedValueOnce({ ok: true, code: 'OK', data: {} })
  fireEvent.click(screen.getByText('Nhập bộ câu hỏi'))
  expect(await screen.findByText('Đã nhập bộ v3 (chưa kích hoạt)')).toBeTruthy()
  const [name, args] = rpc.mock.calls.find((c) => c[0] === 'admin_import_question_set')!
  expect(name).toBe('admin_import_question_set')
  expect(args.p_version).toBe('v3')
  expect(args.p_questions).toHaveLength(12)
  expect(args.p_questions[0]).toEqual({ idx: '1', prompt: 'Câu 1', a: 'Đá', b: 'B', c: 'C', d: 'D', correct: 'b', explanation: 'Vì' })
})

it('invalid xlsx: row errors shown, import disabled', async () => {
  rpc.mockResolvedValue(sets)
  const bad = sheet(11)
  bad[3][6] = 'e'
  read.mockResolvedValue(bad)
  render(<QuestionsSection onForbidden={vi.fn()} />)
  upload()
  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toContain('Cần đúng 12 câu, file có 11')
  expect(alert.textContent).toContain('Dòng 4: correct phải là a, b, c hoặc d')
  fireEvent.change(screen.getByLabelText('Phiên bản mới'), { target: { value: 'v3' } })
  expect((screen.getByText('Nhập bộ câu hỏi') as HTMLButtonElement).disabled).toBe(true)
})

it('activate needs a confirm step', async () => {
  rpc.mockResolvedValue(sets)
  render(<QuestionsSection onForbidden={vi.fn()} />)
  fireEvent.click(await screen.findByText('Kích hoạt'))
  expect(rpc.mock.calls.some((c) => c[0] === 'admin_activate_question_set')).toBe(false)
  fireEvent.click(screen.getByText('Xác nhận kích hoạt v2'))
  expect(await screen.findByText('Đã kích hoạt bộ v2')).toBeTruthy()
  expect(rpc).toHaveBeenCalledWith('admin_activate_question_set', { p_version: 'v2' })
})

it('FORBIDDEN calls onForbidden', async () => {
  rpc.mockResolvedValue({ ok: false, code: 'FORBIDDEN' })
  const f = vi.fn()
  render(<QuestionsSection onForbidden={f} />)
  await vi.waitFor(() => expect(f).toHaveBeenCalled())
})

it('header with trailing empty cell is accepted; blank middle row keeps Excel row numbers', async () => {
  rpc.mockResolvedValue(sets)
  const s = sheet()
  s[0] = [...head, '']
  s[5] = [...s[5], '']
  s[6][6] = 'x'
  s.splice(3, 0, ['', '', '']) // dòng 4 trống → câu 6 nằm ở dòng 8
  read.mockResolvedValue(s)
  render(<QuestionsSection onForbidden={vi.fn()} />)
  upload()
  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toBe('Dòng 8: correct phải là a, b, c hoặc d')
  expect(screen.getByText('Câu 12')).toBeTruthy() // vẫn xem trước khi có lỗi
})
