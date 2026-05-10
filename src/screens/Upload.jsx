import React, { useState, useRef } from 'react'
import { useAppStore } from '../store.js'
import { parseCSV, parsePDF, mapRows } from '../utils.js'

const TRI_GREEN  = '#004B32'
const TRI_BIRCH  = '#F3EDE4'

function PreviewTable({ transactions }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: '#004B3220' }}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b" style={{ background: '#004B3208', borderColor: '#004B3215' }}>
            <th className="text-left px-3 py-2" style={{ color: TRI_GREEN, opacity: 0.6 }}>Date</th>
            <th className="text-left px-3 py-2" style={{ color: TRI_GREEN, opacity: 0.6 }}>Merchant</th>
            <th className="text-right px-3 py-2" style={{ color: TRI_GREEN, opacity: 0.6 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.slice(0, 8).map(t => (
            <tr key={t.id} className="border-b last:border-0" style={{ borderColor: '#004B3210' }}>
              <td className="px-3 py-2" style={{ color: TRI_GREEN, opacity: 0.5 }}>{t.date}</td>
              <td className="px-3 py-2 font-medium max-w-[140px] truncate" style={{ color: '#222222' }}>{t.merchant}</td>
              <td className="px-3 py-2 text-right font-mono" style={{ color: '#222222' }}>{t.currency}{t.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {transactions.length > 8 && (
        <p className="text-center text-xs py-2" style={{ color: TRI_GREEN, opacity: 0.4 }}>+{transactions.length - 8} more</p>
      )}
    </div>
  )
}

function ColumnMapper({ headers, rawData, currency, onMapped, onCancel }) {
  const [cols, setCols] = useState({ dateCol: '', merchantCol: '', amountCol: '', currencyCol: '' })
  const preview = rawData.slice(0, 3)
  const canProceed = cols.merchantCol && cols.amountCol

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: TRI_GREEN, opacity: 0.7 }}>
        We couldn't auto-detect the columns. Please map them manually:
      </p>
      {[
        { key: 'dateCol', label: 'Date column', required: false },
        { key: 'merchantCol', label: 'Merchant / Description column', required: true },
        { key: 'amountCol', label: 'Amount column', required: true },
        { key: 'currencyCol', label: 'Currency column (optional)', required: false },
      ].map(({ key, label, required }) => (
        <div key={key}>
          <label className="text-sm font-medium" style={{ color: TRI_GREEN }}>
            {label}{required && <span className="text-red-400">*</span>}
          </label>
          <select
            value={cols[key]}
            onChange={e => setCols(c => ({ ...c, [key]: e.target.value }))}
            className="mt-1 w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white"
            style={{ borderColor: '#004B3230', color: '#222222' }}
          >
            <option value="">— not mapped —</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      ))}

      <div className="overflow-x-auto rounded-xl border text-xs" style={{ borderColor: '#004B3220' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#004B3208' }}>
              {headers.map(h => (
                <th key={h} className="px-2 py-1.5 text-left font-medium" style={{ color: TRI_GREEN, opacity: 0.6 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} className="border-t" style={{ borderColor: '#004B3210' }}>
                {headers.map(h => (
                  <td key={h} className="px-2 py-1.5 max-w-[80px] truncate" style={{ color: '#222222' }}>{row[h]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onMapped(mapRows(rawData, cols, currency))}
          disabled={!canProceed}
          className="flex-1 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40"
          style={{ background: TRI_GREEN }}
        >
          Use These Columns
        </button>
        <button onClick={onCancel} className="px-4 text-sm" style={{ color: TRI_GREEN, opacity: 0.6 }}>Back</button>
      </div>
    </div>
  )
}

export default function Upload() {
  const navigate = useAppStore(s => s.navigate)
  const startNewSession = useAppStore(s => s.startNewSession)
  const currency = useAppStore(s => s.currency)

  const [state, setState] = useState('idle')
  const [transactions, setTransactions] = useState([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [rawSample, setRawSample] = useState(null)
  const [lowConfidence, setLowConfidence] = useState(false)
  const [mappingData, setMappingData] = useState(null)
  const fileRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    setFileName(file.name)
    setState('parsing')
    setError('')
    setRawSample(null)

    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const result = await parsePDF(file, currency)
        setLowConfidence(result.lowConfidence)
        setTransactions(result.transactions)
        setState('preview')
      } else {
        const result = await parseCSV(file, currency)
        if (result.needsMapping) {
          setMappingData(result)
          setState('mapping')
        } else {
          setTransactions(result.transactions)
          setState('preview')
        }
      }
    } catch (err) {
      setError(err.message)
      if (err.rawSample) setRawSample(err.rawSample)
      setState('error')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const proceed = () => {
    startNewSession(transactions, fileName)
    navigate('category-select')
  }

  return (
    <div className="min-h-screen px-4 pt-12 pb-8" style={{ background: TRI_BIRCH }}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('home')} className="text-2xl leading-none" style={{ color: TRI_GREEN, opacity: 0.5 }}>←</button>
        <h1 className="text-xl font-bold" style={{ color: TRI_GREEN }}>Upload Transactions</h1>
      </div>

      {state === 'idle' && (
        <div
          className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors hover:border-opacity-80"
          style={{ borderColor: '#004B3240' }}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <div className="text-4xl mb-3">📄</div>
          <p className="font-semibold" style={{ color: TRI_GREEN }}>Drop a file here, or tap to browse</p>
          <p className="text-sm mt-1" style={{ color: TRI_GREEN, opacity: 0.5 }}>Supports CSV and PDF</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.pdf"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {state === 'parsing' && (
        <div className="text-center py-16">
          <div className="text-3xl mb-3 animate-pulse">⏳</div>
          <p style={{ color: TRI_GREEN, opacity: 0.6 }}>Parsing {fileName}…</p>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={{ background: '#FF000010', border: '1px solid #FF000030' }}>
            <p className="font-semibold text-sm text-red-700">Parsing failed</p>
            <p className="text-sm mt-1 text-red-600">{error}</p>
          </div>

          {rawSample && rawSample.length > 0 && (
            <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: '#004B3220' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: TRI_GREEN, opacity: 0.5 }}>
                What we extracted from the PDF (first {rawSample.length} rows):
              </p>
              <div className="space-y-1 font-mono text-xs overflow-x-auto" style={{ color: TRI_GREEN, opacity: 0.6 }}>
                {rawSample.map((row, i) => (
                  <div key={i} className="whitespace-nowrap">{row || '(empty)'}</div>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: TRI_GREEN, opacity: 0.4 }}>
                If you can see your transactions above but they weren't detected, please share this with support. Otherwise, export as CSV from your bank.
              </p>
            </div>
          )}

          <button
            onClick={() => setState('idle')}
            className="w-full bg-white rounded-2xl py-3 font-semibold text-sm border"
            style={{ color: TRI_GREEN, borderColor: '#004B3220' }}
          >
            Try Another File
          </button>
        </div>
      )}

      {state === 'mapping' && mappingData && (
        <ColumnMapper
          headers={mappingData.headers}
          rawData={mappingData.rawData}
          currency={currency}
          onMapped={(txns) => { setTransactions(txns); setState('preview') }}
          onCancel={() => setState('idle')}
        />
      )}

      {state === 'preview' && (
        <div className="space-y-4">
          {lowConfidence && (
            <div className="rounded-2xl p-3" style={{ background: '#FF640015', border: '1px solid #FF640040' }}>
              <p className="text-sm" style={{ color: '#884400' }}>⚠️ PDF parsing confidence is low — please verify the transactions below look correct.</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: TRI_GREEN, opacity: 0.6 }}>
              Found <span className="font-bold" style={{ color: TRI_GREEN, opacity: 1 }}>{transactions.length}</span> transactions
            </p>
            <button onClick={() => setState('idle')} className="text-sm font-semibold" style={{ color: TRI_GREEN }}>
              Change file
            </button>
          </div>
          <PreviewTable transactions={transactions} />
          <button
            onClick={proceed}
            className="w-full text-white rounded-2xl py-4 font-bold text-lg shadow-lg transition-opacity hover:opacity-90"
            style={{ background: TRI_GREEN, boxShadow: '0 8px 24px #004B3240' }}
          >
            Looks Good →
          </button>
        </div>
      )}
    </div>
  )
}
