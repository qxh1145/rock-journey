import type { ReactNode } from 'react'
import { sfx } from '../audio'
import { Mascot, carveCaption } from '../components/Mascot'
import { Notebook } from '../components/Notebook'
import { TopBar, type TopBarProps } from '../components/TopBar'
import { optText, type GameState, type Question, type Stage } from '../game'

export function PlayScreen({ game, answeredQuestion, selected, submitting, waitingSync, statusMessage, carving, torn, topBar,
  onSelect, onSubmit, onNext, onCarved, onTearEnd }: {
  game: GameState
  answeredQuestion: Question | null
  selected: string | null
  submitting: boolean
  waitingSync: boolean
  statusMessage: string
  carving: { from: Stage; key: string } | null
  torn: { key: string; node: ReactNode } | null
  topBar: Omit<TopBarProps, 'title' | 'showAvatar'>
  onSelect: (id: string) => void
  onSubmit: () => void
  onNext: (feedbackPage: ReactNode) => void
  onCarved: () => void
  onTearEnd: () => void
}) {
  const feedbackPage = game.answer && answeredQuestion ? <Notebook>
    <p className="q">{answeredQuestion.prompt}</p>
    {!game.answer.is_correct && <p className="nb-wrong">× {optText(answeredQuestion, selected)} — Chưa chính xác</p>}
    <p className="nb-right">✓ {optText(answeredQuestion, game.answer.correct_option_id)} — {game.answer.is_correct ? 'Chính xác!' : 'Đáp án đúng'}</p>
    <p className="nb-explain">{game.answer.explanation}</p>
  </Notebook> : null

  return <main className="screen play">
    <TopBar title={`Câu ${Math.min(game.answer ? game.answered_count : game.answered_count + 1, 12)}/12`} {...topBar} />
    <div className="track"><div style={{ width: `${(game.answered_count / 12) * 100}%` }} /></div>
    <Mascot stage={game.mascot_stage} carving={carving} onCarved={onCarved} />
    <p className="caption">{carveCaption(game, Boolean(carving))}</p>

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
            <p className="footnote">Đã lưu câu trả lời · Tiến độ được giữ nguyên</p></>
        : <><button className="primary" disabled={!selected || submitting || Boolean(torn)} onClick={onSubmit}>
              {submitting ? 'Đang lưu…' : waitingSync ? 'Thử đồng bộ lại' : 'Chốt đáp án'}</button>
            <p className={waitingSync ? 'footnote error' : 'footnote'} role="status">{statusMessage || 'Sau khi chốt, bạn không thể trả lời lại.'}</p></>}
    </div>
  </main>
}
