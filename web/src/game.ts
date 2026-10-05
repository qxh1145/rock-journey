import { supabase } from './lib/supabase'

export type Screen = 'loading' | 'landing' | 'playing' | 'showcase' | 'result' | 'error' | 'setup'
export type Stage = 'RAW' | 'CARVED_1' | 'CARVED_2' | 'CARVED_3' | 'CARVED_4' | 'CARVED_5' | 'FINISHED'
export type Option = { id: string; text: string }
export type Question = { question_id: string; index: number; prompt: string; options: Option[] }
export type AnswerFeedback = { answer_id: string; question_index: number; is_correct: boolean; correct_option_id: string; explanation: string }
export type GameState = {
  session_id: string
  status: 'IN_PROGRESS' | 'COMPLETED'
  answered_count: number
  correct_count: number
  mascot_stage: Stage
  qualified_for_reward: boolean
  reward_claimed: boolean
  title?: 'MAM_NGHE' | null
  question?: Question | null
  answer?: AnswerFeedback
  chisel_event_id?: string | null
}
export type RpcResponse<T> = { ok: boolean; code: string; message: string | null; data: T | null }
export type PendingAnswer = { option: string; key: string }

export const STAGES: Stage[] = ['RAW', 'CARVED_1', 'CARVED_2', 'CARVED_3', 'CARVED_4', 'CARVED_5', 'FINISHED']
export const CHISEL_KEY = 'rock-journey-chisel-seen'
export const BADGE_KEY = 'rock-journey-badge-seen'
export const CONFLICT = ['QUESTION_OUT_OF_ORDER', 'QUESTION_ALREADY_ANSWERED', 'SESSION_COMPLETED']

export function readStore<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
export function writeStore(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage có thể bị chặn */ }
}
export function removeStore(key: string) {
  try { localStorage.removeItem(key) } catch { /* storage có thể bị chặn */ }
}
export const message = (e: unknown, fallback = 'Có lỗi xảy ra.') => (e instanceof Error ? e.message : fallback)

export async function callRpc<T>(name: string, args?: Record<string, unknown>): Promise<RpcResponse<T>> {
  if (!supabase) throw new Error('Chưa cấu hình kết nối Supabase.')
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data as RpcResponse<T>
}

// Phản ứng của client theo docs/rpc-error-codes.md — chỉ rẽ nhánh theo code, không theo message
export type RpcAction = 'reload' | 'retry' | 'signin' | 'show'
const RELOAD = [...CONFLICT, 'CONFLICT', 'SESSION_ALREADY_EXISTS', 'NOT_FOUND']
export function rpcAction(code: string): RpcAction {
  if (RELOAD.includes(code)) return 'reload'
  if (code === 'DATABASE_UNAVAILABLE' || code === 'RATE_LIMITED') return 'retry'
  if (code === 'UNAUTHENTICATED') return 'signin'
  return 'show'
}

export const optText = (q: Question, id: string | null) => q.options.find((o) => o.id === id)?.text ?? ''
