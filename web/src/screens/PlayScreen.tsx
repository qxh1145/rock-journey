import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { sfx } from '../audio'
import { Mascot } from '../components/Mascot'
import { TopBar, type TopBarProps } from '../components/TopBar'
import { optText, type GameState, type Question, type Stage } from '../game'

export function PlayScreen({ game, answeredQuestion, selected, submitting, waitingSync, statusMessage, carving, torn, topBar,
  onSelect, onSubmit, onNext, onCarved, onTearEnd, intro, onIntroEnd }: {
  game: GameState
  intro?: boolean
  onIntroEnd?: () => void
  answeredQuestion: Question | null
  selected: string | null
  submitting: boolean
  waitingSync: boolean
  statusMessage: string
  carving: { from: Stage; key: string } | null
  torn: { key: string; node: ReactNode } | null
  topBar: Omit<TopBarProps, 'title'>
  onSelect: (id: string) => void
  onSubmit: () => void
  onNext: (feedbackPage: ReactNode) => void
  onCarved: () => void
  onTearEnd: () => void
}) {
  const feedbackPage = game.answer && answeredQuestion ? <div className="question-card feedback-card">
    <p className="q">{answeredQuestion.prompt}</p>
    {!game.answer.is_correct && <p className="nb-wrong">× {optText(answeredQuestion, selected)} — Chưa chính xác</p>}
    <p className={game.answer.is_correct ? 'nb-right ok' : 'nb-right'}>✓ {optText(answeredQuestion, game.answer.correct_option_id)} — {game.answer.is_correct ? 'Chính xác!' : 'Đáp án đúng'}</p>
    <p className="nb-explain">{game.answer.explanation}</p>
  </div> : null

  const root = useRef<HTMLElement>(null)
  // flow mở màn (Figma 142:1053 → 148:1081 smart animate 700ms ease-in-out; chờ 120ms; → 148:1142 400ms ease-out)
  useLayoutEffect(() => {
    if (!intro) return
    const el = root.current!
    const inOut = 'cubic-bezier(.42, 0, .58, 1)'
    const fade = (sel: string, o: KeyframeAnimationOptions) =>
      [...el.querySelectorAll(sel)].map((n) => n.animate({ opacity: [0, 1] }, { fill: 'backwards', ...o }))
    fade('.top, .track', { duration: 700, easing: inOut })
    fade('.play-hero', { duration: 700, easing: inOut })
    const last = fade('.question-stack, .bottom', { duration: 400, delay: 820, easing: 'cubic-bezier(0, 0, .58, 1)' })
    void Promise.all(last.map((x) => x.finished)).then(onIntroEnd, () => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <main className="screen play" ref={root} inert={intro}>
    <TopBar title={`Câu ${Math.min(game.answer ? game.answered_count : game.answered_count + 1, 12)}/12`} {...topBar} />
    <div className="track"><div style={{ width: `${(game.answered_count / 12) * 100}%` }} /></div>
    <div className="play-hero"><Mascot stage={game.mascot_stage} carving={carving} onCarved={onCarved} /></div>

    <div className="question-stack">
    {feedbackPage ?? (game.question ? <div className="question-card" key={game.question.question_id}>
      <p className="q" id="q">{game.question.prompt}</p>
      <p className="question-hint">Chọn một đáp án · Chỉ chốt một lần</p>
      <div className="answer-list" role="radiogroup" aria-labelledby="q">
        {game.question.options.map((o, index) => <button key={o.id} className="answer-option" role="radio" aria-checked={selected === o.id}
          disabled={submitting || Boolean(torn)} onClick={() => { onSelect(o.id); sfx.play('click') }}>
          <span className="answer-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
          <span className="answer-text">{o.text}</span>
          <span className="answer-check" aria-hidden="true">{selected === o.id ? '✓' : ''}</span>
        </button>)}
      </div>
    </div> : <p className="question-card muted" role="status">Đang khôi phục câu hỏi…</p>)}
    {torn && <div key={torn.key} aria-hidden="true">
      <div className="tear piece" onAnimationEnd={onTearEnd}>{torn.node}</div>
    </div>}
    </div>

    <div className="bottom">
      {game.answer
        ? <><button className="primary" onClick={() => onNext(feedbackPage)}>{game.status === 'COMPLETED' ? 'Xem kết quả' : `Tiếp tục câu ${game.answered_count + 1}`}</button>
            <p className="footnote">quntrn05</p></>
        : <><button className="primary" disabled={!selected || submitting || Boolean(torn)} onClick={onSubmit}>
              {submitting ? 'Đang lưu…' : waitingSync ? 'Thử đồng bộ lại' : 'Chốt đáp án'}</button>
            <p className={waitingSync ? 'footnote error' : 'footnote'} role="status">{statusMessage || 'Sau khi chốt, bạn không thể trả lời lại.'}</p></>}
    </div>
  </main>
}
