import React, { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAppStore } from '../store.js'
import { buildCategoryStats, exportCSV, exportPDF, fmt } from '../utils.js'

const TRI_GREEN  = '#004B32'
const TRI_BIRCH  = '#F3EDE4'
const TRI_SIENNA = '#FF6400'

const SPECIAL_COLOURS = { uncategorized: '#98D39A', review_later: '#FF6400' }

function CategorySection({ stat, isOpen, onToggle, fmtAmt }) {
  const colour = SPECIAL_COLOURS[stat.id] || stat.colour || TRI_GREEN
  return (
    <div className="border rounded-2xl overflow-hidden" style={{ borderColor: '#004B3215' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-white/70 transition-colors text-left"
      >
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: colour }} />
        <span className="flex-1 font-semibold" style={{ color: '#222222' }}>{stat.name}</span>
        <span className="text-sm" style={{ color: TRI_GREEN, opacity: 0.4 }}>{stat.count} txns</span>
        <span className="font-bold ml-2" style={{ color: TRI_GREEN }}>{fmtAmt(stat.total)}</span>
        <span className="ml-1" style={{ color: TRI_GREEN, opacity: 0.3 }}>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="border-t" style={{ borderColor: '#004B3210' }}>
          {stat.transactions.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0"
              style={{ background: '#004B3205', borderColor: '#004B3208' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#222222' }}>{t.merchant}</p>
                <p className="text-xs" style={{ color: TRI_GREEN, opacity: 0.45 }}>{t.date}</p>
              </div>
              <p className="text-sm font-mono font-semibold flex-shrink-0" style={{ color: TRI_GREEN }}>
                {t.currency || '£'}{t.amount.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, fmtAmt }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border rounded-xl px-3 py-2 shadow-lg text-sm" style={{ borderColor: '#004B3220' }}>
      <p className="font-semibold" style={{ color: TRI_GREEN }}>{d.name}</p>
      <p style={{ color: TRI_GREEN, opacity: 0.6 }}>{fmtAmt ? fmtAmt(d.value) : d.value}</p>
    </div>
  )
}

export default function FinalOverview() {
  const navigate = useAppStore(s => s.navigate)
  const categories = useAppStore(s => s.categories)
  const viewingSession = useAppStore(s => s.viewingSession)
  const [openSections, setOpenSections] = useState({})
  const [exporting, setExporting] = useState(false)

  if (!viewingSession) { navigate('home'); return null }

  const sessionCurrency = viewingSession.transactions?.[0]?.currency || '£'
  const fmtAmt = (v) => fmt(v, sessionCurrency)

  const stats = buildCategoryStats(viewingSession, categories)
  const totalAmount = stats.reduce((s, c) => s + c.total, 0)
  const totalCount = stats.reduce((s, c) => s + c.count, 0)

  const chartData = stats.map(s => ({
    name: s.name,
    value: s.total,
    colour: SPECIAL_COLOURS[s.id] || s.colour || TRI_GREEN,
  })).filter(d => d.value > 0)

  const toggleSection = (id) => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))

  const handleExportPDF = async () => {
    setExporting(true)
    try { await exportPDF(viewingSession, categories) }
    finally { setExporting(false) }
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: TRI_BIRCH }}>
      {/* Header */}
      <div
        className="px-4 pt-12 pb-4 border-b sticky top-0 z-10"
        style={{ background: TRI_BIRCH, borderColor: '#004B3215' }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: TRI_GREEN }}>Overview</h1>
          <button
            onClick={() => navigate('home')}
            className="text-sm font-semibold"
            style={{ color: TRI_GREEN }}
          >
            Done
          </button>
        </div>
        <p className="text-xs mt-0.5" style={{ color: TRI_GREEN, opacity: 0.45 }}>{viewingSession.fileName}</p>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Pie chart */}
        <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#004B3215' }}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.colour} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip fmtAmt={fmtAmt} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary table */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#004B3215' }}>
          <div
            className="px-4 py-3 border-b flex justify-between text-xs font-semibold uppercase tracking-wide"
            style={{ borderColor: '#004B3210', color: TRI_GREEN, opacity: 0.5 }}
          >
            <span>Category</span>
            <div className="flex gap-6">
              <span>Count</span>
              <span>Total</span>
              <span className="w-10 text-right">%</span>
            </div>
          </div>
          {stats.map(s => (
            <div
              key={s.id}
              className="px-4 py-3 flex items-center border-b last:border-0"
              style={{ borderColor: '#004B3208' }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0"
                style={{ background: SPECIAL_COLOURS[s.id] || s.colour || TRI_GREEN }}
              />
              <span className="flex-1 text-sm font-medium" style={{ color: '#222222' }}>{s.name}</span>
              <div className="flex gap-6 text-sm text-right">
                <span className="w-8" style={{ color: TRI_GREEN, opacity: 0.5 }}>{s.count}</span>
                <span className="font-semibold w-20" style={{ color: TRI_GREEN }}>{fmtAmt(s.total)}</span>
                <span className="w-10" style={{ color: TRI_GREEN, opacity: 0.4 }}>
                  {totalAmount ? ((s.total / totalAmount) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          ))}
          <div className="px-4 py-3 flex items-center" style={{ background: '#004B3208', borderTop: '1px solid #004B3215' }}>
            <span className="flex-1 text-sm font-bold" style={{ color: TRI_GREEN }}>Total</span>
            <div className="flex gap-6 text-sm text-right">
              <span className="w-8 font-semibold" style={{ color: TRI_GREEN }}>{totalCount}</span>
              <span className="font-bold w-20" style={{ color: TRI_GREEN }}>{fmtAmt(totalAmount)}</span>
              <span className="w-10" />
            </div>
          </div>
        </div>

        {/* Transaction detail sections */}
        <div className="space-y-2">
          {stats.map(s => (
            <CategorySection
              key={s.id}
              stat={s}
              isOpen={!!openSections[s.id]}
              onToggle={() => toggleSection(s.id)}
              fmtAmt={fmtAmt}
            />
          ))}
        </div>

        {/* Export */}
        <div className="flex gap-3">
          <button
            onClick={() => exportCSV(viewingSession, categories)}
            className="flex-1 bg-white rounded-2xl py-3.5 font-semibold text-sm transition-colors hover:bg-white/70 border"
            style={{ color: TRI_GREEN, borderColor: '#004B3220' }}
          >
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex-1 text-white rounded-2xl py-3.5 font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60 shadow-md"
            style={{ background: TRI_GREEN, boxShadow: '0 4px 16px #004B3240' }}
          >
            {exporting ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
