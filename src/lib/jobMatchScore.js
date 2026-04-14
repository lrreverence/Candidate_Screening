/** Coerce JSON/array columns that may arrive as stringified JSON from some clients or legacy rows. */
function normalizeJsonArray(val) {
  if (Array.isArray(val)) return val
  if (val == null) return []
  if (typeof val === 'string') {
    const s = val.trim()
    if (!s) return []
    try {
      const parsed = JSON.parse(s)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Requirement match score (0–100) from job required_documents / required_credentials
 * vs applicant documents and license IDs. Mirrors admin ApplicantsManagement / ApplicantDetailView.
 *
 * @returns {number|null} null when the job has no scored requirements
 */
export function computeRequirementMatchPercent(job, { documents = [], applicantLicenseIds = [] } = {}) {
  const requiredDocuments = normalizeJsonArray(job?.required_documents)
  const requiredCredentials = normalizeJsonArray(job?.required_credentials)

  if (requiredDocuments.length === 0 && requiredCredentials.length === 0) {
    return null
  }

  const licenseSet = new Set(
    (applicantLicenseIds || []).map((id) => String(id || '').trim()).filter(Boolean)
  )

  let documentScore = 0
  let documentTotal = 0
  let credentialScore = 0
  let credentialTotal = 0

  if (requiredDocuments.length > 0) {
    requiredDocuments.forEach((reqDoc) => {
      const percentage = parseFloat(reqDoc.percentage) || 0
      documentTotal += percentage
      const hasDocument = documents.some((doc) => doc.file_type === reqDoc.document_type)
      if (hasDocument) {
        documentScore += percentage
      }
    })
  }

  if (requiredCredentials.length > 0) {
    credentialTotal = requiredCredentials.length
    credentialScore = requiredCredentials.filter((cred) => licenseSet.has(String(cred).trim())).length
  }

  let matchPercentage = 0
  if (documentTotal > 0 && credentialTotal > 0) {
    const documentMatch = (documentScore / documentTotal) * 100
    const credentialMatch = (credentialScore / credentialTotal) * 100
    const documentWeight = Math.min(documentTotal / 100, 1)
    const credentialWeight = Math.max(0, 1 - documentWeight)
    matchPercentage = documentMatch * documentWeight + credentialMatch * credentialWeight
  } else if (documentTotal > 0) {
    matchPercentage = (documentScore / documentTotal) * 100
  } else if (credentialTotal > 0) {
    matchPercentage = (credentialScore / credentialTotal) * 100
  }

  return Math.round(Math.min(100, Math.max(0, matchPercentage)))
}

/** Merge legacy applicants.licenses JSON with applicant_licenses.category values. */
export function collectApplicantCredentialIds(applicantLicensesJson, applicantLicenseRows) {
  const fromJson = Array.isArray(applicantLicensesJson) ? applicantLicensesJson : []
  const fromTable = (applicantLicenseRows || [])
    .map((r) => String(r?.category || '').trim())
    .filter(Boolean)
  return [...new Set([...fromJson.map(String), ...fromTable])]
}
