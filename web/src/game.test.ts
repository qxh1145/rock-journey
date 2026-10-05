import { expect, it } from 'vitest'
import { optText, type Question } from './game'

const q: Question = { question_id: 'q1', index: 1, prompt: 'p', options: [{ id: 'a', text: 'Một' }, { id: 'b', text: 'Hai' }] }

it('optText returns the option text, empty when missing', () => {
  expect(optText(q, 'b')).toBe('Hai')
  expect(optText(q, 'zzz')).toBe('')
  expect(optText(q, null)).toBe('')
})
