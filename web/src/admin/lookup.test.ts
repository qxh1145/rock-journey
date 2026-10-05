import { expect, it } from 'vitest'
import { prizeStatus, titleOf, type PlayerRow } from './LookupSection'

const base: PlayerRow = { player_id: 'p', email: 'p1@x', session_id: 's', status: 'COMPLETED', correct_count: 10, answered_count: 12,
  completed_at: null, qualified_for_reward: true, reward_claimed: false, reward_claimed_at: null }

it('derives title and prize status per matrix', () => {
  expect(titleOf(base)).toBe('Mầm Nghề')
  expect(prizeStatus(base)).toBe('Chưa trao')
  expect(prizeStatus({ ...base, reward_claimed: true, reward_claimed_at: '2026-10-06T00:00:00Z' })).toMatch(/^Đã trao · /)
  const fail = { ...base, qualified_for_reward: false }
  expect(titleOf(fail)).toBeNull()
  expect(prizeStatus(fail)).toBe('Không đủ điều kiện')
  const none = { ...base, session_id: null, status: 'NONE', qualified_for_reward: false }
  expect(prizeStatus(none)).toBe('Chưa chơi')
  expect(titleOf(none)).toBeNull()
})
