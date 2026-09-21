// Tenant onboarding pipeline: pure logic, no React, no DOM (except load/save).

// Your checklist grouped into the stages a letting desk actually reports on.
export const PHASES = [
  { id: 'market', label: 'Marketing', color: '#d97706' },
  { id: 'screening', label: 'Application & Screening', color: '#2563eb' },
  { id: 'approval', label: 'Approval & Lease', color: '#7c3aed' },
  { id: 'movein', label: 'Move-in', color: '#059669' },
  { id: 'admin', label: 'Admin & Aftercare', color: '#475569' },
]

export const STEPS = [
  { id: 'advertise', label: 'Advertise unit', hint: 'List the property on the relevant portals and channels.', phase: 'market', notes: true },
  { id: 'application', label: 'Application form received', hint: 'Applicant has submitted a completed application.', phase: 'screening' },
  { id: 'docs', label: 'ID + proof of income + bank statements collected', hint: 'Identity, income and banking documents received for vetting.', phase: 'screening' },
  { id: 'credit', label: 'Credit check done', hint: 'Credit bureau check completed and reviewed.', phase: 'screening' },
  { id: 'references', label: 'References checked', hint: 'Landlord and employer references contacted and verified.', phase: 'screening' },
  { id: 'approved', label: 'Application approved in writing', hint: 'Formal written approval issued to the applicant.', phase: 'approval' },
  { id: 'lease', label: 'Lease prepared & signed by both parties', hint: 'Lease agreement drafted and signed by tenant and landlord.', phase: 'approval' },
  { id: 'deposit', label: 'Deposit + first rent received & receipted', hint: "Deposit and first month's rent received and a receipt issued.", phase: 'movein' },
  { id: 'inventory', label: 'Inventory & Condition Report completed & signed', hint: 'Property condition documented and signed off by both parties.', phase: 'movein' },
  { id: 'keys', label: 'Keys / access handed over + receipt signed', hint: 'Keys or access provided and the handover receipt signed.', phase: 'movein' },
  { id: 'bodycorp', label: 'Body corporate notified', hint: 'Body corporate / HOA informed of the new tenant.', phase: 'admin' },
  { id: 'file', label: 'Tenant file completed (Rental Schedule)', hint: 'Tenant file finalised and captured on the rental schedule.', phase: 'admin' },
  { id: 'welcome', label: 'Welcome communication sent', hint: 'Welcome pack or message sent to the new tenant.', phase: 'admin' },
  { id: 'followup', label: '30-day follow-up scheduled', hint: 'Check-in scheduled for 30 days after move-in.', phase: 'admin' },
]

export const stepsInPhase = (phaseId) => STEPS.filter((s) => s.phase === phaseId)
export const phaseDoneCount = (u, phaseId) =>
  stepsInPhase(phaseId).filter((s) => u.steps[s.id]).length

export const newUnit = ({ unit, applicant, owner }) => ({
  id: Math.random().toString(36).slice(2, 9),
  unit,
  applicant,
  owner,
  createdAt: new Date().toISOString(),
  steps: {}, // { [stepId]: { at, by } }
  files: {}, // { [stepId]: [{ id, name, size, type, at, by }] } — blob lives in files.js
  notes: {}, // { [stepId]: [{ id, text, at, by }] } — progress log for steps that opt in
})

export const doneCount = (u) => STEPS.filter((s) => u.steps[s.id]).length
export const percent = (u) => Math.round((doneCount(u) / STEPS.length) * 100)

// "Where is this one?" = first step still outstanding. Steps can be ticked out
// of order (body corporate often gets told early) — this still reads right.
export const currentStep = (u) => STEPS.find((s) => !u.steps[s.id]) ?? null

export const lastActivity = (u) => {
  const times = Object.values(u.steps).map((s) => s.at)
  return times.length ? times.sort().at(-1) : u.createdAt
}

export const daysSince = (iso, now = Date.now()) =>
  Math.floor((now - new Date(iso).getTime()) / 86400000)

export const toggle = (u, stepId, by) => {
  const steps = { ...u.steps }
  if (steps[stepId]) delete steps[stepId]
  else steps[stepId] = { at: new Date().toISOString(), by: by || 'unknown' }
  return { ...u, steps }
}

// Old units saved before file support existed have no `files` key.
export const filesFor = (u, stepId) => u.files?.[stepId] ?? []

export const attachFile = (u, stepId, meta) => ({
  ...u,
  files: { ...u.files, [stepId]: [...filesFor(u, stepId), meta] },
})

export const removeFile = (u, stepId, fileId) => ({
  ...u,
  files: { ...u.files, [stepId]: filesFor(u, stepId).filter((f) => f.id !== fileId) },
})

// Old units saved before notes existed have no `notes` key.
export const notesFor = (u, stepId) => u.notes?.[stepId] ?? []

export const addNote = (u, stepId, note) => ({
  ...u,
  notes: { ...u.notes, [stepId]: [...notesFor(u, stepId), note] },
})

export const removeNote = (u, stepId, noteId) => ({
  ...u,
  notes: { ...u.notes, [stepId]: notesFor(u, stepId).filter((n) => n.id !== noteId) },
})

// Excel/Sheets treat a leading = + - @ as a formula, so a unit name like
// "=HYPERLINK(...)" would execute when someone opens the exported report.
// Prefix those with an apostrophe so they stay text.
const esc = (v) => {
  const s = String(v ?? '')
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`
}

export const toCSV = (units, now = Date.now()) => {
  const head = [
    'Unit', 'Applicant', 'Responsible', 'Current step', 'Steps done',
    'Progress %', 'Last activity', 'Days idle', ...STEPS.map((s) => s.label),
  ]
  const rows = units.map((u) => {
    const cur = currentStep(u)
    const last = lastActivity(u)
    return [
      u.unit, u.applicant, u.owner,
      cur ? cur.label : 'Complete',
      `${doneCount(u)}/${STEPS.length}`,
      percent(u), last.slice(0, 10), daysSince(last, now),
      ...STEPS.map((s) =>
        u.steps[s.id] ? `${u.steps[s.id].at.slice(0, 10)} ${u.steps[s.id].by}` : ''
      ),
    ]
  })
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n')
}

// Dashboard strip: counts against whatever list the caller is currently viewing
// (e.g. after search/agent filtering) so it reads as "this view", not "everything".
export const summarize = (units, now = Date.now()) => ({
  total: units.length,
  complete: units.filter((u) => !currentStep(u)).length,
  inProgress: units.filter((u) => currentStep(u)).length,
  overdue: units.filter((u) => currentStep(u) && daysSince(lastActivity(u), now) > 7).length,
})

const AVATAR_COLORS = ['#d97706', '#2563eb', '#7c3aed', '#059669', '#db2777', '#0891b2', '#dc2626', '#65a30d']

export const colorFor = (s) =>
  AVATAR_COLORS[[...String(s || '?')].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]

export const initials = (s) =>
  String(s || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'

const KEY = 'gravproperty.units.v1'

export const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? []
  } catch {
    return []
  }
}

export const save = (units) => localStorage.setItem(KEY, JSON.stringify(units))
