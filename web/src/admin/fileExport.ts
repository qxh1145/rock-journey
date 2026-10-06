const save = (name: string, blob: Blob) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// BOM để Excel đọc đúng UTF-8 tiếng Việt
export const downloadCsv = (name: string, csv: string) =>
  save(name, new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))

// RFC 4180: trường đặt trong "…", "" là dấu nháy kép, xuống dòng trong trường được giữ nguyên
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c !== '"') field += c
      else if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

// nạp thư viện khi bấm, không đưa vào bundle chính
export async function downloadXlsx(name: string, rows: string[][]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  await writeXlsxFile(rows.map((r) => r.map((v) => (v === '' ? null : v)))).toFile(name)
}

// sheet đầu tiên, mọi ô thành chuỗi ('' khi trống); nạp thư viện khi cần
export async function readXlsx(file: File): Promise<string[][]> {
  const { readSheet } = await import('read-excel-file/browser')
  const rows = await readSheet(file)
  return rows.map((r) => r.map((v) => (v == null ? '' : String(v).trim())))
}
