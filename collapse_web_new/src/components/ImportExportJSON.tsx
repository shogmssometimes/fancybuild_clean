import React, { useRef } from 'react'

function downloadJSON(filename: string, data: any) {
  const text = JSON.stringify(data, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

function pad(n: number) {
  return n < 10 ? '0' + n : String(n)
}

function formatMMDDYY(d: Date) {
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const yy = String(d.getFullYear()).slice(-2)
  return `${mm}${dd}${yy}`
}

function formatHHMMSS(d: Date) {
  return `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

const STORAGE_PREFIX = 'collapse.'

const isCollapseKey = (key: string) => key.startsWith(STORAGE_PREFIX)

const snapshotCollapseData = () => {
  const data: Record<string, any> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !isCollapseKey(key)) continue
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      data[key] = JSON.parse(raw)
    } catch {
      data[key] = raw
    }
  }
  return data
}

const removeCollapseData = () => {
  const doomed: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && isCollapseKey(key)) doomed.push(key)
  }
  doomed.forEach((key) => localStorage.removeItem(key))
}

const persistCollapseEntries = (entries: [string, any][]) => {
  entries.forEach(([k, v]) => {
    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch (e) {
      localStorage.setItem(k, String(v))
    }
  })
}

const filterCollapseEntries = (payload: Record<string, any>) =>
  Object.entries(payload).filter(([key]) => isCollapseKey(key))

export default function ImportExportJSON({ filenamePrefix = 'collapse-data' }: { filenamePrefix?: string }) {
  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleExportAll = () => {
    try {
      const data = snapshotCollapseData()
      if (Object.keys(data).length === 0) {
        window.alert(`No Collapse data found to export (looking for keys starting with "${STORAGE_PREFIX}").`)
        return
      }

      const now = new Date()
      const mmddyy = formatMMDDYY(now)
      const hhmmss = formatHHMMSS(now)
      const filename = `${filenamePrefix}-${mmddyy}-${hhmmss}.json`
      const payload = {
        meta: { app: 'cvttweb', exportedAt: mmddyy, exportedAtISO: now.toISOString() },
        data,
      }
      downloadJSON(filename, payload)
    } catch (err) {
      window.alert('Export failed: ' + String(err))
    }
  }

  const handleImportClick = () => {
    fileRef.current?.click()
  }

  const handleFile = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!parsed || typeof parsed !== 'object') throw new Error('Imported file is not a JSON object')

        // Expect the export shape { meta?, data } or a plain key->value map
        const importedData: Record<string, any> = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed
        const collapseEntries = filterCollapseEntries(importedData)
        if (collapseEntries.length === 0) {
          throw new Error(`Import file does not contain Collapse data (expected keys starting with "${STORAGE_PREFIX}").`)
        }

        // Create a backup of current localStorage (download immediately)
        const backup = snapshotCollapseData()

        const now = new Date()
        const mmddyy = formatMMDDYY(now)
        const hhmmss = formatHHMMSS(now)
        const backupFilename = `${filenamePrefix}-backup-${mmddyy}-${hhmmss}.json`
        downloadJSON(backupFilename, { meta: { createdAt: mmddyy, createdAtISO: now.toISOString() }, data: backup })

        // Confirm destructive import
        const confirmMsg = `This import will replace Collapse data stored in this browser (keys starting with "${STORAGE_PREFIX}"). A backup file has been downloaded to your device. Proceed?`
        if (!window.confirm(confirmMsg)) {
          window.alert('Import cancelled. No changes were made.')
          return
        }

        // Remove existing Collapse namespace entries only, then write new ones
        removeCollapseData()
        persistCollapseEntries(collapseEntries)

        window.alert('Import complete. The page will reload to apply imported data.')
        window.location.reload()
      } catch (err: any) {
        window.alert('Import failed: ' + (err?.message ?? String(err)))
      }
    }
    reader.onerror = () => window.alert('Failed to read file')
    reader.readAsText(file)
  }

  return (
    <div className="ops-toolbar">
      <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
      <button onClick={handleExportAll} title="Export Collapse browser data (keys prefixed collapse.)">Export JSON</button>
      <button onClick={handleImportClick} title="Import Collapse browser data (existing Collapse keys will be replaced)">Import (Replace All)</button>
    </div>
  )
}
