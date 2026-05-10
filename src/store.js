import { create } from 'zustand'
import { persist } from 'zustand/middleware'

let _id = Date.now()
const uid = () => (++_id).toString(36)

function buildDeck(transactions) {
  return transactions.filter(t => t.assignedCategory === null).map(t => t.id)
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      screen: 'home',
      categories: [],
      sessions: [],
      activeSession: null,
      viewingSession: null, // session shown in overview (just-completed or past)
      currency: '£',

      navigate: (screen) => set({ screen }),

      setCurrency: (symbol) => set({ currency: symbol }),

      // ── Categories ──────────────────────────────────────────────
      addCategory: (name, colour) =>
        set(s => ({
          categories: [
            ...s.categories,
            { id: uid(), name, colour: colour || '#004B32', createdAt: new Date().toISOString() },
          ],
        })),

      updateCategory: (id, updates) =>
        set(s => ({ categories: s.categories.map(c => (c.id === id ? { ...c, ...updates } : c)) })),

      deleteCategory: (id) =>
        set(s => ({ categories: s.categories.filter(c => c.id !== id) })),

      reorderCategories: (orderedIds) =>
        set(s => ({
          categories: orderedIds.map(id => s.categories.find(c => c.id === id)).filter(Boolean),
        })),

      // ── Session setup ────────────────────────────────────────────
      startNewSession: (transactions, fileName) => {
        const session = {
          id: uid(),
          createdAt: new Date().toISOString(),
          fileName,
          status: 'in_progress',
          transactions: transactions.map(t => ({ ...t, assignedCategory: null })),
          selectedCategoryIds: [],
          currentCategoryIndex: 0,
          currentDeck: [],
          currentDeckIndex: 0,
          undoAction: null,
        }
        set({ activeSession: session })
      },

      setSessionCategories: (categoryIds) =>
        set(s => ({
          activeSession: s.activeSession ? { ...s.activeSession, selectedCategoryIds: categoryIds } : null,
        })),

      startSwiping: () =>
        set(s => ({
          activeSession: s.activeSession
            ? {
                ...s.activeSession,
                currentDeck: buildDeck(s.activeSession.transactions),
                currentDeckIndex: 0,
                undoAction: null,
              }
            : null,
        })),

      // ── Swipe actions ────────────────────────────────────────────
      swipeRight: () => {
        const { activeSession } = get()
        if (!activeSession) return
        const { currentDeck, currentDeckIndex, selectedCategoryIds, currentCategoryIndex } = activeSession
        const transactionId = currentDeck[currentDeckIndex]
        const categoryId = selectedCategoryIds[currentCategoryIndex]
        set(s => ({
          activeSession: {
            ...s.activeSession,
            transactions: s.activeSession.transactions.map(t =>
              t.id === transactionId ? { ...t, assignedCategory: categoryId } : t
            ),
            currentDeckIndex: currentDeckIndex + 1,
            undoAction: { transactionId, action: 'right', prevDeckIndex: currentDeckIndex },
          },
        }))
      },

      swipeLeft: () => {
        const { activeSession } = get()
        if (!activeSession) return
        const { currentDeck, currentDeckIndex } = activeSession
        const transactionId = currentDeck[currentDeckIndex]
        set(s => ({
          activeSession: {
            ...s.activeSession,
            currentDeckIndex: currentDeckIndex + 1,
            undoAction: { transactionId, action: 'left', prevDeckIndex: currentDeckIndex },
          },
        }))
      },

      swipeUp: () => {
        const { activeSession } = get()
        if (!activeSession) return
        const { currentDeck, currentDeckIndex } = activeSession
        const transactionId = currentDeck[currentDeckIndex]
        set(s => ({
          activeSession: {
            ...s.activeSession,
            transactions: s.activeSession.transactions.map(t =>
              t.id === transactionId ? { ...t, assignedCategory: 'review_later' } : t
            ),
            currentDeckIndex: currentDeckIndex + 1,
            undoAction: { transactionId, action: 'up', prevDeckIndex: currentDeckIndex },
          },
        }))
      },

      undoSwipe: () => {
        const { activeSession } = get()
        if (!activeSession?.undoAction) return
        const { undoAction } = activeSession
        set(s => ({
          activeSession: {
            ...s.activeSession,
            transactions:
              undoAction.action !== 'left'
                ? s.activeSession.transactions.map(t =>
                    t.id === undoAction.transactionId ? { ...t, assignedCategory: null } : t
                  )
                : s.activeSession.transactions,
            currentDeckIndex: undoAction.prevDeckIndex,
            undoAction: null,
          },
        }))
      },

      advanceToNextCategory: () =>
        set(s => {
          const session = s.activeSession
          if (!session) return {}
          const newTransactions = session.transactions
          return {
            activeSession: {
              ...session,
              currentCategoryIndex: session.currentCategoryIndex + 1,
              currentDeck: buildDeck(newTransactions),
              currentDeckIndex: 0,
              undoAction: null,
            },
          }
        }),

      finalizeSession: () => {
        const { activeSession } = get()
        if (!activeSession) return null
        const completed = {
          ...activeSession,
          status: 'complete',
          transactions: activeSession.transactions.map(t =>
            t.assignedCategory === null ? { ...t, assignedCategory: 'uncategorized' } : t
          ),
        }
        set(s => ({
          sessions: [...s.sessions.filter(s2 => s2.id !== completed.id), completed],
          activeSession: null,
          viewingSession: completed,
        }))
        return completed
      },

      discardActiveSession: () => set({ activeSession: null }),

      deleteSession: (id) => set(s => ({ sessions: s.sessions.filter(x => x.id !== id) })),

      setViewingSession: (session) => set({ viewingSession: session }),
    }),
    {
      name: 'swipe-cat-v1',
      partialize: s => ({ categories: s.categories, sessions: s.sessions, activeSession: s.activeSession, currency: s.currency }),
    }
  )
)
