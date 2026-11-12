import { useState } from 'react'
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Flame,
  Mail,
  PhoneCall,
  RefreshCw,
  Snowflake,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { TIER_STYLES } from '../api'

function ScoreRing({ score, tier }) {
  const style = TIER_STYLES[tier] || TIER_STYLES.Warm
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, Number(score ?? 0)))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 124 124">
        <circle
          cx="62"
          cy="62"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-slate-200 dark:text-slate-800"
        />
        <circle
          cx="62"
          cy="62"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${style.text} transition-all duration-500 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono-num text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {clamped}
        </span>
        <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
          / 100 Score
        </span>
      </div>
    </div>
  )
}

function TierIcon({ tier, className }) {
  if (tier === 'Hot') return <Flame className={className} />
  if (tier === 'Warm') return <Zap className={className} />
  return <Snowflake className={className} />
}

export default function LeadDossier({
  payload,
  result,
  loading,
  draftLoading,
  metadata,
  onQuickPatch,
  onGenerateDraft,
  onOpenInSimulator,
  showQuickSliders = true,
  headerLabel = 'Lead Intelligence',
}) {
  const [copied, setCopied] = useState(false)

  if (!result && !loading) {
    return (
      <div className="flex h-full min-h-[380px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Select any lead to inspect its conversion score, counterfactual drivers, and outreach playbook.
        </p>
      </div>
    )
  }

  const score = result?.score ?? 0
  const tier = result?.tier ?? 'Warm'
  const style = TIER_STYLES[tier] || TIER_STYLES.Warm
  const hotCut = metadata?.hot_threshold ?? 66
  const warmCut = metadata?.warm_threshold ?? 46

  const handleCopy = () => {
    if (!result?.draft) return
    navigator.clipboard?.writeText(result.draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleApplyLever = (label) => {
    if (!onQuickPatch || !payload) return
    if (label.startsWith('Time +300s')) {
      onQuickPatch({ time_on_site: Math.min(1500, Number(payload.time_on_site || 0) + 300) })
    } else if (label.startsWith('Time -240s')) {
      onQuickPatch({ time_on_site: Math.max(60, Number(payload.time_on_site || 0) - 240) })
    } else if (label.includes('Working Professional')) {
      onQuickPatch({ occupation: 'Working Professional' })
    } else if (label.includes('Unemployed')) {
      onQuickPatch({ occupation: 'Unemployed' })
    } else if (label.includes('SMS Sent')) {
      onQuickPatch({ last_activity: 'SMS Sent' })
    } else if (label.includes('Unreachable')) {
      onQuickPatch({ last_activity: 'Unreachable' })
    } else if (label.includes('Reference')) {
      onQuickPatch({ lead_source: 'Reference' })
    } else if (label.includes('Do Not Email')) {
      onQuickPatch({ do_not_email: payload.do_not_email === 'Yes' ? 'No' : 'Yes' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Score & Playbook Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              {headerLabel}
            </span>
            {loading && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                Updating
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {result?.latency_ms != null && (
              <span className="font-mono-num inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <Clock className="h-3 w-3" />
                {result.latency_ms}ms
              </span>
            )}
            {onOpenInSimulator && (
              <button
                onClick={onOpenInSimulator}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Full Studio
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Ring + Tier Summary */}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <ScoreRing score={score} tier={tier} />

          <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${style.bg} ${style.border} ${style.text}`}
              >
                <TierIcon tier={tier} className="h-3.5 w-3.5" />
                {tier} Priority
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {payload?.occupation || 'Unknown Role'}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {payload?.lead_source || 'Direct'}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {result?.recommendation}
            </p>

            {/* Threshold Spectrum */}
            <div className="pt-1">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="absolute inset-y-0 left-0 bg-sky-500/80" style={{ width: `${warmCut}%` }} />
                <div
                  className="absolute inset-y-0 bg-amber-500/85"
                  style={{ left: `${warmCut}%`, width: `${hotCut - warmCut}%` }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-rose-500/90"
                  style={{ left: `${hotCut}%` }}
                />
                <div
                  className="absolute top-1/2 h-3.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 ring-2 ring-white transition-all duration-300 dark:bg-white dark:ring-slate-900"
                  style={{ left: `${Math.min(99, Math.max(1, score))}%` }}
                />
              </div>
              <div className="font-mono-num mt-1.5 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                <span>0 Cold</span>
                <span>Warm ≥{warmCut}</span>
                <span>Hot ≥{hotCut}</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Signal Pills */}
        {payload && (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3.5 dark:border-slate-800">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              Time: <strong className="font-mono-num">{payload.time_on_site}s</strong>
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              Visits: <strong className="font-mono-num">{payload.TotalVisits}</strong>
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              Activity: <strong>{payload.last_activity || '—'}</strong>
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              Track: <strong>{payload.specialization || 'General'}</strong>
            </span>
            {(payload.do_not_email === 'Yes' || payload.do_not_call === 'Yes') && (
              <span className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                DND Active
              </span>
            )}
          </div>
        )}
      </div>

      {/* Inline Quick What-If Sliders */}
      {showQuickSliders && payload && onQuickPatch && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200">
              Instant Behavioral Sandbox
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Drag to test score sensitivity
            </span>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-300">Time on Site</span>
                <span className="font-mono-num font-semibold text-blue-600 dark:text-blue-400">
                  {payload.time_on_site}s
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2000}
                step={15}
                value={payload.time_on_site}
                onChange={(e) => onQuickPatch({ time_on_site: Number(e.target.value) })}
                className="studio-slider w-full bg-slate-200 dark:bg-slate-800"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-300">Website Visits</span>
                <span className="font-mono-num font-semibold text-blue-600 dark:text-blue-400">
                  {payload.TotalVisits}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={payload.TotalVisits}
                onChange={(e) => onQuickPatch({ TotalVisits: Number(e.target.value) })}
                className="studio-slider w-full bg-slate-200 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      {/* Counterfactual Sensitivity Levers */}
      {result?.levers && result.levers.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wide text-slate-700 uppercase dark:text-slate-200">
              Counterfactual Score Levers
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Click any lever to test
            </span>
          </div>
          <div className="space-y-2">
            {result.levers.map((lever) => {
              const positive = lever.delta >= 0
              return (
                <button
                  key={lever.label}
                  onClick={() => handleApplyLever(lever.label)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-left text-xs transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {positive ? (
                      <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                    )}
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {lever.label}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono-num text-[11px] text-slate-400 dark:text-slate-500">
                      → {lever.new_score}
                    </span>
                    <span
                      className={`font-mono-num rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                        positive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                      }`}
                    >
                      {positive ? `+${lever.delta}` : lever.delta}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Gemini AI Outreach Composer */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                AI Outreach Studio
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Field-minimized Gemini prompt (no PII sent)
              </div>
            </div>
          </div>

          <button
            onClick={onGenerateDraft}
            disabled={draftLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-violet-700 disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-600"
          >
            {draftLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : payload?.do_not_email === 'Yes' ? (
              <PhoneCall className="h-3.5 w-3.5" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            {draftLoading ? 'Drafting...' : result?.draft ? 'Regenerate Draft' : 'Generate AI Draft'}
          </button>
        </div>

        {result?.draft ? (
          <div className="relative rounded-xl border border-violet-200/80 bg-violet-50/40 p-3.5 dark:border-violet-500/25 dark:bg-violet-950/20">
            <button
              onClick={handleCopy}
              className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <pre className="whitespace-pre-wrap pr-16 font-sans text-xs leading-relaxed text-slate-700 dark:text-slate-200">
              {result.draft}
            </pre>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
            {result?.draft_note ||
              'Click "Generate AI Draft" to compose a personalized email or call script tailored to this lead’s score and specialization.'}
          </div>
        )}
      </div>
    </div>
  )
}
