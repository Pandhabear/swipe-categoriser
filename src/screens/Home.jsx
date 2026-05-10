import React, { useState } from 'react'
import { useAppStore } from '../store.js'

const CURRENCIES = [
  { symbol: '£', label: 'GBP £' },
  { symbol: '€', label: 'EUR €' },
  { symbol: '$', label: 'USD $' },
  { symbol: 'A$', label: 'AUD A$' },
  { symbol: 'C$', label: 'CAD C$' },
  { symbol: 'CHF', label: 'CHF' },
  { symbol: '¥', label: 'JPY ¥' },
  { symbol: 'kr', label: 'SEK/NOK/DKK kr' },
]

export default function Home() {
  const navigate = useAppStore(s => s.navigate)
  const activeSession = useAppStore(s => s.activeSession)
  const discardActiveSession = useAppStore(s => s.discardActiveSession)
  const currency = useAppStore(s => s.currency)
  const setCurrency = useAppStore(s => s.setCurrency)
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: '#F3EDE4' }}>
      <div className="text-center mb-10">
        {/* Triodos wordmark */}
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 shadow-lg"
          style={{ background: '#004B32' }}
        >
          <span className="text-white font-bold text-2xl tracking-tight">T</span>
        </div>
        <h1 className="text-3xl font-bold" style={{ color: '#004B32' }}>Swipe Categoriser</h1>
        <p className="mt-2 text-sm" style={{ color: '#004B32', opacity: 0.6 }}>
          Categorise your bank transactions, one swipe at a time.
        </p>

        {/* Currency selector */}
        <div className="mt-4 flex justify-center">
          {!showCurrencyPicker ? (
            <button
              onClick={() => setShowCurrencyPicker(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{ background: '#004B3215', color: '#004B32' }}
            >
              <span>{currency}</span>
              <span style={{ opacity: 0.5, fontSize: '10px' }}>▾</span>
              <span style={{ opacity: 0.6 }}>Currency</span>
            </button>
          ) : (
            <div className="bg-white border rounded-2xl shadow-lg p-3 w-56 text-left" style={{ borderColor: '#004B3220' }}>
              <p className="text-xs font-semibold uppercase tracking-wide px-1 mb-2" style={{ color: '#004B32', opacity: 0.5 }}>
                Select currency
              </p>
              {CURRENCIES.map(c => (
                <button
                  key={c.symbol}
                  onClick={() => { setCurrency(c.symbol); setShowCurrencyPicker(false) }}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors"
                  style={
                    currency === c.symbol
                      ? { background: '#004B3212', color: '#004B32', fontWeight: 600 }
                      : { color: '#222222' }
                  }
                >
                  {c.label}
                </button>
              ))}
              <button
                onClick={() => setShowCurrencyPicker(false)}
                className="w-full text-center text-xs mt-1 py-1"
                style={{ color: '#004B32', opacity: 0.4 }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {activeSession && (
        <div
          className="w-full rounded-2xl p-4 mb-5 border"
          style={{ background: '#DFFF5733', borderColor: '#004B3230' }}
        >
          <p className="font-semibold text-sm" style={{ color: '#004B32' }}>Session in progress</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: '#004B32', opacity: 0.7 }}>{activeSession.fileName}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => navigate('swiping')}
              className="flex-1 text-white rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: '#004B32' }}
            >
              Resume
            </button>
            <button
              onClick={() => { if (confirm('Discard this session?')) discardActiveSession() }}
              className="flex-1 bg-white rounded-xl py-2.5 text-sm font-semibold border"
              style={{ color: '#004B32', borderColor: '#004B3230' }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="w-full space-y-3">
        <button
          onClick={() => navigate('upload')}
          className="w-full text-white rounded-2xl py-4 text-lg font-bold shadow-lg transition-opacity hover:opacity-90 active:opacity-80"
          style={{ background: '#004B32', boxShadow: '0 8px 24px #004B3240' }}
        >
          New Session
        </button>
        <button
          onClick={() => navigate('past-sessions')}
          className="w-full bg-white rounded-2xl py-4 text-lg font-semibold transition-colors hover:bg-white/80 border"
          style={{ color: '#004B32', borderColor: '#004B3220' }}
        >
          Past Sessions
        </button>
        <button
          onClick={() => navigate('categories')}
          className="w-full bg-white rounded-2xl py-4 text-lg font-semibold transition-colors hover:bg-white/80 border"
          style={{ color: '#004B32', borderColor: '#004B3220' }}
        >
          Manage Categories
        </button>
      </div>
    </div>
  )
}
