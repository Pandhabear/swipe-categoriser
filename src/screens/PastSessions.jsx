import React from 'react'
import { useAppStore } from '../store.js'
import { fmt } from '../utils.js'

const TRI_GREEN  = '#004B32'
const TRI_BIRCH  = '#F3EDE4'
const TRI_SAGE   = '#98D39A'

export default function PastSessions() {
  const navigate = useAppStore(s => s.navigate)
  const sessions = useAppStore(s => s.sessions)
  const deleteSession = useAppStore(s => s.deleteSession)
  const setViewingSession = useAppStore(s => s.setViewingSession)

  const sorted = [...sessions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const openSession = (session) => {
    setViewingSession(session)
    navigate('overview')
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirm('Delete this session? This cannot be undone.')) deleteSession(id)
  }

  return (
    <div className="min-h-screen px-4 pt-12 pb-8" style={{ background: TRI_BIRCH }}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('home')} className="text-2xl leading-none" style={{ color: TRI_GREEN, opacity: 0.5 }}>←</button>
        <h1 className="text-xl font-bold" style={{ color: TRI_GREEN }}>Past Sessions</h1>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm" style={{ color: TRI_GREEN, opacity: 0.5 }}>No completed sessions yet.</p>
          <button
            onClick={() => navigate('upload')}
            className="mt-4 font-semibold text-sm"
            style={{ color: TRI_GREEN }}
          >
            Start a new session →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(session => {
            const d = new Date(session.createdAt)
            const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            const total = session.transactions.reduce((s, t) => s + t.amount, 0)
            const sessionCurrency = session.transactions?.[0]?.currency || '£'
            const isComplete = session.status === 'complete'

            return (
              <button
                key={session.id}
                onClick={() => isComplete && openSession(session)}
                className="w-full bg-white rounded-2xl p-4 text-left border transition-colors hover:bg-white/70"
                style={{ borderColor: '#004B3215' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm" style={{ color: '#222222' }}>{session.fileName}</p>
                    <p className="text-xs mt-0.5" style={{ color: TRI_GREEN, opacity: 0.45 }}>{dateStr}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={isComplete
                        ? { background: TRI_SAGE + '30', color: TRI_GREEN }
                        : { background: '#FF640020', color: '#884400' }
                      }
                    >
                      {isComplete ? 'Complete' : 'In Progress'}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="text-lg leading-none px-1 transition-opacity hover:opacity-60 text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-sm">
                  <span style={{ color: TRI_GREEN, opacity: 0.5 }}>
                    <span className="font-bold" style={{ color: '#222222', opacity: 1 }}>{session.transactions.length}</span> transactions
                  </span>
                  <span style={{ color: TRI_GREEN, opacity: 0.5 }}>
                    Total <span className="font-bold" style={{ color: '#222222', opacity: 1 }}>{fmt(total, sessionCurrency)}</span>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
