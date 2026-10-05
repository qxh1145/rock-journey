import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { sfx, useMusic, type Track } from './audio'
import {
  BADGE_KEY, CHISEL_KEY, callRpc, rpcAction, message, readStore, removeStore, writeStore,
  type GameState, type PendingAnswer, type Question, type Screen, type Stage,
} from './game'
import { AvatarMenu } from './components/TopBar'
import { MedalOverlay } from './components/MedalOverlay'
import { MusicSheet } from './components/MusicSheet'
import { StartScreen } from './screens/StartScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ResultScreen } from './screens/ResultScreen'
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
  // mascot hiển thị: giữ stage cũ trong lúc chạy animation đục rồi mới đổi
  const [carving, setCarving] = useState<{ from: Stage; key: string } | null>(null)
  // trang sổ cũ đang bị xé (Figma: xé trên xuống ~0,8s)
  const [torn, setTorn] = useState<{ key: string; node: ReactNode } | null>(null)
  const music = useMusic(tracks)
  // undefined = chưa nhận INITIAL_SESSION; null = khách → lần đầu luôn route
  const activeUserId = useRef<string | null | undefined>(undefined)

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
    if (!navigator.onLine) {
      setWaitingSync(true)
      return setStatusMessage('Chưa lưu — đang ngoại tuyến, sẽ tự gửi lại khi có mạng.')
    }
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
    if (game.status === 'COMPLETED') return setScreen('result')
    if (game.answer && feedbackPage) { setTorn({ key: game.answer.answer_id, node: feedbackPage }); sfx.play('tear') }
    setGame({ ...game, answer: undefined })
    setSelected(null)
  }

  const topBar = { user, menuOpen, onToggleMenu: () => setMenuOpen((v) => !v), onOpenMusic: () => setMusicOpen(true) }

  return (
    <div className="phone">
      <div className="rotate-hint" role="alert">Vui lòng xoay dọc điện thoại để chơi.</div>

      {screen === 'loading' && <p className="center muted" role="status">Đang tải hành trình…</p>}

      {screen === 'setup' && <main className="screen"><h1>Nghệ nhân tạc đá</h1>
        <p>Thêm <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_KEY</code> vào <code>.env.local</code>.</p></main>}

      {screen === 'landing' && <StartScreen error={error} onSignIn={() => void signIn()} />}

      {screen === 'playing' && game && <PlayScreen game={game} answeredQuestion={answeredQuestion} selected={selected}
        submitting={submitting} waitingSync={waitingSync} statusMessage={statusMessage} carving={carving} torn={torn} topBar={topBar}
        onSelect={setSelected} onSubmit={() => void submitAnswer()} onNext={next}
        onCarved={() => setCarving(null)} onTearEnd={() => setTorn(null)} />}

      {screen === 'result' && game && <ResultScreen game={game} topBar={topBar}
        onShowMedal={() => { setBadgeOpen(true); sfx.play('badge') }} onSignOut={() => void signOut()} />}

      {screen === 'error' && <main className="screen">
        <p className="error" role="alert">{error || 'Có lỗi xảy ra.'}</p>
        <div className="bottom"><button className="primary" onClick={reload}>Thử lại</button></div>
      </main>}

      {menuOpen && <AvatarMenu user={user} onSignOut={() => void signOut()} />}

      {musicOpen && <MusicSheet music={music} tracks={tracks} onClose={() => setMusicOpen(false)} />}

      {badgeOpen && <MedalOverlay onClose={() => setBadgeOpen(false)} />}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
