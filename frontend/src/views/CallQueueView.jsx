import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, Flame, Search, Snowflake, Sparkles, TrendingUp, Zap } from 'lucide-react'
import { TIER_STYLES, rowToPayload, scoreSingleLead } from '../api'
import LeadDossier from '../components/LeadDossier'

export default function CallQueueView({
  queueRows,
  dropdownOptions,
  metadata,
  baselineRate,
  onOpenInSimulator,
}) {
  const [tierFilter, setTierFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('score')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const [activePayload, setActivePayload] = useState(null)
  const [activeResult, setActiveResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = queueRows.filter((row) => {
      if (tierFilter !== 'All' && row.Tier !== tierFilter) return false
      if (!q) return true
      const hay = [
        row['What is your current occupation'],
        row.Specialization,
        row['Lead Source'],
        row['Last Activity'],
        row.City,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
    return [...base].sort((a, b) => {
      if (sortBy === 'time') {
        return Number(b['Total Time Spent on Website'] || 0) - Number(a['Total Time Spent on Website'] || 0)
      }
      return Number(b['Lead Score'] || 0) - Number(a['Lead Score'] || 0)
    })
  }, [queueRows, tierFilter, query, sortBy])

  const counts = useMemo(() => {
    const hot = queueRows.filter((r) => r.Tier === 'Hot').length
    const warm = queueRows.filter((r) => r.Tier === 'Warm').length
    const cold = queueRows.filter((r) => r.Tier === 'Cold').length
    return { all: queueRows.length, hot, warm, cold }
  }, [queueRows])

  const selectedRow = filtered[selectedIndex] || filtered[0] || null

  // Score newly selected row cleanly via backend to get counterfactual levers
  useEffect(() => {
    if (!selectedRow) return
    const nextPayload = rowToPayload(selectedRow, dropdownOptions, false)
    setActivePayload(nextPayload)

    let cancelled = false
    setLoading(true)
    scoreSingleLead(nextPayload)
      .then((res) => {
        if (!cancelled) setActiveResult(res)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedRow, dropdownOptions])

  const handleQuickPatch = (patch) => {
    if (!activePayload) return
    const updated = { ...activePayload, ...patch, include_draft: false }
    setActivePayload(updated)
    setLoading(true)
    scoreSingleLead(updated)
      .then((res) => setActiveResult(res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const handleGenerateDraft = () => {
    if (!activePayload) return
    setDraftLoading(true)
    scoreSingleLead({ ...activePayload, include_draft: true })
      .then((res) => setActiveResult(res))
      .catch(() => {})
      .finally(() => setDraftLoading(false))
  }

  const hotPrecision = metadata?.hot_precision ? (metadata.hot_precision * 100).toFixed(1) : '80.3'
  const liftX = baselineRate ? (Number(hotPrecision) / baselineRate).toFixed(1) : '2.1'

  return (
    <div className="space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Hot Queue (Call First)</span>
            <Flame className="h-4 w-4 text-rose-500" />
          </div>
          <div className="font-mono-num mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
            {counts.hot}
            <span className="ml-1.5 text-xs font-normal text-slate-400">/ {counts.all} leads</span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
            Score ≥ {metadata?.hot_threshold ?? 66} · Call within 15 min
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Warm Follow-Up</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="font-mono-num mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
            {counts.warm}
            <span className="ml-1.5 text-xs font-normal text-slate-400">leads</span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            Score {metadata?.warm_threshold ?? 46}–{(metadata?.hot_threshold ?? 66) - 1} · Same-day cadence
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Cold Automated</span>
            <Snowflake className="h-4 w-4 text-sky-500" />
          </div>
          <div className="font-mono-num mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
            {counts.cold}
            <span className="ml-1.5 text-xs font-normal text-slate-400">leads</span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-sky-600 dark:text-sky-400">
            Auto-nurture · Zero rep hours wasted
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-blue-600 to-indigo-600 p-4 text-white shadow-xs dark:border-blue-500/30">
          <div className="flex items-center justify-between text-xs font-medium text-blue-100">
            <span>Sales Efficiency Lift</span>
            <TrendingUp className="h-4 w-4 text-blue-100" />
          </div>
          <div className="font-mono-num mt-1.5 text-2xl font-bold">
            {hotPrecision}%
            <span className="ml-1.5 text-xs font-medium text-blue-100">{liftX}x lift</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-100/90">
            vs {baselineRate ?? 38.5}% baseline random calling
          </div>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left: Interactive Ranked Queue */}
        <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-6 xl:col-span-5">
          {/* Controls */}
          <div className="space-y-3 border-b border-slate-200/80 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSelectedIndex(0)
                  }}
                  placeholder="Search occupation, specialization, source..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-8.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
                />
              </div>
              <button
                onClick={() => setSortBy((s) => (s === 'score' ? 'time' : 'score'))}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                title="Toggle sort order"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortBy === 'score' ? 'Score' : 'Time'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'All', label: `All (${counts.all})` },
                { id: 'Hot', label: `Hot (${counts.hot})` },
                { id: 'Warm', label: `Warm (${counts.warm})` },
                { id: 'Cold', label: `Cold (${counts.cold})` },
              ].map((pill) => {
                const active = tierFilter === pill.id
                return (
                  <button
                    key={pill.id}
                    onClick={() => {
                      setTierFilter(pill.id)
                      setSelectedIndex(0)
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-blue-500 dark:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pill.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Queue Rows */}
          <div className="max-h-[650px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800/80">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No leads match the current search or filter.
              </div>
            ) : (
              filtered.map((row, idx) => {
                const isSelected = selectedRow?._rank === row._rank
                const style = TIER_STYLES[row.Tier] || TIER_STYLES.Warm
                const timeSec = Number(row['Total Time Spent on Website'] || 0)
                const timeBarPct = Math.min(100, Math.round((timeSec / 1800) * 100))

                return (
                  <button
                    key={`${row._rank}-${idx}`}
                    onClick={() => setSelectedIndex(idx)}
                    className={`flex w-full items-start gap-3 p-3.5 text-left transition ${
                      isSelected
                        ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-500/30 dark:bg-blue-500/10 dark:ring-blue-400/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div
                      className={`font-mono-num flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border text-sm font-bold ${style.bg} ${style.border} ${style.text}`}
                    >
                      {row['Lead Score']}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                          {row['What is your current occupation'] || 'Unknown'} ·{' '}
                          {row.Specialization || 'General'}
                        </span>
                        <span className="font-mono-num shrink-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          #{row._rank}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{row['Lead Source']}</span>
                        <span>·</span>
                        <span>{row['Last Activity']}</span>
                        <span>·</span>
                        <span className="font-mono-num">{timeSec}s on site</span>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full ${style.bar}`}
                            style={{ width: `${Math.max(8, timeBarPct)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold uppercase ${style.text}`}>{row.Tier}</span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Sticky Live Intelligence Dossier */}
        <div className="lg:col-span-6 xl:col-span-7">
          <div className="lg:sticky lg:top-20">
            <LeadDossier
              payload={activePayload}
              result={activeResult}
              loading={loading}
              draftLoading={draftLoading}
              metadata={metadata}
              onQuickPatch={handleQuickPatch}
              onGenerateDraft={handleGenerateDraft}
              onOpenInSimulator={
                activePayload ? () => onOpenInSimulator(activePayload) : undefined
              }
              headerLabel={
                selectedRow
                  ? `Prospect #${selectedRow._rank} · ${selectedRow.Specialization || 'Lead'}`
                  : 'Lead Intelligence'
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
