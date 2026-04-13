import { computeResumeJobMatchBreakdown } from './resumeJobMatchBreakdown'
import { computeRequirementMatchPercent, collectApplicantCredentialIds } from './jobMatchScore'

/** Languages may live on `applicants.languages_spoken` or only on `public.users.languages_spoken`. */
export function mergeApplicantLanguagesFromUser(applicantRow, userRow) {
  const norm = (v) => {
    if (!Array.isArray(v)) return []
    return [...new Set(v.map((x) => String(x || '').trim()).filter(Boolean))]
  }
  const fromApplicant = norm(applicantRow?.languages_spoken)
  if (fromApplicant.length) return fromApplicant
  return norm(userRow?.languages_spoken)
}

export function mapApplicantOthersRow(row) {
  if (!row || typeof row !== 'object') return {}
  return {
    skills: row.skills,
    preferred_places: row.preferred_places,
    preferred_monthly_salary: row.preferred_monthly_salary,
    can_start: {
      asap: typeof row.can_start_asap === 'boolean' ? row.can_start_asap : true,
      date: row.can_start_date || ''
    },
    employment_types: row.employment_types
  }
}

/** Maps DB / legacy `level` values to bucket keys used by scoring and admin UI. */
export function normalizeEducationLevelKey(raw) {
  let lv = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
  const aliases = {
    elementary_school: 'elementary',
    primary: 'elementary',
    grade_school: 'elementary',
    highschool: 'high_school',
    senior_high: 'high_school',
    senior_high_school: 'high_school',
    shs: 'high_school',
    vocational_school: 'vocational',
    tech_vocational: 'vocational',
    technical_vocational: 'vocational',
    university: 'college',
    tertiary: 'college',
    undergrad: 'college'
  }
  if (aliases[lv]) return aliases[lv]
  return lv
}

export function groupEducation(rows) {
  const base = { elementary: [], high_school: [], vocational: [], college: [] }
  for (const r of rows || []) {
    const lv = normalizeEducationLevelKey(r?.level)
    if (!base[lv]) continue
    base[lv].push({
      school: r.school,
      course: r.course,
      year_graduated: r.year_graduated,
      attachment_path: r.attachment_path,
      attachment: r.attachment_path
        ? { file_path: r.attachment_path, file_name: r.attachment_name }
        : null
    })
  }
  return base
}

const APPLICATION_SELECT = `
  id,
  applicant_id,
  job_id,
  status,
  updated_at,
  created_at,
  submitted_at,
  interviewed_at,
  hired_at,
  rejected_at,
  rejection_reason,
  applicants:applicant_id (
    id,
    first_name,
    middle_name,
    last_name,
    name_extension,
    email,
    phone,
    date_of_birth,
    gender,
    street_address,
    barangay,
    city,
    province,
    zip_code,
    civil_status,
    religion,
    height_cm,
    weight_kg,
    licenses,
    reference_code,
    file_201_data
  ),
  jobs:job_id (
    title,
    location,
    category_percentages,
    age_scoring,
    gender_scoring,
    height_scoring,
    weight_scoring,
    employment_experience_scoring,
    training_count_scoring,
    others_scoring,
    required_documents,
    required_credentials
  )
`

/**
 * Loads applicant resume slices + job scoring and returns breakdown for admin UI.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} applicationId
 */
export async function loadAdminApplicationResumeBundle(supabase, applicationId) {
  const { data: app, error: appErr } = await supabase
    .from('applications')
    .select(APPLICATION_SELECT)
    .eq('id', applicationId)
    .single()

  if (appErr) throw appErr
  if (!app?.applicants?.id) throw new Error('Applicant not found')

  let applicant = app.applicants
  if (applicant.user_id) {
    const { data: langUser, error: langErr } = await supabase
      .from('users')
      .select('languages_spoken')
      .eq('id', applicant.user_id)
      .maybeSingle()
    if (langErr) console.warn('[adminApplicationResumeBundle] users.languages_spoken', langErr)
    const langs = mergeApplicantLanguagesFromUser(applicant, langUser)
    applicant = { ...applicant, languages_spoken: langs }
  } else {
    applicant = {
      ...applicant,
      languages_spoken: mergeApplicantLanguagesFromUser(applicant, null)
    }
  }

  const job = app.jobs
  const aid = applicant.id

  const [
    { data: eduRows, error: eduErr },
    { data: licRows, error: licErr },
    { data: trRows, error: trErr },
    { data: empRows, error: empErr },
    { data: clrRows, error: clrErr },
    { data: others, error: othErr },
    { data: docs, error: docErr }
  ] = await Promise.all([
    supabase
      .from('educational_attainments')
      .select('*')
      .eq('applicant_id', aid)
      .order('level', { ascending: true })
      .order('sort_order', { ascending: true }),
    supabase
      .from('applicant_licenses')
      .select('category,license_number,date_issued,date_expiry,attachment')
      .eq('applicant_id', aid),
    supabase.from('applicant_trainings').select('training_attended,date').eq('applicant_id', aid),
    supabase.from('employment_records').select('category,position,agency,place,from_date,to_date').eq('applicant_id', aid),
    supabase
      .from('applicant_clearances')
      .select('clearance_type,date_issued,date_expiry,attachment_path')
      .eq('applicant_id', aid),
    supabase.from('applicant_others').select('*').eq('applicant_id', aid).maybeSingle(),
    supabase.from('documents').select('file_type,file_name,file_path,created_at,application_id').eq('applicant_id', aid)
  ])

  if (eduErr && !String(eduErr.message || '').includes('does not exist')) console.warn(eduErr)
  if (licErr) console.warn(licErr)
  if (trErr) console.warn(trErr)
  if (empErr) console.warn(empErr)
  if (clrErr) console.warn(clrErr)
  if (othErr) console.warn(othErr)
  if (docErr) console.warn(docErr)

  const educationByLevel = groupEducation(eduRows || [])
  const licenseRows = licRows || []
  const trainingsList = (trRows || []).map((r) => ({
    training_attended: r.training_attended,
    date: r.date
  }))
  const employmentRecords = empRows || []
  const clearancesList = clrRows || []
  const othersRow = mapApplicantOthersRow(others)
  const docsList = docs || []

  const ctx = {
    applicant,
    educationByLevel,
    licenseRows,
    trainingsList,
    employmentRecords,
    clearancesList,
    othersRow
  }

  const breakdown = computeResumeJobMatchBreakdown(job || {}, ctx)
  const licenseIds = collectApplicantCredentialIds(applicant.licenses, licenseRows)
  const requirementPercent =
    job && (job.required_documents?.length || job.required_credentials?.length)
      ? computeRequirementMatchPercent(job, {
          documents: docsList,
          applicantLicenseIds: licenseIds
        })
      : null

  return {
    application: { ...app, applicants: applicant },
    applicant,
    job,
    breakdown,
    requirementPercent,
    educationByLevel,
    employmentRecords,
    trainingsList,
    clearancesList,
    licenseRows,
    othersRow,
    docsList
  }
}
