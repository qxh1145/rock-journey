import { useEffect, useRef, useState } from 'react'

export type Track = { title: string; asset_url: string }
type Sfx = 'click' | 'correct' | 'wrong' | 'saw' | 'chisel' | 'tear' | 'finish' | 'badge'

const PREFS_KEY = 'rock-journey-audio'
type Prefs = { music: boolean; sfx: boolean; track: string | null }
const loadPrefs = (): Prefs => {
  try { return { music: false, sfx: true, track: null, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') } } catch { return { music: false, sfx: true, track: null } }
}
const savePrefs = (p: Prefs) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* bỏ qua */ } }

// SFX: file /audio/sfx/<tên>.mp3; thiếu file thì phát beep tổng hợp để game vẫn có phản hồi
const BEEP: Record<Sfx, [number, number]> = {
  click: [660, 0.05], correct: [880, 0.15], wrong: [220, 0.2], saw: [90, 0.35], chisel: [140, 0.12], tear: [400, 0.08], finish: [1320, 0.3], badge: [1046, 0.4],
}
const cache = new Map<Sfx, HTMLAudioElement | null>()
let ctx: AudioContext | null = null
let duck: (() => void) | null = null

export const sfx = {
  enabled: loadPrefs().sfx,
  play(kind: Sfx) {
    if (!this.enabled) return
    duck?.()
    let el = cache.get(kind)
    if (el === undefined) {
      el = new Audio(`/audio/sfx/${kind}.mp3`)
      el.volume = 0.7
      el.onerror = () => cache.set(kind, null)
      cache.set(kind, el)
    }
    if (el) {
      const a = el.cloneNode() as HTMLAudioElement
      a.volume = 0.7
      a.play().catch(() => beep(kind))
    } else beep(kind)
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

const MUSIC_VOL = 0.3

export function useMusic(tracks: Track[]) {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(false)
  const ref = useRef<HTMLAudioElement | null>(null)
  const track = prefs.track ?? tracks[0]?.asset_url ?? null

  if (!ref.current && typeof Audio !== 'undefined') {
    const a = new Audio()
    a.loop = true
    a.volume = MUSIC_VOL
    ref.current = a
  }

  useEffect(() => {
    const a = ref.current!
    const t = () => setTime(a.currentTime), d = () => setDuration(a.duration), e = () => setError(true)
    a.addEventListener('timeupdate', t); a.addEventListener('loadedmetadata', d); a.addEventListener('error', e)
    // giảm nhạc khi có hiệu ứng quan trọng
    duck = () => { a.volume = MUSIC_VOL * 0.4; window.setTimeout(() => (a.volume = MUSIC_VOL), 900) }
    // autoplay bị chặn → thử lại ở tương tác đầu tiên
    const unlock = () => prefs.music && a.paused && a.play().catch(() => {})
    document.addEventListener('pointerdown', unlock, { once: true })
    return () => { a.removeEventListener('timeupdate', t); a.removeEventListener('loadedmetadata', d); a.removeEventListener('error', e); document.removeEventListener('pointerdown', unlock) }
  }, [prefs.music])

  useEffect(() => {
    savePrefs(prefs)
    sfx.enabled = prefs.sfx
    const a = ref.current!
    if (track && !a.src.endsWith(track)) { setError(false); a.src = track }
    if (prefs.music && track) a.play().catch(() => {})
    else a.pause()
  }, [prefs, track])

  return {
    track, time, duration, error,
    playing: prefs.music,
    sfxOn: prefs.sfx,
    toggle: () => setPrefs((p) => ({ ...p, music: !p.music })),
    toggleSfx: () => setPrefs((p) => ({ ...p, sfx: !p.sfx })),
    select: (url: string) => setPrefs((p) => ({ ...p, track: url, music: true })),
    seek: (s: number) => { if (ref.current) ref.current.currentTime = s },
  }
}
