import { useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { sfx, useMusic, type Track } from './audio'
import './style.css'

type Screen = 'loading' | 'landing' | 'playing' | 'result' | 'error' | 'setup'
type Stage = 'RAW' | 'CARVED_1' | 'CARVED_2' | 'CARVED_3' | 'CARVED_4' | 'CARVED_5' | 'FINISHED'
type Option = { id: string; text: string }
type Question = { question_id: string; index: number; prompt: string; options: Option[] }
type AnswerFeedback = { answer_id: string; question_index: number; is_correct: boolean; correct_option_id: string; explanation: string }
type GameState = {
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
type RpcResponse<T> = { ok: boolean; code: string; message: string | null; data: T | null }
type PendingAnswer = { option: string; key: string }

const STAGES: Stage[] = ['RAW', 'CARVED_1', 'CARVED_2', 'CARVED_3', 'CARVED_4', 'CARVED_5', 'FINISHED']
const CHISEL_KEY = 'rock-journey-chisel-seen'
const BADGE_KEY = 'rock-journey-badge-seen'
const CONFLICT = ['QUESTION_OUT_OF_ORDER', 'QUESTION_ALREADY_ANSWERED', 'SESSION_COMPLETED']

function readStore<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
function writeStore(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage có thể bị chặn */ }
}
function removeStore(key: string) {
  try { localStorage.removeItem(key) } catch { /* storage có thể bị chặn */ }
}
const message = (e: unknown, fallback = 'Có lỗi xảy ra.') => (e instanceof Error ? e.message : fallback)

async function callRpc<T>(name: string, args?: Record<string, unknown>): Promise<RpcResponse<T>> {
  if (!supabase) throw new Error('Chưa cấu hình kết nối Supabase.')
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data as RpcResponse<T>
}

function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [game, setGame] = useState<GameState | null>(null)
  const [answeredQuestion, setAnsweredQuestion] = useState<Question | null>(null)
  const [user, setUser] = useState<Session['user'] | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [waitingSync, setWaitingSync] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [tracks, setTracks] = useState<Track[]>([])
  const [musicOpen, setMusicOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [badgeOpen, setBadgeOpen] = useState(false)
  // mascot hiển thị: giữ stage cũ trong lúc chạy animation đục rồi mới đổi
  const [carving, setCarving] = useState<{ from: Stage; key: string } | null>(null)
  // trang sổ cũ đang bị xé (Figma: xé trên xuống ~0,8s)
  const [torn, setTorn] = useState<{ key: string; node: React.ReactNode } | null>(null)
  const music = useMusic(tracks)
  const activeUserId = useRef<string | null>(null)

  const loadCurrentRoute = useCallback(async () => {
    if (!supabase) return setScreen('setup')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    setUser(session?.user ?? null)
    if (!session) { setGame(null); return setScreen('landing') }
    setScreen('loading')
    const r = await callRpc<GameState>('get_current_session')
    if (!r.ok) throw new Error(r.message ?? 'Không tải được lượt chơi.')
    if (r.code === 'NONE') {
      // landing đã nói luật → bắt đầu luôn sau khi đăng nhập
      const s = await callRpc<GameState>('start_session')
      if (!s.data) throw new Error(s.message ?? 'Không thể bắt đầu lượt chơi.')
      setGame(s.data)
      return setScreen(s.data.status === 'COMPLETED' ? 'result' : 'playing')
    }
    if (!r.data) throw new Error('Máy chủ chưa trả về trạng thái lượt chơi.')
    setGame(r.data)
    setScreen(r.data.status === 'COMPLETED' ? 'result' : 'playing')
  }, [])

  const reload = useCallback(() => {
    void loadCurrentRoute().catch((e: unknown) => { setError(message(e)); setScreen('error') })
  }, [loadCurrentRoute])

  useEffect(() => {
    if (!supabase) return setScreen('setup')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // SIGNED_IN bắn lại khi focus tab/refresh token → chỉ route khi đổi user
      const nextId = session?.user.id ?? null
      if (nextId === activeUserId.current) return
      activeUserId.current = nextId
      window.setTimeout(reload, 0) // không gọi Supabase trong callback (deadlock supabase-js)
    })
    void supabase.from('music_playlist').select('title, asset_url').order('display_order')
      .then(({ data }) => setTracks((data ?? []) as Track[]))
    return () => subscription.unsubscribe()
  }, [reload])

  // khôi phục lựa chọn chưa đồng bộ khi mở lại câu hỏi
  useEffect(() => {
    if (screen !== 'playing' || !game?.question || game.answer) return
    const pending = readStore<PendingAnswer | null>(`rock-journey-pending:${game.session_id}:${game.question.question_id}`, null)
    setSelected(pending?.option ?? null)
    setWaitingSync(Boolean(pending))
    setStatusMessage(pending ? 'Có câu trả lời chưa được xác nhận. Bấm để đồng bộ lại.' : '')
  }, [screen, game?.session_id, game?.question?.question_id, game?.answer])

  // mở huy chương một lần khi vừa đạt danh hiệu
  useEffect(() => {
    if (screen !== 'result' || game?.title !== 'MAM_NGHE') return
    const seen = readStore<string[]>(BADGE_KEY, [])
    if (seen.includes(game.session_id)) return
    writeStore(BADGE_KEY, [...seen, game.session_id])
    setBadgeOpen(true)
    sfx.play('badge')
  }, [screen, game?.title, game?.session_id])

  async function signIn() {
    if (!supabase) return
    setError('')
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (e) setError(e.message)
  }

  async function signOut() {
    setMenuOpen(false)
    await supabase?.auth.signOut()
  }

  async function submitAnswer() {
    if (!game?.question || !selected || submitting) return
    const question = game.question
    const pendingKey = `rock-journey-pending:${game.session_id}:${question.question_id}`
    const previous = readStore<PendingAnswer | null>(pendingKey, null)
    // giữ cùng idempotency key cho tới khi server xác nhận
    const pending = previous?.option === selected ? previous : { option: selected, key: crypto.randomUUID() }
    writeStore(pendingKey, pending)
    setSubmitting(true)
    setStatusMessage('Đang gửi…')
    try {
      const r = await callRpc<GameState>('submit_answer', {
        p_session_id: game.session_id, p_question_id: question.question_id,
        p_option_id: pending.option, p_idempotency_key: pending.key,
      })
      if (!r.ok || !r.data) {
        if (CONFLICT.includes(r.code)) { removeStore(pendingKey); return reload() }
        throw new Error(r.message ?? 'Không thể lưu câu trả lời.')
      }
      removeStore(pendingKey)
      const prevStage = game.mascot_stage
      setGame(r.data)
      setAnsweredQuestion(question)
      setWaitingSync(false)
      setStatusMessage('')
      sfx.play(r.data.answer?.is_correct ? 'correct' : 'wrong')
      const eventId = r.data.chisel_event_id
      const seen = readStore<string[]>(CHISEL_KEY, [])
      if (eventId && !seen.includes(eventId)) {
        writeStore(CHISEL_KEY, [...seen, eventId])
        setCarving({ from: prevStage, key: eventId })
      }
    } catch (e) {
      setWaitingSync(true)
      setStatusMessage(`${message(e, 'Mất kết nối')} — lựa chọn vẫn được giữ, bấm để đồng bộ lại.`)
    } finally {
      setSubmitting(false)
    }
  }

  function next() {
    if (!game) return
    if (game.status === 'COMPLETED') return setScreen('result')
    if (game.answer && feedbackPage) { setTorn({ key: game.answer.answer_id, node: feedbackPage }); sfx.play('tear') }
    setGame({ ...game, answer: undefined })
    setSelected(null)
  }

  const feedbackPage = game?.answer && answeredQuestion ? <Notebook>
    <p className="q">{answeredQuestion.prompt}</p>
    {!game.answer.is_correct && <p className="nb-wrong">× {optText(answeredQuestion, selected)} — Chưa chính xác</p>}
    <p className="nb-right">✓ {optText(answeredQuestion, game.answer.correct_option_id)} — {game.answer.is_correct ? 'Chính xác!' : 'Đáp án đúng'}</p>
    <p className="nb-explain">{game.answer.explanation}</p>
  </Notebook> : null

  const header = (title: string, showAvatar = true) => (
    <header className="top">
      {showAvatar && <button className="avatar" aria-label="Tài khoản" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
        {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" /> : <span aria-hidden="true">👤</span>}
      </button>}
      <strong className="top-title">{title}</strong>
      <button className="ghost" onClick={() => setMusicOpen(true)}>Đổi nhạc <span aria-hidden="true">♪</span></button>
    </header>
  )

  return (
    <div className="phone">
      <div className="rotate-hint" role="alert">Vui lòng xoay dọc điện thoại để chơi.</div>

      {screen === 'loading' && <p className="center muted" role="status">Đang tải hành trình…</p>}

      {screen === 'setup' && <main className="screen"><h1>Nghệ nhân tạc đá</h1>
        <p>Thêm <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_KEY</code> vào <code>.env.local</code>.</p></main>}

      {screen === 'landing' && <main className="screen">
        <p className="eyebrow">NGHỆ NHÂN TẠC ĐÁ</p>
        <h1>Từ khối đá thô,<br />đến một tác phẩm.</h1>
        <p className="muted">Khám phá nghề tạc đá qua 12 câu hỏi. Mỗi câu đúng giúp tác phẩm thành hình.</p>
        <Mascot stage="RAW" />
        <ul className="rules">
          <li>12 câu hỏi · Mỗi câu chốt một lần</li>
          <li>Đạt 10/12 để nhận danh hiệu</li>
          <li>Mỗi tài khoản chỉ được làm bài 1 lần</li>
        </ul>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="bottom"><button className="primary" onClick={() => void signIn()}>Đăng nhập bằng Google</button></div>
      </main>}

      {screen === 'playing' && game && <main className="screen">
        {header(`Câu ${Math.min(game.answer ? game.answered_count : game.answered_count + 1, 12)}/12`)}
        <div className="track"><div style={{ width: `${(game.answered_count / 12) * 100}%` }} /></div>
        <Mascot stage={game.mascot_stage} carving={carving} onCarved={() => setCarving(null)} />
        <p className="caption">{carveCaption(game, Boolean(carving))}</p>

        <div className="nb-stack">
        {feedbackPage ?? (game.question ? <Notebook key={game.question.question_id}>
          <p className="q" id="q">{game.question.prompt}</p>
          <div role="radiogroup" aria-labelledby="q">
            {game.question.options.map((o) => <button key={o.id} className="nb-opt" role="radio" aria-checked={selected === o.id}
              disabled={submitting} onClick={() => { setSelected(o.id); sfx.play('click') }}>
              <span className="box" aria-hidden="true" />{o.text}
            </button>)}
          </div>
          <p className="nb-hint">Chọn một đáp án · Chỉ chốt một lần</p>
        </Notebook> : <p className="center muted">Đang khôi phục câu hỏi…</p>)}
        {torn && <div key={torn.key} aria-hidden="true">
          <div className="tear keep">{torn.node}</div>
          <div className="tear piece" onAnimationEnd={() => setTorn(null)}>{torn.node}</div>
        </div>}
        </div>

        <div className="bottom">
          {game.answer
            ? <><button className="primary" onClick={next}>{game.status === 'COMPLETED' ? 'Xem kết quả' : `Tiếp tục câu ${game.answered_count + 1}`}</button>
                <p className="footnote">Đã lưu câu trả lời · Tiến độ được giữ nguyên</p></>
            : <><button className="primary" disabled={!selected || submitting || Boolean(torn)} onClick={() => void submitAnswer()}>
                  {submitting ? 'Đang gửi…' : waitingSync ? 'Thử đồng bộ lại' : 'Chốt đáp án'}</button>
                <p className={waitingSync ? 'footnote error' : 'footnote'} role="status">{statusMessage || 'Sau khi chốt, bạn không thể trả lời lại.'}</p></>}
        </div>
      </main>}

      {screen === 'result' && game && <main className="screen">
        {header('Kết quả', false)}
        <h1>Bạn đã hoàn thành!</h1>
        <p className="muted">Một tác phẩm, một khởi đầu mới.</p>
        <Mascot stage="FINISHED" small />
        {game.title === 'MAM_NGHE' && <p className="title-name">Mầm Nghề</p>}
        <p className="score">{game.correct_count} / 12 câu đúng</p>
        <section className="panel">
          {game.qualified_for_reward ? <>
            <h2>Đủ điều kiện nhận quà</h2>
            <p>Đưa email tài khoản Google cho ban tổ chức để kiểm tra và nhận quà.</p>
            <p className="small">Trạng thái: {game.reward_claimed ? 'Đã nhận quà' : 'Chưa nhận quà'}</p>
          </> : <p>Cảm ơn bạn đã tham gia hành trình tạc đá cùng chúng tôi.</p>}
        </section>
        <div className="bottom">
          {game.title === 'MAM_NGHE' && <button className="primary" onClick={() => { setBadgeOpen(true); sfx.play('badge') }}>Xem lại huy chương</button>}
          <p className="footnote left">Lượt chơi đã hoàn tất. Khi quay lại, bạn có thể xem kết quả và trạng thái quà.</p>
          <button className="link" onClick={() => void signOut()}>Đăng xuất</button>
        </div>
      </main>}

      {screen === 'error' && <main className="screen">
        <p className="error" role="alert">{error || 'Có lỗi xảy ra.'}</p>
        <div className="bottom"><button className="primary" onClick={reload}>Thử lại</button></div>
      </main>}

      {menuOpen && <div className="menu" role="menu">
        <p className="small">{user?.email}</p>
        <button role="menuitem" className="link" onClick={() => void signOut()}>Đăng xuất</button>
      </div>}

      {musicOpen && <MusicSheet music={music} tracks={tracks} onClose={() => setMusicOpen(false)} />}

      {badgeOpen && <div className="overlay" role="dialog" aria-modal="true" aria-label="Danh hiệu Mầm Nghề">
        <img className="badge-img" src="/assets/badge.webp" alt="Huy chương danh hiệu Mầm Nghề" />
        <p>Bạn đã đạt danh hiệu Mầm Nghề</p>
        <button className="primary light" autoFocus onClick={() => setBadgeOpen(false)}>Tiếp tục</button>
      </div>}
    </div>
  )
}

const optText = (q: Question, id: string | null) => q.options.find((o) => o.id === id)?.text ?? ''

function carveCaption(g: GameState, carving: boolean) {
  const pct = Math.round((STAGES.indexOf(g.mascot_stage) / 6) * 100)
  if (carving) return `Tạc ${pct}% · Đang đục…`
  if (g.status === 'COMPLETED') return 'Tạc 100% · Tác phẩm hoàn thiện'
  const odd = g.answered_count % 2 === 1
  if (!g.answer && odd) return `Tạc ${pct}% · Xong câu này là đục tiếp`
  return `Tạc ${pct}% · Còn ${odd ? 1 : 2} câu nữa là đục tiếp`
}

function Notebook({ children }: { children: React.ReactNode }) {
  return <section className="notebook"><div className="spiral" aria-hidden="true" /><div className="paper">{children}</div></section>
}

const DUST = ['dust-1', 'dust-2', 'dust-2', 'dust-3', 'dust-3', 'dust-4', 'dust-4']

function Mascot({ stage, carving, onCarved, small }: {
  stage: Stage; carving?: { from: Stage; key: string } | null; onCarved?: () => void; small?: boolean
}) {
  const [swapped, setSwapped] = useState(false)
  useEffect(() => {
    if (!carving) return
    setSwapped(false)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    // 2 nhát búa (≈0.25s & 0.55s), đổi hình ở 0.7s, kết thúc 1.2s (PRD §12); reduced motion → fade ngắn
    // máy xẻ 0–0.45s → đổi sang đục, búa gõ 2 nhát
    const hits = reduce ? [] : [window.setTimeout(() => sfx.play('saw'), 0),
      ...[600, 850].map((t) => window.setTimeout(() => sfx.play('chisel'), t))]
    const finish = stage === 'FINISHED' ? window.setTimeout(() => sfx.play('finish'), 900) : 0
    const swap = window.setTimeout(() => setSwapped(true), reduce ? 0 : 950)
    const done = window.setTimeout(() => onCarved?.(), reduce ? 250 : stage === 'FINISHED' ? 1600 : 1400)
    return () => [...hits, finish, swap, done].forEach(clearTimeout)
  }, [carving?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = carving && !swapped ? carving.from : stage
  const i = STAGES.indexOf(shown)
  return <div className={`mascot ${small ? 'small' : ''} ${carving ? 'carving' : ''}`} role="img" aria-label={`Tác phẩm: hình thái ${i + 1}/7`}>
    <img className="stone" key={shown} src={`/assets/stage-${i + 1}.webp`} alt="" />
    {carving && <>
      <img className="fx saw" src="/assets/saw.webp" alt="" />
      <img className="fx chisel" src="/assets/chisel.webp" alt="" />
      <img className="fx hammer" src="/assets/hammer.webp" alt="" />
      <img className="fx dust" src={`/assets/${DUST[STAGES.indexOf(stage)]}.webp`} alt="" />
      <img className="fx debris" src={`/assets/debris-${(STAGES.indexOf(stage) % 3) + 1}.webp`} alt="" />
      {stage === 'FINISHED' && <img className="fx sparkle" src="/assets/sparkle.webp" alt="" />}
    </>}
  </div>
}

function MusicSheet({ music, tracks, onClose }: { music: ReturnType<typeof useMusic>; tracks: Track[]; onClose: () => void }) {
  const idx = Math.max(0, tracks.findIndex((t) => t.asset_url === music.track))
  const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')
  return <div className="sheet-backdrop" onClick={onClose}>
    <section className="sheet" role="dialog" aria-modal="true" aria-label="Nhạc nền" onClick={(e) => e.stopPropagation()}>
      <div className="grabber" aria-hidden="true" />
      <div className="sheet-head"><h2>Nhạc nền</h2><button className="ghost-btn" onClick={onClose}>Xong</button></div>
      {tracks.length === 0 ? <p className="muted">Chưa có bài nhạc nào.</p> : <>
        <h3>{tracks[idx].title}</h3>
        <p className="muted">Nghệ nhân tạc đá · Bài {idx + 1} / {tracks.length}</p>
        <div className="transport">
          <button aria-label="Bài trước" onClick={() => music.select(tracks[(idx - 1 + tracks.length) % tracks.length].asset_url)}>⏮</button>
          <button className="play" aria-label={music.playing ? 'Tạm dừng' : 'Phát'} onClick={music.toggle}>{music.playing ? '⏸' : '▶'}</button>
          <button aria-label="Bài sau" onClick={() => music.select(tracks[(idx + 1) % tracks.length].asset_url)}>⏭</button>
        </div>
        <input type="range" aria-label="Vị trí bài hát" min={0} max={music.duration || 0} step={1} value={music.time} onChange={(e) => music.seek(+e.target.value)} />
        <div className="times"><span>{fmt(music.time)}</span><span>-{fmt(music.duration - music.time)}</span></div>
        <p className="label">DANH SÁCH PHÁT</p>
        <div role="radiogroup" aria-label="Danh sách phát">
          {tracks.map((t) => <button key={t.asset_url} role="radio" aria-checked={t.asset_url === music.track} className="track-item" onClick={() => music.select(t.asset_url)}>
            {t.title}<span className="dot" aria-hidden="true" />
          </button>)}
        </div>
        {music.error && <p className="error small">Không phát được bài này.</p>}
      </>}
      <div className="sfx-row"><span>Hiệu ứng âm thanh</span>
        <button className="ghost-btn" aria-pressed={music.sfxOn} onClick={music.toggleSfx}>{music.sfxOn ? 'Bật' : 'Tắt'}</button></div>
    </section>
  </div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
