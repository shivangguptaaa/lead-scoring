import {
  Activity,
  BarChart3,
  FileSpreadsheet,
  Inbox,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  {
    id: 'queue',
    label: 'Call Queue',
    desc: 'Prioritized live inbox',
    icon: Inbox,
  },
  {
    id: 'simulator',
    label: 'Score Simulator',
    desc: 'What-if & persona lab',
    icon: SlidersHorizontal,
  },
  {
    id: 'batch',
    label: 'Batch Engine',
    desc: 'CSV scoring & export',
    icon: FileSpreadsheet,
  },
  {
    id: 'analytics',
    label: 'Model & ROI Lift',
    desc: 'Lift curve & guardrails',
    icon: BarChart3,
  },
]

export default function Sidebar({
  activeTab,
  onSelectTab,
  metadata,
  hotCount,
  geminiConfigured,
  mobileOpen,
  onCloseMobile,
}) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 dark:border-slate-800/80 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-sm shadow-blue-600/25">
              <Activity className="h-4.5 w-4.5" strokeWidth={2.3} />
            </div>
            <div>
              <div className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                SignalScale
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                X Education RevOps
              </div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 space-y-1 px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase dark:text-slate-500">
            Workspace
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                data-nav-id={item.id}
                onClick={() => {
                  onSelectTab(item.id)
                  onCloseMobile()
                }}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                  active
                    ? 'bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-200/80 dark:bg-blue-500/12 dark:text-blue-300 dark:ring-blue-500/25'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      active
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                    }`}
                  />
                  <div>
                    <div className="text-[13px] font-semibold leading-tight">{item.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                  </div>
                </div>
                {item.id === 'queue' && hotCount > 0 && (
                  <span className="font-mono-num rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                    {hotCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer Telemetry Card */}
        <div className="border-t border-slate-200/80 p-3.5 dark:border-slate-800/80">
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                {metadata?.model_type || 'RandomForest'}
              </span>
              <span className="font-mono-num rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {metadata?.test_roc_auc ? `${metadata.test_roc_auc.toFixed(3)} AUC` : 'READY'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-2 text-[11px] dark:border-slate-800">
              <div>
                <div className="text-slate-400 dark:text-slate-500">Hot Cutoff</div>
                <div className="font-mono-num font-semibold text-slate-700 dark:text-slate-200">
                  ≥ {metadata?.hot_threshold ?? 66} pts
                </div>
              </div>
              <div>
                <div className="text-slate-400 dark:text-slate-500">Precision</div>
                <div className="font-mono-num font-semibold text-emerald-600 dark:text-emerald-400">
                  {metadata?.hot_precision ? `${(metadata.hot_precision * 100).toFixed(1)}%` : '80.3%'}
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-200/70 pt-2 text-[11px] dark:border-slate-800">
              <Sparkles
                className={`h-3.5 w-3.5 ${
                  geminiConfigured ? 'text-violet-500' : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span className="text-slate-600 dark:text-slate-400">
                {geminiConfigured ? 'Gemini Outreach Active' : 'Deterministic Playbook Mode'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
