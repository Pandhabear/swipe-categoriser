import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store.js'

const TRI_GREEN = '#004B32'
const TRI_BIRCH = '#F3EDE4'

export default function CategorySelection() {
  const navigate = useAppStore(s => s.navigate)
  const categories = useAppStore(s => s.categories)
  const setSessionCategories = useAppStore(s => s.setSessionCategories)
  const startSwiping = useAppStore(s => s.startSwiping)
  const activeSession = useAppStore(s => s.activeSession)

  const [selected, setSelected] = useState(() => categories.map(c => c.id))
  const [order, setOrder] = useState(() => categories.map(c => c.id))
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  useEffect(() => {
    setOrder(prev => {
      const validSelected = selected.filter(id => categories.some(c => c.id === id))
      return [...validSelected, ...prev.filter(id => !validSelected.includes(id))]
    })
  }, [selected])

  if (!activeSession) { navigate('home'); return null }

  const orderedSelected = order.filter(id => selected.includes(id))

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) return
    const from = order.indexOf(dragId)
    const to = order.indexOf(targetId)
    const reordered = [...order]
    reordered.splice(to, 0, reordered.splice(from, 1)[0])
    setOrder(reordered)
    setDragId(null)
    setDragOverId(null)
  }

  const handleStart = () => {
    if (!orderedSelected.length) return
    setSessionCategories(orderedSelected)
    startSwiping()
    navigate('swiping')
  }

  return (
    <div className="min-h-screen px-4 pt-12 pb-8" style={{ background: TRI_BIRCH }}>
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate('upload')} className="text-2xl leading-none" style={{ color: TRI_GREEN, opacity: 0.5 }}>←</button>
        <h1 className="text-xl font-bold" style={{ color: TRI_GREEN }}>Choose Categories</h1>
      </div>
      <p className="text-sm mb-6 ml-9" style={{ color: TRI_GREEN, opacity: 0.5 }}>
        Select and order the categories to swipe through.
      </p>

      {categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm mb-4" style={{ color: TRI_GREEN, opacity: 0.5 }}>No categories yet.</p>
          <button
            onClick={() => navigate('categories')}
            className="font-semibold text-sm"
            style={{ color: TRI_GREEN }}
          >
            Create some categories first →
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelected(categories.map(c => c.id))}
              className="text-xs font-semibold"
              style={{ color: TRI_GREEN }}
            >
              Select all
            </button>
            <span style={{ color: '#004B3230' }}>|</span>
            <button
              onClick={() => setSelected([])}
              className="text-xs"
              style={{ color: TRI_GREEN, opacity: 0.5 }}
            >
              Deselect all
            </button>
          </div>

          <div className="space-y-2 mb-6">
            {order.map(id => {
              const cat = categories.find(c => c.id === id)
              if (!cat) return null
              const isSelected = selected.includes(id)
              const posInOrder = orderedSelected.indexOf(id)
              return (
                <div
                  key={id}
                  draggable={isSelected}
                  onDragStart={() => setDragId(id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(id) }}
                  onDrop={() => handleDrop(id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                  style={{
                    opacity: dragOverId === id ? 0.5 : isSelected ? 1 : 0.45,
                    background: isSelected ? 'white' : '#004B3208',
                    border: `1px solid ${isSelected ? '#004B3218' : '#004B3210'}`,
                  }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                >
                  {isSelected
                    ? <span className="text-lg cursor-grab select-none" style={{ color: TRI_GREEN, opacity: 0.25 }}>⠿</span>
                    : <span className="w-5" />
                  }
                  <button onClick={() => toggle(id)} className="flex items-center gap-3 flex-1 text-left">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: cat.colour }} />
                    <span className="font-medium" style={{ color: isSelected ? '#222222' : TRI_GREEN }}>{cat.name}</span>
                  </button>
                  {isSelected && posInOrder >= 0 && (
                    <span className="text-xs font-mono w-5 text-right" style={{ color: TRI_GREEN, opacity: 0.3 }}>{posInOrder + 1}</span>
                  )}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(id)}
                    className="w-4 h-4"
                    style={{ accentColor: TRI_GREEN }}
                  />
                </div>
              )
            })}
          </div>

          {orderedSelected.length > 0 && (
            <p className="text-xs text-center mb-4" style={{ color: TRI_GREEN, opacity: 0.4 }}>
              Swiping through {orderedSelected.length} {orderedSelected.length === 1 ? 'category' : 'categories'} · {activeSession.transactions.length} transactions
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={!orderedSelected.length}
            className="w-full text-white rounded-2xl py-4 font-bold text-lg shadow-lg transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: TRI_GREEN, boxShadow: '0 8px 24px #004B3240' }}
          >
            Start Swiping →
          </button>
        </>
      )}
    </div>
  )
}
