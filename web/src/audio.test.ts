import { beforeEach, expect, test, vi } from 'vitest'
import { DEFAULT_PREFS, PREFS_KEY, loadPrefs, savePrefs, sfx } from './audio'

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

test('SFX off: tear plays nothing but still calls back (CAP-4)', () => {
  const Audio = vi.fn()
  vi.stubGlobal('Audio', Audio)
  sfx.enabled = false
  try {
    const done = vi.fn()
    sfx.play('tear', done)
    expect(Audio).not.toHaveBeenCalled()
    expect(done).toHaveBeenCalledOnce()
  } finally {
    sfx.enabled = true
    vi.unstubAllGlobals()
  }
})
