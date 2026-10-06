import type { AdminFilter } from './filters'

export function FilterBar({ value: filter, onChange }: { value: AdminFilter; onChange: (f: AdminFilter) => void }) {
  const set = (patch: Partial<AdminFilter>) => onChange({ ...filter, ...patch })
  return (
    <div className="admin-filter">
      <label>Từ ngày<input type="date" value={filter.from} onChange={(e) => set({ from: e.target.value })} /></label>
      <label>Đến ngày<input type="date" value={filter.to} onChange={(e) => set({ to: e.target.value })} /></label>
      <label>Trạng thái<select value={filter.status} onChange={(e) => set({ status: e.target.value as AdminFilter['status'] })}>
        <option value="">Tất cả</option><option value="IN_PROGRESS">Đang chơi</option><option value="COMPLETED">Hoàn thành</option>
      </select></label>
      <label>Điểm từ<input type="number" min={0} max={12} step={1} value={filter.scoreMin} onChange={(e) => set({ scoreMin: e.target.value })} /></label>
      <label>Điểm đến<input type="number" min={0} max={12} step={1} value={filter.scoreMax} onChange={(e) => set({ scoreMax: e.target.value })} /></label>
      <label>Quà<select value={filter.prize} onChange={(e) => set({ prize: e.target.value as AdminFilter['prize'] })}>
        <option value="">Tất cả</option><option value="NOT_ELIGIBLE">Không đủ điều kiện</option>
        <option value="UNCLAIMED">Chưa nhận</option><option value="CLAIMED">Đã nhận</option>
      </select></label>
    </div>
  )
}
