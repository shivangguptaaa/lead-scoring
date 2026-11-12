import { useMemo, useRef, useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  Play,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react'
import {
  TIER_STYLES,
  rowToPayload,
  scoreSampleBatch,
  scoreSingleLead,
  scoreUploadedBatch,
} from '../api'
import LeadDossier from '../components/LeadDossier'

function TierDonut({ counts }) {
  const total = counts.Hot + counts.Warm + counts.Cold || 1
  const r = 38
  const c = 2 * Math.PI * r
  const hotLen = (counts.Hot / total) * c
  const warmLen = (counts.Warm / total) * c
  const coldLen = (counts.Cold / total) * c

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#e11d48"
            strokeWidth="12"
            strokeDasharray={`${hotLen} ${c}`}
            strokeDashoffset={0}
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#d97706"
            strokeWidth="12"
            strokeDasharray={`${warmLen} ${c}`}
            strokeDashoffset={-hotLen}
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#0284c7"
            strokeWidth="12"
            strokeDasharray={`${coldLen} ${c}`}
            strokeDashoffset={-(hotLen + warmLen)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono-num text-lg font-bold text-slate-900 dark:text-white">
            {total}
          </span>
          <span className="text-[10px] font-medium text-slate-400">Leads</span>
        </div>
      </div>

      <div className="flex-1 space-y-2 text-xs">
        {[
          { name: 'Hot', val: counts.Hot, color: 'bg-rose-500' },
          { name: 'Warm', val: counts.Warm, color: 'bg-amber-500' },
          { name: 'Cold', val: counts.Cold, color: 'bg-sky-500' },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              {item.name}
            </span>
            <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
              {item.val}{' '}
              <span className="font-normal text-slate-400">
                ({Math.round((item.val / total) * 100)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BatchView({
  dropdownOptions,
  metadata,
  onOpenInSimulator,
}) {
  const [batchData, setBatchData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [tierFilter, setTierFilter] = useState('All')
  const [query, setQuery] = useState('')

  // Slide-over inspection drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [inspectPayload, setInspectPayload] = useState(null)
  const [inspectResult, setInspectResult] = useState(null)
  const [inspectLoading, setInspectLoading] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)

  const fileInputRef = useRef(null)

  const runSample = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await scoreSampleBatch()
      setBatchData(data)
    } catch (e) {
      setError(e.message || 'Could not score sample batch.')
    } finally {
      setLoading(false)
    }
  }

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const data = await scoreUploadedBatch(file)
      setBatchData(data)
    } catch (e) {
      setError(e.message || 'Invalid CSV format.')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    if (!batchData?.rows) return []
    const q = query.trim().toLowerCase()
    return batchData.rows.filter((row) => {
      if (tierFilter !== 'All' && row.Tier !== tierFilter) return false
      if (!q) return true
      const hay = [
        row['What is your current occupation'],
        row.Specialization,
        row['Lead Source'],
        row['Last Activity'],
        row['Recommended Action'],
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [batchData, tierFilter, query])

  const openInspector = (row) => {
    const payload = rowToPayload(row, dropdownOptions, false)
    setInspectPayload(payload)
    setDrawerOpen(true)
    setInspectLoading(true)
    scoreSingleLead(payload)
      .then((res) => setInspectResult(res))
      .catch(() => {})
      .finally(() => setInspectLoading(false))
  }

  const patchInspector = (patch) => {
    if (!inspectPayload) return
    const next = { ...inspectPayload, ...patch, include_draft: false }
    setInspectPayload(next)
    setInspectLoading(true)
    scoreSingleLead(next)
      .then((res) => setInspectResult(res))
      .catch(() => {})
      .finally(() => setInspectLoading(false))
  }

  const generateInspectorDraft = () => {
    if (!inspectPayload) return
    setDraftLoading(true)
    scoreSingleLead({ ...inspectPayload, include_draft: true })
      .then((res) => setInspectResult(res))
      .catch(() => {})
      .finally(() => setDraftLoading(false))
  }

  const exportCsv = () => {
    if (!batchData?.csv_text) return
    const blob = new Blob([batchData.csv_text], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scored_leads_prioritized.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Upload + Actions Card */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition lg:col-span-7 ${
            dragActive
              ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10'
              : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Drop a CRM CSV export here, or click to browse
          </p>
          <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
            Automatically aligns columns, handles unseen categories identically to training, and ranks every prospect 0–100.
          </p>
        </div>

        {/* Quick Actions Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
              <Sparkles className="h-4 w-4 text-blue-500" />
              Instant Demo & Template
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Don’t have a spreadsheet handy? Score 40 real held-out prospect records right now or download the CSV schema template.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              id="runSampleBatchBtn"
              onClick={runSample}
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {loading ? 'Scoring...' : 'Run 40-Lead Sample'}
            </button>
            <a
              href="/api/sample-csv"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5" />
              Template CSV
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Results View */}
      {batchData ? (
        <div className="space-y-5">
          {/* Summary KPI + Donut Row */}
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-7">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[11px] font-medium text-slate-500">Total Scored</div>
                <div className="font-mono-num mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {batchData.summary.total_leads}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-400">
                  {batchData.summary.source_label}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[11px] font-medium text-slate-500">Average Score</div>
                <div className="font-mono-num mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {batchData.summary.avg_score}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">0–100 propensity</div>
              </div>
              <div className="col-span-2 rounded-2xl border border-slate-200/90 bg-white p-4 sm:col-span-1 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-[11px] font-medium text-slate-500">% Flagged Hot</div>
                <div className="font-mono-num mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {batchData.summary.pct_hot}%
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">Call-first queue</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
              <TierDonut counts={batchData.summary.tier_counts} />
            </div>
          </div>

          {/* Ranked Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                {['All', 'Hot', 'Warm', 'Cold'].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setTierFilter(tier)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      tierFilter === tier
                        ? 'bg-slate-900 text-white dark:bg-blue-500'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter table..."
                    className="w-44 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none sm:w-56 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Occupation</th>
                    <th className="px-4 py-3">Specialization</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Recommended Next Step</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredRows.map((row, idx) => {
                    const st = TIER_STYLES[row.Tier] || TIER_STYLES.Warm
                    return (
                      <tr
                        key={`${row._rank}-${idx}`}
                        onClick={() => openInspector(row)}
                        className="cursor-pointer transition hover:bg-blue-50/50 dark:hover:bg-blue-500/8"
                      >
                        <td className="font-mono-num px-4 py-3 font-medium text-slate-400">
                          #{row._rank}
                        </td>
                        <td className="font-mono-num px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {row['Lead Score']}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${st.bg} ${st.border} ${st.text}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                            {row.Tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                          {row['What is your current occupation']}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {row.Specialization}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {row['Lead Source']}
                        </td>
                        <td className="font-mono-num px-4 py-3 text-slate-600 dark:text-slate-300">
                          {row['Total Time Spent on Website']}s
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                          {row['Recommended Action']}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click <strong>Run 40-Lead Sample</strong> above or drop a CSV file to generate ranked tables, tier breakdowns, and click-to-inspect dossiers.
          </p>
        </div>
      )}

      {/* Slide-Over Lead Inspector Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
          <div className="relative h-full w-full max-w-xl overflow-y-auto bg-slate-50 p-5 shadow-2xl dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Lead Batch Inspector
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Simulate behavioral changes or draft personalized AI outreach
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <LeadDossier
              payload={inspectPayload}
              result={inspectResult}
              loading={inspectLoading}
              draftLoading={draftLoading}
              metadata={metadata}
              onQuickPatch={patchInspector}
              onGenerateDraft={generateInspectorDraft}
              onOpenInSimulator={
                inspectPayload
                  ? () => {
                      setDrawerOpen(false)
                      onOpenInSimulator(inspectPayload)
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
