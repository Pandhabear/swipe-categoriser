import React, { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useAppStore } from '../store.js'

const THRESHOLD_X = 90
const THRESHOLD_Y = 70
const TRI_GREEN  = '#004B32'
const TRI_BIRCH  = '#F3EDE4'
const TRI_SIENNA = '#FF6400'

function SwipeCard({ transaction, category, onSwipe, swipeRef }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-18, 18])
  const rightOpacity = useTransform(x, [30, THRESHOLD_X], [0, 1])
  const leftOpacity = useTransform(x, [-THRESHOLD_X, -30], [1, 0])
  const upOpacity = useTransform(y, [-THRESHOLD_Y, -25], [1, 0])
  const animatingRef = useRef(false)

  const cardColour = category?.colour || TRI_GREEN

  const triggerSwipe = async (dir) => {
    if (animatingRef.current) return
    animatingRef.current = true
    const targets = { right: [600, 0], left: [-600, 0], up: [0, -600] }
    const [tx, ty] = targets[dir]
    await Promise.all([
      animate(x, tx, { duration: 0.22, ease: 'easeIn' }),
      dir === 'up' ? animate(y, ty, { duration: 0.22, ease: 'easeIn' }) : Promise.resolve(),
    ])
    onSwipe(dir)
  }

  useEffect(() => {
    if (swipeRef) swipeRef.current = triggerSwipe
    return () => { if (swipeRef) swipeRef.current = null }
  })

  const handleDragEnd = (_, info) => {
    if (info.offset.x > THRESHOLD_X) triggerSwipe('right')
    else if (info.offset.x < -THRESHOLD_X) triggerSwipe('left')
    else if (info.offset.y < -THRESHOLD_Y) triggerSwipe('up')
    else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 28 })
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 28 })
    }
  }

  return (
    <motion.div
      key={transaction.id}
      initial={{ scale: 0.92, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0, transition: { duration: 0.2 } }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.75}
      onDragEnd={handleDragEnd}
      style={{ x, y, rotate, touchAction: 'none', userSelect: 'none' }}
      className="absolute inset-x-5 top-2 bottom-2 bg-white rounded-3xl cursor-grab active:cursor-grabbing"
      whileHover={{ boxShadow: '0 20px 50px rgba(0,75,50,0.14)' }}
      whileTap={{ cursor: 'grabbing' }}
    >
      {/* Right overlay — assign */}
      <motion.div
        className="absolute inset-0 rounded-3xl flex items-center justify-start pl-8 pointer-events-none"
        style={{ opacity: rightOpacity, background: cardColour + '22' }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-3xl text-white font-bold"
          style={{ background: cardColour }}
        >✓</div>
      </motion.div>

      {/* Left overlay — skip */}
      <motion.div
        className="absolute inset-0 rounded-3xl flex items-center justify-end pr-8 pointer-events-none"
        style={{ opacity: leftOpacity, background: '#00000010' }}
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl text-white font-bold" style={{ background: '#222222' }}>✕</div>
      </motion.div>

      {/* Up overlay — review later */}
      <motion.div
        className="absolute inset-0 rounded-3xl flex items-center justify-center pointer-events-none"
        style={{ opacity: upOpacity, background: TRI_SIENNA + '18' }}
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl text-white font-bold" style={{ background: TRI_SIENNA }}>?</div>
      </motion.div>

      <div className="h-full flex flex-col justify-center px-8 py-10">
        <p className="text-sm" style={{ color: TRI_GREEN, opacity: 0.45 }}>{transaction.date}</p>
        <h2 className="text-2xl font-bold mt-2 leading-tight break-words" style={{ color: '#222222' }}>
          {transaction.merchant}
        </h2>
        <p className="text-4xl font-bold mt-5" style={{ color: cardColour }}>
          {transaction.currency || '£'}{parseFloat(transaction.amount).toFixed(2)}
        </p>
      </div>
    </motion.div>
  )
}

export default function Swiping() {
  const store = useAppStore()
  const { activeSession, categories, navigate, swipeRight, swipeLeft, swipeUp, undoSwipe, advanceToNextCategory, finalizeSession } = store
  const swipeRef = useRef(null)

  useEffect(() => {
    if (!activeSession) { navigate('home'); return }
    const { selectedCategoryIds, currentCategoryIndex, currentDeck, currentDeckIndex } = activeSession
    if (currentCategoryIndex >= selectedCategoryIds.length) {
      finalizeSession()
      navigate('overview')
      return
    }
    if (currentDeckIndex >= currentDeck.length) {
      navigate('category-complete')
    }
  }, [
    activeSession?.currentCategoryIndex,
    activeSession?.currentDeckIndex,
    activeSession?.currentDeck?.length,
  ])

  useEffect(() => {
    const onKey = (e) => {
      if (!swipeRef.current) return
      if (e.key === 'ArrowRight') swipeRef.current('right')
      else if (e.key === 'ArrowLeft') swipeRef.current('left')
      else if (e.key === 'ArrowUp') swipeRef.current('up')
      else if (e.key === 'z' || e.key === 'Z') undoSwipe()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undoSwipe])

  if (!activeSession) return null

  const { selectedCategoryIds, currentCategoryIndex, currentDeck, currentDeckIndex, undoAction, transactions } = activeSession

  if (currentCategoryIndex >= selectedCategoryIds.length) return null
  if (currentDeckIndex >= currentDeck.length) return null

  const currentCategoryId = selectedCategoryIds[currentCategoryIndex]
  const currentCategory = categories.find(c => c.id === currentCategoryId)
  const cardColour = currentCategory?.colour || TRI_GREEN
  const remaining = currentDeck.length - currentDeckIndex
  const progress = currentDeckIndex / currentDeck.length

  const currentTxId = currentDeck[currentDeckIndex]
  const currentTransaction = transactions.find(t => t.id === currentTxId)
  const nextTxId = currentDeck[currentDeckIndex + 1]
  const nextTransaction = nextTxId ? transactions.find(t => t.id === nextTxId) : null

  const handleSwipe = (dir) => {
    if (dir === 'right') swipeRight()
    else if (dir === 'left') swipeLeft()
    else swipeUp()
  }

  const handleButtonSwipe = (dir) => {
    if (swipeRef.current) swipeRef.current(dir)
    else handleSwipe(dir)
  }

  return (
    <div className="h-screen flex flex-col select-none overflow-hidden" style={{ background: TRI_BIRCH }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: cardColour }} />
            <span className="font-bold" style={{ color: TRI_GREEN }}>{currentCategory?.name || 'Category'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: TRI_GREEN, opacity: 0.45 }}>{remaining} left</span>
            <button
              onClick={() => navigate('home')}
              title="Save & close"
              className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-50"
              style={{ background: '#004B3215', color: TRI_GREEN }}
            >
              <span className="text-sm leading-none font-semibold">✕</span>
            </button>
          </div>
        </div>
        <p className="text-xs mb-2" style={{ color: TRI_GREEN, opacity: 0.4 }}>
          Category {currentCategoryIndex + 1} of {selectedCategoryIds.length}
        </p>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#004B3215' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress * 100}%`, background: cardColour }}
          />
        </div>
      </div>

      {/* Card stack */}
      <div className="flex-1 relative mx-0 min-h-0">
        {nextTransaction && (
          <div
            className="absolute inset-x-5 top-4 bottom-4 bg-white rounded-3xl"
            style={{ transform: 'scale(0.94) translateY(12px)', zIndex: 1, boxShadow: '0 4px 20px rgba(0,75,50,0.07)' }}
          />
        )}
        {currentTransaction && (
          <div className="absolute inset-0" style={{ zIndex: 10 }}>
            <SwipeCard
              key={currentTxId}
              transaction={currentTransaction}
              category={currentCategory}
              onSwipe={handleSwipe}
              swipeRef={swipeRef}
            />
          </div>
        )}
      </div>

      {/* Hint labels */}
      <div className="flex justify-between px-10 text-xs pb-1 flex-shrink-0" style={{ color: TRI_GREEN, opacity: 0.3 }}>
        <span>← Skip</span>
        <span>↑ Review later</span>
        <span>Assign →</span>
      </div>

      {/* Controls */}
      <div className="px-5 pb-8 pt-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleButtonSwipe('left')}
            className="flex-1 bg-white rounded-2xl py-4 text-2xl shadow-sm active:scale-95 transition-transform border"
            style={{ borderColor: '#004B3215' }}
          >
            ✕
          </button>
          <button
            onClick={undoSwipe}
            disabled={!undoAction}
            className="bg-white rounded-2xl px-4 py-4 shadow-sm disabled:opacity-25 active:scale-95 transition-transform font-bold border"
            style={{ color: TRI_GREEN, borderColor: '#004B3215' }}
          >
            ↩
          </button>
          <button
            onClick={() => handleButtonSwipe('up')}
            className="bg-white rounded-2xl px-4 py-4 shadow-sm active:scale-95 transition-transform font-bold text-xl border"
            style={{ color: TRI_SIENNA, borderColor: '#004B3215' }}
          >
            ↑
          </button>
          <button
            onClick={() => handleButtonSwipe('right')}
            className="flex-1 rounded-2xl py-4 text-2xl shadow-sm active:scale-95 transition-transform text-white font-bold"
            style={{ background: cardColour, boxShadow: `0 6px 20px ${cardColour}55` }}
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  )
}
