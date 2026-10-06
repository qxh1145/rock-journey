// bộ lọc admin dùng chung; map sang tham số RPC (admin_get_dashboard và các màn sau)
export type AdminFilter = {
  from: string // 'YYYY-MM-DD' (giờ địa phương), '' = không lọc
  to: string // ngày cuối, tính cả ngày đó
  status: '' | 'IN_PROGRESS' | 'COMPLETED'
  scoreMin: string
  scoreMax: string
  prize: '' | 'NOT_ELIGIBLE' | 'UNCLAIMED' | 'CLAIMED'
}

export const emptyFilter: AdminFilter = { from: '', to: '', status: '', scoreMin: '', scoreMax: '', prize: '' }

const day = (d: string, add = 0) => {
  const t = new Date(d + 'T00:00')
  t.setDate(t.getDate() + add)
  return t.toISOString()
}

export function toRpcParams(f: AdminFilter) {
  return {
    p_from: f.from ? day(f.from) : null,
    p_to: f.to ? day(f.to, 1) : null, // server dùng [from, to)
    p_status: f.status || null,
    p_score_min: f.scoreMin === '' ? null : parseInt(f.scoreMin, 10),
    p_score_max: f.scoreMax === '' ? null : parseInt(f.scoreMax, 10),
    p_prize: f.prize || null,
  }
}
