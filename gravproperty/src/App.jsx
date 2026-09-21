import { useEffect, useState } from 'react'
import {
  STEPS, PHASES, newUnit, toggle, doneCount, percent, currentStep,
  lastActivity, daysSince, toCSV, load, save, filesFor, attachFile, removeFile,
  stepsInPhase, phaseDoneCount, summarize, initials, colorFor,
  notesFor, addNote, removeNote,
} from './pipeline'
import { saveBlob, getBlob, deleteBlob } from './files'
import { initAuth, getAccount, signOut } from './auth'
import Login from './Login'
import { IconBuilding, IconSearch, IconDownload, IconPaperclip, IconClock } from './icons'
import './App.css'

const fmtSize = (bytes) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(0)} KB`

const phaseOf = (id) => PHASES.find((p) => p.id === id)

const blank = { unit: '', applicant: '', owner: '' }

function App() {
  const [units, setUnits] = useState(load)
  const [account, setAccount] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [selected, setSelected] = useState(() => load()[0]?.id ?? null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(blank)
  const [owner, setOwner] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => save(units), [units])
  useEffect(() => {
    initAuth().then(() => {
      setAccount(getAccount())
      setAuthReady(true)
    })
  }, [])

  // Access gate: nothing below renders until Microsoft has confirmed who you
  // are. Fails closed — a misconfigured VITE_MSAL_* env shows the setup
  // notice instead of quietly letting anyone in.
  if (!authReady) return null
  if (!account) return <Login />

  const me = account.name || account.username

  const owners = [...new Set(units.map((u) => u.owner).filter(Boolean))].sort()
  const shown = units.filter(
    (u) =>
      (!owner || u.owner === owner) &&
      `${u.unit} ${u.applicant} ${u.owner}`.toLowerCase().includes(q.toLowerCase())
  )
  const current = units.find((u) => u.id === selected) ?? null
  const stats = summarize(shown)

  const add = (e) => {
    e.preventDefault()
    if (!draft.unit.trim()) return
    const u = newUnit(draft)
    setUnits([...units, u])
    setDraft(blank)
    setAdding(false)
    setSelected(u.id)
  }

  const tick = (id, stepId) =>
    setUnits(units.map((u) => (u.id === id ? toggle(u, stepId, me) : u)))

  const remove = (u) => {
    if (!confirm(`Remove ${u.unit} and its progress?`)) return
    Object.values(u.files ?? {}).flat().forEach((f) => deleteBlob(f.id))
    setUnits(units.filter((x) => x.id !== u.id))
    if (selected === u.id) setSelected(null)
  }

  const upload = async (unitId, stepId, fileList) => {
    try {
      for (const file of fileList) {
        const id = crypto.randomUUID()
        await saveBlob(id, file)
        const meta = {
          id, name: file.name, size: file.size, type: file.type,
          at: new Date().toISOString(), by: me || 'unknown',
        }
        setUnits((cur) => cur.map((u) => (u.id === unitId ? attachFile(u, stepId, meta) : u)))
      }
    } catch (err) {
      alert(`Could not save file: ${err.message}`)
    }
  }

  const download = async (meta) => {
    const blob = await getBlob(meta.id)
    if (!blob) return alert('File data not found — it may have been cleared from this browser.')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = meta.name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const removeAttachment = (unitId, stepId, fileId) => {
    deleteBlob(fileId)
    setUnits((cur) => cur.map((u) => (u.id === unitId ? removeFile(u, stepId, fileId) : u)))
  }

  const postNote = (unitId, stepId, text) => {
    const note = { id: crypto.randomUUID(), text, at: new Date().toISOString(), by: me || 'unknown' }
    setUnits((cur) => cur.map((u) => (u.id === unitId ? addNote(u, stepId, note) : u)))
  }

  const deleteNote = (unitId, stepId, noteId) =>
    setUnits((cur) => cur.map((u) => (u.id === unitId ? removeNote(u, stepId, noteId) : u)))

  const exportCSV = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([toCSV(shown)], { type: 'text/csv' }))
    a.download = `pipeline-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <header>
        <div className="brand">
          <span className="brand-mark"><IconBuilding /></span>
          <div>
            <h1>GravProperty</h1>
            <p className="tagline">Tenant onboarding pipeline</p>
          </div>
        </div>
        <div className="me">
          <span className="avatar" style={{ background: colorFor(me) }}>{initials(me)}</span>
          <div className="me-heading">
            <span className="me-name">{me}</span>
            <span className="me-email">{account.username}</span>
          </div>
          <button type="button" className="ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div className="stats">
        <div className="stat-card">
          <span className="stat-card-value">{stats.total}</span>
          <span className="stat-card-label">Units tracked</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{stats.inProgress}</span>
          <span className="stat-card-label">In progress</span>
        </div>
        <div className="stat-card good">
          <span className="stat-card-value">{stats.complete}</span>
          <span className="stat-card-label">Completed</span>
        </div>
        <div className="stat-card warn">
          <span className="stat-card-value">{stats.overdue}</span>
          <span className="stat-card-label">Overdue (7d+ idle)</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <IconSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search unit or applicant…" />
        </div>
        <select value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">All agents</option>
          {owners.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        {owners.map((o) => {
          const mine = units.filter((u) => u.owner === o)
          const live = mine.filter((u) => currentStep(u))
          return (
            <button
              key={o}
              type="button"
              className={`chip ${owner === o ? 'active' : ''}`}
              onClick={() => setOwner(owner === o ? '' : o)}
            >
              {o} · {live.length} in progress
            </button>
          )
        })}
        <span className="spacer" />
        <button type="button" className="ghost" onClick={exportCSV} disabled={!shown.length}>
          <IconDownload /> Export report (CSV)
        </button>
      </div>

      <div className="layout">
        <nav className="units">
          <button type="button" className="new-unit" onClick={() => setAdding(true)}>
            + New unit
          </button>

          {shown.map((u) => {
            const cur = currentStep(u)
            const idle = daysSince(lastActivity(u))
            const phase = cur ? phaseOf(cur.phase) : null
            return (
              <button
                key={u.id}
                type="button"
                className={`unit-tab ${u.id === selected ? 'active' : ''}`}
                onClick={() => setSelected(u.id)}
              >
                <div className="unit-tab-top">
                  <span className="avatar" style={{ background: colorFor(u.applicant || u.unit) }}>
                    {initials(u.applicant || u.unit)}
                  </span>
                  <div className="unit-tab-heading">
                    <span className="unit-name">{u.unit}</span>
                    <span className="unit-applicant">{u.applicant || 'No applicant yet'}</span>
                  </div>
                  <span className="unit-pct">{percent(u)}%</span>
                </div>
                <div className="meter">
                  <span style={{ width: `${percent(u)}%` }} className={cur ? '' : 'meter-done'} />
                </div>
                <div className="unit-tab-bottom">
                  <span className="phase-chip" style={{ '--phase-color': phase?.color ?? '#059669' }}>
                    <span className="phase-dot" /> {phase?.label ?? 'Complete'}
                  </span>
                  {u.owner && <span className="unit-agent">{u.owner}</span>}
                </div>
                {cur && idle > 7 && (
                  <span className="idle-flag"><IconClock /> {idle}d idle</span>
                )}
              </button>
            )
          })}

          {!shown.length && !adding && <p className="empty-nav">No units match.</p>}
        </nav>

        <main className="detail">
          {adding && (
            <form className="add-form" onSubmit={add}>
              <h2>New unit</h2>
              <input
                autoFocus
                value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                placeholder="Unit / property address"
              />
              <input
                value={draft.applicant}
                onChange={(e) => setDraft({ ...draft, applicant: e.target.value })}
                placeholder="Applicant / tenant name"
              />
              <input
                value={draft.owner}
                onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
                placeholder="Responsible agent"
                list="owners"
              />
              <datalist id="owners">
                {owners.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
              <div className="add-form-actions">
                <button type="button" className="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </button>
                <button type="submit">Create unit</button>
              </div>
            </form>
          )}

          {!adding && !current && (
            <div className="empty-detail">
              <p>Select a unit on the left, or create one to start tracking.</p>
            </div>
          )}

          {!adding && current && (
            <>
              <div className="detail-header">
                <div>
                  <h2>{current.unit}</h2>
                  <p className="meta">
                    {current.applicant || 'No applicant yet'} · Agent: {current.owner || '—'}
                  </p>
                </div>
                <div className="detail-header-stats">
                  <div className="stat">
                    <span className="stat-value">{percent(current)}%</span>
                    <span className="stat-label">complete</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{doneCount(current)}/{STEPS.length}</span>
                    <span className="stat-label">steps done</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{daysSince(lastActivity(current))}d</span>
                    <span className="stat-label">since activity</span>
                  </div>
                  <button type="button" className="danger" onClick={() => remove(current)}>
                    Remove
                  </button>
                </div>
              </div>

              <div className="phase-bar">
                {PHASES.map((p) => {
                  const total = stepsInPhase(p.id).length
                  const done = phaseDoneCount(current, p.id)
                  return (
                    <div
                      key={p.id}
                      className="phase-seg"
                      style={{ flexGrow: total, '--phase-color': p.color }}
                      title={`${p.label}: ${done}/${total} done`}
                    >
                      <span style={{ width: `${(done / total) * 100}%` }} />
                    </div>
                  )
                })}
              </div>
              <div className="phase-legend">
                {PHASES.map((p) => (
                  <span key={p.id} className="phase-chip" style={{ '--phase-color': p.color }}>
                    <span className="phase-dot" /> {p.label}
                    <span className="phase-count">{phaseDoneCount(current, p.id)}/{stepsInPhase(p.id).length}</span>
                  </span>
                ))}
              </div>

              {PHASES.map((phase) => (
                <section key={phase.id} className="phase-group">
                  <h3 className="phase-heading" style={{ '--phase-color': phase.color }}>
                    <span className="phase-dot" /> {phase.label}
                    <span className="phase-count">
                      {phaseDoneCount(current, phase.id)}/{stepsInPhase(phase.id).length}
                    </span>
                  </h3>
                  <ol className="tasks">
                    {stepsInPhase(phase.id).map((s) => {
                      const done = current.steps[s.id]
                      const isCurrent = !done && currentStep(current)?.id === s.id
                      const i = STEPS.indexOf(s)
                      return (
                        <li
                          key={s.id}
                          className={`task ${done ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                          style={{ '--phase-color': phase.color }}
                        >
                          <button
                            type="button"
                            className="task-check"
                            onClick={() => tick(current.id, s.id)}
                            aria-label={done ? `Mark "${s.label}" not done` : `Mark "${s.label}" done`}
                          >
                            {done ? '✓' : i + 1}
                          </button>
                          <div className="task-body">
                            <span className="task-title">{s.label}</span>
                            <span className="task-hint">{s.hint}</span>
                            <div className="task-files">
                              {filesFor(current, s.id).map((f) => (
                                <span key={f.id} className="file-chip">
                                  <button
                                    type="button"
                                    className="file-name"
                                    onClick={() => download(f)}
                                    title={`${f.name} · ${fmtSize(f.size)} · ${f.by} · ${f.at.slice(0, 10)}`}
                                  >
                                    <IconPaperclip /> {f.name}
                                  </button>
                                  <button
                                    type="button"
                                    className="file-remove"
                                    onClick={() => removeAttachment(current.id, s.id, f.id)}
                                    aria-label={`Remove ${f.name}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                              <label className="file-add">
                                + Attach document
                                <input
                                  type="file"
                                  multiple
                                  onChange={(e) => {
                                    upload(current.id, s.id, e.target.files)
                                    e.target.value = ''
                                  }}
                                />
                              </label>
                            </div>
                            {s.notes && (
                              <div className="task-notes">
                                {notesFor(current, s.id).map((n) => (
                                  <div key={n.id} className="note">
                                    <span className="note-text">{n.text}</span>
                                    <span className="note-meta">
                                      {n.by} · {n.at.slice(0, 10)}
                                      <button
                                        type="button"
                                        className="note-remove"
                                        onClick={() => deleteNote(current.id, s.id, n.id)}
                                        aria-label="Remove update"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  </div>
                                ))}
                                <form
                                  className="note-form"
                                  onSubmit={(e) => {
                                    e.preventDefault()
                                    const input = e.target.elements.note
                                    const text = input.value.trim()
                                    if (!text) return
                                    postNote(current.id, s.id, text)
                                    e.target.reset()
                                  }}
                                >
                                  <input name="note" placeholder="Add a progress update — e.g. listed on Property24, 3 enquiries…" />
                                  <button type="submit" className="ghost">Add</button>
                                </form>
                              </div>
                            )}
                          </div>
                          <div className="task-status">
                            {done ? (
                              <>
                                <span className="badge done">Done</span>
                                <span className="task-by">{done.by} · {done.at.slice(0, 10)}</span>
                              </>
                            ) : isCurrent ? (
                              <span className="badge current">Up next</span>
                            ) : (
                              <span className="badge pending">Pending</span>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </section>
              ))}
            </>
          )}
        </main>
      </div>
    </>
  )
}

export default App
