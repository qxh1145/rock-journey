export function MedalOverlay({ onClose }: { onClose: () => void }) {
  return <div className="overlay" role="dialog" aria-modal="true" aria-label="Danh hiệu Mầm Nghề">
    <img className="badge-img" src="/assets/badge.webp" alt="Huy chương danh hiệu Mầm Nghề" />
    <p>Bạn đã đạt danh hiệu Mầm Nghề</p>
    <button className="primary light" autoFocus onClick={onClose}>Tiếp tục</button>
  </div>
}
