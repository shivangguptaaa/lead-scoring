export async function fetchBootstrap() {
  const res = await fetch('/api/bootstrap')
  if (!res.ok) throw new Error('Failed to load workspace metadata')
  return res.json()
}

export async function scoreSingleLead(payload) {
  const res = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Scoring failed')
  }
  return res.json()
}

export async function scoreSampleBatch() {
  const res = await fetch('/api/sample-batch', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to score sample batch')
  return res.json()
}

export async function scoreUploadedBatch(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/batch', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to parse or score CSV')
  }
  return res.json()
}

export function cleanFieldValue(val, fallback = '') {
  if (val === undefined || val === null || val === '—' || val === 'nan' || val === 'NaN') {
    return fallback
  }
  return String(val)
}

export function presetToPayload(preset, includeDraft = false) {
  return {
    TotalVisits: Number(preset.TotalVisits ?? 0),
    time_on_site: Number(preset['Total Time Spent on Website'] ?? 0),
    page_views: Number(preset['Page Views Per Visit'] ?? 0),
    lead_origin: cleanFieldValue(preset['Lead Origin'], 'Landing Page Submission'),
    lead_source: cleanFieldValue(preset['Lead Source'], 'Google'),
    last_activity: cleanFieldValue(preset['Last Activity'], 'Email Opened'),
    how_heard: cleanFieldValue(preset['How did you hear about X Education'], 'Online Search'),
    occupation: cleanFieldValue(preset['What is your current occupation'], 'Unemployed'),
    specialization: cleanFieldValue(preset.Specialization, 'Finance Management'),
    city: cleanFieldValue(preset.City, 'Mumbai'),
    country: cleanFieldValue(preset.Country, 'India'),
    do_not_email: cleanFieldValue(preset['Do Not Email'], 'No'),
    do_not_call: cleanFieldValue(preset['Do Not Call'], 'No'),
    free_copy: cleanFieldValue(preset['A free copy of Mastering The Interview'], 'No'),
    include_draft: includeDraft,
  }
}

export function rowToPayload(row, dropdownOptions = {}, includeDraft = false) {
  const firstOpt = (col, fallback) => {
    const list = dropdownOptions[col]
    return list && list.length ? list[0] : fallback
  }
  return {
    TotalVisits: Math.max(0, Math.round(Number(row.TotalVisits || 0))),
    time_on_site: Math.max(0, Math.round(Number(row['Total Time Spent on Website'] || 0))),
    page_views: Math.max(0, Number(row['Page Views Per Visit'] || 0)),
    lead_origin: cleanFieldValue(row['Lead Origin'], firstOpt('Lead Origin', 'Landing Page Submission')),
    lead_source: cleanFieldValue(row['Lead Source'], firstOpt('Lead Source', 'Google')),
    last_activity: cleanFieldValue(row['Last Activity'], firstOpt('Last Activity', 'Email Opened')),
    how_heard: cleanFieldValue(
      row['How did you hear about X Education'],
      firstOpt('How did you hear about X Education', 'Online Search'),
    ),
    occupation: cleanFieldValue(
      row['What is your current occupation'],
      firstOpt('What is your current occupation', 'Unemployed'),
    ),
    specialization: cleanFieldValue(row.Specialization, firstOpt('Specialization', 'Finance Management')),
    city: cleanFieldValue(row.City, firstOpt('City', 'Mumbai')),
    country: cleanFieldValue(row.Country, firstOpt('Country', 'India')),
    do_not_email: cleanFieldValue(row['Do Not Email'], 'No') === 'Yes' ? 'Yes' : 'No',
    do_not_call: cleanFieldValue(row['Do Not Call'], 'No') === 'Yes' ? 'Yes' : 'No',
    free_copy: cleanFieldValue(row['A free copy of Mastering The Interview'], 'No') === 'Yes' ? 'Yes' : 'No',
    include_draft: includeDraft,
  }
}

export const TIER_STYLES = {
  Hot: {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/12',
    border: 'border-rose-200 dark:border-rose-500/30',
    dot: 'bg-rose-500',
    stroke: '#e11d48',
    strokeDark: '#fb7185',
    bar: 'bg-rose-500',
    ring: 'ring-rose-500/20',
  },
  Warm: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/12',
    border: 'border-amber-200 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    stroke: '#d97706',
    strokeDark: '#fbbf24',
    bar: 'bg-amber-500',
    ring: 'ring-amber-500/20',
  },
  Cold: {
    text: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/12',
    border: 'border-sky-200 dark:border-sky-500/30',
    dot: 'bg-sky-500',
    stroke: '#0284c7',
    strokeDark: '#38bdf8',
    bar: 'bg-sky-500',
    ring: 'ring-sky-500/20',
  },
}
