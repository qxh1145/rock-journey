import { useEffect, useRef, useState } from 'react'

export type Track = { title: string; asset_url: string }
type Sfx = 'click' | 'correct' | 'wrong' | 'saw' | 'chisel' | 'tear' | 'finish' | 'badge'

export const PREFS_KEY = 'rock-journey-audio'
export type Prefs = { music: boolean; sfx: boolean; track: string | null }
// FR-12: nhạc bật mặc định, phát ở tương tác đầu tiên
export const DEFAULT_PREFS: Prefs = { music: true, sfx: true, track: null }
export const loadPrefs = (): Prefs => {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') } } catch { return { ...DEFAULT_PREFS } }
}
export const savePrefs = (p: Prefs) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* bỏ qua */ } }

// SFX: file /audio/sfx/<tên>.mp3; thiếu file thì phát beep tổng hợp để game vẫn có phản hồi
const BEEP: Record<Sfx, [number, number]> = {
  click: [660, 0.05], correct: [880, 0.15], wrong: [220, 0.2], saw: [90, 0.35], chisel: [140, 0.12], tear: [400, 0.08], finish: [1320, 0.3], badge: [1046, 0.4],
}
const M = (f: string) => encodeURI(`/audio/music/${f}`)
const SFX_URL: Partial<Record<Sfx, string>> = {
  saw: M('upgrade-sfx.mp3'),
  correct: M('Duolingo Correct Sound Effect.mp3'),
  wrong: M('Duolingo Incorrect Answer sound effect.mp3'),
  finish: M('The Witcher 3： Wild Hunt ｜ Quest Completed ♪ [Sound Effect].mp3'),
}
// nhạc nền mặc định: hai bài nối nhau, lặp lại
export const DEFAULT_QUEUE = [M("Evil's Soft First Touches.mp3"), M('Fate\u00a0Calls.mp3')]
export const FINALE_SONG = M('VSTRA - So Bad.mp3')

const cache = new Map<Sfx, HTMLAudioElement | null>()
let ctx: AudioContext | null = null
let duck: (() => void) | null = null

export const sfx = {
  enabled: loadPrefs().sfx,
  play(kind: Sfx, onEnd?: () => void) {
    if (!this.enabled) return void onEnd?.()
    duck?.()
    let el = cache.get(kind)
    if (el === undefined) {
      el = new Audio(SFX_URL[kind] ?? `/audio/sfx/${kind}.mp3`)
      el.volume = 0.7
      el.onerror = () => cache.set(kind, null)
      cache.set(kind, el)
    }
    if (el) {
      const a = el.cloneNode() as HTMLAudioElement
      a.volume = 0.7
      if (onEnd) a.onended = onEnd
      a.play().catch(() => { beep(kind); onEnd?.() })
    } else { beep(kind); onEnd?.() }
  },
}

function beep(kind: Sfx) {
  ctx ??= new AudioContext()
  const [f, d] = BEEP[kind]
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.frequency.value = f
  g.gain.value = 0.08
  o.connect(g).connect(ctx.destination)
  o.start(); o.stop(ctx.currentTime + d)
}

// bài mặc định / bài kết không nằm trong playlist → lấy tên từ file đang phát
export const trackTitle = (track: string | null, tracks: Track[]) =>
  tracks.find((t) => t.asset_url === track)?.title ?? (track ? decodeURI(track).split('/').pop()!.replace(/\.mp3$/i, '') : tracks[0]?.title ?? '')

const MUSIC_VOL = 0.3

export function useMusic(tracks: Track[], defaultQueue: string[] | null) {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [finale, setFinale] = useState(false)
  const [idx, setIdx] = useState(0)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(false)
  const ref = useRef<HTMLAudioElement | null>(null)
  // bài đã chọn bị gỡ khỏi danh sách phát → quay về hàng đợi mặc định
  const picked = prefs.track && (!tracks.length || tracks.some((t) => t.asset_url === prefs.track)) ? prefs.track : null
  const queue = finale ? [FINALE_SONG] : picked ? [picked] : defaultQueue ?? (tracks[0] ? [tracks[0].asset_url] : [])
  const track = queue.length ? queue[idx % queue.length] : null

  if (!ref.current && typeof Audio !== 'undefined') {
    const a = new Audio()
    a.loop = true
    a.volume = MUSIC_VOL
    ref.current = a
  }

  useEffect(() => {
    const a = ref.current!
    const t = () => setTime(a.currentTime), d = () => setDuration(a.duration), e = () => setError(true), n = () => setIdx((i) => i + 1)
    a.addEventListener('timeupdate', t); a.addEventListener('loadedmetadata', d); a.addEventListener('error', e); a.addEventListener('ended', n)
    // giảm nhạc khi có hiệu ứng quan trọng
    duck = () => { a.volume = MUSIC_VOL * 0.4; window.setTimeout(() => (a.volume = MUSIC_VOL), 900) }
    // autoplay bị chặn → thử lại ở mọi tương tác cho tới khi phát được.
    // Cảm ứng chỉ được phép phát ở pointerup/touchend/click (không phải pointerdown) nên nghe đủ các event
    const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']
    const stop = () => GESTURES.forEach((g) => document.removeEventListener(g, unlock, true))
    const unlock = () => { if (prefs.music && a.paused && a.src) a.play().then(stop, () => {}) }
    GESTURES.forEach((g) => document.addEventListener(g, unlock, true))
    return () => { a.removeEventListener('timeupdate', t); a.removeEventListener('loadedmetadata', d); a.removeEventListener('error', e); a.removeEventListener('ended', n); stop() }
  }, [prefs.music])

  useEffect(() => {
    savePrefs(prefs)
    sfx.enabled = prefs.sfx
    const a = ref.current!
    a.loop = queue.length === 1
    if (track && !a.src.endsWith(track)) { setError(false); a.src = track }
    if (prefs.music && track) a.play().catch(() => {})
    else a.pause()
  }, [prefs, track, queue.length])

  return {
    track, time, duration, error,
    playing: prefs.music,
    sfxOn: prefs.sfx,
    toggle: () => setPrefs((p) => ({ ...p, music: !p.music })),
    toggleSfx: () => setPrefs((p) => ({ ...p, sfx: !p.sfx })),
    select: (url: string) => { setFinale(false); setPrefs((p) => ({ ...p, track: url, music: true })) },
    // hoàn thành: dừng nhạc, phát SFX hoàn thành rồi chuyển sang bài kết
    finish: () => { ref.current?.pause(); sfx.play('finish', () => { setIdx(0); setFinale(true) }) },
    seek: (s: number) => { if (ref.current) ref.current.currentTime = s },
  }
}
