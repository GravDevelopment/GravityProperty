import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  STEPS, PHASES, newUnit, toggle, doneCount, percent, currentStep,
  lastActivity, daysSince, toCSV, filesFor, attachFile, removeFile,
  stepsInPhase, phaseDoneCount, summarize, initials, colorFor,
  notesFor, addNote, removeNote,
} from './pipeline.js'

test('a fresh unit sits at the first step', () => {
  const u = newUnit({ unit: '12A', applicant: 'N Dlamini', owner: 'Ewan' })
  assert.equal(doneCount(u), 0)
  assert.equal(percent(u), 0)
  assert.equal(currentStep(u).id, 'advertise')
  assert.equal(lastActivity(u), u.createdAt)
})

test('toggle records who and when, and is reversible', () => {
  let u = newUnit({ unit: '12A', applicant: 'N Dlamini', owner: 'Ewan' })
  u = toggle(u, 'advertise', 'Ewan')
  assert.equal(u.steps.advertise.by, 'Ewan')
  assert.equal(currentStep(u).id, 'application')
  u = toggle(u, 'advertise', 'Ewan')
  assert.equal(doneCount(u), 0)
  assert.equal(currentStep(u).id, 'advertise')
})

test('out-of-order ticks still report the first outstanding step', () => {
  let u = newUnit({ unit: '12A', applicant: 'N Dlamini', owner: 'Ewan' })
  u = toggle(u, 'bodycorp', 'Ewan')
  assert.equal(currentStep(u).id, 'advertise')
  assert.equal(doneCount(u), 1)
})

test('all steps ticked = complete', () => {
  let u = newUnit({ unit: '12A', applicant: 'N Dlamini', owner: 'Ewan' })
  for (const s of STEPS) u = toggle(u, s.id, 'Ewan')
  assert.equal(currentStep(u), null)
  assert.equal(percent(u), 100)
})

test('daysSince counts whole days', () => {
  const now = Date.parse('2026-01-10T00:00:00Z')
  assert.equal(daysSince('2026-01-07T00:00:00Z', now), 3)
})

test('attaching a file does not mark the step done, and can be removed', () => {
  let u = newUnit({ unit: '12A', applicant: 'N Dlamini', owner: 'Ewan' })
  u = attachFile(u, 'docs', { id: 'f1', name: 'id.pdf', size: 123, type: 'application/pdf' })
  assert.equal(filesFor(u, 'docs').length, 1)
  assert.equal(doneCount(u), 0) // uploading isn't the same as ticking the step
  u = removeFile(u, 'docs', 'f1')
  assert.equal(filesFor(u, 'docs').length, 0)
})

test('a unit saved before file support existed has no files key', () => {
  const legacy = { id: '1', unit: '1', applicant: '', owner: '', steps: {} }
  assert.deepEqual(filesFor(legacy, 'docs'), [])
})

test('every step belongs to exactly one phase, and phases cover all steps', () => {
  const phaseIds = new Set(PHASES.map((p) => p.id))
  for (const s of STEPS) assert.ok(phaseIds.has(s.phase), `${s.id} has an unknown phase`)
  const total = PHASES.reduce((n, p) => n + stepsInPhase(p.id).length, 0)
  assert.equal(total, STEPS.length)
})

test('phaseDoneCount only counts ticks within that phase', () => {
  let u = newUnit({ unit: '12A', applicant: 'N Dlamini', owner: 'Ewan' })
  u = toggle(u, 'advertise', 'Ewan') // market
  u = toggle(u, 'credit', 'Ewan') // screening
  assert.equal(phaseDoneCount(u, 'market'), 1)
  assert.equal(phaseDoneCount(u, 'screening'), 1)
  assert.equal(phaseDoneCount(u, 'movein'), 0)
})

test('summarize buckets units by status against the list it is given', () => {
  const now = Date.parse('2026-01-10T00:00:00Z')
  const fresh = newUnit({ unit: 'A', applicant: '', owner: '' })
  const stale = { ...newUnit({ unit: 'B', applicant: '', owner: '' }), createdAt: '2026-01-01T00:00:00Z' }
  let done = newUnit({ unit: 'C', applicant: '', owner: '' })
  for (const s of STEPS) done = toggle(done, s.id, 'Ewan')

  const stats = summarize([fresh, stale, done], now)
  assert.equal(stats.total, 3)
  assert.equal(stats.complete, 1)
  assert.equal(stats.inProgress, 2)
  assert.equal(stats.overdue, 1) // only "stale" is both in-progress and >7 days idle
})

test('initials and colorFor are deterministic and handle blanks', () => {
  assert.equal(initials('Naledi Dlamini'), 'ND')
  assert.equal(initials(''), '?')
  assert.equal(colorFor('Ewan'), colorFor('Ewan'))
})

test('the advertise step is flagged for progress notes; others are not by default', () => {
  assert.equal(STEPS.find((s) => s.id === 'advertise').notes, true)
  assert.ok(!STEPS.find((s) => s.id === 'credit').notes)
})

test('notes log progress without affecting done state, and can be removed', () => {
  let u = newUnit({ unit: '12A', applicant: 'N Dlamini', owner: 'Ewan' })
  u = addNote(u, 'advertise', { id: 'n1', text: 'Listed on Property24', at: '2026-01-01', by: 'Ewan' })
  u = addNote(u, 'advertise', { id: 'n2', text: '3 enquiries so far', at: '2026-01-05', by: 'Ewan' })
  assert.equal(notesFor(u, 'advertise').length, 2)
  assert.equal(doneCount(u), 0)
  u = removeNote(u, 'advertise', 'n1')
  assert.deepEqual(notesFor(u, 'advertise').map((n) => n.id), ['n2'])
})

test('a unit saved before notes existed has no notes key', () => {
  const legacy = { id: '1', unit: '1', applicant: '', owner: '', steps: {} }
  assert.deepEqual(notesFor(legacy, 'advertise'), [])
})

test('CSV escapes quotes/commas and has a column per step', () => {
  const u = toggle(
    newUnit({ unit: 'Unit 3, Block "B"', applicant: 'N Dlamini', owner: 'Ewan' }),
    'advertise', 'Ewan'
  )
  const [head, row] = toCSV([u]).split('\n')
  assert.equal(head.split('","').length, 8 + STEPS.length)
  assert.match(row, /"Unit 3, Block ""B"""/)
  assert.match(row, /"Application form received"/) // current step
  assert.match(row, /"1\/14"/)
})
