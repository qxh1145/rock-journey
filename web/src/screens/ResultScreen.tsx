import { Mascot } from '../components/Mascot'
import { TopBar, type TopBarProps } from '../components/TopBar'
import type { GameState } from '../game'

export function ResultScreen({ game, topBar, onShowMedal, onReplay }: {
  game: GameState; topBar: Omit<TopBarProps, 'title'>; onShowMedal: () => void
  onReplay?: () => void
}) {
  return <main className="screen result">
    <TopBar title="Kết quả" {...topBar} />
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
      {game.title === 'MAM_NGHE' && <button className="primary" onClick={onShowMedal}>Xem lại huy chương</button>}
      {onReplay && <button className="primary" onClick={onReplay}>Chơi lại</button>}
      <p className="footnote left">Lượt chơi đã hoàn tất. Khi quay lại, bạn có thể xem kết quả và trạng thái quà.</p>
    </div>
  </main>
}
