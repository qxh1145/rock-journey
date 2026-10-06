import { Mascot } from '../components/Mascot'

export function StartScreen({ error, cta, onCta, busy }: { error: string; cta: string; onCta: () => void; busy?: boolean }) {
  return <main className="screen start">
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
    <div className="bottom"><button className="primary" disabled={busy} onClick={onCta}>{busy ? 'Đang đăng nhập…' : cta}</button></div>
  </main>
}
