import { computeResumeJobMatchBreakdown } from './resumeJobMatchBreakdown'
import { computeRequirementMatchPercent, collectApplicantCredentialIds } from './jobMatchScore'

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

export function groupEducation(rows) {
  const base = { elementary: [], high_school: [], vocational: [], college: [] }
  for (const r of rows || []) {
    const lv = String(r?.level || '')
      .trim()
      .toLowerCase()
      .replace(/-/g, '_')
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
    languages_spoken,
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

  const applicant = app.applicants
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
    supabase.from('educational_attainments').select('*').eq('applicant_id', aid),
    supabase.from('applicant_licenses').select('category,date_issued,date_expiry,attachment').eq('applicant_id', aid),
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
    application: app,
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
