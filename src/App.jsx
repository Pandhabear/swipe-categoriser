import React from 'react'
import { useAppStore } from './store.js'
import Home from './screens/Home.jsx'
import CategoryManagement from './screens/CategoryManagement.jsx'
import Upload from './screens/Upload.jsx'
import CategorySelection from './screens/CategorySelection.jsx'
import Swiping from './screens/Swiping.jsx'
import CategoryCompletion from './screens/CategoryCompletion.jsx'
import FinalOverview from './screens/FinalOverview.jsx'
import PastSessions from './screens/PastSessions.jsx'

const SCREENS = {
  home: Home,
  categories: CategoryManagement,
  upload: Upload,
  'category-select': CategorySelection,
  swiping: Swiping,
  'category-complete': CategoryCompletion,
  overview: FinalOverview,
  'past-sessions': PastSessions,
}

export default function App() {
  const screen = useAppStore(s => s.screen)
  const Screen = SCREENS[screen] || Home
  return (
    <div className="min-h-screen max-w-sm mx-auto relative overflow-x-hidden">
      <Screen />
    </div>
  )
}
