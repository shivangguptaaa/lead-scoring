import { Menu, Moon, PlusCircle, Sparkles, Sun } from 'lucide-react'

const TAB_TITLES = {
  queue: {
    title: 'Prioritized Call Queue',
    subtitle: '40 real validation leads ranked 0–100 by calibrated conversion likelihood',
  },
  simulator: {
    title: 'Interactive Score Simulator',
    subtitle: 'Adjust lead behavior & profile attributes to inspect live counterfactual impact',
  },
  batch: {
    title: 'Batch CSV Scoring Engine',
    subtitle: 'Score spreadsheets in bulk, inspect ranked leads, and export prioritized CRM queues',
  },
  analytics: {
    title: 'Model Benchmarks, Lift & Guardrails',
    subtitle: '9,240-lead cumulative conversion lift, feature drivers, calibration, and safety checks',
  },
}

export default function TopBar({
  activeTab,
  theme,
  onToggleTheme,
  geminiConfigured,
  onOpenMobileMenu,
  onQuickSimulate,
}) {
  const info = TAB_TITLES[activeTab] || TAB_TITLES.queue

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/85 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display truncate text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
              {info.title}
            </h1>
            <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
              {info.subtitle}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span
            className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium md:inline-flex ${
              geminiConfigured
                ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/12 dark:text-violet-300'
                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            {geminiConfigured ? 'Gemini Drafts On' : 'Gemini Key Optional'}
          </span>

          {activeTab !== 'simulator' && (
            <button
              onClick={onQuickSimulate}
              className="hidden items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 sm:inline-flex"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Lead
            </button>
          )}

          <button
            id="themeToggle"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
            aria-label="Toggle light/dark theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-600" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
