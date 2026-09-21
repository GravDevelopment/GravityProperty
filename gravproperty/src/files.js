// Blob storage for uploaded documents. IndexedDB, not localStorage — a
// handful of ID/bank-statement PDFs will blow past localStorage's ~5-10MB
// quota fast. Only the raw bytes live here; filename/size/who/when metadata
// travels with the unit in pipeline.js's normal localStorage save.

const DB_NAME = 'gravproperty'
const STORE = 'files'

let dbPromise
const getDB = () => {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

const run = async (mode, fn) => {
  const db = await getDB()
  const store = db.transaction(STORE, mode).objectStore(STORE)
  return new Promise((resolve, reject) => {
    const req = fn(store)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const saveBlob = (id, blob) => run('readwrite', (s) => s.put(blob, id))
export const getBlob = (id) => run('readonly', (s) => s.get(id))
export const deleteBlob = (id) => run('readwrite', (s) => s.delete(id))
