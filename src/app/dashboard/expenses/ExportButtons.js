'use client'

import toast from 'react-hot-toast'

export function PersonalExportButtons({ expenses }) {
  function exportCSV() {
    const headers = ['Date', 'Description', 'Category', 'Amount']
    const rows = expenses.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.description,
      e.category || 'Other',
      e.amount
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-expenses.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  function exportPDF() {
    window.print()
  }

  return (
    <div className="flex gap-2">
      <button onClick={exportCSV} className="btn btn-outline flex items-center gap-1.5" style={{ fontSize: '11px', padding: '6px 12px' }}>
        <i className="ti ti-file-spreadsheet text-sm"></i> CSV
      </button>
      <button onClick={exportPDF} className="btn btn-outline flex items-center gap-1.5" style={{ fontSize: '11px', padding: '6px 12px' }}>
        <i className="ti ti-printer text-sm"></i> PDF
      </button>
    </div>
  )
}
