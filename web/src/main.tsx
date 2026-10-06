import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { DEFAULT_QUEUE, sfx, trackTitle, useMusic, type Track } from './audio'
import {
  BADGE_KEY, CHISEL_KEY, callRpc, rpcAction, message, readStore, removeStore, writeStore,
  type GameState, type PendingAnswer, type Question, type Screen, type Stage,
} from './game'
import { AvatarMenu } from './components/TopBar'
import { MedalOverlay } from './components/MedalOverlay'
import { MusicSheet } from './components/MusicSheet'
import { GateScreen } from './screens/GateScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ResultScreen } from './screens/ResultScreen'
import { ShowcaseScreen } from './screens/ShowcaseScreen'
import { AdminApp } from './admin/AdminApp'

const REPLAY_EMAIL = 'quandeptraixuhue@gmail.com'
const NETWORK_ERROR = 'Không có kết nối mạng. Kiểm tra mạng rồi thử lại.'
import './style.css'

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
  // flow mở màn cổng → quiz đang chạy (Figma 142:1053 → 148:1142)
  // giữ nhãn nút lúc bấm để lớp cổng đang mờ đi không đổi chữ
  const [intro, setIntro] = useState<string | null>(null)
  // mascot hiển thị: giữ stage cũ trong lúc chạy animation đục rồi mới đổi
  const [carving, setCarving] = useState<{ from: Stage; key: string } | null>(null)
  // trang sổ cũ đang bị xé (Figma: xé trên xuống ~0,8s)
  const [torn, setTorn] = useState<{ key: string; node: ReactNode } | null>(null)
  // tài khoản này giữ playlist cũ thay vì nhạc nền mặc định
  const music = useMusic(tracks, user?.email?.toLowerCase() === 'honguyenvietanh1405@gmail.com' ? null : DEFAULT_QUEUE)
  // undefined = chưa nhận INITIAL_SESSION; null = khách → lần đầu luôn route
  const activeUserId = useRef<string | null | undefined>(undefined)

  const [canRetry, setCanRetry] = useState(true)
  const fail = (text: string, retry: boolean) => { setError(text); setCanRetry(retry); setScreen('error') }

  // mọi thông báo cho người chơi lúc khởi động đi qua rpcAction — chỉ rẽ nhánh theo code
  const handleRpcError = useCallback((r: { code: string; message: string | null }, fallback: string) => {
    const action = rpcAction(r.code)
    if (action === 'signin') { setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'); return void supabase?.auth.signOut() }
    fail(r.message ?? fallback, action !== 'show')
  }, [])

  const loadCurrentRoute = useCallback(async () => {
    if (!supabase) return setScreen('setup')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    setUser(session?.user ?? null)
    if (!session) { setGame(null); return setScreen('landing') }
    setError('')
    setScreen('loading')
    const r = await callRpc<GameState>('get_current_session')
    if (!r.ok) return handleRpcError(r, 'Không tải được lượt chơi.')
    setGame(r.code === 'NONE' ? null : r.data)
    // FR-11: đã hoàn thành → vào thẳng kết quả; còn lại luôn qua màn bắt đầu
    setScreen(r.code === 'COMPLETED' && r.data ? 'result' : 'landing')
  }, [handleRpcError])

  const reload = useCallback(() => {
    void loadCurrentRoute().catch(() => fail(NETWORK_ERROR, true))
  }, [loadCurrentRoute])

  const starting = useRef(false)
  const enterPlay = (cta: string) => { setIntro(matchMedia('(prefers-reduced-motion: reduce)').matches ? null : cta); setScreen('playing') }
  async function start(cta: string) {
    if (game) return enterPlay(cta)
    if (starting.current) return
    starting.current = true
    const s = await callRpc<GameState>('start_session').catch(() => null).finally(() => { starting.current = false })
    if (!s) return fail(NETWORK_ERROR, true)
    if (!s.ok || !s.data) {
      if (rpcAction(s.code) === 'reload') return reload()
      return handleRpcError(s, 'Không thể bắt đầu lượt chơi.')
    }
    setGame(s.data)
    if (s.data.status === 'COMPLETED') return setScreen('result')
    enterPlay(cta)
  }

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
    setStatusMessage(pending ? 'Chưa lưu — có câu trả lời chưa được xác nhận, bấm để đồng bộ lại.' : '')
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

  // chỉ ẩn/hiện nút; quyền thật do RPC replay_session kiểm tra email ở server
  const canReplay = user?.email?.toLowerCase() === REPLAY_EMAIL
  async function replay() {
    const r = await callRpc('replay_session').catch((e: unknown) => ({ ok: false, message: message(e, 'Không thể chơi lại.') }))
    if (!r.ok) { setError(r.message ?? 'Không thể chơi lại.'); return setScreen('error') }
    setAnsweredQuestion(null)
    setSelected(null)
    reload()
  }

  async function signOut() {
    setMenuOpen(false)
    setError('')
    await supabase?.auth.signOut()
  }

  // state chưa kịp render lại giữa hai lần chạm → khoá đồng bộ bằng ref (CAP-2: double-tap chỉ ghi một lần)
  const inFlight = useRef(false)
  async function submitAnswer() {
    if (!game?.question || !selected || inFlight.current) return
    const question = game.question
    const pendingKey = `rock-journey-pending:${game.session_id}:${question.question_id}`
    const previous = readStore<PendingAnswer | null>(pendingKey, null)
    // giữ cùng idempotency key cho tới khi server xác nhận
    const pending = previous?.option === selected ? previous : { option: selected, key: crypto.randomUUID() }
    writeStore(pendingKey, pending)
    if (!navigator.onLine) {
      setWaitingSync(true)
      return setStatusMessage('Chưa lưu — đang ngoại tuyến, sẽ tự gửi lại khi có mạng.')
    }
    inFlight.current = true
    setSubmitting(true)
    setStatusMessage('Đang lưu…')
    try {
      const r = await callRpc<GameState>('submit_answer', {
        p_session_id: game.session_id, p_question_id: question.question_id,
        p_option_id: pending.option, p_idempotency_key: pending.key,
      })
      if (!r.ok || !r.data) {
        const action = rpcAction(r.code)
        if (action === 'reload') { removeStore(pendingKey); return reload() }
        // phiên hết hạn → đăng xuất, onAuthStateChange đưa về landing; giữ pending để gửi lại sau
        if (action === 'signin') return void supabase?.auth.signOut()
        if (action === 'show') {
          removeStore(pendingKey)
          setWaitingSync(false)
          return setStatusMessage(r.message ?? 'Không thể lưu câu trả lời.')
        }
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
      setStatusMessage(`Chưa lưu — ${message(e, 'Mất kết nối')}. Lựa chọn vẫn được giữ, bấm để đồng bộ lại.`)
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  // có mạng lại → tự gửi lại câu chưa lưu (cùng idempotency key nên server chỉ giữ một bản)
  const submitRef = useRef(submitAnswer)
  submitRef.current = submitAnswer
  useEffect(() => {
    if (!waitingSync) return
    const onOnline = () => void submitRef.current()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [waitingSync])

  function next(feedbackPage: ReactNode) {
    if (!game) return
    if (game.status === 'COMPLETED') { music.finish(); return setScreen('showcase') }
    if (game.answer && feedbackPage) { setTorn({ key: game.answer.answer_id, node: feedbackPage }); sfx.play('tear') }
    setGame({ ...game, answer: undefined })
    setSelected(null)
  }

  const gateCta = game?.status === 'IN_PROGRESS' ? `Tiếp tục câu ${game.answered_count + 1}` : 'BẮT ĐẦU KHÁM PHÁ'
  const topBar = { user, menuOpen, onToggleMenu: () => setMenuOpen((v) => !v), onOpenMusic: () => setMusicOpen(true), musicTitle: trackTitle(music.track, tracks) }

  return (
    <><div className="rotate-hint" role="alert">Vui lòng xoay dọc điện thoại để chơi.</div>
    <div className="phone">

      {screen === 'loading' && <p className="center muted" role="status">Đang tải hành trình…</p>}

      {screen === 'setup' && <main className="screen"><h1>Nghệ nhân tạc đá</h1>
        <p>Thêm <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_KEY</code> vào <code>.env.local</code>.</p></main>}

      {screen === 'landing' && <GateScreen stage={game?.mascot_stage ?? 'RAW'} cta={user ? gateCta : 'Đăng nhập bằng Google'} error={error}
        onCta={() => void (user ? start(gateCta) : signIn())} />}

      {screen === 'playing' && game && intro !== null && <GateScreen stage={game.mascot_stage} cta={intro} leaving />}
      {screen === 'playing' && game && <PlayScreen intro={intro !== null} onIntroEnd={() => setIntro(null)} game={game} answeredQuestion={answeredQuestion} selected={selected}
        submitting={submitting} waitingSync={waitingSync} statusMessage={statusMessage} carving={carving} torn={torn} topBar={topBar}
        onSelect={setSelected} onSubmit={() => void submitAnswer()} onNext={next}
        onCarved={() => setCarving(null)} onTearEnd={() => setTorn(null)} />}

      {screen === 'showcase' && <ShowcaseScreen onDone={() => setScreen('result')} />}

      {screen === 'result' && game && <ResultScreen game={game} topBar={topBar}
        onShowMedal={() => { setBadgeOpen(true); sfx.play('badge') }}
        onReplay={canReplay ? () => void replay() : undefined} />}

      {screen === 'error' && <main className="screen">
        <p className="error" role="alert">{error || 'Có lỗi xảy ra.'}</p>
        <div className="bottom">
          {canRetry && <button className="primary" onClick={reload}>Thử lại</button>}
          {user && <button className="link" onClick={() => void signOut()}>Đăng xuất</button>}
        </div>
      </main>}

      {menuOpen && <AvatarMenu onSignOut={() => void signOut()} />}

      {musicOpen && <MusicSheet music={music} tracks={tracks} onClose={() => setMusicOpen(false)} />}

      {badgeOpen && <MedalOverlay onClose={() => setBadgeOpen(false)} />}
    </div></>
  )
}

// khung Figma 390×844 co giãn vừa viewport (min-zoom)
const fit = () => document.documentElement.style.setProperty('--s', String(Math.min(innerWidth / 390, innerHeight / 844)))
fit()
addEventListener('resize', fit)
ReactDOM.createRoot(document.getElementById('root')!).render(location.pathname.replace(/\/$/, '') === '/admin' ? <AdminApp /> : <App />)
