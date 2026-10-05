import { expect, it } from 'vitest'
import { STAGES, type GameState } from '../game'
import { carveCaption } from './Mascot'

const g = (answered: number): GameState => ({
  session_id: 's', status: answered === 12 ? 'COMPLETED' : 'IN_PROGRESS', answered_count: answered, correct_count: 0,
  mascot_stage: STAGES[Math.floor(answered / 2)], qualified_for_reward: false, reward_claimed: false,
})

it('carveCaption turns the stage into a percent and the next-carve countdown', () => {
  expect(carveCaption(g(0), false)).toBe('Tạc 0% · Còn 2 câu nữa là đục tiếp')
  expect(carveCaption(g(4), false)).toBe('Tạc 33% · Còn 2 câu nữa là đục tiếp')
  expect(carveCaption(g(5), false)).toBe('Tạc 33% · Xong câu này là đục tiếp')
  expect(carveCaption(g(12), false)).toBe('Tạc 100% · Tác phẩm hoàn thiện')
  expect(carveCaption(g(6), true)).toBe('Tạc 50% · Đang đục…')
})
