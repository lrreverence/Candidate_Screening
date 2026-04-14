import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import ApplicationHeader from '../components/application/ApplicationHeader'
import ApplicationFooter from '../components/application/ApplicationFooter'

const SECTION_DEFS = [
  { key: 'personal', label: 'Personal Information', icon: 'person', cta: { label: 'Edit', to: '/profile/personalinformation' } },
  { key: 'education', label: 'Educational Attainment', icon: 'school', cta: null },
  { key: 'employment', label: 'Employment Record', icon: 'work', cta: null },
  { key: 'licenses', label: 'Licenses', icon: 'verified', cta: null },
  { key: 'training', label: 'Training / Certificates', icon: 'workspace_premium', cta: null },
  { key: 'clearances', label: 'Clearances', icon: 'gavel', cta: null },
  { key: 'others', label: 'Others', icon: 'more_horiz', cta: null },
]

const formatDisplayName = (a, userProfile) => {
  const first = a?.first_name || userProfile?.first_name || ''
  const middle = a?.middle_name || ''
  const last = a?.last_name || userProfile?.last_name || ''
  const ext = a?.name_extension || userProfile?.name_extension || ''
  return [first, middle, last].filter(Boolean).join(' ') + (ext ? ` ${ext}` : '')
}

const formatLocation = (a) => {
  const parts = [a?.city, a?.province].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}

const formatMobile = (value) => {
  const v = String(value || '').trim()
  return v || '—'
}

const formatDate = (value) => {
  if (!value) return '—'
  // Accepts YYYY-MM-DD or ISO strings
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

const formatHeight = (value) => {
  if (value == null || value === '') return '—'
  const n = Number(value)
  return Number.isFinite(n) ? `${n} cm` : String(value)
}

const formatWeight = (value) => {
  if (value == null || value === '') return '—'
  const n = Number(value)
  return Number.isFinite(n) ? `${n} kg` : String(value)
}

const formatList = (value) => {
  if (!Array.isArray(value) || value.length === 0) return '—'
  return value.map((v) => String(v)).filter(Boolean).join(', ') || '—'
}

const pickPersonalValue = (applicant, profile, key) => {
  const a = applicant && typeof applicant === 'object' ? applicant[key] : undefined
  if (a !== undefined && a !== null && a !== '') return a
  const p = profile && typeof profile === 'object' ? profile[key] : undefined
  return p
}

/** PostgREST / Postgres when table missing or not in schema cache yet */
const isSupabaseMissingTableError = (err) => {
  const code = String(err?.code || '')
  if (code === '42P01' || code === 'PGRST205') return true
  const m = String(err?.message || '').toLowerCase()
  if (m.includes('relation') && m.includes('does not exist')) return true
  if (m.includes('could not find the table') && m.includes('schema cache')) return true
  return false
}

/** User-facing hint when migrations were not applied to the linked Supabase project */
const notifyLocalOnlyDbNotReady = (sectionLabel, err) => {
  console.warn(`[RESUME_PROFILE] ${sectionLabel}: Supabase reported missing or unpublished tables.`, err)
  window.alert(
    `${sectionLabel}: the database tables for this section are not available on your Supabase project (or PostgREST cannot see them yet). ` +
      `Your changes were kept in this browser only.\n\n` +
      `Fix: in the Supabase dashboard for this project, open the SQL editor and run the migration files from this repo under supabase/migrations ` +
      `(for licenses and trainings, use the migration that creates applicant_licenses and applicant_trainings). Then save again.`
  )
}

const EDUCATION_LEVELS = [
  { key: 'elementary', label: 'Elementary School' },
  { key: 'high_school', label: 'High School' },
  { key: 'vocational', label: 'Vocational' },
  { key: 'college', label: 'College' },
]

const makeEmptyEducationRow = () => ({
  school: '',
  course: '',
  year_graduated: '',
  attachment: null, // { file_name, file_path, mime_type, file_size }
})

const normalizeEducationState = (value) => {
  const base = {}
  for (const lvl of EDUCATION_LEVELS) {
    base[lvl.key] = [makeEmptyEducationRow()]
  }
  if (!value || typeof value !== 'object') return base

  for (const lvl of EDUCATION_LEVELS) {
    const v = value[lvl.key]
    if (Array.isArray(v) && v.length > 0) {
      base[lvl.key] = v.map((row) => ({
        school: row?.school || '',
        course: row?.course || '',
        year_graduated: row?.year_graduated || '',
        attachment: row?.attachment && typeof row.attachment === 'object' ? row.attachment : null,
      }))
    }
  }
  return base
}

const makeEmptyTrainingRow = () => ({
  training_attended: '',
  date: '',
})

/** Fixed license rows (same shape as clearances: dates + attachment). */
const LICENSE_TYPES = [
  { key: 'drivers_license', label: 'Drivers License' },
  { key: 'security_guard_license', label: 'Security Guard License' },
  { key: 'security_officers_license', label: 'Security Officers License' },
  { key: 'security_managers_license', label: 'Security Managers License' },
  { key: 'bank_and_armor_license', label: 'Bank And Armor License' },
  { key: 'protection_agent', label: 'Protection Agent' },
]

const makeEmptyLicenseSlotRow = () => ({
  license_number: '',
  date_issued: '',
  date_expiry: '',
  attachment: null, // { file_name, file_path, mime_type, file_size }
})

const categoryStringToLicenseKey = (raw) => {
  const id = String(raw || '').trim()
  if (!id) return null
  if (LICENSE_TYPES.some((t) => t.key === id)) return id
  const s = id.toLowerCase().replace(/\s+/g, ' ').replace(/’/g, "'")

  for (const t of LICENSE_TYPES) {
    if (s === t.label.toLowerCase()) return t.key
  }

  const aliases = [
    { key: 'drivers_license', patterns: ["driver's license", 'driver license'] },
    { key: 'security_guard_license', patterns: ['security guard license', 'security guard'] },
    { key: 'security_officers_license', patterns: ['security officers license', 'security officer license'] },
    { key: 'security_managers_license', patterns: ['security managers license', 'security manager license'] },
    { key: 'bank_and_armor_license', patterns: ['bank and armor license', 'bank & armor license'] },
    { key: 'protection_agent', patterns: ['protection agent'] },
  ]
  for (const { key, patterns } of aliases) {
    for (const p of patterns) {
      if (s === p || s.includes(p)) return key
    }
  }

  // Legacy checklist IDs sometimes stored as category
  if (s === 'drivers_license' || (s.includes('driver') && s.includes('license'))) return 'drivers_license'
  if (s.includes('security guard') && s.includes('license')) return 'security_guard_license'

  return null
}

const normalizeLicensesMapFromInput = (licensesInput) => {
  const base = {}
  for (const t of LICENSE_TYPES) base[t.key] = makeEmptyLicenseSlotRow()

  if (licensesInput == null) return base

  if (typeof licensesInput === 'object' && !Array.isArray(licensesInput)) {
    for (const t of LICENSE_TYPES) {
      const v = licensesInput[t.key]
      if (v && typeof v === 'object') {
        base[t.key] = {
          license_number: v?.license_number || '',
          date_issued: v?.date_issued || '',
          date_expiry: v?.date_expiry || '',
          attachment: v?.attachment && typeof v.attachment === 'object' ? v.attachment : null,
        }
      }
    }
    return base
  }

  if (!Array.isArray(licensesInput)) return base

  const scoreSlot = (row) =>
    (row?.attachment ? 4 : 0) +
    (String(row?.date_expiry || '').trim() ? 2 : 0) +
    (String(row?.date_issued || '').trim() ? 1 : 0) +
    (String(row?.license_number || '').trim() ? 0.5 : 0)

  for (const row of licensesInput) {
    const key = categoryStringToLicenseKey(row?.category)
    if (!key || !base[key]) continue
    const slot = {
      license_number: row?.license_number || '',
      date_issued: row?.date_issued || '',
      date_expiry: row?.date_expiry || '',
      attachment: row?.attachment && typeof row.attachment === 'object' ? row.attachment : null,
    }
    if (scoreSlot(slot) > scoreSlot(base[key])) base[key] = slot
  }

  return base
}

const normalizeCredentialsState = (value) => {
  const base = {
    licenses: normalizeLicensesMapFromInput(null),
    trainings: [makeEmptyTrainingRow()],
  }
  if (!value || typeof value !== 'object') return base

  const normalizeTrainingList = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return [makeEmptyTrainingRow()]
    return arr.map((row) => ({
      training_attended: row?.training_attended || row?.training || '',
      date: row?.date || '',
    }))
  }

  return {
    licenses: normalizeLicensesMapFromInput(value.licenses),
    trainings: normalizeTrainingList(value.trainings),
  }
}

const CLEARANCE_TYPES = [
  { key: 'nbi', label: 'NBI' },
  { key: 'police', label: 'Police Clearance' },
  { key: 'brgy', label: 'Brgy Clearance' },
  { key: 'court', label: 'Court Clearance' },
]

const makeEmptyClearanceRow = () => ({
  date_issued: '',
  date_expiry: '',
  attachment: null, // { file_name, file_path, mime_type, file_size, doc_id }
})

const normalizeClearancesState = (value) => {
  const base = {}
  for (const t of CLEARANCE_TYPES) base[t.key] = makeEmptyClearanceRow()
  if (!value || typeof value !== 'object') return base

  for (const t of CLEARANCE_TYPES) {
    const v = value?.[t.key]
    if (v && typeof v === 'object') {
      base[t.key] = {
        date_issued: v?.date_issued || '',
        date_expiry: v?.date_expiry || '',
        attachment: v?.attachment && typeof v.attachment === 'object' ? v.attachment : null,
      }
    }
  }
  return base
}

const makeEmptyEmploymentRow = () => ({
  position: '',
  agency: '',
  place: '',
  from: '',
  to: '',
})

const normalizeEmploymentState = (value) => {
  const base = {
    job_related: [makeEmptyEmploymentRow()],
    non_related: [makeEmptyEmploymentRow()],
  }
  if (!value || typeof value !== 'object') return base
  const jr = value?.job_related
  const nr = value?.non_related
  if (Array.isArray(jr) && jr.length) {
    base.job_related = jr.map((r) => ({
      position: r?.position || '',
      agency: r?.agency || '',
      place: r?.place || '',
      from: r?.from || '',
      to: r?.to || '',
    }))
  }
  if (Array.isArray(nr) && nr.length) {
    base.non_related = nr.map((r) => ({
      position: r?.position || '',
      agency: r?.agency || '',
      place: r?.place || '',
      from: r?.from || '',
      to: r?.to || '',
    }))
  }
  return base
}

const SKILL_OPTIONS = [
  'Basic Life Support (BLS)',
  'CCTV Operation',
  'Radio Operation',
  'Safety Officer',
  'Drive',
]

const PLACE_OPTIONS = [
  'Quezon City',
  'Makati',
  'Mandaluyong',
  'Pasay',
  'Parañaque',
  'San Juan City',
  'Cavite, Cavite',
  'Marikina City',
  'Pasig City',
]

const SALARY_OPTIONS = ['10,000-15,000', '15,000-20,000', '20,000-25,000', '25,000-30,000', '30,000-35,000', '35,000-40,000']

const EMPLOYMENT_TYPE_OPTIONS = [
  { id: 'full_time', label: 'Full time' },
  { id: 'part_time', label: 'Part-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'temporary', label: 'Temporary' },
]

const makeEmptyOthersState = () => ({
  skills: [],
  preferred_places: [],
  preferred_monthly_salary: [],
  can_start: {
    asap: true,
    date: '',
  },
  employment_types: [],
})

const normalizeOthersState = (value) => {
  const base = makeEmptyOthersState()
  if (!value || typeof value !== 'object') return base
  const skills = Array.isArray(value.skills) ? value.skills.map(String).filter(Boolean) : []
  const preferred_places = Array.isArray(value.preferred_places) ? value.preferred_places.map(String).filter(Boolean) : []
  const preferred_monthly_salary = Array.isArray(value.preferred_monthly_salary)
    ? value.preferred_monthly_salary.map(String).filter(Boolean)
    : []

  // Supports both old shape (can_start: {asap,date}) and new table columns (can_start_asap/can_start_date)
  const asap =
    typeof value?.can_start?.asap === 'boolean'
      ? value.can_start.asap
      : typeof value?.can_start_asap === 'boolean'
        ? value.can_start_asap
        : true
  const date =
    typeof value?.can_start?.date === 'string'
      ? value.can_start.date
      : typeof value?.can_start_date === 'string'
        ? value.can_start_date
        : ''

  const employment_types = Array.isArray(value.employment_types) ? value.employment_types.map(String).filter(Boolean) : []
  return {
    ...base,
    skills,
    preferred_places,
    preferred_monthly_salary,
    can_start: { asap, date },
    employment_types,
  }
}

const parseYmd = (value) => {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

const toDateOnly = (value) => {
  if (!value) return null
  const s = String(value).trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const diffDays = (from, to) => {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

const diffMonthsInclusive = (from, to) => {
  const a = parseYmd(from)
  const b = parseYmd(to)
  if (!a || !b) return 0
  // normalize to first day of month to avoid day-of-month pitfalls
  const start = new Date(a.getFullYear(), a.getMonth(), 1)
  const end = new Date(b.getFullYear(), b.getMonth(), 1)
  const raw = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
  return Math.max(0, raw)
}

const formatMonthsAsYearsMonths = (months) => {
  const m = Math.max(0, Number(months) || 0)
  if (!m) return '—'
  const yrs = Math.floor(m / 12)
  const rem = m % 12
  const parts = []
  if (yrs) parts.push(`${yrs} ${yrs === 1 ? 'yr' : 'yrs'}`)
  if (rem) parts.push(`${rem} ${rem === 1 ? 'month' : 'months'}`)
  return parts.join(' ')
}

const ResumeProfile = () => {
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const routeParams = useParams()
  const { user, userProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [applicant, setApplicant] = useState(null)
  const [profile, setProfile] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [expandedKey, setExpandedKey] = useState(null)

  const [education, setEducation] = useState(() => normalizeEducationState(null))
  const [educationBusy, setEducationBusy] = useState(false)

  const [credentials, setCredentials] = useState(() => normalizeCredentialsState(null))
  const [credentialsBusy, setCredentialsBusy] = useState(false)
  const [licenseUploadingKey, setLicenseUploadingKey] = useState(null)

  const credentialsStorageKey = useMemo(
    () => (user?.id ? `resume_credentials_${user.id}` : 'resume_credentials'),
    [user?.id]
  )

  const [employment, setEmployment] = useState(() => normalizeEmploymentState(null))
  const [employmentBusy, setEmploymentBusy] = useState(false)

  const [clearances, setClearances] = useState(() => normalizeClearancesState(null))
  const [clearancesBusy, setClearancesBusy] = useState(false)
  const [clearanceUploadingKey, setClearanceUploadingKey] = useState(null)
  const clearancesStorageKey = useMemo(() => (user?.id ? `resume_clearances_${user.id}` : 'resume_clearances'), [user?.id])

  const [others, setOthers] = useState(() => normalizeOthersState(null))
  const [othersBusy, setOthersBusy] = useState(false)
  const othersStorageKey = useMemo(() => (user?.id ? `resume_others_${user.id}` : 'resume_others'), [user?.id])
  const [othersCustomDraft, setOthersCustomDraft] = useState({
    skills: '',
    preferred_places: '',
    preferred_monthly_salary: '',
  })

  const isApplyReviewRoute = routerLocation.pathname.startsWith('/profile/apply')
  const applyJobId = isApplyReviewRoute ? (routeParams.jobId ?? null) : null
  const [applyJobTitle, setApplyJobTitle] = useState('')
  const [continueBusy, setContinueBusy] = useState(false)

  useEffect(() => {
    if (!applyJobId) {
      setApplyJobTitle('')
      return
    }
    let cancelled = false
    supabase
      .from('jobs')
      .select('title')
      .eq('id', applyJobId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data?.title) setApplyJobTitle(data.title)
        else setApplyJobTitle('')
      })
    return () => {
      cancelled = true
    }
  }, [applyJobId])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!user?.id) return
      setLoading(true)

      try {
        const [{ data: u, error: uErr }, { data: a, error: aErr }] = await Promise.all([
          supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('applicants')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
        ])

        if (cancelled) return
        if (uErr) throw uErr
        if (aErr) throw aErr
        setProfile(u || null)
        setApplicant(a || null)

        if (!a?.id) {
          setPhotoUrl(null)
          return
        }

        const { data: docs, error: docError } = await supabase
          .from('documents')
          .select('file_path,file_type,created_at')
          .eq('applicant_id', a.id)
          .order('created_at', { ascending: false })

        if (cancelled) return
        if (docError) throw docError

        const photoDoc = (docs || []).find((d) => d.file_type === '2x2_ID_PICTURE' || d.file_type === 'IDPhoto')
        if (!photoDoc?.file_path) {
          setPhotoUrl(null)
          return
        }

        const bucket = photoDoc.file_type === '2x2_ID_PICTURE' ? 'id-pictures' : 'resumes'
        const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(photoDoc.file_path, 3600)
        if (cancelled) return
        setPhotoUrl(signed?.signedUrl || null)
      } catch (e) {
        if (!cancelled) {
          console.error('[RESUME_PROFILE] Load error:', e)
          setApplicant(null)
          setProfile(null)
          setPhotoUrl(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    const loadEducation = async () => {
      if (!applicant?.id) return
      try {
        const { data, error } = await supabase
          .from('educational_attainments')
          .select('*')
          .eq('applicant_id', applicant.id)
          .order('level', { ascending: true })
          .order('sort_order', { ascending: true })

        if (error) throw error

        const next = normalizeEducationState(null)
        for (const row of data || []) {
          const level = row.level
          if (!next[level]) continue
          if (!Array.isArray(next[level])) next[level] = []
          next[level].push({
            school: row.school || '',
            course: row.course || '',
            year_graduated: row.year_graduated || '',
            attachment: row.attachment_path
              ? {
                  file_name: row.attachment_name || '',
                  file_path: row.attachment_path,
                  mime_type: row.attachment_mime || '',
                  file_size: row.attachment_size || null,
                }
              : null,
          })
        }

        // Remove the default empty row if we actually have saved rows
        for (const lvl of EDUCATION_LEVELS) {
          const rows = next[lvl.key]
          if (Array.isArray(rows) && rows.length > 1 && rows[0]?.school === '' && rows[0]?.course === '' && rows[0]?.year_graduated === '' && !rows[0]?.attachment) {
            next[lvl.key] = rows.slice(1)
          }
          if (!Array.isArray(next[lvl.key]) || next[lvl.key].length === 0) next[lvl.key] = [makeEmptyEducationRow()]
        }

        setEducation(next)
      } catch (err) {
        console.error('[RESUME_PROFILE] load education error:', err)
      }
    }

    loadEducation()
  }, [applicant?.id])

  useEffect(() => {
    const fromDb = applicant?.licenses_training_certificates || applicant?.credentials || null
    if (fromDb) {
      setCredentials(normalizeCredentialsState(fromDb))
      return
    }
    try {
      const raw = localStorage.getItem(credentialsStorageKey)
      if (raw) setCredentials(normalizeCredentialsState(JSON.parse(raw)))
    } catch {
      // ignore
    }
  }, [applicant?.id, credentialsStorageKey])

  useEffect(() => {
    let cancelled = false

    const loadFromTables = async () => {
      if (!applicant?.id) return
      try {
        const [{ data: licRows, error: licErr }, { data: trRows, error: trErr }] = await Promise.all([
          supabase
            .from('applicant_licenses')
            .select('category,license_number,date_issued,date_expiry,attachment,created_at')
            .eq('applicant_id', applicant.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('applicant_trainings')
            .select('training_attended,date,created_at')
            .eq('applicant_id', applicant.id)
            .order('created_at', { ascending: true }),
        ])

        if (cancelled) return
        if (licErr) throw licErr
        if (trErr) throw trErr

        const licMap = normalizeLicensesMapFromInput(null)
        for (const r of licRows || []) {
          const key = categoryStringToLicenseKey(r?.category)
          if (!key) continue
          const slot = {
            license_number: r?.license_number || '',
            date_issued: r?.date_issued || '',
            date_expiry: r?.date_expiry || '',
            attachment: r?.attachment && typeof r.attachment === 'object' ? r.attachment : null,
          }
          const scoreSlot = (row) =>
            (row?.attachment ? 4 : 0) +
            (String(row?.date_expiry || '').trim() ? 2 : 0) +
            (String(row?.date_issued || '').trim() ? 1 : 0) +
            (String(row?.license_number || '').trim() ? 0.5 : 0)
          if (scoreSlot(slot) > scoreSlot(licMap[key])) licMap[key] = slot
        }

        const next = normalizeCredentialsState({
          licenses: licMap,
          trainings: (trRows || []).map((r) => ({
            training_attended: r?.training_attended || '',
            date: r?.date || '',
          })),
        })
        setCredentials(next)
      } catch (e) {
        // If the tables don't exist yet (migration not applied), keep existing fallback behavior.
        console.warn('[RESUME_PROFILE] credentials table load failed (using fallback):', e)
      }
    }

    loadFromTables()
    return () => {
      cancelled = true
    }
  }, [applicant?.id])

  useEffect(() => {
    const loadEmployment = async () => {
      if (!applicant?.id) return
      try {
        const { data, error } = await supabase
          .from('employment_records')
          .select('id,category,position,agency,place,from_date,to_date')
          .eq('applicant_id', applicant.id)
          .order('from_date', { ascending: false })

        if (error) throw error

        const next = normalizeEmploymentState(null)
        for (const row of data || []) {
          const bucket = row.category === 'non_related' ? 'non_related' : 'job_related'
          if (!Array.isArray(next[bucket])) next[bucket] = []
          next[bucket].push({
            position: row.position || '',
            agency: row.agency || '',
            place: row.place || '',
            from: row.from_date || '',
            to: row.to_date || '',
          })
        }

        // Remove default empty rows if we actually have saved rows
        for (const k of ['job_related', 'non_related']) {
          const rows = next[k]
          if (Array.isArray(rows) && rows.length > 1) {
            const first = rows[0]
            if (first?.position === '' && first?.agency === '' && first?.place === '' && first?.from === '' && first?.to === '') {
              next[k] = rows.slice(1)
            }
          }
          if (!Array.isArray(next[k]) || next[k].length === 0) next[k] = [makeEmptyEmploymentRow()]
        }

        setEmployment(next)
      } catch (err) {
        console.error('[RESUME_PROFILE] load employment error:', err)
      }
    }

    loadEmployment()
  }, [applicant?.id])

  useEffect(() => {
    const loadClearances = async () => {
      if (!applicant?.id) return
      try {
        const { data, error } = await supabase
          .from('applicant_clearances')
          .select('clearance_type,date_issued,date_expiry,attachment_path,attachment_name,attachment_mime,attachment_size,document_id')
          .eq('applicant_id', applicant.id)

        if (error) throw error

        const base = normalizeClearancesState(null)
        for (const row of data || []) {
          const key = String(row?.clearance_type || '').toLowerCase()
          if (!base[key]) continue
          base[key] = {
            date_issued: row?.date_issued || '',
            date_expiry: row?.date_expiry || '',
            attachment: row?.attachment_path
              ? {
                  file_name: row?.attachment_name || '',
                  file_path: row?.attachment_path,
                  mime_type: row?.attachment_mime || '',
                  file_size: row?.attachment_size || null,
                  doc_id: row?.document_id || null,
                }
              : null,
          }
        }
        setClearances(base)
      } catch (err) {
        const missingTable = isSupabaseMissingTableError(err)
        if (!missingTable) console.error('[RESUME_PROFILE] load clearances error:', err)

        // Fallbacks
        const fromDb = applicant?.clearances || applicant?.clearance || null
        if (fromDb) {
          setClearances(normalizeClearancesState(fromDb))
          return
        }
        try {
          const raw = localStorage.getItem(clearancesStorageKey)
          if (raw) setClearances(normalizeClearancesState(JSON.parse(raw)))
        } catch {
          // ignore
        }
      }
    }

    loadClearances()
  }, [applicant?.id, clearancesStorageKey])

  useEffect(() => {
    let cancelled = false
    const loadOthers = async () => {
      if (!applicant?.id) return
      try {
        const { data, error } = await supabase
          .from('applicant_others')
          .select('skills,preferred_places,preferred_monthly_salary,can_start_asap,can_start_date,employment_types')
          .eq('applicant_id', applicant.id)
          .maybeSingle()
        if (cancelled) return
        if (error) throw error
        if (data) {
          setOthers(normalizeOthersState(data))
          return
        }
      } catch (e) {
        if (!cancelled) console.warn('[RESUME_PROFILE] load others from DB failed, using local fallback:', e)
      }

      if (cancelled) return
      // Local fallback (only if DB read fails / no row yet)
      try {
        const raw = localStorage.getItem(othersStorageKey)
        if (raw) setOthers(normalizeOthersState(JSON.parse(raw)))
      } catch {
        // ignore
      }
    }

    loadOthers()
    return () => {
      cancelled = true
    }
  }, [applicant?.id, othersStorageKey])

  const displayName = useMemo(() => formatDisplayName(profile, userProfile), [profile, userProfile])
  const location = useMemo(() => formatLocation(profile), [profile])
  const email = profile?.email || user?.email || '—'
  const phone = formatMobile(profile?.phone)

  const setEducationField = (levelKey, index, field, value) => {
    setEducation((prev) => {
      const next = { ...prev }
      const rows = Array.isArray(next[levelKey]) ? [...next[levelKey]] : [makeEmptyEducationRow()]
      const current = rows[index] || makeEmptyEducationRow()
      rows[index] = { ...current, [field]: value }
      next[levelKey] = rows
      return next
    })
  }

  const addEducationRow = (levelKey) => {
    setEducation((prev) => {
      const next = { ...prev }
      const rows = Array.isArray(next[levelKey]) ? [...next[levelKey]] : []
      next[levelKey] = [...rows, makeEmptyEducationRow()]
      return next
    })
  }

  const deleteEducationRow = (levelKey, index) => {
    setEducation((prev) => {
      const next = { ...prev }
      const rows = Array.isArray(next[levelKey]) ? [...next[levelKey]] : []
      const filtered = rows.filter((_, i) => i !== index)
      next[levelKey] = filtered.length ? filtered : [makeEmptyEducationRow()]
      return next
    })
  }

  const saveEducation = async () => {
    if (!user?.id || !applicant?.id) return
    setEducationBusy(true)
    try {
      // Replace-all strategy (small table): delete then insert
      const { error: delError } = await supabase
        .from('educational_attainments')
        .delete()
        .eq('applicant_id', applicant.id)
      if (delError) throw delError

      const rowsToInsert = []
      for (const lvl of EDUCATION_LEVELS) {
        const rows = Array.isArray(education[lvl.key]) ? education[lvl.key] : []
        rows.forEach((r, idx) => {
          const isEmpty = !String(r?.school || '').trim() && !String(r?.course || '').trim() && !String(r?.year_graduated || '').trim() && !r?.attachment
          if (isEmpty) return
          rowsToInsert.push({
            applicant_id: applicant.id,
            level: lvl.key,
            sort_order: idx,
            school: r?.school || '',
            course: r?.course || '',
            year_graduated: r?.year_graduated || '',
            attachment_path: r?.attachment?.file_path || null,
            attachment_name: r?.attachment?.file_name || null,
            attachment_mime: r?.attachment?.mime_type || null,
            attachment_size: r?.attachment?.file_size || null,
          })
        })
      }

      if (rowsToInsert.length > 0) {
        const { error: insError } = await supabase.from('educational_attainments').insert(rowsToInsert)
        if (insError) throw insError
      }

      alert('Educational attainment saved.')
    } catch (err) {
      console.error('[RESUME_PROFILE] save education error:', err)
      alert(`Save failed: ${err?.message || 'Unknown error'}`)
    } finally {
      setEducationBusy(false)
    }
  }

  const setCredentialField = (groupKey, index, field, value) => {
    if (groupKey !== 'trainings') return
    setCredentials((prev) => {
      const next = { ...prev }
      const rows = Array.isArray(next.trainings) ? [...next.trainings] : [makeEmptyTrainingRow()]
      const current = rows[index] || makeEmptyTrainingRow()
      rows[index] = { ...current, [field]: value }
      next.trainings = rows
      return next
    })
  }

  const setLicenseSlotField = (key, field, value) => {
    setCredentials((prev) => ({
      ...prev,
      licenses: {
        ...normalizeLicensesMapFromInput(prev.licenses),
        [key]: { ...(prev.licenses?.[key] || makeEmptyLicenseSlotRow()), [field]: value },
      },
    }))
  }

  const clearLicenseSlot = (key) => {
    setCredentials((prev) => ({
      ...prev,
      licenses: {
        ...normalizeLicensesMapFromInput(prev.licenses),
        [key]: makeEmptyLicenseSlotRow(),
      },
    }))
  }

  const addCredentialRow = (groupKey) => {
    if (groupKey !== 'trainings') return
    setCredentials((prev) => {
      const next = { ...prev }
      const rows = Array.isArray(next.trainings) ? [...next.trainings] : []
      next.trainings = [...rows, makeEmptyTrainingRow()]
      return next
    })
  }

  const deleteCredentialRow = (groupKey, index) => {
    if (groupKey !== 'trainings') return
    setCredentials((prev) => {
      const next = { ...prev }
      const rows = Array.isArray(next.trainings) ? [...next.trainings] : []
      const filtered = rows.filter((_, i) => i !== index)
      next.trainings = filtered.length ? filtered : [makeEmptyTrainingRow()]
      return next
    })
  }

  const uploadLicenseSlotAttachment = async (key, file) => {
    if (!user?.id) {
      alert('You must be logged in to upload files')
      return
    }
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (file.size > maxSize) {
      alert('File size exceeds 5MB. Please upload a smaller file.')
      return
    }
    if (!allowed.includes(file.type)) {
      alert('Allowed files: jpg/jpeg, png, webp, pdf (max 5MB).')
      return
    }

    setLicenseUploadingKey(key)
    try {
      const { data: a, error: aErr } = await supabase
        .from('applicants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (aErr) throw aErr
      if (!a?.id) {
        alert('Please complete Personal Information first.')
        navigate('/profile/personalinformation')
        return
      }

      const prevAtt = credentials?.licenses?.[key]?.attachment
      if (prevAtt?.file_path) {
        await supabase.storage.from('resumes').remove([prevAtt.file_path])
      }
      if (prevAtt?.doc_id) {
        await supabase.from('documents').delete().eq('id', prevAtt.doc_id)
      }

      const ts = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${user.id}/credential_license_${key}_${ts}_${sanitizedName}`

      const { error: uploadErr } = await supabase.storage.from('resumes').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadErr) throw uploadErr

      const fileType = `LICENSE_${String(key).toUpperCase()}`
      const { data: docRow } = await supabase
        .from('documents')
        .insert({
          applicant_id: a.id,
          application_id: null,
          file_path: filePath,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
        })
        .select('id')
        .maybeSingle()

      setLicenseSlotField(key, 'attachment', {
        file_name: file.name,
        file_path: filePath,
        mime_type: file.type,
        file_size: file.size,
        doc_id: docRow?.id || null,
      })
    } catch (err) {
      console.error('[RESUME_PROFILE] license upload error:', err)
      alert(`Upload failed: ${err?.message || 'Unknown error'}`)
    } finally {
      setLicenseUploadingKey(null)
    }
  }

  const removeLicenseSlotAttachment = async (key) => {
    const existing = credentials?.licenses?.[key]?.attachment
    if (!existing) return
    try {
      setLicenseUploadingKey(key)
      if (existing?.file_path) {
        await supabase.storage.from('resumes').remove([existing.file_path])
      }
      if (existing?.doc_id) {
        await supabase.from('documents').delete().eq('id', existing.doc_id)
      }

      // Also remove persisted license row (otherwise application review may still read old expiry dates)
      if (applicant?.id) {
        const label = LICENSE_TYPES.find((t) => t.key === key)?.label || null
        if (label) {
          await supabase
            .from('applicant_licenses')
            .delete()
            .eq('applicant_id', applicant.id)
            .eq('category', label)
        }
      }
    } catch (err) {
      console.error('[RESUME_PROFILE] license remove error:', err)
    } finally {
      // "Remove" should clear the whole slot (dates + validity) not just the file
      clearLicenseSlot(key)
      setLicenseUploadingKey(null)
    }
  }

  const saveCredentials = async () => {
    if (!user?.id || !applicant?.id) return
    setCredentialsBusy(true)
    try {
      const licMap = normalizeLicensesMapFromInput(credentials.licenses)
      const licensesToSave = LICENSE_TYPES.map((t) => {
        const r = licMap[t.key] || makeEmptyLicenseSlotRow()
        const hasAny = r?.license_number || r?.date_issued || r?.date_expiry || r?.attachment
        if (!hasAny) return null
        return {
          category: t.label,
          license_number: String(r?.license_number || '').trim() || null,
          date_issued: r?.date_issued || null,
          date_expiry: r?.date_expiry || null,
          attachment: r?.attachment && typeof r.attachment === 'object' ? r.attachment : null,
        }
      }).filter(Boolean)

      const trainingsToSave = (credentials.trainings || [])
        .map((r) => ({
          training_attended: String(r?.training_attended || '').trim(),
          date: String(r?.date || '').trim() || null,
        }))
        .filter((r) => r.training_attended || r.date)

      // Replace strategy: delete then insert current rows
      const [{ error: delLicErr }, { error: delTrErr }] = await Promise.all([
        supabase.from('applicant_licenses').delete().eq('applicant_id', applicant.id),
        supabase.from('applicant_trainings').delete().eq('applicant_id', applicant.id),
      ])
      if (delLicErr) throw delLicErr
      if (delTrErr) throw delTrErr

      if (licensesToSave.length) {
        const { error: insLicErr } = await supabase.from('applicant_licenses').insert(
          licensesToSave.map((r) => ({
            applicant_id: applicant.id,
            ...r,
          }))
        )
        if (insLicErr) throw insLicErr
      }

      if (trainingsToSave.length) {
        const { error: insTrErr } = await supabase.from('applicant_trainings').insert(
          trainingsToSave.map((r) => ({
            applicant_id: applicant.id,
            ...r,
          }))
        )
        if (insTrErr) throw insTrErr
      }

      alert('Licenses / trainings saved.')
    } catch (err) {
      console.error('[RESUME_PROFILE] save credentials error:', err)
      const missingTable = isSupabaseMissingTableError(err)
      if (missingTable) {
        localStorage.setItem(credentialsStorageKey, JSON.stringify(credentials))
        notifyLocalOnlyDbNotReady('Licenses / trainings', err)
      } else {
        alert(`Save failed: ${err?.message || 'Unknown error'}`)
      }
    } finally {
      setCredentialsBusy(false)
    }
  }

  const setEmploymentField = (bucket, index, field, value) => {
    setEmployment((prev) => {
      const next = { ...prev }
      const rows = Array.isArray(next[bucket]) ? [...next[bucket]] : [makeEmptyEmploymentRow()]
      const current = rows[index] || makeEmptyEmploymentRow()
      rows[index] = { ...current, [field]: value }
      next[bucket] = rows
      return next
    })
  }

  const addEmploymentRow = (bucket) => {
    setEmployment((prev) => {
      const next = { ...prev }
      const rows = Array.isArray(next[bucket]) ? [...next[bucket]] : []
      next[bucket] = [...rows, makeEmptyEmploymentRow()]
      return next
    })
  }

  const deleteEmploymentRow = (bucket, index) => {
    setEmployment((prev) => {
      const next = { ...prev }
      const rows = Array.isArray(next[bucket]) ? [...next[bucket]] : []
      const filtered = rows.filter((_, i) => i !== index)
      next[bucket] = filtered.length ? filtered : [makeEmptyEmploymentRow()]
      return next
    })
  }

  const saveEmployment = async () => {
    if (!user?.id || !applicant?.id) return
    setEmploymentBusy(true)
    try {
      const toInsert = []
      for (const bucket of ['job_related', 'non_related']) {
        const rows = Array.isArray(employment?.[bucket]) ? employment[bucket] : []
        for (const r of rows) {
          const clean = {
            position: String(r?.position || '').trim(),
            agency: String(r?.agency || '').trim(),
            place: String(r?.place || '').trim(),
            from_date: r?.from || null,
            to_date: r?.to || null,
          }
          const hasAny = clean.position || clean.agency || clean.place || clean.from_date || clean.to_date
          if (!hasAny) continue
          toInsert.push({
            applicant_id: applicant.id,
            category: bucket,
            ...clean,
          })
        }
      }

      // Replace strategy: delete all existing rows for this applicant, then insert current rows.
      // (Simple + consistent; ok for small lists.)
      const { error: delErr } = await supabase.from('employment_records').delete().eq('applicant_id', applicant.id)
      if (delErr) throw delErr

      if (toInsert.length) {
        const { error: insErr } = await supabase.from('employment_records').insert(toInsert)
        if (insErr) throw insErr
      }

      alert('Employment record saved.')
    } catch (err) {
      console.error('[RESUME_PROFILE] save employment error:', err)
      alert(`Save failed: ${err?.message || 'Unknown error'}`)
    } finally {
      setEmploymentBusy(false)
    }
  }

  const daysUntil = (dateStr) => {
    const d = toDateOnly(dateStr)
    if (!d) return null
    const today = new Date()
    return diffDays(today, d)
  }

  const handleContinueApplication = async () => {
    if (!user?.id) return
    if (!applicant?.id) {
      navigate(applyJobId ? `/profile/personalinformation/${applyJobId}` : '/profile/personalinformation')
      return
    }
    setContinueBusy(true)
    try {
      if (applyJobId) {
        const { data: existingApp, error: existErr } = await supabase
          .from('applications')
          .select('id')
          .eq('applicant_id', applicant.id)
          .eq('job_id', applyJobId)
          .maybeSingle()
        if (existErr && existErr.code !== 'PGRST116') throw existErr
        if (existingApp?.id) {
          const { error: upErr } = await supabase
            .from('applications')
            .update({
              current_step: 5,
              status: 'PENDING',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingApp.id)
          if (upErr) throw upErr
        } else {
          const { error: insErr } = await supabase.from('applications').insert({
            job_id: applyJobId,
            applicant_id: applicant.id,
            status: 'PENDING',
            current_step: 5,
          })
          if (insErr) throw insErr
        }
        navigate(`/apply/${applyJobId}/success`)
      } else {
        navigate('/profile/apply')
      }
    } catch (err) {
      console.error('[RESUME_PROFILE] continue application:', err)
      alert(err?.message || 'Could not continue. Please try again.')
    } finally {
      setContinueBusy(false)
    }
  }

  const renderApplyReviewTableSection = (s) => {
    const Ro = ({ children }) => (
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{children == null || children === '' ? '—' : children}</span>
    )

    if (s.key === 'education') {
      return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#0f172a]">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0b1220] border-b border-gray-200 dark:border-white/10">
                {['Level', 'School', 'Course / degree', 'Year graduated', 'Attachment'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {EDUCATION_LEVELS.flatMap((lvl) => {
                const rows = (education[lvl.key] || []).filter(
                  (row) =>
                    String(row?.school || '').trim() ||
                    String(row?.course || '').trim() ||
                    String(row?.year_graduated || '').trim() ||
                    row?.attachment?.file_name
                )
                const displayRows = rows.length ? rows : []
                if (displayRows.length === 0) {
                  return (
                    <tr key={`${lvl.key}-empty`}>
                      <td className="px-3 py-2 font-extrabold text-slate-800 dark:text-white">{lvl.label}</td>
                      <td className="px-3 py-2" colSpan={4}>
                        <Ro>—</Ro>
                      </td>
                    </tr>
                  )
                }
                return displayRows.map((row, idx) => (
                  <tr key={`${lvl.key}-${idx}`}>
                    <td className="px-3 py-2 font-extrabold text-slate-800 dark:text-white whitespace-nowrap">
                      {idx === 0 ? lvl.label : ''}
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{row.school}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{row.course}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{row.year_graduated}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{row.attachment?.file_name}</Ro>
                    </td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      )
    }

    if (s.key === 'licenses') {
      const licMap = normalizeLicensesMapFromInput(credentials.licenses)
      return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#0f172a]">
          <table className="min-w-[800px] w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0b1220] border-b border-gray-200 dark:border-white/10">
                {['Category', 'License number', 'Date issued', 'Date expiry', 'Remaining days', 'Status', 'Attachment'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {LICENSE_TYPES.map((t) => {
                const row = licMap[t.key] || makeEmptyLicenseSlotRow()
                const remaining = row?.date_expiry ? daysUntil(row.date_expiry) : null
                const status =
                  row?.date_expiry && remaining != null
                    ? remaining >= 0
                      ? 'Valid'
                      : 'Expired'
                    : '—'
                return (
                  <tr key={t.key}>
                    <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">{t.label}</td>
                    <td className="px-3 py-2">
                      <Ro>{row.license_number}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{formatDate(row.date_issued)}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{formatDate(row.date_expiry)}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{row?.date_expiry && remaining != null ? remaining : '—'}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{status}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{row.attachment?.file_name}</Ro>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    }

    if (s.key === 'training') {
      const rows = (credentials.trainings || []).filter(
        (row) => String(row?.training_attended || '').trim() || String(row?.date || '').trim()
      )
      const list = rows.length ? rows : []
      return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#0f172a]">
          <table className="min-w-[520px] w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0b1220] border-b border-gray-200 dark:border-white/10">
                <th className="px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80">
                  Training attended
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {(list.length ? list : [{}]).map((row, idx) => (
                <tr key={`tr-${idx}`}>
                  <td className="px-3 py-2">
                    <Ro>{row?.training_attended}</Ro>
                  </td>
                  <td className="px-3 py-2">
                    <Ro>{row?.date}</Ro>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (s.key === 'employment') {
      return (
        <div className="space-y-5">
          {[
            { key: 'job_related', title: 'Employment record (job related)' },
            { key: 'non_related', title: 'Employment record (non-related)' },
          ].map((block) => {
            const rows = (employment?.[block.key] || []).filter(
              (r) =>
                String(r?.position || '').trim() ||
                String(r?.agency || '').trim() ||
                String(r?.place || '').trim() ||
                String(r?.from || '').trim() ||
                String(r?.to || '').trim()
            )
            const totalMonths = rows.reduce((sum, r) => sum + diffMonthsInclusive(r?.from, r?.to), 0)
            return (
              <div key={block.key} className="rounded-xl bg-white dark:bg-[#0c1527] border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-white/10">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">{block.title}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[860px] w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-[#08101f]">
                        {['Position', 'Agency', 'Place', 'From', 'To', 'Total'].map((h) => (
                          <th
                            key={h}
                            className="border border-gray-200 dark:border-white/10 px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-[#93c5fd]"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(rows.length ? rows : [{}]).map((row, idx) => {
                        const rowMonths = diffMonthsInclusive(row?.from, row?.to)
                        return (
                          <tr key={idx} className="bg-white dark:bg-[#0c1527]">
                            <td className="border border-gray-200 dark:border-white/10 px-2.5 py-2">
                              <Ro>{row?.position}</Ro>
                            </td>
                            <td className="border border-gray-200 dark:border-white/10 px-2.5 py-2">
                              <Ro>{row?.agency}</Ro>
                            </td>
                            <td className="border border-gray-200 dark:border-white/10 px-2.5 py-2">
                              <Ro>{row?.place}</Ro>
                            </td>
                            <td className="border border-gray-200 dark:border-white/10 px-2.5 py-2">
                              <Ro>{row?.from ? formatDate(row.from) : ''}</Ro>
                            </td>
                            <td className="border border-gray-200 dark:border-white/10 px-2.5 py-2">
                              <Ro>{row?.to ? formatDate(row.to) : ''}</Ro>
                            </td>
                            <td className="border border-gray-200 dark:border-white/10 px-3 py-2 whitespace-nowrap font-semibold text-slate-900 dark:text-white">
                              {formatMonthsAsYearsMonths(rowMonths)}
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="bg-slate-50 dark:bg-[#08101f]">
                        <td colSpan={5} className="border border-gray-200 dark:border-white/10 px-3 py-2">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-white">Total</span>
                        </td>
                        <td className="border border-gray-200 dark:border-white/10 px-3 py-2 text-right text-sm font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatMonthsAsYearsMonths(totalMonths)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (s.key === 'clearances') {
      return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#0f172a]">
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0b1220] border-b border-gray-200 dark:border-white/10">
                {['Category', 'Date issued', 'Date expiry', 'Remaining days', 'Status', 'Attachment'].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {CLEARANCE_TYPES.map((t) => {
                const row = clearances?.[t.key] || makeEmptyClearanceRow()
                const remaining = row?.date_expiry ? daysUntil(row.date_expiry) : null
                const status =
                  row?.date_expiry && remaining != null
                    ? remaining >= 0
                      ? 'Valid'
                      : 'Expired'
                    : '—'
                return (
                  <tr key={t.key}>
                    <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">{t.label}</td>
                    <td className="px-3 py-2">
                      <Ro>{formatDate(row.date_issued)}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{formatDate(row.date_expiry)}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{row?.date_expiry && remaining != null ? remaining : '—'}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{status}</Ro>
                    </td>
                    <td className="px-3 py-2">
                      <Ro>{row.attachment?.file_name}</Ro>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    }

    if (s.key === 'others') {
      const etLabels = (others?.employment_types || [])
        .map((id) => EMPLOYMENT_TYPE_OPTIONS.find((o) => o.id === id)?.label || id)
        .join(', ')
      return (
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b1220] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Skills</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
              {(others?.skills || []).length ? others.skills.join(', ') : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b1220] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Preferred places</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
              {(others?.preferred_places || []).length ? others.preferred_places.join(', ') : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b1220] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Preferred monthly salary</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
              {(others?.preferred_monthly_salary || []).length ? others.preferred_monthly_salary.join(', ') : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b1220] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Availability</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
              {others?.can_start?.asap
                ? 'ASAP'
                : others?.can_start?.date
                  ? formatDate(others.can_start.date)
                  : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b1220] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Employment type</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-white">{etLabels || '—'}</p>
          </div>
        </div>
      )
    }

    return <p className="text-sm text-slate-600 dark:text-[#93c5fd]/80">Nothing to show for this section.</p>
  }

  const setClearanceField = (key, field, value) => {
    setClearances((prev) => ({
      ...prev,
      [key]: { ...(prev?.[key] || makeEmptyClearanceRow()), [field]: value },
    }))
  }

  const clearClearanceRow = (key) => {
    setClearances((prev) => ({
      ...prev,
      [key]: makeEmptyClearanceRow(),
    }))
  }

  const uploadClearanceAttachment = async (key, file) => {
    if (!user?.id) {
      alert('You must be logged in to upload files')
      return
    }
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (file.size > maxSize) {
      alert('File size exceeds 5MB. Please upload a smaller file.')
      return
    }
    if (!allowed.includes(file.type)) {
      alert('Allowed files: jpg/jpeg, png, webp, pdf (max 5MB).')
      return
    }

    setClearanceUploadingKey(key)
    try {
      const { data: a, error: aErr } = await supabase
        .from('applicants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (aErr) throw aErr
      if (!a?.id) {
        alert('Please complete Personal Information first.')
        navigate('/profile/personalinformation')
        return
      }

      const existing = clearances?.[key]?.attachment
      if (existing?.file_path) {
        await supabase.storage.from('resumes').remove([existing.file_path])
      }
      if (existing?.doc_id) {
        await supabase.from('documents').delete().eq('id', existing.doc_id)
      }

      const ts = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const filePath = `${user.id}/clearance_${key}_${ts}_${sanitizedName}`

      const { error: uploadErr } = await supabase.storage.from('resumes').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadErr) throw uploadErr

      const fileType = `CLEARANCE_${String(key).toUpperCase()}`
      const { data: docRow } = await supabase
        .from('documents')
        .insert({
          applicant_id: a.id,
          application_id: null,
          file_path: filePath,
          file_name: file.name,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
        })
        .select('id')
        .maybeSingle()

      setClearanceField(key, 'attachment', {
        file_name: file.name,
        file_path: filePath,
        mime_type: file.type,
        file_size: file.size,
        doc_id: docRow?.id || null,
      })
    } catch (err) {
      console.error('[RESUME_PROFILE] clearance upload error:', err)
      alert(`Upload failed: ${err?.message || 'Unknown error'}`)
    } finally {
      setClearanceUploadingKey(null)
    }
  }

  const removeClearanceAttachment = async (key) => {
    const existing = clearances?.[key]?.attachment
    if (!existing) return
    try {
      setClearanceUploadingKey(key)
      if (existing?.file_path) {
        await supabase.storage.from('resumes').remove([existing.file_path])
      }
      if (existing?.doc_id) {
        await supabase.from('documents').delete().eq('id', existing.doc_id)
      }

      // Also remove persisted clearance row (otherwise application review may still read old expiry dates)
      if (applicant?.id) {
        await supabase
          .from('applicant_clearances')
          .delete()
          .eq('applicant_id', applicant.id)
          .eq('clearance_type', key)
      }
    } catch (err) {
      console.error('[RESUME_PROFILE] clearance remove error:', err)
    } finally {
      // "Remove" should clear the whole row (dates + validity) not just the file
      clearClearanceRow(key)
      setClearanceUploadingKey(null)
    }
  }

  const saveClearances = async () => {
    if (!user?.id || !applicant?.id) return
    setClearancesBusy(true)
    try {
      const rowsToSave = CLEARANCE_TYPES.map((t) => {
        const row = clearances?.[t.key] || makeEmptyClearanceRow()
        const a = row?.attachment
        const hasAny = row?.date_issued || row?.date_expiry || a
        if (!hasAny) return null
        return {
          applicant_id: applicant.id,
          clearance_type: t.key,
          date_issued: row?.date_issued || null,
          date_expiry: row?.date_expiry || null,
          attachment_path: a?.file_path || null,
          attachment_name: a?.file_name || null,
          attachment_mime: a?.mime_type || null,
          attachment_size: a?.file_size || null,
          document_id: a?.doc_id || null,
          updated_at: new Date().toISOString(),
        }
      }).filter(Boolean)

      const { error: delErr } = await supabase.from('applicant_clearances').delete().eq('applicant_id', applicant.id)
      if (delErr) throw delErr

      if (rowsToSave.length) {
        const { error: insErr } = await supabase.from('applicant_clearances').insert(rowsToSave)
        if (insErr) throw insErr
      }

      alert('Clearances saved.')
    } catch (err) {
      console.error('[RESUME_PROFILE] save clearances error:', err)
      const missingTable = isSupabaseMissingTableError(err)
      if (missingTable) {
        localStorage.setItem(clearancesStorageKey, JSON.stringify(clearances))
        notifyLocalOnlyDbNotReady('Clearances', err)
      } else {
        alert(`Save failed: ${err?.message || 'Unknown error'}`)
      }
    } finally {
      setClearancesBusy(false)
    }
  }

  const toggleOthersArrayItem = (key, value) => {
    setOthers((prev) => {
      const current = Array.isArray(prev?.[key]) ? prev[key] : []
      const v = String(value)
      const nextArr = current.includes(v) ? current.filter((x) => x !== v) : [...current, v]
      return { ...prev, [key]: nextArr }
    })
  }

  const addCustomOthersItem = (key, raw) => {
    const v = String(raw || '').trim()
    if (!v) return
    setOthers((prev) => {
      const current = Array.isArray(prev?.[key]) ? prev[key] : []
      if (current.includes(v)) return prev
      return { ...prev, [key]: [...current, v] }
    })
    setOthersCustomDraft((d) => ({ ...d, [key]: '' }))
  }

  const toggleEmploymentType = (id) => {
    setOthers((prev) => {
      const current = Array.isArray(prev?.employment_types) ? prev.employment_types : []
      const nextArr = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
      return { ...prev, employment_types: nextArr }
    })
  }

  const saveOthers = async () => {
    if (!user?.id || !applicant?.id) return
    setOthersBusy(true)
    try {
      const fields = {
        skills: Array.isArray(others?.skills) ? others.skills : [],
        preferred_places: Array.isArray(others?.preferred_places) ? others.preferred_places : [],
        preferred_monthly_salary: Array.isArray(others?.preferred_monthly_salary) ? others.preferred_monthly_salary : [],
        can_start_asap: !!others?.can_start?.asap,
        can_start_date: others?.can_start?.asap ? null : others?.can_start?.date || null,
        employment_types: Array.isArray(others?.employment_types) ? others.employment_types : [],
        updated_at: new Date().toISOString(),
      }

      // Avoid upsert: INSERT .. ON CONFLICT DO UPDATE often fails under RLS even when plain insert/update work.
      const { data: existing, error: existErr } = await supabase
        .from('applicant_others')
        .select('applicant_id')
        .eq('applicant_id', applicant.id)
        .maybeSingle()
      if (existErr) throw existErr

      if (existing) {
        const { error: upErr } = await supabase.from('applicant_others').update(fields).eq('applicant_id', applicant.id)
        if (upErr) throw upErr
      } else {
        const { error: insErr } = await supabase.from('applicant_others').insert({ applicant_id: applicant.id, ...fields })
        if (insErr) {
          if (String(insErr.code) === '23505') {
            const { error: upErr } = await supabase.from('applicant_others').update(fields).eq('applicant_id', applicant.id)
            if (upErr) throw upErr
          } else {
            throw insErr
          }
        }
      }

      alert('Others saved.')
    } catch (err) {
      console.error('[RESUME_PROFILE] save others error:', err)
      const missingTable = isSupabaseMissingTableError(err)
      if (missingTable) {
        try {
          localStorage.setItem(othersStorageKey, JSON.stringify(others))
        } catch {
          // ignore
        }
        notifyLocalOnlyDbNotReady('Other profile details', err)
      } else {
        alert(`Save failed: ${err?.message || 'Unknown error'}`)
        try {
          localStorage.setItem(othersStorageKey, JSON.stringify(others))
        } catch {
          // ignore
        }
      }
    } finally {
      setOthersBusy(false)
    }
  }

  return (
    <div className="dark min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display transition-colors duration-200">
      <ApplicationHeader />

      <main
        className={`mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 flex-grow ${isApplyReviewRoute ? 'pb-28' : ''}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {isApplyReviewRoute ? 'Review your profile' : 'Resume / Profile'}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-[#93c5fd]">
              {isApplyReviewRoute
                ? applyJobId
                  ? applyJobTitle
                    ? `Applying for: ${applyJobTitle}. Expand each section to verify your information.`
                    : 'Expand each section to verify your information before you continue.'
                  : 'General application — expand each section to verify your information.'
                : 'Review your details before final submission.'}
            </p>
          </div>
          {!isApplyReviewRoute ? (
            <button
              type="button"
              onClick={() => navigate('/profile/personalinformation')}
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary text-[#0f172a] px-6 text-sm font-bold hover:bg-blue-400 transition-colors"
            >
              Edit personal info
            </button>
          ) : (
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => navigate('/profile/resume')}
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 dark:border-white/20 bg-white/80 dark:bg-white/5 px-6 text-sm font-bold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
              >
                Full profile editor
              </button>
            </div>
          )}
        </div>

        {isApplyReviewRoute && !loading && !applicant?.id && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            <p className="font-bold">No applicant profile found yet.</p>
            <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
              Complete personal information first, then return here to review and continue.
            </p>
            <button
              type="button"
              onClick={() => navigate(applyJobId ? `/profile/personalinformation/${applyJobId}` : '/profile/personalinformation')}
              className="mt-3 inline-flex h-9 items-center rounded-full bg-primary text-[#0f172a] px-5 text-xs font-bold hover:bg-blue-400 transition-colors"
            >
              Go to personal information
            </button>
          </div>
        )}
        {/* Paper card */}
        <section className="overflow-hidden rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1e40af]/60 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          {/* Header block (like screenshot) */}
            <div className="grid grid-cols-1 gap-4 border-b border-gray-200 dark:border-white/10 p-5 sm:grid-cols-[180px_1fr] sm:gap-6 sm:p-7">
            <div className="flex items-start gap-4 sm:block">
              {isApplyReviewRoute ? (
                <div
                  className="relative h-28 w-28 overflow-hidden rounded-xl bg-black sm:h-36 sm:w-36 ring-1 ring-white/10"
                  title="ID photo"
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/80">
                      <span className="text-sm font-bold">Picture</span>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/profile/id-picture')}
                  className="relative h-28 w-28 overflow-hidden rounded-xl bg-black sm:h-36 sm:w-36 ring-1 ring-white/10 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 hover:ring-white/20 transition"
                  title="Change picture"
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/80">
                      <span className="text-sm font-bold">Picture</span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-2 bottom-2">
                    <div className="w-full rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-900 text-center">
                      Change
                    </div>
                  </div>
                </button>
              )}
              <div className="sm:hidden">
                <p className="text-sm font-black leading-tight text-slate-900 dark:text-white">{displayName || '—'}</p>
                <p className="text-xs text-slate-600 dark:text-[#93c5fd]">{location}</p>
              </div>
            </div>

            <div className="min-w-0">
              <div className="hidden sm:block">
                <p className="text-2xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">{displayName || '—'}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-600 dark:text-[#93c5fd]">{location}</p>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-slate-800 dark:text-white">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-[#93c5fd]">mail</span>
                  <span className="truncate">{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-[#93c5fd]">call</span>
                  <span className="truncate">{phone}</span>
                </div>
                <div className="pt-2 text-xs text-slate-500 dark:text-[#93c5fd]/80">
                  ID: <span className="font-mono">{applicant?.reference_code || (user?.id ? user.id.slice(0, 8).toUpperCase() : '—')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Accordion rows */}
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {SECTION_DEFS.map((s) => {
              const isOpen = expandedKey === s.key
              return (
                <div key={s.key} className="group">
                  <button
                    type="button"
                    onClick={() => setExpandedKey((prev) => (prev === s.key ? null : s.key))}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-7 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="material-symbols-outlined text-[20px] text-slate-500 dark:text-[#93c5fd]">{s.icon}</span>
                      <span className="truncate text-sm font-extrabold uppercase tracking-wide text-slate-900 dark:text-white">
                        {s.label}
                      </span>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[22px] text-slate-500 dark:text-[#93c5fd] transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    >
                      expand_more
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 sm:px-7">
                      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-[#0b1220] p-4">
                        {s.key === 'personal' ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Full name</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{displayName || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Address</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {pickPersonalValue(applicant, profile, 'street_address') ? (
                                  <>
                                    {pickPersonalValue(applicant, profile, 'street_address')}
                                    {pickPersonalValue(applicant, profile, 'barangay')
                                      ? `, ${pickPersonalValue(applicant, profile, 'barangay')}`
                                      : ''}
                                    {pickPersonalValue(applicant, profile, 'city')
                                      ? `, ${pickPersonalValue(applicant, profile, 'city')}`
                                      : ''}
                                    {pickPersonalValue(applicant, profile, 'province')
                                      ? `, ${pickPersonalValue(applicant, profile, 'province')}`
                                      : ''}
                                    {pickPersonalValue(applicant, profile, 'zip_code')
                                      ? ` ${pickPersonalValue(applicant, profile, 'zip_code')}`
                                      : ''}
                                  </>
                                ) : (
                                  '—'
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Contact</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {email} <span className="text-slate-300 dark:text-white/20 px-1">|</span> {phone}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Date of birth</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {formatDate(pickPersonalValue(applicant, profile, 'date_of_birth'))}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Gender</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {pickPersonalValue(applicant, profile, 'gender') || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Civil status</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {pickPersonalValue(applicant, profile, 'civil_status') || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Religion</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {pickPersonalValue(applicant, profile, 'religion') || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Height</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {formatHeight(pickPersonalValue(applicant, profile, 'height_cm'))}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Weight</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {formatWeight(pickPersonalValue(applicant, profile, 'weight_kg'))}
                              </p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#93c5fd]/80">Languages spoken</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {formatList(pickPersonalValue(applicant, profile, 'languages_spoken'))}
                              </p>
                            </div>
                          </div>
                        ) : isApplyReviewRoute ? (
                          renderApplyReviewTableSection(s)
                        ) : s.key === 'education' ? (
                          <div className="space-y-4">
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#0f172a]">
                              <table className="min-w-[860px] w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-[#0b1220] border-b border-gray-200 dark:border-white/10">
                                    <th className="px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80 w-[190px]">
                                      Level
                                    </th>
                                    <th className="px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80 w-[340px]">
                                      School
                                    </th>
                                    <th className="px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80">
                                      Year/Course/Degree/Major
                                    </th>
                                    <th className="px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80 w-[160px]">
                                      Year Graduated
                                    </th>
                                    <th className="px-3 py-2 text-right text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80 w-[120px]">
                                      Action
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                                  {EDUCATION_LEVELS.flatMap((lvl) =>
                                    (education[lvl.key] || [makeEmptyEducationRow()]).map((row, idx) => {
                                      return (
                                        <tr key={`${lvl.key}-${idx}`} className="align-top">
                                          <td className="px-3 py-3 font-extrabold text-slate-900 dark:text-white">
                                            {idx === 0 ? lvl.label : ''}
                                          </td>
                                          <td className="px-3 py-2">
                                            <input
                                              value={row.school}
                                              onChange={(e) => setEducationField(lvl.key, idx, 'school', e.target.value)}
                                              placeholder="School name"
                                              className="w-full rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#93c5fd]/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                            />
                                          </td>
                                          <td className="px-3 py-2">
                                            <input
                                              value={row.course}
                                              onChange={(e) => setEducationField(lvl.key, idx, 'course', e.target.value)}
                                              placeholder="Course / Degree / Major"
                                              className="w-full rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#93c5fd]/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                            />
                                          </td>
                                          <td className="px-3 py-2">
                                            <input
                                              value={row.year_graduated}
                                              onChange={(e) => setEducationField(lvl.key, idx, 'year_graduated', e.target.value)}
                                              placeholder="Year"
                                              className="w-full rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#93c5fd]/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                            />
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <button
                                                type="button"
                                                onClick={() => deleteEducationRow(lvl.key, idx)}
                                                className="rounded-md bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-2 text-xs font-extrabold hover:bg-red-500/15 transition-colors"
                                                title="Delete row"
                                              >
                                                Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => addEducationRow(lvl.key)}
                                                className="rounded-md bg-primary/10 text-primary px-3 py-2 text-xs font-extrabold hover:bg-primary/15 transition-colors"
                                                title="Add row"
                                              >
                                                +ADD
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={saveEducation}
                                disabled={educationBusy}
                                className="min-w-[140px] inline-flex items-center justify-center rounded-md bg-[#155e75] hover:bg-[#0e7490] text-white px-8 py-3 text-sm font-bold tracking-wide shadow-sm disabled:opacity-60"
                              >
                                {educationBusy ? 'SAVING…' : 'SAVE'}
                              </button>
                            </div>
                          </div>
                        ) : s.key === 'licenses' ? (
                          <div className="space-y-4">
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#0f172a]">
                              <table className="min-w-[1120px] w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-[#0b1220] border-b border-gray-200 dark:border-white/10">
                                    {['Category', 'License number', 'Date issued', 'Date expiry', 'Remaining days', 'Status', 'Upload', ''].map((h, idx) => (
                                      <th
                                        key={h + idx}
                                        className={`px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80 ${
                                          idx === 7 ? 'text-right w-[140px]' : 'text-left'
                                        }`}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                                  {(() => {
                                    const licMap = normalizeLicensesMapFromInput(credentials.licenses)
                                    return LICENSE_TYPES.map((t) => {
                                    const row = licMap[t.key] || makeEmptyLicenseSlotRow()
                                    const remaining = row?.date_expiry ? daysUntil(row.date_expiry) : null
                                    const status =
                                      row?.date_expiry && remaining != null
                                        ? remaining >= 0
                                          ? 'VALID'
                                          : 'EXPIRED'
                                        : 'N/A'
                                    const inputId = `license-upload-${t.key}`
                                    const busy = licenseUploadingKey === t.key
                                    return (
                                      <tr key={t.key} className="align-top">
                                        <td className="px-3 py-3 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                                          {t.label}
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="text"
                                            value={row.license_number || ''}
                                            onChange={(e) => setLicenseSlotField(t.key, 'license_number', e.target.value)}
                                            placeholder="License no."
                                            className="w-full min-w-[140px] max-w-[220px] rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#93c5fd]/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="date"
                                            value={row.date_issued || ''}
                                            onChange={(e) => setLicenseSlotField(t.key, 'date_issued', e.target.value)}
                                            className="w-full max-w-[180px] rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="date"
                                            value={row.date_expiry || ''}
                                            onChange={(e) => setLicenseSlotField(t.key, 'date_expiry', e.target.value)}
                                            className="w-full max-w-[180px] rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                                          />
                                        </td>
                                        <td className="px-3 py-3 font-bold text-slate-700 dark:text-[#93c5fd] whitespace-nowrap">
                                          {row?.date_expiry && remaining != null ? remaining : 'N/A'}
                                        </td>
                                        <td className="px-3 py-3">
                                          <span
                                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
                                              status === 'VALID'
                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                : status === 'EXPIRED'
                                                  ? 'bg-red-500/10 text-red-700 dark:text-red-300'
                                                  : 'bg-slate-500/10 text-slate-700 dark:text-slate-300'
                                            }`}
                                          >
                                            {status}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => document.getElementById(inputId)?.click()}
                                              disabled={busy}
                                              className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                                            >
                                              {busy ? 'Uploading…' : 'Upload'}
                                            </button>
                                            <input
                                              id={inputId}
                                              type="file"
                                              className="hidden"
                                              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
                                              onChange={(e) => uploadLicenseSlotAttachment(t.key, e.target.files?.[0] || null)}
                                            />
                                            <div className="min-w-0">
                                              {row.attachment?.file_name ? (
                                                <p className="text-xs font-semibold text-slate-700 dark:text-[#93c5fd] truncate max-w-[260px]">
                                                  {row.attachment.file_name}
                                                </p>
                                              ) : (
                                                <p className="text-[11px] text-slate-500 dark:text-[#93c5fd]/60">Jpg, jpeg, pdf, webp • 5mb</p>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {row.attachment ? (
                                            <button
                                              type="button"
                                              onClick={() => removeLicenseSlotAttachment(t.key)}
                                              disabled={busy}
                                              className="rounded-md bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 text-xs font-extrabold hover:bg-red-500/15 transition-colors disabled:opacity-60"
                                            >
                                              REMOVE
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => document.getElementById(inputId)?.click()}
                                              disabled={busy}
                                              className="rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-xs font-extrabold hover:bg-emerald-500/15 transition-colors disabled:opacity-60"
                                            >
                                              ADD
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })
                                  })()}
                                </tbody>
                              </table>
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={saveCredentials}
                                disabled={credentialsBusy || !!licenseUploadingKey}
                                className="min-w-[140px] inline-flex items-center justify-center rounded-md bg-[#155e75] hover:bg-[#0e7490] text-white px-8 py-3 text-sm font-bold tracking-wide shadow-sm disabled:opacity-60"
                              >
                                {credentialsBusy ? 'SAVING…' : 'SAVE'}
                              </button>
                            </div>
                          </div>
                        ) : s.key === 'training' ? (
                          <div className="space-y-4">
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#0f172a]">
                              <table className="min-w-[760px] w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-[#0b1220] border-b border-gray-200 dark:border-white/10">
                                    <th className="px-4 py-3 text-left text-sm font-black text-slate-900 dark:text-white" colSpan={2}>
                                      Training/Certificates
                                    </th>
                                  </tr>
                                  <tr className="bg-white dark:bg-[#0f172a] border-b border-gray-200 dark:border-white/10">
                                    <th className="px-4 py-2 text-left text-[13px] font-extrabold text-slate-900 dark:text-white">
                                      Training Attended
                                    </th>
                                    <th className="px-4 py-2 text-center text-[13px] font-extrabold text-slate-900 dark:text-white w-[220px]">
                                      Date
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                                  {(credentials.trainings || [makeEmptyTrainingRow()]).map((row, idx) => (
                                    <tr key={`train-${idx}`} className="bg-white dark:bg-[#0f172a]">
                                      <td className="px-4 py-2">
                                        <input
                                          value={row.training_attended}
                                          onChange={(e) => setCredentialField('trainings', idx, 'training_attended', e.target.value)}
                                          placeholder="e.g. Customer Service"
                                          className="w-full rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#93c5fd]/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          value={row.date}
                                          onChange={(e) => setCredentialField('trainings', idx, 'date', e.target.value)}
                                          placeholder="2020"
                                          className="w-full text-center rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#93c5fd]/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-white dark:bg-[#0f172a]">
                                    <td className="px-4 py-3 text-center font-extrabold text-slate-900 dark:text-white" colSpan={2}>
                                      <button
                                        type="button"
                                        onClick={() => addCredentialRow('trainings')}
                                        className="w-full py-2 rounded-md bg-primary/10 text-primary text-sm font-extrabold hover:bg-primary/15 transition-colors"
                                      >
                                        +Add
                                      </button>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={saveCredentials}
                                disabled={credentialsBusy || !!licenseUploadingKey}
                                className="min-w-[140px] inline-flex items-center justify-center rounded-md bg-[#155e75] hover:bg-[#0e7490] text-white px-8 py-3 text-sm font-bold tracking-wide shadow-sm disabled:opacity-60"
                              >
                                {credentialsBusy ? 'SAVING…' : 'SAVE'}
                              </button>
                            </div>
                          </div>
                        ) : s.key === 'employment' ? (
                          <div className="space-y-5">
                            {[
                              { key: 'job_related', title: 'Employment Record (Job Related)' },
                              { key: 'non_related', title: 'Employment Record (NON-Related)' },
                            ].map((block) => {
                              const rows = Array.isArray(employment?.[block.key]) ? employment[block.key] : []
                              const totalMonths = rows.reduce((sum, r) => sum + diffMonthsInclusive(r?.from, r?.to), 0)
                              return (
                                <div key={block.key} className="rounded-xl bg-white dark:bg-[#0c1527] border border-gray-200 dark:border-white/10 overflow-hidden">
                                  <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-white/10">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">{block.title}</p>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="min-w-[860px] w-full border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 dark:bg-[#08101f]">
                                          {['Position', 'Agency', 'Place', 'From', 'To', 'Total Work Exp'].map((h) => (
                                            <th
                                              key={h}
                                              scope="col"
                                              className="border border-gray-200 dark:border-white/10 px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-[#93c5fd]"
                                            >
                                              {h}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(rows.length ? rows : [makeEmptyEmploymentRow()]).map((row, idx) => {
                                          const rowMonths = diffMonthsInclusive(row?.from, row?.to)
                                          return (
                                            <tr key={idx} className="bg-white dark:bg-[#0c1527]">
                                              <td className="border border-gray-200 dark:border-white/10 px-2.5 py-2 align-top">
                                                <div className="flex items-start gap-2">
                                                  <input
                                                    value={row.position}
                                                    onChange={(e) => setEmploymentField(block.key, idx, 'position', e.target.value)}
                                                    placeholder="e.g. Security Guard"
                                                    className="w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => deleteEmploymentRow(block.key, idx)}
                                                    disabled={(employment?.[block.key]?.length || 0) <= 1}
                                                    className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-slate-400 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                                                    title="Remove row"
                                                  >
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                  </button>
                                                </div>
                                              </td>
                                              <td className="border border-gray-200 dark:border-white/10 px-2.5 py-2 align-top">
                                                <input
                                                  value={row.agency}
                                                  onChange={(e) => setEmploymentField(block.key, idx, 'agency', e.target.value)}
                                                  placeholder="e.g. ADV Agency"
                                                  className="w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                                />
                                              </td>
                                              <td className="border border-gray-200 dark:border-white/10 px-2.5 py-2 align-top">
                                                <input
                                                  value={row.place}
                                                  onChange={(e) => setEmploymentField(block.key, idx, 'place', e.target.value)}
                                                  placeholder="e.g. SM Manila"
                                                  className="w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                                />
                                              </td>
                                              <td className="border border-gray-200 dark:border-white/10 px-2.5 py-2 align-top">
                                                <input
                                                  type="date"
                                                  value={row.from}
                                                  onChange={(e) => setEmploymentField(block.key, idx, 'from', e.target.value)}
                                                  className="w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                                />
                                              </td>
                                              <td className="border border-gray-200 dark:border-white/10 px-2.5 py-2 align-top">
                                                <input
                                                  type="date"
                                                  value={row.to}
                                                  onChange={(e) => setEmploymentField(block.key, idx, 'to', e.target.value)}
                                                  className="w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                                />
                                              </td>
                                              <td className="border border-gray-200 dark:border-white/10 px-3 py-2 align-top">
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                                  {formatMonthsAsYearsMonths(rowMonths)}
                                                </div>
                                              </td>
                                            </tr>
                                          )
                                        })}

                                        <tr className="bg-white dark:bg-[#0c1527]">
                                          <td colSpan={6} className="border border-gray-200 dark:border-white/10 px-3 py-2">
                                            <button
                                              type="button"
                                              onClick={() => addEmploymentRow(block.key)}
                                              className="w-full rounded-lg border border-dashed border-gray-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 py-2 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                            >
                                              +ADD
                                            </button>
                                          </td>
                                        </tr>

                                        <tr className="bg-slate-50 dark:bg-[#08101f]">
                                          <td colSpan={5} className="border border-gray-200 dark:border-white/10 px-3 py-2">
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-white">TOTAL</span>
                                          </td>
                                          <td className="border border-gray-200 dark:border-white/10 px-3 py-2 text-right">
                                            <span className="text-sm font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                                              {formatMonthsAsYearsMonths(totalMonths)}
                                            </span>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )
                            })}

                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={saveEmployment}
                                disabled={employmentBusy}
                                className="inline-flex h-10 items-center justify-center rounded-md bg-[#0b5a78] px-10 text-sm font-black uppercase tracking-wider text-white hover:bg-[#0a4e68] transition-colors disabled:opacity-60"
                              >
                                {employmentBusy ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : s.key === 'clearances' ? (
                          <div className="space-y-4">
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#0f172a]">
                              <table className="min-w-[980px] w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-[#0b1220] border-b border-gray-200 dark:border-white/10">
                                    {['Category', 'Date issued', 'Date expiry', 'Remaining days', 'Status', 'Upload', ''].map((h, idx) => (
                                      <th
                                        key={h + idx}
                                        className={`px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80 ${
                                          idx === 6 ? 'text-right w-[140px]' : 'text-left'
                                        }`}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                                  {CLEARANCE_TYPES.map((t) => {
                                    const row = clearances?.[t.key] || makeEmptyClearanceRow()
                                    const remaining = row?.date_expiry ? daysUntil(row.date_expiry) : null
                                    const status =
                                      row?.date_expiry && remaining != null
                                        ? remaining >= 0
                                          ? 'VALID'
                                          : 'EXPIRED'
                                        : 'N/A'
                                    const inputId = `clearance-upload-${t.key}`
                                    const busy = clearanceUploadingKey === t.key
                                    return (
                                      <tr key={t.key} className="align-top">
                                        <td className="px-3 py-3 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                                          {t.label}
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="date"
                                            value={row.date_issued || ''}
                                            onChange={(e) => setClearanceField(t.key, 'date_issued', e.target.value)}
                                            className="w-full max-w-[180px] rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                                          />
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="date"
                                            value={row.date_expiry || ''}
                                            onChange={(e) => setClearanceField(t.key, 'date_expiry', e.target.value)}
                                            className="w-full max-w-[180px] rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                                          />
                                        </td>
                                        <td className="px-3 py-3 font-bold text-slate-700 dark:text-[#93c5fd] whitespace-nowrap">
                                          {row?.date_expiry && remaining != null ? remaining : 'N/A'}
                                        </td>
                                        <td className="px-3 py-3">
                                          <span
                                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
                                              status === 'VALID'
                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                : status === 'EXPIRED'
                                                  ? 'bg-red-500/10 text-red-700 dark:text-red-300'
                                                  : 'bg-slate-500/10 text-slate-700 dark:text-slate-300'
                                            }`}
                                          >
                                            {status}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => document.getElementById(inputId)?.click()}
                                              disabled={busy}
                                              className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                                            >
                                              {busy ? 'Uploading…' : 'Upload'}
                                            </button>
                                            <input
                                              id={inputId}
                                              type="file"
                                              className="hidden"
                                              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
                                              onChange={(e) => uploadClearanceAttachment(t.key, e.target.files?.[0] || null)}
                                            />
                                            <div className="min-w-0">
                                              {row.attachment?.file_name ? (
                                                <p className="text-xs font-semibold text-slate-700 dark:text-[#93c5fd] truncate max-w-[260px]">
                                                  {row.attachment.file_name}
                                                </p>
                                              ) : (
                                                <p className="text-[11px] text-slate-500 dark:text-[#93c5fd]/60">Jpg, jpeg, pdf, webp • 5mb</p>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {row.attachment ? (
                                            <button
                                              type="button"
                                              onClick={() => removeClearanceAttachment(t.key)}
                                              disabled={busy}
                                              className="rounded-md bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 text-xs font-extrabold hover:bg-red-500/15 transition-colors disabled:opacity-60"
                                            >
                                              REMOVE
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => document.getElementById(inputId)?.click()}
                                              disabled={busy}
                                              className="rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-xs font-extrabold hover:bg-emerald-500/15 transition-colors disabled:opacity-60"
                                            >
                                              ADD
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={saveClearances}
                                disabled={clearancesBusy || !!clearanceUploadingKey}
                                className="min-w-[140px] inline-flex items-center justify-center rounded-md bg-[#155e75] hover:bg-[#0e7490] text-white px-8 py-3 text-sm font-bold tracking-wide shadow-sm disabled:opacity-60"
                              >
                                {clearancesBusy ? 'SAVING…' : 'SAVE'}
                              </button>
                            </div>
                          </div>
                        ) : s.key === 'others' ? (
                          <div className="space-y-5">
                            <div className="rounded-xl bg-white/70 dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 overflow-hidden">
                              <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0b1220]">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">Skills</p>
                                <p className="mt-1 text-[12px] text-slate-600 dark:text-[#93c5fd]/80">You can select multiple skills.</p>
                              </div>
                              <div className="p-4 sm:p-5">
                                {(others?.skills || []).length > 0 && (
                                  <div className="mb-4">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80">
                                      Selected
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {(others?.skills || []).map((v) => (
                                        <button
                                          key={v}
                                          type="button"
                                          onClick={() => toggleOthersArrayItem('skills', v)}
                                          className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-extrabold text-primary"
                                          title="Remove"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">close</span>
                                          {v}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  {SKILL_OPTIONS.map((opt) => {
                                    const active = (others?.skills || []).includes(opt)
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => toggleOthersArrayItem('skills', opt)}
                                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                                          active
                                            ? 'border-primary bg-primary/15 text-primary'
                                            : 'border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10'
                                        }`}
                                        aria-pressed={active}
                                      >
                                        <span className="material-symbols-outlined text-[16px]">{active ? 'check_circle' : 'add_circle'}</span>
                                        {opt}
                                      </button>
                                    )
                                  })}
                                </div>

                                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                  <input
                                    value={othersCustomDraft.skills}
                                    onChange={(e) => setOthersCustomDraft((d) => ({ ...d, skills: e.target.value }))}
                                    placeholder="Add your own skill"
                                    className="flex-1 rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addCustomOthersItem('skills', othersCustomDraft.skills)}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-[#0f172a] hover:bg-[#60a5fa] transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Add
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl bg-white/70 dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 overflow-hidden">
                              <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0b1220]">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">Preferred Places</p>
                                <p className="mt-1 text-[12px] text-slate-600 dark:text-[#93c5fd]/80">You can select multiple places.</p>
                              </div>
                              <div className="p-4 sm:p-5">
                                {(others?.preferred_places || []).length > 0 && (
                                  <div className="mb-4">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80">
                                      Selected
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {(others?.preferred_places || []).map((v) => (
                                        <button
                                          key={v}
                                          type="button"
                                          onClick={() => toggleOthersArrayItem('preferred_places', v)}
                                          className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-extrabold text-primary"
                                          title="Remove"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">close</span>
                                          {v}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {PLACE_OPTIONS.map((opt) => {
                                    const active = (others?.preferred_places || []).includes(opt)
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => toggleOthersArrayItem('preferred_places', opt)}
                                        className={`group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                                          active
                                            ? 'border-primary bg-primary/10'
                                            : 'border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10'
                                        }`}
                                        aria-pressed={active}
                                      >
                                        <span className={`text-sm font-bold ${active ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-white'}`}>
                                          {opt}
                                        </span>
                                        <span
                                          className={`material-symbols-outlined text-[20px] ${active ? 'text-primary' : 'text-slate-400 dark:text-[#93c5fd]/60'}`}
                                          aria-hidden="true"
                                        >
                                          {active ? 'check_circle' : 'radio_button_unchecked'}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>

                                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                  <input
                                    value={othersCustomDraft.preferred_places}
                                    onChange={(e) =>
                                      setOthersCustomDraft((d) => ({ ...d, preferred_places: e.target.value }))
                                    }
                                    placeholder="Add your own preferred place"
                                    className="flex-1 rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addCustomOthersItem('preferred_places', othersCustomDraft.preferred_places)
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-[#0f172a] hover:bg-[#60a5fa] transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Add
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl bg-white/70 dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 overflow-hidden">
                              <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0b1220]">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">Preferred Monthly Salary</p>
                                <p className="mt-1 text-[12px] text-slate-600 dark:text-[#93c5fd]/80">You can select multiple salary ranges.</p>
                              </div>
                              <div className="p-4 sm:p-5">
                                {(others?.preferred_monthly_salary || []).length > 0 && (
                                  <div className="mb-4">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-[#93c5fd]/80">
                                      Selected
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {(others?.preferred_monthly_salary || []).map((v) => (
                                        <button
                                          key={v}
                                          type="button"
                                          onClick={() => toggleOthersArrayItem('preferred_monthly_salary', v)}
                                          className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-extrabold text-primary"
                                          title="Remove"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">close</span>
                                          {v}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {SALARY_OPTIONS.map((opt) => {
                                    const active = (others?.preferred_monthly_salary || []).includes(opt)
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => toggleOthersArrayItem('preferred_monthly_salary', opt)}
                                        className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                                          active
                                            ? 'border-primary bg-primary/10'
                                            : 'border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10'
                                        }`}
                                        aria-pressed={active}
                                      >
                                        <span className="text-sm font-bold text-slate-700 dark:text-white">{opt}</span>
                                        <span
                                          className={`material-symbols-outlined text-[20px] ${active ? 'text-primary' : 'text-slate-400 dark:text-[#93c5fd]/60'}`}
                                          aria-hidden="true"
                                        >
                                          {active ? 'check_circle' : 'radio_button_unchecked'}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>

                                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                  <input
                                    value={othersCustomDraft.preferred_monthly_salary}
                                    onChange={(e) =>
                                      setOthersCustomDraft((d) => ({
                                        ...d,
                                        preferred_monthly_salary: e.target.value,
                                      }))
                                    }
                                    placeholder="Add your own salary range label"
                                    className="flex-1 rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addCustomOthersItem(
                                        'preferred_monthly_salary',
                                        othersCustomDraft.preferred_monthly_salary
                                      )
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-[#0f172a] hover:bg-[#60a5fa] transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Add
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="rounded-xl bg-white/70 dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 overflow-hidden">
                                <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0b1220]">
                                  <p className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">Can start?</p>
                                </div>
                                <div className="p-4 sm:p-5 space-y-3">
                                  <button
                                    type="button"
                                    onClick={() => setOthers((p) => ({ ...p, can_start: { ...(p?.can_start || {}), asap: true } }))}
                                    className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                                      others?.can_start?.asap
                                        ? 'border-primary bg-primary/10'
                                        : 'border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10'
                                    }`}
                                    aria-pressed={!!others?.can_start?.asap}
                                  >
                                    <span className="text-sm font-bold text-slate-700 dark:text-white">ASAP</span>
                                    <span
                                      className={`material-symbols-outlined text-[20px] ${
                                        others?.can_start?.asap ? 'text-primary' : 'text-slate-400 dark:text-[#93c5fd]/60'
                                      }`}
                                      aria-hidden="true"
                                    >
                                      {others?.can_start?.asap ? 'check_circle' : 'radio_button_unchecked'}
                                    </span>
                                  </button>

                                  <div className="rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-white">Preferred date</p>
                                        <p className="text-[12px] text-slate-500 dark:text-[#93c5fd]/70">Pick a date if not ASAP.</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setOthers((p) => ({ ...p, can_start: { ...(p?.can_start || {}), asap: false } }))}
                                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                                          !others?.can_start?.asap
                                            ? 'border-primary bg-primary/15 text-primary'
                                            : 'border-gray-300 dark:border-white/10 text-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10'
                                        }`}
                                        aria-pressed={!others?.can_start?.asap}
                                      >
                                        <span className="material-symbols-outlined text-[16px]">event</span>
                                        Select
                                      </button>
                                    </div>
                                    <input
                                      type="date"
                                      value={others?.can_start?.date || ''}
                                      onChange={(e) =>
                                        setOthers((p) => ({
                                          ...p,
                                          can_start: { ...(p?.can_start || {}), asap: false, date: e.target.value },
                                        }))
                                      }
                                      className="mt-3 w-full rounded-lg border border-gray-300 dark:border-[#1e40af]/60 bg-white dark:bg-[#111827] px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-xl bg-white/70 dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 overflow-hidden">
                                <div className="px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0b1220]">
                                  <p className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">Employment type</p>
                                  <p className="mt-1 text-[12px] text-slate-600 dark:text-[#93c5fd]/80">You can select multiple.</p>
                                </div>
                                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {EMPLOYMENT_TYPE_OPTIONS.map((opt) => {
                                    const active = (others?.employment_types || []).includes(opt.id)
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => toggleEmploymentType(opt.id)}
                                        className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                                          active
                                            ? 'border-primary bg-primary/10'
                                            : 'border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10'
                                        }`}
                                        aria-pressed={active}
                                      >
                                        <span className="text-sm font-bold text-slate-700 dark:text-white">{opt.label}</span>
                                        <span
                                          className={`material-symbols-outlined text-[20px] ${active ? 'text-primary' : 'text-slate-400 dark:text-[#93c5fd]/60'}`}
                                          aria-hidden="true"
                                        >
                                          {active ? 'check_circle' : 'radio_button_unchecked'}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={saveOthers}
                                disabled={othersBusy}
                                className="min-w-[140px] inline-flex items-center justify-center rounded-md bg-[#155e75] hover:bg-[#0e7490] text-white px-8 py-3 text-sm font-bold tracking-wide shadow-sm disabled:opacity-60"
                              >
                                {othersBusy ? 'SAVING…' : 'SAVE'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-700 dark:text-gray-300">
                            This section will populate as you complete more steps in your application.
                          </p>
                        )}

                        {!isApplyReviewRoute && s.cta?.to && (
                          <div className="mt-4 flex justify-end">
                            <Link
                              to={s.cta.to}
                              className="inline-flex items-center justify-center rounded-full bg-primary text-[#0f172a] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide hover:bg-blue-400 transition-colors"
                            >
                              {s.cta.label}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Bottom whitespace like a page */}
          <div className="h-8 bg-white dark:bg-[#111827]" />
        </section>

        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white">
            Loading your profile…
          </div>
        )}
      </main>

      {isApplyReviewRoute && (
        <div className="sticky bottom-0 z-40 border-t border-slate-200 dark:border-[#1e40af]/60 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(applyJobId ? `/job/${applyJobId}` : '/')}
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 dark:border-white/15 px-6 text-sm font-bold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              Back to jobs
            </button>
            <button
              type="button"
              onClick={handleContinueApplication}
              disabled={continueBusy || !applicant?.id}
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary text-[#0f172a] px-8 text-sm font-bold hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {continueBusy ? 'Working…' : 'Submit application'}
            </button>
          </div>
        </div>
      )}

      <ApplicationFooter />
    </div>
  )
}

export default ResumeProfile

