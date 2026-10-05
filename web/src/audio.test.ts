import { beforeEach, expect, test } from 'vitest'
import { DEFAULT_PREFS, PREFS_KEY, loadPrefs, savePrefs } from './audio'

const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
} as Storage
beforeEach(() => store.clear())

test('music is on by default (FR-12)', () => {
  expect(loadPrefs()).toEqual({ music: true, sfx: true, track: null })
})

test('saved choice round-trips and fills missing fields', () => {
  savePrefs({ music: false, sfx: false, track: '/audio/music/2.mp3' })
  expect(loadPrefs()).toEqual({ music: false, sfx: false, track: '/audio/music/2.mp3' })
  store.set(PREFS_KEY, JSON.stringify({ track: 'x' }))
  expect(loadPrefs()).toEqual({ ...DEFAULT_PREFS, track: 'x' })
})

test('corrupt storage falls back to defaults', () => {
  store.set(PREFS_KEY, '{oops')
  expect(loadPrefs()).toEqual(DEFAULT_PREFS)
})

test('sfx.play is silent when SFX is off (CAP-4)', async () => {
  const { sfx } = await import('./audio')
  let made = 0
  globalThis.Audio = class { constructor() { made++ } } as unknown as typeof Audio
  const prev = [sfx.enabled, globalThis.Audio] as const
  sfx.enabled = false
  try {
    sfx.play('tear')
    expect(made).toBe(0)
  } finally {
    [sfx.enabled, globalThis.Audio] = prev
  }
})
