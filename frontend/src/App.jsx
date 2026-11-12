import { useEffect, useState } from 'react'
import { fetchBootstrap } from './api'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import CallQueueView from './views/CallQueueView'
import SimulatorView from './views/SimulatorView'
import BatchView from './views/BatchView'
import AnalyticsView from './views/AnalyticsView'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('xe-studio-theme') || 'light')
  const [activeTab, setActiveTab] = useState('queue')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [boot, setBoot] = useState(null)
  const [bootError, setBootError] = useState('')
  const [simulatorSeed, setSimulatorSeed] = useState(null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('xe-studio-theme', theme)
  }, [theme])

  useEffect(() => {
    fetchBootstrap()
      .then((data) => setBoot(data))
      .catch((err) => setBootError(err.message || 'Failed to connect to backend'))
  }, [])

  const openInSimulator = (payload) => {
    setSimulatorSeed(payload)
    setActiveTab('simulator')
  }

  if (bootError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-500/30 dark:bg-slate-900">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Could not initialize Lead Scoring Workspace
          </h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{bootError}</p>
        </div>
      </div>
    )
  }

  if (!boot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Loading RandomForest pipeline & 9,240-lead telemetry...
          </p>
        </div>
      </div>
    )
  }

  const hotCount = (boot.sample_queue || []).filter((r) => r.Tier === 'Hot').length

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        metadata={boot.metadata}
        hotCount={hotCount}
        geminiConfigured={boot.gemini_configured}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeTab={activeTab}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          geminiConfigured={boot.gemini_configured}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onQuickSimulate={() => setActiveTab('simulator')}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          {activeTab === 'queue' && (
            <CallQueueView
              queueRows={boot.sample_queue || []}
              dropdownOptions={boot.dropdown_options}
              metadata={boot.metadata}
              baselineRate={boot.baseline_conversion_rate}
              onOpenInSimulator={openInSimulator}
            />
          )}

          {activeTab === 'simulator' && (
            <SimulatorView
              dropdownOptions={boot.dropdown_options}
              presets={boot.presets}
              metadata={boot.metadata}
              initialPayload={simulatorSeed}
              onClearInitialPayload={() => setSimulatorSeed(null)}
            />
          )}

          {activeTab === 'batch' && (
            <BatchView
              dropdownOptions={boot.dropdown_options}
              metadata={boot.metadata}
              onOpenInSimulator={openInSimulator}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              analytics={boot.analytics}
              featureImportance={boot.feature_importance}
              metadata={boot.metadata}
              liftCurve={boot.lift_curve}
              baselineRate={boot.baseline_conversion_rate}
            />
          )}
        </main>
      </div>
    </div>
  )
}
