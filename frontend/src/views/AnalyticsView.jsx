import { useMemo, useState } from 'react'
import { CheckCircle2, Database, GitBranch, Lock, ShieldCheck, Sliders, TrendingUp } from 'lucide-react'

function LiftCurveChart({ curve, selectedPct }) {
  if (!curve || curve.length === 0) return null

  const width = 460
  const height = 220
  const padL = 38
  const padR = 16
  const padT = 16
  const padB = 30
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const pts = [{ pct_contacted: 0, capture_rate: 0 }, ...curve]
  const toX = (pct) => padL + (pct / 100) * plotW
  const toY = (rate) => padT + plotH - (rate / 100) * plotH

  const modelPath = pts
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(p.pct_contacted).toFixed(1)} ${toY(p.capture_rate).toFixed(1)}`)
    .join(' ')

  const areaPath = `${modelPath} L ${toX(100).toFixed(1)} ${toY(0).toFixed(1)} L ${toX(0).toFixed(1)} ${toY(0).toFixed(1)} Z`

  const activePoint = pts.find((p) => p.pct_contacted === selectedPct) || pts[pts.length - 1]
  const ax = toX(activePoint.pct_contacted)
  const ay = toY(activePoint.capture_rate)
  const ry = toY(activePoint.pct_contacted)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
      <defs>
        <linearGradient id="liftArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0, 25, 50, 75, 100].map((val) => {
        const y = toY(val)
        return (
          <g key={val}>
            <line
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke="currentColor"
              strokeDasharray="3 4"
              className="text-slate-200 dark:text-slate-800"
            />
            <text
              x={padL - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-slate-400 text-[9px] font-mono"
            >
              {val}%
            </text>
          </g>
        )
      })}

      {/* Random Baseline Diagonal */}
      <line
        x1={toX(0)}
        y1={toY(0)}
        x2={toX(100)}
        y2={toY(100)}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeDasharray="5 4"
        className="text-slate-400 dark:text-slate-600"
      />

      {/* Model Lift Area + Curve */}
      <path d={areaPath} fill="url(#liftArea)" />
      <path d={modelPath} fill="none" stroke="#2563eb" strokeWidth="2.8" strokeLinecap="round" />

      {/* Active Comparison Line */}
      <line
        x1={ax}
        y1={padT}
        x2={ax}
        y2={padT + plotH}
        stroke="#6366f1"
        strokeWidth="1.4"
        strokeDasharray="2 2"
      />
      <circle cx={ax} cy={ry} r="4.5" className="fill-slate-400 stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
      <circle cx={ax} cy={ay} r="6" className="fill-blue-600 stroke-white dark:fill-blue-400 dark:stroke-slate-900" strokeWidth="2" />

      {[20, 40, 60, 80, 100].map((val) => (
        <text
          key={val}
          x={toX(val)}
          y={height - 8}
          textAnchor="middle"
          className="fill-slate-400 text-[9px] font-mono"
        >
          {val}%
        </text>
      ))}
    </svg>
  )
}

export default function AnalyticsView({
  analytics,
  featureImportance,
  metadata,
  liftCurve,
  baselineRate,
}) {
  const [capacityPct, setCapacityPct] = useState(40)
  const [hoveredBin, setHoveredBin] = useState(null)

  const activeLift = useMemo(() => {
    if (!liftCurve || liftCurve.length === 0) return null
    return liftCurve.find((pt) => pt.pct_contacted === capacityPct) || liftCurve[3]
  }, [liftCurve, capacityPct])

  const maxHist = useMemo(() => {
    const bins = analytics?.histogram || []
    return Math.max(1, ...bins.map((b) => b.Hot + b.Warm + b.Cold))
  }, [analytics])

  const maxImp = useMemo(() => {
    if (!featureImportance?.length) return 1
    return Math.max(0.001, featureImportance[0].importance)
  }, [featureImportance])

  const cvScores = metadata?.cv_scores || {
    RandomForest: { mean: 0.8994, std: 0.0041 },
    LogisticRegression: { mean: 0.8973, std: 0.0037 },
    XGBoost: { mean: 0.8869, std: 0.0058 },
  }

  return (
    <div className="space-y-5">
      {/* Interactive Sales Capacity & ROI Simulator */}
      {activeLift && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="space-y-4 lg:col-span-6">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                <TrendingUp className="h-3.5 w-3.5" />
                Cumulative Conversion Gains (9,240 Leads)
              </div>

              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Sales Call Capacity Simulator
              </h2>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Suppose your counselors only have bandwidth to call the{' '}
                <strong className="text-slate-900 dark:text-white">top {capacityPct}%</strong>{' '}
                highest-scoring leads. Compare how many real enrollments your team captures versus calling at random.
              </p>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Leads Contacted ({activeLift.leads_contacted.toLocaleString()} calls)
                  </span>
                  <span className="font-mono-num font-bold text-blue-600 dark:text-blue-400">
                    Top {capacityPct}% (Min Score ≥ {activeLift.min_score})
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={10}
                  value={capacityPct}
                  onChange={(e) => setCapacityPct(Number(e.target.value))}
                  className="studio-slider w-full bg-slate-200 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                  <div className="text-[10px] font-semibold text-emerald-700 uppercase dark:text-emerald-300">
                    Model Captures
                  </div>
                  <div className="font-mono-num mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {activeLift.capture_rate}%
                  </div>
                  <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                    of all enrollments
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">
                    Random Calling
                  </div>
                  <div className="font-mono-num mt-1 text-xl font-bold text-slate-700 dark:text-slate-300">
                    {activeLift.random_capture_rate}%
                  </div>
                  <div className="text-[10px] text-slate-400">without scoring</div>
                </div>

                <div className="rounded-xl border border-blue-200/80 bg-blue-50/70 p-3 dark:border-blue-500/25 dark:bg-blue-500/10">
                  <div className="text-[10px] font-semibold text-blue-700 uppercase dark:text-blue-300">
                    Queue Precision
                  </div>
                  <div className="font-mono-num mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                    {activeLift.slice_precision}%
                  </div>
                  <div className="text-[10px] text-blue-700/80 dark:text-blue-300/80">
                    vs {baselineRate}% base
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/60 lg:col-span-6">
              <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>% of Total Conversions Captured vs % Leads Called</span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-3 rounded-xs bg-blue-600" />
                    Model Queue
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-0.5 w-3 border-t-2 border-dashed border-slate-400" />
                    Random
                  </span>
                </div>
              </div>
              <LiftCurveChart curve={liftCurve} selectedPct={capacityPct} />
            </div>
          </div>
        </div>
      )}

      {/* Histogram + Top Signals */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Stacked Score Histogram */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Score Distribution (9,240 Leads)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bimodal separation shows strong confidence at the extremes
              </p>
            </div>
            {hoveredBin && (
              <span className="font-mono-num rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {hoveredBin.range}: {hoveredBin.Hot + hoveredBin.Warm + hoveredBin.Cold}
              </span>
            )}
          </div>

          <div className="flex h-48 items-end gap-1.5 pt-4">
            {(analytics?.histogram || []).map((bin) => {
              const total = bin.Hot + bin.Warm + bin.Cold
              const hPct = Math.round((total / maxHist) * 100)
              const dominant =
                bin.Hot >= bin.Warm && bin.Hot >= bin.Cold
                  ? 'bg-rose-500'
                  : bin.Warm >= bin.Cold
                    ? 'bg-amber-500'
                    : 'bg-sky-500'
              return (
                <div
                  key={bin.range}
                  onMouseEnter={() => setHoveredBin(bin)}
                  onMouseLeave={() => setHoveredBin(null)}
                  className="group flex flex-1 flex-col items-center justify-end h-full"
                  title={`${bin.range}: ${total} leads`}
                >
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 group-hover:opacity-85 ${dominant}`}
                    style={{ height: `${Math.max(4, hPct)}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="font-mono-num mt-2 flex justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-800">
            <span>0 (Cold)</span>
            <span>46 (Warm)</span>
            <span>66 (Hot)</span>
            <span>100</span>
          </div>
        </div>

        {/* Top Feature Drivers */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
          <div className="mb-3.5">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Top Predictive Feature Weights
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Global Gini importance from the fitted RandomForest pipeline
            </p>
          </div>
          <div className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
            {(featureImportance || []).map((feat) => {
              const pct = Math.max(4, Math.round((feat.importance / maxImp) * 100))
              return (
                <div key={feat.feature} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="truncate pr-2 font-medium text-slate-700 dark:text-slate-200">
                      {feat.feature}
                    </span>
                    <span className="font-mono-num shrink-0 font-semibold text-slate-500 dark:text-slate-400">
                      {(feat.importance * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CV Benchmark Table & Guardrails */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            5-Fold Cross-Validation Benchmark
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Selected by highest cross-validated ROC-AUC & calibration reliability
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-3.5 py-2.5">Model</th>
                  <th className="px-3.5 py-2.5">ROC-AUC</th>
                  <th className="px-3.5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(cvScores).map(([name, val]) => {
                  const selected = name === (metadata?.model_type || 'RandomForest')
                  return (
                    <tr key={name} className={selected ? 'bg-blue-50/40 dark:bg-blue-500/8' : ''}>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-100">
                        {name}
                      </td>
                      <td className="font-mono-num px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
                        {Number(val.mean).toFixed(4)} ± {Number(val.std).toFixed(4)}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {selected ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Benchmarked</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="font-mono-num mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Brier: {metadata?.brier_score?.toFixed(4) ?? '0.1368'}</span>
            <span>·</span>
            <span>Max Reliability Gap: {metadata?.max_reliability_gap?.toFixed(4) ?? '0.0597'}</span>
          </div>
        </div>

        {/* 4 System Guardrails */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:col-span-7">
          {[
            {
              icon: Database,
              title: 'Zero Data Leakage',
              desc: 'Drops 10 post-rep columns (Tags, Lead Quality, Asymmetrique*, Last Notable Activity) before fitting or scoring.',
            },
            {
              icon: GitBranch,
              title: 'Train/Serve Pipeline Parity',
              desc: 'A single fitted scikit-learn Pipeline handles missing values, rare categories, scaling, and unseen fields identically.',
            },
            {
              icon: Sliders,
              title: 'Deterministic Tiers',
              desc: 'Hot (≥66), Warm (≥46), and Cold cutoffs come straight from calibrated validation curves—never hallucinated by an LLM.',
            },
            {
              icon: Lock,
              title: 'Field-Minimized GenAI',
              desc: 'Gemini outreach drafting only ever sees occupation, specialization, source, score, and tier—never PII or raw lead rows.',
            },
          ].map((g) => {
            const Icon = g.icon
            return (
              <div
                key={g.title}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-blue-400">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{g.title}</h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{g.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
