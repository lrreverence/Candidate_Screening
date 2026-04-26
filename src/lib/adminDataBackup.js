import JSZip from 'jszip'
import { supabase } from './supabase'

function isoDateStamp(date = new Date()) {
  // ex: 2026-04-26T15:52:10Z -> 2026-04-26T15-52-10Z (filename-safe)
  return date.toISOString().replaceAll(':', '-')
}

async function fetchAllRows({ table, pageSize = 1000 }) {
  const rows = []
  let from = 0

  // Supabase PostgREST supports `range(from, to)` pagination.
  // Loop until we get fewer than pageSize rows.
  // Note: If RLS blocks access, this will throw and surface to the UI.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase.from(table).select('*').range(from, to)
    if (error) throw error

    const batch = Array.isArray(data) ? data : []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  return rows
}

function downloadBlob({ blob, filename }) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function createAdminDataBackupZip() {
  const createdAt = new Date()

  // Core + resume satellite tables used by this app.
  // Keep this explicit (instead of introspecting) so it’s deterministic and safe.
  const tables = [
    'jobs',
    'users',
    'applicants',
    'applications',
    'documents',
    'applicant_licenses',
    'applicant_trainings',
    'employment_records',
    'applicant_clearances',
    'applicant_others'
  ]

  const zip = new JSZip()
  const manifest = {
    version: 1,
    created_at: createdAt.toISOString(),
    tables: {}
  }

  for (const table of tables) {
    const rows = await fetchAllRows({ table })
    manifest.tables[table] = { row_count: rows.length }
    zip.file(`${table}.json`, JSON.stringify(rows, null, 2))
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = `e-power-security-backup_${isoDateStamp(createdAt)}.zip`
  downloadBlob({ blob, filename })

  return manifest
}

