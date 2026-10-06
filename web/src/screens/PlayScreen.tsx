import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { sfx } from '../audio'
import { Mascot } from '../components/Mascot'
import { Notebook } from '../components/Notebook'
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
  const feedbackPage = game.answer && answeredQuestion ? <Notebook>
    <p className="q">{answeredQuestion.prompt}</p>
    {!game.answer.is_correct && <p className="nb-wrong">× {optText(answeredQuestion, selected)} — Chưa chính xác</p>}
    <p className={game.answer.is_correct ? 'nb-right ok' : 'nb-right'}>✓ {optText(answeredQuestion, game.answer.correct_option_id)} — {game.answer.is_correct ? 'Chính xác!' : 'Đáp án đúng'}</p>
    <p className="nb-explain">{game.answer.explanation}</p>
  </Notebook> : null

  const root = useRef<HTMLElement>(null)
  // flow mở màn (Figma 142:1053 → 148:1081 smart animate 700ms ease-in-out; chờ 120ms; → 148:1142 400ms ease-out)
  useLayoutEffect(() => {
    if (!intro) return
    const el = root.current!
    const inOut = 'cubic-bezier(.42, 0, .58, 1)'
    const fade = (sel: string, o: KeyframeAnimationOptions) =>
      [...el.querySelectorAll(sel)].map((n) => n.animate({ opacity: [0, 1] }, { fill: 'backwards', ...o }))
    fade('.top, .track', { duration: 700, easing: inOut })
    const stone = el.querySelector<HTMLImageElement>('.stone')
    if (stone) {
      // đá ở cổng: hộp 148×105 @(44,333) contain căn giữa → hộp .play .stone contain căn đáy; neo ở đáy giữa ảnh
      const a = stone.naturalWidth / stone.naturalHeight || 1000 / 709
      const w0 = Math.min(148, 105 * a), w1 = Math.min(stone.offsetWidth, stone.offsetHeight * a)
      const dx = 44 + 148 / 2 - (stone.offsetLeft + stone.offsetWidth / 2)
      const dy = 333 + 105 / 2 + w0 / a / 2 - (stone.offsetTop + stone.offsetHeight)
      stone.animate({ transform: [`translate(${dx}px, ${dy}px) scale(${w0 / w1})`, 'none'], transformOrigin: ['50% 100%', '50% 100%'], opacity: [1, 1] },
        { duration: 700, easing: inOut })
    }
    const last = fade('.nb-stack, .bottom', { duration: 400, delay: 820, easing: 'cubic-bezier(0, 0, .58, 1)' })
    void Promise.all(last.map((x) => x.finished)).then(onIntroEnd, () => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <main className="screen play" ref={root} inert={intro}>
    <TopBar title={`Câu ${Math.min(game.answer ? game.answered_count : game.answered_count + 1, 12)}/12`} {...topBar} />
    <div className="track"><div style={{ width: `${(game.answered_count / 12) * 100}%` }} /></div>
    <Mascot stage={game.mascot_stage} carving={carving} onCarved={onCarved} />

    <div className="nb-stack">
    {feedbackPage ?? (game.question ? <Notebook key={game.question.question_id}>
      <p className="q" id="q">{game.question.prompt}</p>
      <div role="radiogroup" aria-labelledby="q">
        {game.question.options.map((o) => <button key={o.id} className="nb-opt" role="radio" aria-checked={selected === o.id}
          disabled={submitting || Boolean(torn)} onClick={() => { onSelect(o.id); sfx.play('click') }}>
          <span className="box" aria-hidden="true" />{o.text}
        </button>)}
      </div>
      <p className="nb-hint">Chọn một đáp án · Chỉ chốt một lần</p>
    </Notebook> : <p className="center muted">Đang khôi phục câu hỏi…</p>)}
    {torn && <div key={torn.key} aria-hidden="true">
      <div className="tear keep">{torn.node}</div>
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
