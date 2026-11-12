import { useEffect, useRef, useState } from 'react'
import { Flame, RotateCcw, Snowflake, Zap } from 'lucide-react'
import { presetToPayload, scoreSingleLead } from '../api'
import LeadDossier from '../components/LeadDossier'

const QUICK_OCCUPATIONS = [
  'Working Professional',
  'Unemployed',
  'Student',
  'Businessman',
  'Housewife',
  'Other',
]

const QUICK_ACTIVITIES = [
  'Email Opened',
  'SMS Sent',
  'Olark Chat Conversation',
  'Converted to Lead',
  'Page Visited on Website',
  'Unreachable',
]

function SegmentedToggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/50">
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
        {['No', 'Yes'].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-md px-2.5 py-0.5 text-[11px] font-semibold transition ${
              value === opt
                ? opt === 'Yes'
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-900 text-white dark:bg-blue-500'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SimulatorView({
  dropdownOptions,
  presets,
  metadata,
  initialPayload,
  onClearInitialPayload,
}) {
  const [payload, setPayload] = useState(
    () => initialPayload || presetToPayload(presets?.Hot || {}, false),
  )
  const [activePreset, setActivePreset] = useState(initialPayload ? 'Custom' : 'Hot')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (initialPayload) {
      setPayload(initialPayload)
      setActivePreset('Custom')
      onClearInitialPayload?.()
    }
  }, [initialPayload, onClearInitialPayload])

  useEffect(() => {
    if (!payload) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      scoreSingleLead({ ...payload, include_draft: false })
        .then((res) => setResult(res))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 140)
    return () => clearTimeout(debounceRef.current)
  }, [payload])

  const patch = (updates) => {
    setActivePreset('Custom')
    setPayload((prev) => ({ ...prev, ...updates }))
  }

  const applyPreset = (name) => {
    if (!presets?.[name]) return
    setActivePreset(name)
    setPayload(presetToPayload(presets[name], false))
  }

  const handleGenerateDraft = () => {
    if (!payload) return
    setDraftLoading(true)
    scoreSingleLead({ ...payload, include_draft: true })
      .then((res) => setResult(res))
      .catch(() => {})
      .finally(() => setDraftLoading(false))
  }

  const SelectField = ({ label, value, options = [], onChange }) => (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs transition focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Preset Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold text-slate-500 uppercase dark:text-slate-400">
            Load Persona:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('Hot')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              activePreset === 'Hot'
                ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-rose-500" />
            Hot Prospect (~96)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('Warm')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              activePreset === 'Warm'
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Warm Prospect (~58)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('Cold')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              activePreset === 'Cold'
                ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Snowflake className="h-3.5 w-3.5 text-sky-500" />
            Cold Prospect (~8)
          </button>
        </div>

        <button
          type="button"
          onClick={() => applyPreset('Hot')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      {/* Main Split Studio */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left Controls */}
        <div className="space-y-4 lg:col-span-7">
          {/* Behavioral Sliders */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-xs font-bold tracking-wider text-blue-600 uppercase dark:text-blue-400">
              1 · Behavioral Engagement Sliders
            </h2>

            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Total Time Spent on Website
                  </span>
                  <span className="font-mono-num rounded-md bg-blue-50 px-2 py-0.5 font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    {payload.time_on_site} sec ({Math.round(payload.time_on_site / 60)}m{' '}
                    {payload.time_on_site % 60}s)
                  </span>
                </div>
                <input
                  id="timeSlider"
                  type="range"
                  min={0}
                  max={2200}
                  step={10}
                  value={payload.time_on_site}
                  onChange={(e) => patch({ time_on_site: Number(e.target.value) })}
                  className="studio-slider w-full bg-slate-200 dark:bg-slate-800"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Total Visits
                    </span>
                    <span className="font-mono-num font-bold text-slate-800 dark:text-slate-100">
                      {payload.TotalVisits}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={payload.TotalVisits}
                    onChange={(e) => patch({ TotalVisits: Number(e.target.value) })}
                    className="studio-slider w-full bg-slate-200 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Page Views / Visit
                    </span>
                    <span className="font-mono-num font-bold text-slate-800 dark:text-slate-100">
                      {Number(payload.page_views).toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={0.5}
                    value={payload.page_views}
                    onChange={(e) => patch({ page_views: Number(e.target.value) })}
                    className="studio-slider w-full bg-slate-200 dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Pill selectors for Last Activity */}
              <div className="pt-1">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Last Touchpoint Activity
                  </span>
                  <span className="text-[11px] text-slate-400">{payload.last_activity}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ACTIVITIES.map((act) => {
                    const active = payload.last_activity === act
                    return (
                      <button
                        key={act}
                        type="button"
                        onClick={() => patch({ last_activity: act })}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                          active
                            ? 'border-blue-500 bg-blue-600 text-white dark:bg-blue-500'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300'
                        }`}
                      >
                        {act}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2.5">
                  <SelectField
                    label="Or choose full Last Activity list"
                    value={payload.last_activity}
                    options={dropdownOptions['Last Activity']}
                    onChange={(val) => patch({ last_activity: val })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Profile Pills & Acquisition */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3.5 text-xs font-bold tracking-wider text-blue-600 uppercase dark:text-blue-400">
              2 · Prospect Profile & Acquisition
            </h2>

            <div className="mb-4">
              <div className="mb-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Current Occupation
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_OCCUPATIONS.map((occ) => {
                  const active = payload.occupation === occ
                  return (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => patch({ occupation: occ })}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                        active
                          ? 'border-indigo-500 bg-indigo-600 text-white dark:bg-indigo-500'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300'
                      }`}
                    >
                      {occ}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <SelectField
                label="Lead Origin"
                value={payload.lead_origin}
                options={dropdownOptions['Lead Origin']}
                onChange={(val) => patch({ lead_origin: val })}
              />
              <SelectField
                label="Lead Source"
                value={payload.lead_source}
                options={dropdownOptions['Lead Source']}
                onChange={(val) => patch({ lead_source: val })}
              />
              <SelectField
                label="Specialization"
                value={payload.specialization}
                options={dropdownOptions.Specialization}
                onChange={(val) => patch({ specialization: val })}
              />
              <SelectField
                label="Referral / Discovery Channel"
                value={payload.how_heard}
                options={dropdownOptions['How did you hear about X Education']}
                onChange={(val) => patch({ how_heard: val })}
              />
              <SelectField
                label="City"
                value={payload.city}
                options={dropdownOptions.City}
                onChange={(val) => patch({ city: val })}
              />
              <SelectField
                label="Country"
                value={payload.country}
                options={dropdownOptions.Country}
                onChange={(val) => patch({ country: val })}
              />
            </div>
          </section>

          {/* Preferences */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-xs font-bold tracking-wider text-blue-600 uppercase dark:text-blue-400">
              3 · Communication Preferences
            </h2>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <SegmentedToggle
                label="Do Not Email"
                value={payload.do_not_email}
                onChange={(val) => patch({ do_not_email: val })}
              />
              <SegmentedToggle
                label="Do Not Call"
                value={payload.do_not_call}
                onChange={(val) => patch({ do_not_call: val })}
              />
              <SegmentedToggle
                label="Free Guide"
                value={payload.free_copy}
                onChange={(val) => patch({ free_copy: val })}
              />
            </div>
          </section>
        </div>

        {/* Right Live Output */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-20">
            <LeadDossier
              payload={payload}
              result={result}
              loading={loading}
              draftLoading={draftLoading}
              metadata={metadata}
              onQuickPatch={patch}
              onGenerateDraft={handleGenerateDraft}
              showQuickSliders={false}
              headerLabel="Live Simulator Output"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
