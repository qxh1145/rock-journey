import { expect, it } from 'vitest'
import { optText, rpcAction, type Question } from './game'

const q: Question = { question_id: 'q1', index: 1, prompt: 'p', options: [{ id: 'a', text: 'Một' }, { id: 'b', text: 'Hai' }] }

it('optText returns the option text, empty when missing', () => {
  expect(optText(q, 'b')).toBe('Hai')
  expect(optText(q, 'zzz')).toBe('')
  expect(optText(q, null)).toBe('')
})

it('rpcAction maps contract codes to client reactions', () => {
  for (const c of ['QUESTION_OUT_OF_ORDER', 'QUESTION_ALREADY_ANSWERED', 'SESSION_COMPLETED', 'CONFLICT', 'NOT_FOUND']) expect(rpcAction(c)).toBe('reload')
  expect(rpcAction('DATABASE_UNAVAILABLE')).toBe('retry')
  expect(rpcAction('RATE_LIMITED')).toBe('retry')
  expect(rpcAction('UNAUTHENTICATED')).toBe('signin')
  expect(rpcAction('INVALID_OPTION')).toBe('show')
  expect(rpcAction('SOMETHING_NEW')).toBe('show')
})
