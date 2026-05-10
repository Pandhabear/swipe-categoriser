import React from 'react'
import { useAppStore } from '../store.js'
import { fmt } from '../utils.js'

const TRI_GREEN  = '#004B32'
const TRI_BIRCH  = '#F3EDE4'

const MESSAGES = [
  'Nice work!', 'Keep going!', 'You\'re on a roll!', 'Great progress!', 'Looking good!',
]

export default function CategoryCompletion() {
  const navigate = useAppStore(s => s.navigate)
  const activeSession = useAppStore(s => s.activeSession)
  const categories = useAppStore(s => s.categories)
  const advanceToNextCategory = useAppStore(s => s.advanceToNextCategory)
  const finalizeSession = useAppStore(s => s.finalizeSession)

  if (!activeSession) { navigate('home'); return null }

  const { selectedCategoryIds, currentCategoryIndex, transactions } = activeSession

  const isLast = currentCategoryIndex >= selectedCategoryIds.length - 1
  const currentCategoryId = selectedCategoryIds[currentCategoryIndex]
  const currentCategory = categories.find(c => c.id === currentCategoryId)
  const cardColour = currentCategory?.colour || TRI_GREEN

  const assigned = transactions.filter(t => t.assignedCategory === currentCategoryId)
  const total = assigned.reduce((s, t) => s + t.amount, 0)
  const msg = MESSAGES[currentCategoryIndex % MESSAGES.length]

  const handleNext = () => {
    if (isLast) {
      finalizeSession()
      navigate('overview')
    } else {
      advanceToNextCategory()
      navigate('swiping')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center" style={{ background: TRI_BIRCH }}>
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl text-white mb-6 shadow-xl"
        style={{ background: cardColour, boxShadow: `0 8px 30px ${cardColour}50` }}
      >
        ✓
      </div>

      <h2 className="text-2xl font-bold" style={{ color: TRI_GREEN }}>
        {currentCategory?.name || 'Category'} done!
      </h2>
      <p className="mt-1 text-sm" style={{ color: TRI_GREEN, opacity: 0.5 }}>{msg}</p>

      <div className="mt-8 bg-white rounded-2xl border p-6 w-full max-w-xs space-y-4" style={{ borderColor: '#004B3215' }}>
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: TRI_GREEN, opacity: 0.4 }}>Assigned</p>
          <p className="text-3xl font-bold mt-1" style={{ color: TRI_GREEN }}>{assigned.length}</p>
          <p className="text-sm" style={{ color: TRI_GREEN, opacity: 0.5 }}>transactions</p>
        </div>
        <div className="border-t" style={{ borderColor: '#004B3210' }} />
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: TRI_GREEN, opacity: 0.4 }}>Total</p>
          <p className="text-3xl font-bold mt-1" style={{ color: cardColour }}>
            {fmt(total, assigned[0]?.currency || '£')}
          </p>
        </div>
      </div>

      {!isLast && (
        <p className="text-sm mt-4" style={{ color: TRI_GREEN, opacity: 0.4 }}>
          {selectedCategoryIds.length - currentCategoryIndex - 1}{' '}
          {selectedCategoryIds.length - currentCategoryIndex - 1 === 1 ? 'category' : 'categories'} remaining
        </p>
      )}

      <button
        onClick={handleNext}
        className="mt-8 w-full max-w-xs text-white rounded-2xl py-4 font-bold text-lg shadow-lg transition-opacity hover:opacity-90"
        style={{ background: cardColour, boxShadow: `0 8px 24px ${cardColour}50` }}
      >
        {isLast ? 'See Full Overview →' : 'Next Category →'}
      </button>
    </div>
  )
}
