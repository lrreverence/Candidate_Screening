import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { uploadJobImage, deleteJobImage, getJobImageUrl } from '../../lib/storageUpload'
import {
  AGE_BRACKETS,
  DEFAULT_AGE_SCORING,
  normalizeAgeScoringFromJob
} from '../../lib/ageScoring'
import {
  GENDER_SCORING_OPTIONS,
  DEFAULT_GENDER_SCORING,
  normalizeGenderScoringFromJob
} from '../../lib/genderScoring'
import {
  HEIGHT_BRACKETS,
  WEIGHT_BRACKETS,
  DEFAULT_HEIGHT_SCORING,
  DEFAULT_WEIGHT_SCORING,
  normalizeHeightScoringFromJob,
  normalizeWeightScoringFromJob
} from '../../lib/bodyMetricsScoring'
import {
  WORK_EXPERIENCE_BRACKETS,
  DEFAULT_EMPLOYMENT_EXPERIENCE_SCORING,
  normalizeEmploymentExperienceScoringFromJob
} from '../../lib/workExperienceScoring'
import {
  TRAINING_COUNT_TIER_ROWS,
  DEFAULT_TRAINING_COUNT_SCORING,
  normalizeTrainingCountScoringFromJob
} from '../../lib/trainingCountScoring'
import {
  OTHERS_SKILL_OPTIONS,
  OTHERS_PLACE_OPTIONS,
  OTHERS_SALARY_OPTIONS,
  OTHERS_EMPLOYMENT_TYPE_OPTIONS,
  normalizeOthersScoringFromJob
} from '../../lib/othersScoring'
import AdminNotificationBell from '../../components/admin/AdminNotificationBell'
import AdminHelpButton from '../../components/admin/AdminHelpButton'

/** Matches resume /profile/resume sections; weights across categories must sum to 100%. */
const DEFAULT_CATEGORY_WEIGHTS = {
  personal: 25,
  education: 10,
  employment: 10,
  licenses: 15,
  training: 15,
  clearances: 15,
  others: 10
}

const JOB_SCORING_SECTIONS = [
  {
    key: 'personal',
    label: 'Personal Information',
    icon: 'person',
    fields: [
      { id: 'full_name', label: 'Full name' },
      { id: 'address', label: 'Address' },
      { id: 'contact', label: 'Contact (email & phone)' },
      { id: 'date_of_birth', label: 'Date of birth' },
      { id: 'gender', label: 'Gender' },
      { id: 'civil_status', label: 'Civil status' },
      { id: 'religion', label: 'Religion' },
      { id: 'height_cm', label: 'Height' },
      { id: 'weight_kg', label: 'Weight' },
      { id: 'languages_spoken', label: 'Languages spoken' }
    ]
  },
  {
    key: 'education',
    label: 'Educational Attainment',
    icon: 'school',
    fields: [
      { id: 'elementary', label: 'Elementary' },
      { id: 'high_school', label: 'High School' },
      { id: 'vocational', label: 'Vocational' },
      { id: 'college', label: 'College' }
    ]
  },
  {
    key: 'employment',
    label: 'Employment Record',
    icon: 'work',
    fields: [
      { id: 'total_experience', label: 'Total work experience (cumulative)' },
      { id: 'position', label: 'Position' },
      { id: 'agency', label: 'Agency' }
    ]
  },
  {
    key: 'licenses',
    label: 'Licenses',
    icon: 'verified',
    fields: [
      { id: 'drivers_license', label: 'Drivers License' },
      { id: 'security_guard_license', label: 'Security Guard License' },
      { id: 'security_officers_license', label: 'Security Officers License' },
      { id: 'security_managers_license', label: 'Security Managers License' },
      { id: 'bank_and_armor_license', label: 'Bank And Armor License' },
      { id: 'protection_agent', label: 'Protection Agent' }
    ]
  },
  {
    key: 'training',
    label: 'Training / Certificates',
    icon: 'workspace_premium',
    fields: [
      { id: 'training_attended', label: 'Training attended' },
      { id: 'date', label: 'Date' }
    ]
  },
  {
    key: 'clearances',
    label: 'Clearances',
    icon: 'gavel',
    fields: [
      { id: 'nbi', label: 'NBI' },
      { id: 'police', label: 'Police clearance' },
      { id: 'brgy', label: 'Brgy clearance' },
      { id: 'court', label: 'Court clearance' }
    ]
  },
  {
    key: 'others',
    label: 'Others',
    icon: 'more_horiz',
    fields: [
      { id: 'skills', label: 'Skills' },
      { id: 'preferred_places', label: 'Preferred places' },
      { id: 'preferred_monthly_salary', label: 'Preferred monthly salary' },
      { id: 'can_start', label: 'Can start' },
      { id: 'employment_types', label: 'Employment type' }
    ]
  }
]

const LEGACY_CATEGORY_TO_KEY = {
  'Personal Info': 'personal',
  'Personal Information': 'personal',
  'Educational Attainment': 'education',
  'Employment Record': 'employment',
  Clearances: 'clearances',
  Others: 'others'
}

const defaultFieldWeightsForSection = (section) => {
  const n = section.fields.length
  if (n === 0) return []
  const base = Math.floor(1000 / n) / 10
  let acc = 0
  return section.fields.map((f, i) => {
    if (i < n - 1) {
      acc += base
      return { field: f.id, percentage: base }
    }
    return { field: f.id, percentage: Math.round((100 - acc) * 10) / 10 }
  })
}

const buildDefaultCategoryPercentages = () =>
  JOB_SCORING_SECTIONS.map((sec) => ({
    category_key: sec.key,
    category: sec.label,
    percentage: DEFAULT_CATEGORY_WEIGHTS[sec.key],
    field_weights: defaultFieldWeightsForSection(sec)
  }))

const preprocessLegacyCategoryRows = (raw) => {
  if (!Array.isArray(raw)) return []
  const list = [...raw]
  const combinedIdx = list.findIndex(
    (r) =>
      typeof r?.category === 'string' &&
      r.category.includes('Licenses') &&
      r.category.includes('Training')
  )
  if (combinedIdx === -1) return list
  const combined = list[combinedIdx]
  const pct = parseFloat(combined.percentage)
  const safe = Number.isFinite(pct) ? pct : 30
  const a = Math.round((safe / 2) * 10) / 10
  const b = Math.round((safe - a) * 10) / 10
  const next = list.filter((_, i) => i !== combinedIdx)
  next.push({
    category_key: 'licenses',
    category: 'Licenses',
    percentage: a,
    field_weights: null
  })
  next.push({
    category_key: 'training',
    category: 'Training / Certificates',
    percentage: b,
    field_weights: null
  })
  return next
}

/**
 * Keeps only weights for fields currently defined on the section, drops removed keys,
 * and rescales so the section total is 100% when needed (e.g. legacy rows still had
 * place/from/to percentages while the UI only shows total_experience, position, agency).
 */
const normalizeFieldWeightsForSection = (sec, rawWeights) => {
  const list = Array.isArray(rawWeights) ? rawWeights : []
  const map = new Map()
  for (const fw of list) {
    if (!fw || typeof fw !== 'object') continue
    const id = fw.field
    if (id == null) continue
    const p = parseFloat(fw.percentage)
    map.set(String(id), Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0)
  }
  const definedIds = new Set(sec.fields.map((f) => f.id))
  const hasStale = [...map.keys()].some((k) => !definedIds.has(k))

  let weights = sec.fields.map((f) => ({
    field: f.id,
    percentage: map.has(f.id) ? map.get(f.id) : 0
  }))
  const sum = weights.reduce((s, w) => s + w.percentage, 0)

  if (sum <= 0) return defaultFieldWeightsForSection(sec)

  if (hasStale || Math.abs(sum - 100) > 0.02) {
    const scale = 100 / sum
    let acc = 0
    weights = weights.map((w, i) => {
      if (i < weights.length - 1) {
        const v = Math.round(w.percentage * scale * 10) / 10
        acc += v
        return { field: w.field, percentage: v }
      }
      return { field: w.field, percentage: Math.round((100 - acc) * 10) / 10 }
    })
  }

  return weights
}

const normalizeCategoryPercentagesFromJob = (raw) => {
  const rows = preprocessLegacyCategoryRows(Array.isArray(raw) ? raw : [])
  const byKey = {}
  for (const row of rows) {
    const key = row.category_key || LEGACY_CATEGORY_TO_KEY[row.category]
    if (!key) continue
    if (!byKey[key]) byKey[key] = { ...row, category_key: key }
  }

  return JOB_SCORING_SECTIONS.map((sec) => {
    const existing = byKey[sec.key]
    let percentage = existing?.percentage
    if (percentage == null || !Number.isFinite(Number(percentage))) {
      percentage = DEFAULT_CATEGORY_WEIGHTS[sec.key]
    }
    percentage = Math.max(0, Math.min(100, Math.round(Number(percentage) * 10) / 10))

    const field_weights = normalizeFieldWeightsForSection(sec, existing?.field_weights)
    return {
      category_key: sec.key,
      category: sec.label,
      percentage,
      field_weights
    }
  })
}

const JobsManagement = () => {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showJobForm, setShowJobForm] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    closed: 0,
    totalApplications: 0
  })
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    department: '',
    employment_type: 'Full-time',
    description: '',
    requirements: '',
    salary_range: '',
    status: 'active',
    open_until: '', // YYYY-MM-DD
    posting_priority: 'Pooling', // Urgent | Pooling
    required_credentials: [],
    required_documents: [],
    category_percentages: buildDefaultCategoryPercentages(),
    age_scoring: { ...DEFAULT_AGE_SCORING },
    gender_scoring: { ...DEFAULT_GENDER_SCORING },
    height_scoring: { ...DEFAULT_HEIGHT_SCORING },
    weight_scoring: { ...DEFAULT_WEIGHT_SCORING },
    employment_experience_scoring: { ...DEFAULT_EMPLOYMENT_EXPERIENCE_SCORING },
    training_count_scoring: { ...DEFAULT_TRAINING_COUNT_SCORING },
    others_scoring: normalizeOthersScoringFromJob(null),
    image: null // Store image path
  })
  const [scoringAccordionKey, setScoringAccordionKey] = useState('personal')
  const [imageFile, setImageFile] = useState(null) // Store selected file
  const [imagePreview, setImagePreview] = useState(null) // Store preview URL
  const [uploadingImage, setUploadingImage] = useState(false)
  const [othersTagDraft, setOthersTagDraft] = useState({
    skills: '',
    preferred_places: '',
    preferred_monthly_salary: ''
  })

  const licenseOptions = [
    { id: 'psa_birth_certificate', label: 'PSA Birth Certificate', subtitle: 'Philippine Statistics Authority' },
    { id: 'nbi_clearance', label: 'NBI Clearance', subtitle: 'National Bureau of Investigation' },
    { id: 'sss_id', label: 'SSS ID / E-1 Form', subtitle: 'Social Security System' },
    { id: 'philhealth_id', label: 'PhilHealth ID', subtitle: 'Philippine Health Insurance Corporation' },
    { id: 'pagibig_id', label: 'Pag-IBIG ID', subtitle: 'Home Development Mutual Fund' },
    { id: 'tin_id', label: 'TIN ID', subtitle: 'Tax Identification Number' },
    { id: 'drivers_license', label: "Driver's License", subtitle: 'Land Transportation Office (LTO)' },
    { id: 'first_aid', label: 'First Aid Certificate', subtitle: 'BLS/CPR Training' },
    { id: 'security_guard_license', label: 'Security Guard License', subtitle: 'PASCO / PNP Security Agency' },
    { id: 'security_officers_license', label: 'Security Officers License', subtitle: 'Supervisory / officer level' },
    { id: 'security_managers_license', label: 'Security Managers License', subtitle: 'Managerial level' },
    { id: 'bank_and_armor_license', label: 'Bank And Armor License', subtitle: 'Bank / armored transport' },
    { id: 'protection_agent', label: 'Protection Agent', subtitle: 'Close protection / escort' }
  ]

  useEffect(() => {
    fetchJobs()
    fetchStats()
  }, [statusFilter, searchQuery])

  const fetchStats = async () => {
    try {
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select('status')

      if (error) throw error

      const total = jobsData?.length || 0
      const active = jobsData?.filter(job => job.status === 'active').length || 0
      const closed = jobsData?.filter(job => job.status === 'closed' || job.status === 'inactive').length || 0

      // Get total applications count
      const { count: totalApplications, error: appsError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      if (appsError) throw appsError

      setStats({ total, active, closed, totalApplications: totalApplications || 0 })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchJobs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          applications:applications(count)
        `)
        .order('created_at', { ascending: false })

      // Apply status filter
      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      // Filter by search query
      let filtered = data || []
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(job =>
          job.title?.toLowerCase().includes(query) ||
          job.location?.toLowerCase().includes(query) ||
          job.department?.toLowerCase().includes(query)
        )
      }

      setJobs(filtered)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'check_circle', label: 'Active' },
      'closed': { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'cancel', label: 'Closed' },
      'inactive': { bg: 'bg-gray-100', text: 'text-gray-600', icon: 'pause_circle', label: 'Inactive' },
      'draft': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'edit', label: 'Draft' }
    }

    const normalizedStatus = status?.toString().toLowerCase().trim() || 'active'
    const config = statusMap[normalizedStatus] || statusMap['active']
    return (
      <span className={`inline-flex items-center gap-1 rounded-md ${config.bg} px-2.5 py-1 text-xs font-semibold ${config.text}`}>
        <span className="material-symbols-outlined text-sm">{config.icon}</span>
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getLicenseLabel = (licenseId) => {
    const license = licenseOptions.find(l => l.id === licenseId)
    return license ? license.label : licenseId
  }

  const handleToggleStatus = async (jobId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'closed' : 'active'
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId)

      if (error) throw error

      // Refresh jobs list
      fetchJobs()
      fetchStats()
    } catch (error) {
      console.error('Error updating job status:', error)
      alert('Failed to update job status')
    }
  }

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)

      if (error) throw error

      // Refresh jobs list
      fetchJobs()
      fetchStats()
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Failed to delete job posting')
    }
  }

  const handleOpenJobForm = async (job = null) => {
    if (job) {
      setEditingJob(job)
      const openUntilValue = (() => {
        // Best-effort: support either date-only ("YYYY-MM-DD") or ISO timestamp.
        const raw = job.open_until || job.job_open_until || job.openUntil || job.deadline || ''
        if (!raw) return ''
        const d = new Date(raw)
        if (Number.isNaN(d.getTime())) return ''
        return d.toISOString().slice(0, 10)
      })()

      const postingPriority = (() => {
        const raw = (job.posting_priority || job.priority || job.urgency || '').toString().trim()
        if (raw) return /urgent/i.test(raw) ? 'Urgent' : 'Pooling'
        // If badge says urgent, treat as urgent; otherwise pooling.
        if ((job.badge_text || '').toString().toLowerCase().includes('urgent')) return 'Urgent'
        return 'Pooling'
      })()

      const categoryPercentages = (() => {
        const raw =
          job.category_percentages ||
          job.categoryPercentages ||
          job.category_weights ||
          job.categoryWeights ||
          null
        let parsed = null
        if (Array.isArray(raw) && raw.length > 0) parsed = raw
        else if (typeof raw === 'string') {
          try {
            const p = JSON.parse(raw)
            if (Array.isArray(p) && p.length > 0) parsed = p
          } catch {
            // ignore
          }
        }
        return normalizeCategoryPercentagesFromJob(parsed)
      })()

      setFormData({
        title: job.title || '',
        location: job.location || '',
        department: job.department || '',
        employment_type: job.type || job.employment_type || 'Full-time', // Map type to employment_type
        description: job.description || '',
        requirements: job.requirements || '',
        salary_range: job.salary || job.salary_range || '', // Map salary to salary_range
        status: job.status || 'active',
        open_until: openUntilValue,
        posting_priority: postingPriority,
        required_credentials: Array.isArray(job.required_credentials) ? job.required_credentials : [],
        required_documents: Array.isArray(job.required_documents) ? job.required_documents : [],
        category_percentages: categoryPercentages,
        age_scoring: normalizeAgeScoringFromJob(job.age_scoring ?? job.ageScoring),
        gender_scoring: normalizeGenderScoringFromJob(job.gender_scoring ?? job.genderScoring),
        height_scoring: normalizeHeightScoringFromJob(job.height_scoring ?? job.heightScoring),
        weight_scoring: normalizeWeightScoringFromJob(job.weight_scoring ?? job.weightScoring),
        employment_experience_scoring: normalizeEmploymentExperienceScoringFromJob(
          job.employment_experience_scoring ?? job.employmentExperienceScoring
        ),
        training_count_scoring: normalizeTrainingCountScoringFromJob(
          job.training_count_scoring ?? job.trainingCountScoring
        ),
        others_scoring: normalizeOthersScoringFromJob(job.others_scoring ?? job.othersScoring),
        image: job.image || null
      })
      
      // Load image preview if job has an image
      if (job.image) {
        const imageUrl = await getJobImageUrl(job.image)
        setImagePreview(imageUrl)
      } else {
        setImagePreview(null)
      }
    } else {
      setEditingJob(null)
      setFormData({
        title: '',
        location: '',
        department: '',
        employment_type: 'Full-time',
        description: '',
        requirements: '',
        salary_range: '',
        status: 'active',
        open_until: '',
        posting_priority: 'Pooling',
        required_credentials: [],
        required_documents: [],
        category_percentages: buildDefaultCategoryPercentages(),
        age_scoring: { ...DEFAULT_AGE_SCORING },
        gender_scoring: { ...DEFAULT_GENDER_SCORING },
        height_scoring: { ...DEFAULT_HEIGHT_SCORING },
        weight_scoring: { ...DEFAULT_WEIGHT_SCORING },
        employment_experience_scoring: { ...DEFAULT_EMPLOYMENT_EXPERIENCE_SCORING },
        training_count_scoring: { ...DEFAULT_TRAINING_COUNT_SCORING },
        others_scoring: normalizeOthersScoringFromJob(null),
        image: null
      })
      setImagePreview(null)
    }
    setScoringAccordionKey('personal')
    setImageFile(null)
    setShowJobForm(true)
  }

  const handleCloseJobForm = () => {
    setShowJobForm(false)
    setEditingJob(null)
    setFormData({
      title: '',
      location: '',
      department: '',
      employment_type: 'Full-time',
      description: '',
      requirements: '',
      salary_range: '',
      status: 'active',
      open_until: '',
      posting_priority: 'Pooling',
      required_credentials: [],
      required_documents: [],
      category_percentages: buildDefaultCategoryPercentages(),
      age_scoring: { ...DEFAULT_AGE_SCORING },
      gender_scoring: { ...DEFAULT_GENDER_SCORING },
      height_scoring: { ...DEFAULT_HEIGHT_SCORING },
      weight_scoring: { ...DEFAULT_WEIGHT_SCORING },
      employment_experience_scoring: { ...DEFAULT_EMPLOYMENT_EXPERIENCE_SCORING },
      training_count_scoring: { ...DEFAULT_TRAINING_COUNT_SCORING },
      others_scoring: normalizeOthersScoringFromJob(null),
      image: null
    })
    setScoringAccordionKey('personal')
    setImageFile(null)
    setImagePreview(null)
    setOthersTagDraft({ skills: '', preferred_places: '', preferred_monthly_salary: '' })
  }

  const setAgeScoring = (patch) => {
    setFormData((prev) => ({
      ...prev,
      age_scoring: { ...(prev.age_scoring || DEFAULT_AGE_SCORING), ...patch }
    }))
  }

  const setGenderScoring = (patch) => {
    setFormData((prev) => ({
      ...prev,
      gender_scoring: { ...(prev.gender_scoring || DEFAULT_GENDER_SCORING), ...patch }
    }))
  }

  const setHeightScoring = (patch) => {
    setFormData((prev) => ({
      ...prev,
      height_scoring: { ...(prev.height_scoring || DEFAULT_HEIGHT_SCORING), ...patch }
    }))
  }

  const setWeightScoring = (patch) => {
    setFormData((prev) => ({
      ...prev,
      weight_scoring: { ...(prev.weight_scoring || DEFAULT_WEIGHT_SCORING), ...patch }
    }))
  }

  const setEmploymentExperienceScoring = (patch) => {
    setFormData((prev) => ({
      ...prev,
      employment_experience_scoring: {
        ...(prev.employment_experience_scoring || DEFAULT_EMPLOYMENT_EXPERIENCE_SCORING),
        ...patch
      }
    }))
  }

  const setTrainingCountTierPercentage = (tierIndex, value) => {
    const numValue = parseFloat(value)
    const safe = Number.isFinite(numValue) ? Math.max(0, Math.min(100, numValue)) : 0
    setFormData((prev) => {
      const cur = normalizeTrainingCountScoringFromJob(prev.training_count_scoring)
      const next = [...(cur.tier_percentages || [])]
      if (tierIndex < 0 || tierIndex >= TRAINING_COUNT_TIER_ROWS.length) return prev
      while (next.length < TRAINING_COUNT_TIER_ROWS.length) {
        next.push(0)
      }
      next[tierIndex] = Math.round(safe * 100) / 100
      return {
        ...prev,
        training_count_scoring: { tier_percentages: next }
      }
    })
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const getCategoryTotal = () => {
    const items = Array.isArray(formData.category_percentages) ? formData.category_percentages : []
    return items.reduce((sum, row) => sum + (parseFloat(row.percentage) || 0), 0)
  }

  const setCategoryPercentageByKey = (categoryKey, value) => {
    const numValue = parseFloat(value)
    const safe = Number.isFinite(numValue) ? Math.max(0, Math.min(100, numValue)) : 0
    setFormData(prev => ({
      ...prev,
      category_percentages: (Array.isArray(prev.category_percentages) ? prev.category_percentages : []).map(row =>
        row.category_key === categoryKey ? { ...row, percentage: safe } : row
      )
    }))
  }

  const setFieldWeight = (categoryKey, fieldId, value) => {
    const numValue = parseFloat(value)
    const safe = Number.isFinite(numValue) ? Math.max(0, Math.min(100, numValue)) : 0
    const section = JOB_SCORING_SECTIONS.find((s) => s.key === categoryKey)
    if (!section) return
    setFormData((prev) => ({
      ...prev,
      category_percentages: (Array.isArray(prev.category_percentages) ? prev.category_percentages : []).map((row) => {
        if (row.category_key !== categoryKey) return row
        const prevMap = new Map(
          (Array.isArray(row.field_weights) ? row.field_weights : []).map((fw) => [
            fw.field,
            parseFloat(fw.percentage) || 0
          ])
        )
        prevMap.set(fieldId, safe)
        const field_weights = section.fields.map((f) => ({
          field: f.id,
          percentage:
            f.id === fieldId
              ? safe
              : Math.max(0, Math.min(100, Number.isFinite(prevMap.get(f.id)) ? prevMap.get(f.id) : 0))
        }))
        return { ...row, field_weights }
      })
    }))
  }

  const getFieldWeightsTotal = (categoryKey) => {
    const sec = JOB_SCORING_SECTIONS.find((s) => s.key === categoryKey)
    const row = (Array.isArray(formData.category_percentages) ? formData.category_percentages : []).find(
      (r) => r.category_key === categoryKey
    )
    if (!sec || !row?.field_weights?.length) return 0
    const map = new Map(row.field_weights.map((w) => [w.field, parseFloat(w.percentage) || 0]))
    return sec.fields.reduce((sum, f) => sum + (map.get(f.id) || 0), 0)
  }

  /** % of Personal category for a field — drives conditional age/gender/height/weight "max points". */
  const getPersonalFieldPercent = (fieldId) => {
    const row = (Array.isArray(formData.category_percentages) ? formData.category_percentages : []).find(
      (r) => r.category_key === 'personal'
    )
    const fw = row?.field_weights?.find((w) => w.field === fieldId)
    return parseFloat(fw?.percentage) || 0
  }

  const halfOfPersonalField = (fieldId) => {
    const v = getPersonalFieldPercent(fieldId)
    return Math.round((v / 2) * 100) / 100
  }

  const getEmploymentFieldPercent = (fieldId) => {
    const row = (Array.isArray(formData.category_percentages) ? formData.category_percentages : []).find(
      (r) => r.category_key === 'employment'
    )
    const fw = row?.field_weights?.find((w) => w.field === fieldId)
    return parseFloat(fw?.percentage) || 0
  }

  const halfOfEmploymentField = (fieldId) => {
    const v = getEmploymentFieldPercent(fieldId)
    return Math.round((v / 2) * 100) / 100
  }

  const getOthersFieldPercent = (fieldId) => {
    const row = (Array.isArray(formData.category_percentages) ? formData.category_percentages : []).find(
      (r) => r.category_key === 'others'
    )
    const fw = row?.field_weights?.find((w) => w.field === fieldId)
    return parseFloat(fw?.percentage) || 0
  }

  const toggleOthersScoringListValue = (fieldKey, value) => {
    const v = String(value || '').trim()
    if (!v) return
    setFormData((prev) => {
      const cur = normalizeOthersScoringFromJob(prev.others_scoring)
      const list = [...cur[fieldKey]]
      const i = list.indexOf(v)
      if (i >= 0) list.splice(i, 1)
      else list.push(v)
      return { ...prev, others_scoring: { ...cur, [fieldKey]: list } }
    })
  }

  const addOthersScoringCustomValue = (fieldKey, raw) => {
    const v = String(raw || '').trim()
    if (!v) return
    setFormData((prev) => {
      const cur = normalizeOthersScoringFromJob(prev.others_scoring)
      const set = new Set(cur[fieldKey])
      set.add(v)
      return { ...prev, others_scoring: { ...cur, [fieldKey]: [...set] } }
    })
    setOthersTagDraft((d) => ({ ...d, [fieldKey]: '' }))
  }

  const toggleOthersScoringEmploymentType = (id) => {
    const v = String(id || '').trim()
    if (!v) return
    setFormData((prev) => {
      const cur = normalizeOthersScoringFromJob(prev.others_scoring)
      const list = [...cur.employment_types]
      const i = list.indexOf(v)
      if (i >= 0) list.splice(i, 1)
      else list.push(v)
      return { ...prev, others_scoring: { ...cur, employment_types: list } }
    })
  }

  const patchOthersCanStartScoring = (patch) => {
    setFormData((prev) => {
      const cur = normalizeOthersScoringFromJob(prev.others_scoring)
      return {
        ...prev,
        others_scoring: {
          ...cur,
          can_start: { ...cur.can_start, ...patch },
        },
      }
    })
  }

  const normalizePostingPriorityToBadge = (priority) => {
    if (priority === 'Urgent') {
      return { badge_text: 'Urgent Hiring', badge_icon: 'priority_high', badge_color: 'primary' }
    }
    return { badge_text: 'Pooling', badge_icon: 'group', badge_color: 'secondary' }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = async () => {
    // If editing and there's an existing image, delete it from storage
    if (editingJob && formData.image) {
      await deleteJobImage(formData.image)
    }
    
    setImageFile(null)
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image: null }))
  }

  const handleSubmitJob = async (e) => {
    e.preventDefault()

    if (!formData.title || !formData.location) {
      alert('Please fill in title and location')
      return
    }

    try {
      const categoryTotal = getCategoryTotal()
      if (Math.round(categoryTotal * 10) / 10 !== 100) {
        alert('Category total must equal 100%')
        return
      }

      const rows = Array.isArray(formData.category_percentages) ? formData.category_percentages : []
      for (const row of rows) {
        const sec = JOB_SCORING_SECTIONS.find((s) => s.key === row.category_key)
        if (!sec) continue
        const map = new Map((row.field_weights || []).map((w) => [w.field, parseFloat(w.percentage) || 0]))
        const subTotal = sec.fields.reduce((s, f) => s + (map.get(f.id) || 0), 0)
        if (Math.round(subTotal * 10) / 10 !== 100) {
          alert(
            `Within "${row.category}", field weights must total 100% of that category (currently ${subTotal.toFixed(1)}%).`
          )
          return
        }
      }

      let imagePath = formData.image

      // Upload new image if one was selected
      if (imageFile) {
        setUploadingImage(true)
        try {
          // Delete old image if editing
          if (editingJob && formData.image) {
            await deleteJobImage(formData.image)
          }

          const uploadResult = await uploadJobImage(imageFile, editingJob?.id)
          imagePath = uploadResult.path
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError)
          alert(`Failed to upload image: ${uploadError.message}`)
          setUploadingImage(false)
          return
        } finally {
          setUploadingImage(false)
        }
      }

      // Prepare data for submission - map form fields to database columns
      const badge = normalizePostingPriorityToBadge(formData.posting_priority)
      const submitData = {
        title: formData.title,
        location: formData.location || null,
        salary: formData.salary_range || null, // Map salary_range to salary
        type: formData.employment_type || null, // Map employment_type to type
        department: formData.department || null,
        description: formData.description || null,
        requirements: formData.requirements || null,
        status: formData.status || 'active',
        // Optional fields (best-effort; will be removed if DB doesn't support them)
        // Store as a date-only string if supported by DB (avoids timezone day-shift)
        open_until: formData.open_until || null,
        posting_priority: formData.posting_priority || 'Pooling',
        category_percentages: Array.isArray(formData.category_percentages) ? formData.category_percentages : [],
        badge_text: badge.badge_text,
        badge_icon: badge.badge_icon,
        badge_color: badge.badge_color,
        required_credentials: Array.isArray(formData.required_credentials) ? formData.required_credentials : [],
        required_documents: Array.isArray(formData.required_documents) ? formData.required_documents : [],
        image: imagePath || null,
        age_scoring: normalizeAgeScoringFromJob({
          ...formData.age_scoring,
          max_points: getPersonalFieldPercent('date_of_birth')
        }),
        gender_scoring: normalizeGenderScoringFromJob({
          ...formData.gender_scoring,
          max_points: getPersonalFieldPercent('gender')
        }),
        height_scoring: normalizeHeightScoringFromJob({
          ...formData.height_scoring,
          max_points: getPersonalFieldPercent('height_cm')
        }),
        weight_scoring: normalizeWeightScoringFromJob({
          ...formData.weight_scoring,
          max_points: getPersonalFieldPercent('weight_kg')
        }),
        employment_experience_scoring: normalizeEmploymentExperienceScoringFromJob({
          ...formData.employment_experience_scoring,
          max_points: getEmploymentFieldPercent('total_experience')
        }),
        training_count_scoring: normalizeTrainingCountScoringFromJob(formData.training_count_scoring),
        others_scoring: normalizeOthersScoringFromJob(formData.others_scoring)
      }

      const stripUnknownColumnFromError = (errorMessage) => {
        const msg = errorMessage || ''
        // PostgreSQL: column "open_until" of relation "jobs" does not exist
        const pg = /column\s+"([^"]+)"/i.exec(msg)
        if (pg) return pg[1]
        // PostgREST: Could not find the 'age_scoring' column of 'jobs' in the schema cache
        const rest = /Could not find the '([^']+)' column of 'jobs'/i.exec(msg)
        if (rest) return rest[1]
        return null
      }

      const maxSchemaRetries = 24
      const strippedColumns = new Set()

      if (editingJob) {
        // Update existing job (best-effort: retry without unknown columns)
        let payload = { ...submitData }
        let updated = false
        let lastUpdateError = null
        for (let attempt = 0; attempt < maxSchemaRetries; attempt++) {
          const { error } = await supabase
            .from('jobs')
            .update(payload)
            .eq('id', editingJob.id)

          if (!error) {
            updated = true
            break
          }
          lastUpdateError = error
          const msg = error?.message || ''
          const unknownCol = stripUnknownColumnFromError(msg)
          if (!unknownCol || !(unknownCol in payload)) {
            console.error('Update error:', error)
            throw error
          }
          strippedColumns.add(unknownCol)
          delete payload[unknownCol]
        }
        if (!updated) {
          console.error('Update error (after retries):', lastUpdateError)
          throw lastUpdateError
        }
        if (strippedColumns.size) {
          alert(
            `Job updated, but some fields were NOT saved because your database schema is missing columns: ${Array.from(
              strippedColumns
            ).join(', ')}. Please run the latest Supabase migrations.`
          )
        } else {
          alert('Job updated successfully!')
        }
      } else {
        // Create new job (best-effort: retry without unknown columns)
        let payload = { ...submitData }
        let inserted = false
        let lastInsertError = null
        for (let attempt = 0; attempt < maxSchemaRetries; attempt++) {
          const { error } = await supabase
            .from('jobs')
            .insert([payload])

          if (!error) {
            inserted = true
            break
          }
          lastInsertError = error
          const msg = error?.message || ''
          const unknownCol = stripUnknownColumnFromError(msg)
          if (!unknownCol || !(unknownCol in payload)) {
            console.error('Insert error:', error)
            throw error
          }
          strippedColumns.add(unknownCol)
          delete payload[unknownCol]
        }
        if (!inserted) {
          console.error('Insert error (after retries):', lastInsertError)
          throw lastInsertError
        }
        if (strippedColumns.size) {
          alert(
            `Job posted, but some fields were NOT saved because your database schema is missing columns: ${Array.from(
              strippedColumns
            ).join(', ')}. Please run the latest Supabase migrations.`
          )
        } else {
          alert('Job posted successfully!')
        }
      }

      handleCloseJobForm()
      fetchJobs()
      fetchStats()
    } catch (error) {
      console.error('Error saving job:', error)
      const errorMessage = error?.message || 'Unknown error occurred'
      alert(`Failed to save job posting: ${errorMessage}`)
    }
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-[#f3f4f6]">
      {/* Top Navigation Bar */}
      <header className="hidden lg:flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-8 shadow-sm">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-navy">Job Postings</h2>
          <p className="text-xs text-gray-500 hidden sm:block">Manage security personnel job openings</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Search */}
          <div className="relative w-48 lg:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
            <input
              className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy transition-all"
              placeholder="Search jobs..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <AdminNotificationBell />
          <AdminHelpButton />
        </div>
      </header>

      {/* Mobile Search Bar */}
      <div className="lg:hidden p-4 bg-white border-b border-gray-200">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
          <input
            className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-4 text-sm text-gray-700 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy transition-all"
            placeholder="Search jobs..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 lg:mb-8">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Job Postings</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.total}</p>
              </div>
              <div className="rounded-md bg-blue-50 p-2 text-primary">
                <span className="material-symbols-outlined">work</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Postings</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.active}</p>
              </div>
              <div className="rounded-md bg-blue-50 p-2 text-blue-600">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <span className="font-medium">Currently accepting applications</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Closed Postings</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.closed}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-2 text-gray-600">
                <span className="material-symbols-outlined">cancel</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Applications</p>
                <p className="mt-1 text-2xl font-bold text-navy">{stats.totalApplications}</p>
              </div>
              <div className="rounded-md bg-purple-50 p-2 text-purple-600">
                <span className="material-symbols-outlined">assignment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="flex flex-col gap-6 rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* Filter Toolbar */}
          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 lg:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Status:</span>
                <select
                  className="appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
            </div>
            <button
              onClick={() => handleOpenJobForm()}
              className="flex items-center justify-center gap-2 rounded-md bg-navy px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-navy-light focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1 w-full lg:w-auto"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Create New Job
            </button>
          </div>

          {/* Jobs Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="rounded-full bg-gray-100 p-6 mb-4">
                <span className="material-symbols-outlined text-5xl text-gray-400">work_off</span>
              </div>
              <h3 className="text-lg font-semibold text-navy mb-2">No job postings found</h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                {searchQuery || statusFilter
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first job posting'}
              </p>
              {!searchQuery && !statusFilter && (
                <button
                  onClick={() => handleOpenJobForm()}
                  className="flex items-center justify-center gap-2 rounded-md bg-navy px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-navy-light"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Create Job Posting
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 lg:p-6 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-navy mb-1">{job.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {job.location || 'Not specified'}
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    {job.department && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="material-symbols-outlined text-sm">business</span>
                        <span>{job.department}</span>
                      </div>
                    )}
                    {job.employment_type && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>{job.employment_type}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="material-symbols-outlined text-sm">group</span>
                      <span>{job.applications?.[0]?.count || 0} applications</span>
                    </div>
                    {Array.isArray(job.required_credentials) && job.required_credentials.length > 0 && (
                      <div className="flex items-start gap-2 text-gray-600">
                        <span className="material-symbols-outlined text-sm mt-0.5">verified</span>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-700 mb-1">Required Credentials:</p>
                          <div className="flex flex-wrap gap-1">
                            {job.required_credentials.slice(0, 3).map((credId) => (
                              <span
                                key={credId}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {getLicenseLabel(credId)}
                              </span>
                            ))}
                            {job.required_credentials.length > 3 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                +{job.required_credentials.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Posted {formatDate(job.created_at)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(job.id, job.status)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-navy transition-all"
                        title={job.status === 'active' ? 'Close job' : 'Activate job'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {job.status === 'active' ? 'close' : 'play_arrow'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleOpenJobForm(job)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary transition-all"
                        title="Edit job"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-all"
                        title="Delete job"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Job Form Modal */}
      {showJobForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-navy">
                {editingJob ? 'Edit Job Posting' : 'Create New Job Posting'}
              </h3>
              <button
                onClick={handleCloseJobForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitJob} className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleFormChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      placeholder="e.g. Security Guard"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleFormChange}
                      required
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      placeholder="e.g. Manila, Philippines"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      placeholder="e.g. Security Operations"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employment Type
                    </label>
                    <select
                      name="employment_type"
                      value={formData.employment_type}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Temporary">Temporary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salary Range
                    </label>
                    <input
                      type="text"
                      name="salary_range"
                      value={formData.salary_range}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                      placeholder="e.g. ₱15,000 - ₱20,000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status (Active/Closed/Draft)
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    >
                      <option value="active">Active</option>
                      <option value="closed">Closed</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Open Until
                    </label>
                    <input
                      type="date"
                      name="open_until"
                      value={formData.open_until}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">Format: mm/dd/yyyy (saved as a date)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Posting Status (Urgent/Pooling)
                    </label>
                    <select
                      name="posting_priority"
                      value={formData.posting_priority}
                      onChange={handleFormChange}
                      className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="Pooling">Pooling</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Image
                  </label>
                  <div className="space-y-3">
                    {imagePreview && (
                      <div className="relative w-full h-48 rounded-lg border border-gray-300 overflow-hidden bg-gray-50">
                        <img
                          src={imagePreview}
                          alt="Job preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <div className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-md hover:border-navy hover:bg-gray-50 transition-colors">
                          <span className="material-symbols-outlined text-gray-400">image</span>
                          <span className="text-sm text-gray-600">
                            {imagePreview ? 'Change Image' : 'Upload Job Image'}
                          </span>
                        </div>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Recommended: 1200x600px. Max size: 5MB. Supported formats: JPG, PNG, WebP
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows="4"
                    className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    placeholder="Describe the job responsibilities and duties..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requirements
                  </label>
                  <textarea
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleFormChange}
                    rows="4"
                    className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    placeholder="List the qualifications and requirements..."
                  />
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-extrabold uppercase tracking-wide text-gray-900">Preferences</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        These show on the applicant job page and are also used for conditional matching under the Others
                        scoring section.
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-gray-400" aria-hidden="true">
                      tune
                    </span>
                  </div>

                  {(() => {
                    const osc = normalizeOthersScoringFromJob(formData.others_scoring)
                    return (
                      <div className="mt-4 space-y-5">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Skills needed</p>
                          {osc.skills?.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {osc.skills.map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => toggleOthersScoringListValue('skills', v)}
                                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800"
                                  title="Remove"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                  {v}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {OTHERS_SKILL_OPTIONS.map((opt) => {
                              const active = osc.skills.includes(opt)
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => toggleOthersScoringListValue('skills', opt)}
                                  className={`rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                                    active
                                      ? 'border-navy bg-navy/10 text-navy'
                                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                  }`}
                                  aria-pressed={active}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                          <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <input
                              value={othersTagDraft.skills}
                              onChange={(e) => setOthersTagDraft((d) => ({ ...d, skills: e.target.value }))}
                              placeholder="Add custom skill"
                              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                            />
                            <button
                              type="button"
                              onClick={() => addOthersScoringCustomValue('skills', othersTagDraft.skills)}
                              className="inline-flex items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy/90"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Preferred places</p>
                          {osc.preferred_places?.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {osc.preferred_places.map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => toggleOthersScoringListValue('preferred_places', v)}
                                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800"
                                  title="Remove"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                  {v}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {OTHERS_PLACE_OPTIONS.map((opt) => {
                              const active = osc.preferred_places.includes(opt)
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => toggleOthersScoringListValue('preferred_places', opt)}
                                  className={`rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                                    active
                                      ? 'border-navy bg-navy/10 text-navy'
                                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                  }`}
                                  aria-pressed={active}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                          <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <input
                              value={othersTagDraft.preferred_places}
                              onChange={(e) =>
                                setOthersTagDraft((d) => ({ ...d, preferred_places: e.target.value }))
                              }
                              placeholder="Add custom place"
                              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                            />
                            <button
                              type="button"
                              onClick={() => addOthersScoringCustomValue('preferred_places', othersTagDraft.preferred_places)}
                              className="inline-flex items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy/90"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                            Preferred monthly salary
                          </p>
                          {osc.preferred_monthly_salary?.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                              {osc.preferred_monthly_salary.map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => toggleOthersScoringListValue('preferred_monthly_salary', v)}
                                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800"
                                  title="Remove"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                  {v}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {OTHERS_SALARY_OPTIONS.map((opt) => {
                              const active = osc.preferred_monthly_salary.includes(opt)
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => toggleOthersScoringListValue('preferred_monthly_salary', opt)}
                                  className={`rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                                    active
                                      ? 'border-navy bg-navy/10 text-navy'
                                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                  }`}
                                  aria-pressed={active}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                          <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <input
                              value={othersTagDraft.preferred_monthly_salary}
                              onChange={(e) =>
                                setOthersTagDraft((d) => ({ ...d, preferred_monthly_salary: e.target.value }))
                              }
                              placeholder="Add custom range label"
                              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                addOthersScoringCustomValue(
                                  'preferred_monthly_salary',
                                  othersTagDraft.preferred_monthly_salary
                                )
                              }
                              className="inline-flex items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy/90"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Resume scoring weights
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      Match the resume profile layout: each section can expand. Assign how much of the overall 100% each
                      section gets; inside each section, assign how that section&apos;s share splits across fields (must
                      total 100% within the section).
                    </p>
                  </div>

                  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="divide-y divide-gray-200">
                      {JOB_SCORING_SECTIONS.map((sec) => {
                        const row = (Array.isArray(formData.category_percentages) ? formData.category_percentages : []).find(
                          (r) => r.category_key === sec.key
                        )
                        const isOpen = scoringAccordionKey === sec.key
                        const fieldTotal = getFieldWeightsTotal(sec.key)
                        const fieldTotalOk = Math.round(fieldTotal * 10) / 10 === 100
                        return (
                          <div key={sec.key}>
                            <button
                              type="button"
                              onClick={() => setScoringAccordionKey((prev) => (prev === sec.key ? null : sec.key))}
                              className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left sm:px-5 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="material-symbols-outlined text-[20px] text-gray-500">{sec.icon}</span>
                                <span className="truncate text-sm font-extrabold uppercase tracking-wide text-gray-900">
                                  {sec.label}
                                </span>
                                <span className="hidden sm:inline text-xs font-semibold text-gray-500 whitespace-nowrap">
                                  · {row?.percentage ?? 0}% of total
                                </span>
                              </div>
                              <span
                                className={`material-symbols-outlined text-[22px] text-gray-500 transition-transform shrink-0 ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                                aria-hidden="true"
                              >
                                expand_more
                              </span>
                            </button>

                            {isOpen && (
                              <div className="px-4 pb-4 sm:px-5">
                                <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-wider text-gray-600">
                                        Category weight
                                      </p>
                                      <p className="mt-0.5 text-[11px] text-gray-500">
                                        Share of the overall 100% across all sections
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={row?.percentage ?? 0}
                                        onChange={(e) => setCategoryPercentageByKey(sec.key, e.target.value)}
                                        className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-center focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                                      />
                                      <span className="text-sm text-gray-600">%</span>
                                    </div>
                                  </div>

                                  {sec.key === 'personal' && (
                                    <p className="mb-3 text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                      <strong>Date of birth, Gender, Height, and Weight</strong> in the table set the{' '}
                                      <strong>full-credit value</strong> for the conditional rules below (% of this
                                      category). Outside the chosen bracket / no match = <strong>half</strong> of that
                                      value.
                                    </p>
                                  )}

                                  {sec.key === 'education' && (
                                    <p className="mb-3 text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                      Weights are <strong>per attainment level</strong> (same blocks as the resume:
                                      Elementary, High School, Vocational, College). They must total 100% of this
                                      category. Higher emphasis on College, for example, means a larger share of the
                                      education score comes from that level&apos;s completeness.
                                    </p>
                                  )}

                                  {sec.key === 'licenses' && (
                                    <p className="mb-3 text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                      <strong>Category weight</strong> is this section&apos;s share of the overall 100%.
                                      Each row is <strong>point assignment</strong> for that license slot on the resume
                                      (same six types as the profile). Row weights must total <strong>100%</strong> of
                                      this category.
                                    </p>
                                  )}

                                  {sec.key === 'employment' && (
                                    <p className="mb-3 text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                      <strong>Total work experience (cumulative)</strong> is the sum of months from all
                                      employment rows (job-related and non-related). The weight on that row caps
                                      conditional scoring below; in the chosen bracket = <strong>full</strong>, otherwise{' '}
                                      <strong>half</strong>.
                                    </p>
                                  )}

                                  {sec.key === 'training' && (
                                    <p className="mb-3 text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                      The table above splits <strong>Training attended</strong> and <strong>Date</strong>{' '}
                                      for per-row completeness (must total 100% of this category).{' '}
                                      <strong>By count</strong> sets point assignment by how many filled training rows
                                      the applicant has; each tier is a <strong>% of this category</strong> when that count
                                      applies (0 trainings = 0 from this rubric).
                                    </p>
                                  )}

                                  {sec.key === 'others' && (
                                    <p className="mb-3 text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                      The table below splits the <strong>Others</strong> category across each field.
                                      Under <strong>Conditional scoring</strong>, pick preferred answers; applicants earn
                                      each row&apos;s weight in proportion to matches (empty preference = full credit for
                                      that row). <strong>Can start:</strong> check ASAP and/or set a target date — match
                                      if the applicant chose the same.
                                    </p>
                                  )}

                                  <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                                    <table className="min-w-[520px] w-full border-collapse text-sm">
                                      <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                          <th
                                            scope="col"
                                            className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-600"
                                          >
                                            Field
                                          </th>
                                          <th
                                            scope="col"
                                            className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-600 w-[200px]"
                                          >
                                            {sec.key === 'licenses'
                                              ? 'Point assignment (% of this category)'
                                              : 'Weight (% of this category)'}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sec.fields.map((f) => {
                                          const fw = row?.field_weights?.find((w) => w.field === f.id)
                                          return (
                                            <tr key={f.id} className="bg-white">
                                              <td className="border-b border-gray-200 px-3 py-2.5 text-gray-900 font-medium">
                                                {f.label}
                                              </td>
                                              <td className="border-b border-gray-200 px-3 py-2 align-middle">
                                                <div className="flex items-center gap-2">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                    value={fw?.percentage ?? 0}
                                                    onChange={(e) => setFieldWeight(sec.key, f.id, e.target.value)}
                                                    className="w-full max-w-[120px] rounded-md border border-gray-300 px-2 py-1.5 text-sm text-center focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                                                  />
                                                  <span className="text-sm text-gray-500 shrink-0">%</span>
                                                </div>
                                              </td>
                                            </tr>
                                          )
                                        })}
                                        <tr className="bg-slate-50">
                                          <td className="px-3 py-2.5 text-xs font-black uppercase tracking-widest text-gray-800">
                                            Total (within category)
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <span
                                              className={`text-sm font-extrabold ${
                                                fieldTotalOk ? 'text-green-600' : fieldTotal > 100 ? 'text-red-600' : 'text-blue-600'
                                              }`}
                                            >
                                              {fieldTotal.toFixed(1)}%
                                            </span>
                                            {!fieldTotalOk && (
                                              <span className="ml-2 text-xs text-gray-500">
                                                {fieldTotal < 100
                                                  ? `add ${(100 - fieldTotal).toFixed(1)}%`
                                                  : `reduce ${(fieldTotal - 100).toFixed(1)}%`}
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  {sec.key === 'training' && (
                                    <div className="mt-4 border-t border-gray-200 pt-4">
                                      <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                        By count
                                      </p>
                                      <p className="mt-1 mb-3 text-[11px] text-gray-500">
                                        Filled row = training attended or date has a value (same rules as the resume).
                                        Applicant gets the percentage for the tier that matches their count (6+ uses the
                                        last row).
                                      </p>
                                      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                                        <table className="min-w-[480px] w-full border-collapse text-sm">
                                          <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                              <th
                                                scope="col"
                                                className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-600"
                                              >
                                                Count
                                              </th>
                                              <th
                                                scope="col"
                                                className="border-b border-gray-200 px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-600 w-[220px]"
                                              >
                                                Point assignment (% of this category)
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {TRAINING_COUNT_TIER_ROWS.map((tier, idx) => {
                                              const tcp = normalizeTrainingCountScoringFromJob(
                                                formData.training_count_scoring
                                              )
                                              const pct = tcp.tier_percentages[idx] ?? 0
                                              return (
                                                <tr key={tier.label} className="bg-white">
                                                  <td className="border-b border-gray-200 px-3 py-2.5 text-gray-900 font-medium">
                                                    {tier.label}
                                                  </td>
                                                  <td className="border-b border-gray-200 px-3 py-2 align-middle">
                                                    <div className="flex items-center gap-2">
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                        value={pct}
                                                        onChange={(e) => setTrainingCountTierPercentage(idx, e.target.value)}
                                                        className="w-full max-w-[120px] rounded-md border border-gray-300 px-2 py-1.5 text-sm text-center focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                                                      />
                                                      <span className="text-sm text-gray-500 shrink-0">%</span>
                                                    </div>
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {sec.key === 'employment' && (
                                    <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                                      <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                          Conditional scoring
                                        </p>
                                        <p className="mt-1 text-[11px] text-gray-500">
                                          Total cumulative months of experience; linked to the{' '}
                                          <strong>Total work experience (cumulative)</strong> row. In bracket = full;
                                          outside = half.
                                        </p>
                                      </div>

                                      <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                                          Total work experience
                                        </label>
                                        <p className="text-[11px] text-gray-500 mb-2">
                                          Cumulative months from all employment rows (open-ended &quot;to&quot; dates
                                          count through today).
                                        </p>
                                        <div className="overflow-x-auto pb-1">
                                          <div className="inline-flex min-w-full sm:min-w-0 border-2 border-gray-900 rounded-sm bg-white divide-x-2 divide-gray-900 overflow-hidden">
                                            {WORK_EXPERIENCE_BRACKETS.map((b, idx) => (
                                              <React.Fragment key={b.id}>
                                                <button
                                                  type="button"
                                                  onClick={() => setEmploymentExperienceScoring({ preferred_bracket_id: b.id })}
                                                  className={`flex-1 min-w-[3.75rem] px-1.5 py-3 text-center text-[10px] sm:text-xs font-bold transition-colors leading-tight ${
                                                    formData.employment_experience_scoring?.preferred_bracket_id === b.id
                                                      ? 'bg-amber-50 text-gray-900 ring-2 ring-inset ring-orange-500'
                                                      : 'bg-white text-gray-900 hover:bg-gray-50'
                                                  }`}
                                                >
                                                  {b.label}
                                                </button>
                                                {idx === 1 && (
                                                  <div
                                                    className="flex flex-col items-center justify-center bg-orange-500 text-white min-w-[4rem] px-1.5 py-2 shrink-0"
                                                    title="From Total work experience row in table above"
                                                  >
                                                    <span className="text-[8px] font-bold uppercase tracking-tight opacity-90 text-center leading-tight">
                                                      Total exp.
                                                    </span>
                                                    <span className="text-base sm:text-lg font-extrabold leading-tight">
                                                      {getEmploymentFieldPercent('total_experience').toFixed(1)}
                                                    </span>
                                                    <span className="text-[9px] opacity-90">% cat.</span>
                                                  </div>
                                                )}
                                              </React.Fragment>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                                          <span>
                                            Bracket:{' '}
                                            <strong className="text-gray-900">
                                              {WORK_EXPERIENCE_BRACKETS.find(
                                                (x) => x.id === formData.employment_experience_scoring?.preferred_bracket_id
                                              )?.label ?? '—'}
                                            </strong>
                                          </span>
                                          <span className="text-gray-400 hidden sm:inline">|</span>
                                          <span>
                                            Full:{' '}
                                            <strong className="text-orange-600">
                                              {getEmploymentFieldPercent('total_experience').toFixed(1)}
                                            </strong>
                                          </span>
                                          <span className="text-gray-400 hidden sm:inline">|</span>
                                          <span>
                                            Outside:{' '}
                                            <strong className="text-gray-900">
                                              {halfOfEmploymentField('total_experience').toFixed(1)}
                                            </strong>
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {sec.key === 'others' &&
                                    (() => {
                                      const osc = normalizeOthersScoringFromJob(formData.others_scoring)
                                      const weightBadge = (fieldId, shortLabel) => (
                                        <div
                                          className="flex flex-col items-center justify-center bg-orange-500 text-white min-w-[4.25rem] px-2 py-2 shrink-0 rounded-md"
                                          title={`From ${shortLabel} row in table above`}
                                        >
                                          <span className="text-[8px] font-bold uppercase tracking-tight opacity-90 text-center leading-tight">
                                            {shortLabel}
                                          </span>
                                          <span className="text-base font-extrabold leading-tight">
                                            {getOthersFieldPercent(fieldId).toFixed(1)}
                                          </span>
                                          <span className="text-[9px] opacity-90">% cat.</span>
                                        </div>
                                      )
                                      return (
                                        <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                                          <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                              Conditional scoring
                                            </p>
                                            <p className="mt-1 text-[11px] text-gray-500">
                                              Same options as the applicant resume. Selected tags are what you want for
                                              this job; scoring uses overlap with the applicant&apos;s selections.
                                            </p>
                                          </div>

                                          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                              <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-gray-800">
                                                  Skills needed
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-gray-500">
                                                  Points scale with how many of your picks match the applicant.
                                                </p>
                                              </div>
                                              {weightBadge('skills', 'Skills')}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {OTHERS_SKILL_OPTIONS.map((opt) => {
                                                const on = osc.skills.includes(opt)
                                                return (
                                                  <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => toggleOthersScoringListValue('skills', opt)}
                                                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                                      on
                                                        ? 'border-orange-500 bg-amber-50 text-gray-900'
                                                        : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                                                    }`}
                                                  >
                                                    {on ? '✓ ' : '+ '}
                                                    {opt}
                                                  </button>
                                                )
                                              })}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <input
                                                type="text"
                                                value={othersTagDraft.skills}
                                                onChange={(e) =>
                                                  setOthersTagDraft((d) => ({ ...d, skills: e.target.value }))
                                                }
                                                placeholder="Add custom skill"
                                                className="min-w-[12rem] flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => addOthersScoringCustomValue('skills', othersTagDraft.skills)}
                                                className="rounded-md bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-900 hover:bg-sky-200"
                                              >
                                                Add skill
                                              </button>
                                            </div>
                                          </div>

                                          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                              <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-gray-800">
                                                  Preferred places
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-gray-500">
                                                  City / area preferences you want weighted.
                                                </p>
                                              </div>
                                              {weightBadge('preferred_places', 'Places')}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {OTHERS_PLACE_OPTIONS.map((opt) => {
                                                const on = osc.preferred_places.includes(opt)
                                                return (
                                                  <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => toggleOthersScoringListValue('preferred_places', opt)}
                                                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                                      on
                                                        ? 'border-orange-500 bg-amber-50 text-gray-900'
                                                        : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                                                    }`}
                                                  >
                                                    {on ? '✓ ' : '+ '}
                                                    {opt}
                                                  </button>
                                                )
                                              })}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <input
                                                type="text"
                                                value={othersTagDraft.preferred_places}
                                                onChange={(e) =>
                                                  setOthersTagDraft((d) => ({
                                                    ...d,
                                                    preferred_places: e.target.value,
                                                  }))
                                                }
                                                placeholder="Add custom place"
                                                className="min-w-[12rem] flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                                              />
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  addOthersScoringCustomValue(
                                                    'preferred_places',
                                                    othersTagDraft.preferred_places
                                                  )
                                                }
                                                className="rounded-md bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-900 hover:bg-sky-200"
                                              >
                                                Add place
                                              </button>
                                            </div>
                                          </div>

                                          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                              <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-gray-800">
                                                  Preferred monthly salary
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-gray-500">
                                                  Salary bands you prefer (same labels as the resume).
                                                </p>
                                              </div>
                                              {weightBadge('preferred_monthly_salary', 'Salary')}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {OTHERS_SALARY_OPTIONS.map((opt) => {
                                                const on = osc.preferred_monthly_salary.includes(opt)
                                                return (
                                                  <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() =>
                                                      toggleOthersScoringListValue('preferred_monthly_salary', opt)
                                                    }
                                                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                                      on
                                                        ? 'border-orange-500 bg-amber-50 text-gray-900'
                                                        : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                                                    }`}
                                                  >
                                                    {on ? '✓ ' : '+ '}
                                                    {opt}
                                                  </button>
                                                )
                                              })}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <input
                                                type="text"
                                                value={othersTagDraft.preferred_monthly_salary}
                                                onChange={(e) =>
                                                  setOthersTagDraft((d) => ({
                                                    ...d,
                                                    preferred_monthly_salary: e.target.value,
                                                  }))
                                                }
                                                placeholder="Add custom range label"
                                                className="min-w-[12rem] flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                                              />
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  addOthersScoringCustomValue(
                                                    'preferred_monthly_salary',
                                                    othersTagDraft.preferred_monthly_salary
                                                  )
                                                }
                                                className="rounded-md bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-900 hover:bg-sky-200"
                                              >
                                                Add range
                                              </button>
                                            </div>
                                          </div>

                                          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                              <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-gray-800">
                                                  Can start
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-gray-500">
                                                  Applicant must match ASAP and/or the exact date you set (when not
                                                  ASAP).
                                                </p>
                                              </div>
                                              {weightBadge('can_start', 'Start')}
                                            </div>
                                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={osc.can_start.want_asap}
                                                onChange={(e) =>
                                                  patchOthersCanStartScoring({ want_asap: e.target.checked })
                                                }
                                                className="rounded border-gray-300 text-navy focus:ring-navy"
                                              />
                                              Prefer ASAP
                                            </label>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="text-xs text-gray-600">Target date</span>
                                              <input
                                                type="date"
                                                value={osc.can_start.want_date}
                                                onChange={(e) =>
                                                  patchOthersCanStartScoring({ want_date: e.target.value })
                                                }
                                                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                                              />
                                            </div>
                                          </div>

                                          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                              <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-gray-800">
                                                  Employment type
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-gray-500">
                                                  Types you want for this posting (multi-select).
                                                </p>
                                              </div>
                                              {weightBadge('employment_types', 'Emp. type')}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {OTHERS_EMPLOYMENT_TYPE_OPTIONS.map((opt) => {
                                                const on = osc.employment_types.includes(opt.id)
                                                return (
                                                  <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => toggleOthersScoringEmploymentType(opt.id)}
                                                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-bold transition-colors ${
                                                      on
                                                        ? 'border-orange-500 bg-amber-50 text-gray-900'
                                                        : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                                                    }`}
                                                  >
                                                    <span>{opt.label}</span>
                                                    <span className="material-symbols-outlined text-[18px]">
                                                      {on ? 'check_circle' : 'add_circle'}
                                                    </span>
                                                  </button>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })()}

                                  {sec.key === 'personal' && (
                                    <div className="mt-4 space-y-6 border-t border-gray-200 pt-4">
                                      <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                          Conditional scoring
                                        </p>
                                        <p className="mt-1 text-[11px] text-gray-500">
                                          Brackets / targets below; caps come from the matching row in the table above.
                                        </p>
                                      </div>

                                      <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">Age</label>
                                        <p className="text-[11px] text-gray-500 mb-2">
                                          Linked to <strong>Date of birth</strong> weight. In bracket = full; outside =
                                          half.
                                        </p>
                                        <div className="overflow-x-auto pb-1">
                                          <div className="inline-flex min-w-full sm:min-w-0 border-2 border-gray-900 rounded-sm bg-white divide-x-2 divide-gray-900 overflow-hidden">
                                            {AGE_BRACKETS.map((b, idx) => (
                                              <React.Fragment key={b.id}>
                                                <button
                                                  type="button"
                                                  onClick={() => setAgeScoring({ preferred_bracket_id: b.id })}
                                                  className={`flex-1 min-w-[4.5rem] px-2 py-3 text-center text-xs sm:text-sm font-bold transition-colors ${
                                                    formData.age_scoring?.preferred_bracket_id === b.id
                                                      ? 'bg-amber-50 text-gray-900 ring-2 ring-inset ring-orange-500'
                                                      : 'bg-white text-gray-900 hover:bg-gray-50'
                                                  }`}
                                                >
                                                  {b.label}
                                                </button>
                                                {idx === 1 && (
                                                  <div
                                                    className="flex flex-col items-center justify-center bg-orange-500 text-white min-w-[4.5rem] px-2 py-2 shrink-0"
                                                    title="From Date of birth row in table above"
                                                  >
                                                    <span className="text-[8px] font-bold uppercase tracking-tight opacity-90 text-center leading-tight">
                                                      DOB row
                                                    </span>
                                                    <span className="text-lg font-extrabold leading-tight">
                                                      {getPersonalFieldPercent('date_of_birth').toFixed(1)}
                                                    </span>
                                                    <span className="text-[9px] opacity-90">% cat.</span>
                                                  </div>
                                                )}
                                              </React.Fragment>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                                          <span>
                                            Bracket:{' '}
                                            <strong className="text-gray-900">
                                              {AGE_BRACKETS.find((x) => x.id === formData.age_scoring?.preferred_bracket_id)
                                                ?.label ?? '—'}
                                            </strong>
                                          </span>
                                          <span className="text-gray-400 hidden sm:inline">|</span>
                                          <span>
                                            Full:{' '}
                                            <strong className="text-orange-600">
                                              {getPersonalFieldPercent('date_of_birth').toFixed(1)}
                                            </strong>
                                          </span>
                                          <span className="text-gray-400 hidden sm:inline">|</span>
                                          <span>
                                            Outside:{' '}
                                            <strong className="text-gray-900">
                                              {halfOfPersonalField('date_of_birth').toFixed(1)}
                                            </strong>
                                          </span>
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">Gender</label>
                                        <p className="text-[11px] text-gray-500 mb-2">
                                          Linked to <strong>Gender</strong> row. Match = full; otherwise = half.
                                        </p>
                                        <div className="overflow-x-auto pb-1">
                                          <div className="inline-flex min-w-full sm:min-w-0 border-2 border-gray-900 rounded-sm bg-white divide-x-2 divide-gray-900 overflow-hidden">
                                            {GENDER_SCORING_OPTIONS.map((g, idx) => (
                                              <React.Fragment key={g.id}>
                                                <button
                                                  type="button"
                                                  onClick={() => setGenderScoring({ preferred_gender: g.id })}
                                                  className={`flex-1 min-w-[5.5rem] px-2 py-3 text-center text-xs sm:text-sm font-bold transition-colors ${
                                                    formData.gender_scoring?.preferred_gender === g.id
                                                      ? 'bg-amber-50 text-gray-900 ring-2 ring-inset ring-orange-500'
                                                      : 'bg-white text-gray-900 hover:bg-gray-50'
                                                  }`}
                                                >
                                                  {g.label}
                                                </button>
                                                {idx === 1 && (
                                                  <div
                                                    className="flex flex-col items-center justify-center bg-orange-500 text-white min-w-[4.5rem] px-2 py-2 shrink-0"
                                                    title="From Gender row in table above"
                                                  >
                                                    <span className="text-[8px] font-bold uppercase tracking-tight opacity-90 text-center leading-tight">
                                                      Gender row
                                                    </span>
                                                    <span className="text-lg font-extrabold leading-tight">
                                                      {getPersonalFieldPercent('gender').toFixed(1)}
                                                    </span>
                                                    <span className="text-[9px] opacity-90">% cat.</span>
                                                  </div>
                                                )}
                                              </React.Fragment>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                                          <span>
                                            Target:{' '}
                                            <strong className="text-gray-900">
                                              {GENDER_SCORING_OPTIONS.find(
                                                (x) => x.id === formData.gender_scoring?.preferred_gender
                                              )?.label ?? '—'}
                                            </strong>
                                          </span>
                                          <span className="text-gray-400 hidden sm:inline">|</span>
                                          <span>
                                            Full:{' '}
                                            <strong className="text-orange-600">
                                              {getPersonalFieldPercent('gender').toFixed(1)}
                                            </strong>
                                          </span>
                                          <span className="text-gray-400 hidden sm:inline">|</span>
                                          <span>
                                            No match:{' '}
                                            <strong className="text-gray-900">
                                              {halfOfPersonalField('gender').toFixed(1)}
                                            </strong>
                                          </span>
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                                          Height (cm)
                                        </label>
                                        <p className="text-[11px] text-gray-500 mb-2">
                                          Linked to <strong>Height</strong> row.
                                        </p>
                                        <div className="overflow-x-auto pb-1">
                                          <div className="inline-flex min-w-full sm:min-w-0 border-2 border-gray-900 rounded-sm bg-white divide-x-2 divide-gray-900 overflow-hidden">
                                            {HEIGHT_BRACKETS.map((b, idx) => (
                                              <React.Fragment key={b.id}>
                                                <button
                                                  type="button"
                                                  onClick={() => setHeightScoring({ preferred_bracket_id: b.id })}
                                                  className={`flex-1 min-w-[3.75rem] px-1.5 py-3 text-center text-[11px] sm:text-xs font-bold transition-colors ${
                                                    formData.height_scoring?.preferred_bracket_id === b.id
                                                      ? 'bg-amber-50 text-gray-900 ring-2 ring-inset ring-orange-500'
                                                      : 'bg-white text-gray-900 hover:bg-gray-50'
                                                  }`}
                                                >
                                                  {b.label}
                                                </button>
                                                {idx === 1 && (
                                                  <div
                                                    className="flex flex-col items-center justify-center bg-orange-500 text-white min-w-[4.25rem] px-1.5 py-2 shrink-0"
                                                    title="From Height row in table above"
                                                  >
                                                    <span className="text-[8px] font-bold uppercase tracking-tight opacity-90 text-center leading-tight">
                                                      Ht row
                                                    </span>
                                                    <span className="text-base sm:text-lg font-extrabold leading-tight">
                                                      {getPersonalFieldPercent('height_cm').toFixed(1)}
                                                    </span>
                                                    <span className="text-[9px] opacity-90">% cat.</span>
                                                  </div>
                                                )}
                                              </React.Fragment>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                                          <span>
                                            Bracket:{' '}
                                            <strong className="text-gray-900">
                                              {HEIGHT_BRACKETS.find(
                                                (x) => x.id === formData.height_scoring?.preferred_bracket_id
                                              )?.label ?? '—'}
                                            </strong>
                                          </span>
                                          <span className="text-gray-400 hidden sm:inline">|</span>
                                          <span>
                                            Full:{' '}
                                            <strong className="text-orange-600">
                                              {getPersonalFieldPercent('height_cm').toFixed(1)}
                                            </strong>
                                          </span>
                                          <span className="text-gray-400 hidden sm:inline">|</span>
                                          <span>
                                            Outside:{' '}
                                            <strong className="text-gray-900">
                                              {halfOfPersonalField('height_cm').toFixed(1)}
                                            </strong>
                                          </span>
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                                          Weight (kg)
                                        </label>
                                        <p className="text-[11px] text-gray-500 mb-2">
                                          Linked to <strong>Weight</strong> row. &quot;80 above&quot; = 81+ kg.
                                        </p>
                                        <div className="overflow-x-auto pb-1">
                                          <div className="inline-flex min-w-full sm:min-w-0 border-2 border-gray-900 rounded-sm bg-white divide-x-2 divide-gray-900 overflow-hidden">
                                            {WEIGHT_BRACKETS.map((b, idx) => (
                                              <React.Fragment key={b.id}>
                                                <button
                                                  type="button"
                                                  onClick={() => setWeightScoring({ preferred_bracket_id: b.id })}
                                                  className={`flex-1 min-w-[3.75rem] px-1.5 py-3 text-center text-[11px] sm:text-xs font-bold transition-colors ${
                                                    formData.weight_scoring?.preferred_bracket_id === b.id
                                                      ? 'bg-amber-50 text-gray-900 ring-2 ring-inset ring-orange-500'
                                                      : 'bg-white text-gray-900 hover:bg-gray-50'
                                                  }`}
                                                >
                                                  {b.label}
                                                </button>
                                                {idx === 1 && (
                                                  <div
                                                    className="flex flex-col items-center justify-center bg-orange-500 text-white min-w-[4.25rem] px-1.5 py-2 shrink-0"
                                                    title="From Weight row in table above"
                                                  >
                                                    <span className="text-[8px] font-bold uppercase tracking-tight opacity-90 text-center leading-tight">
                                                      Wt row
                                                    </span>
                                                    <span className="text-base sm:text-lg font-extrabold leading-tight">
                                                      {getPersonalFieldPercent('weight_kg').toFixed(1)}
                                                    </span>
                                                    <span className="text-[9px] opacity-90">% cat.</span>
                                                  </div>
                                                )}
                                              </React.Fragment>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                                          <span>
                                            Bracket:{' '}
                                            <strong className="text-gray-900">
                                              {WEIGHT_BRACKETS.find(
                                                (x) => x.id === formData.weight_scoring?.preferred_bracket_id
                                              )?.label ?? '—'}
                                            </strong>
                                          </span>
                                          <span className="text-gray-400 hidden sm:inline">|</span>
                                          <span>
                                            Full:{' '}
                                            <strong className="text-orange-600">
                                              {getPersonalFieldPercent('weight_kg').toFixed(1)}
                                            </strong>
                                          </span>
                                          <span className="text-gray-400 hidden sm:inline">|</span>
                                          <span>
                                            Outside:{' '}
                                            <strong className="text-gray-900">
                                              {halfOfPersonalField('weight_kg').toFixed(1)}
                                            </strong>
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        All categories total:{' '}
                        <span
                          className={`font-bold ${
                            getCategoryTotal() === 100
                              ? 'text-green-600'
                              : getCategoryTotal() > 100
                                ? 'text-red-600'
                                : 'text-blue-600'
                          }`}
                        >
                          {getCategoryTotal().toFixed(1)}%
                        </span>
                      </span>
                      {getCategoryTotal() !== 100 && (
                        <span className="text-xs text-gray-500">
                          {getCategoryTotal() < 100
                            ? `Add ${(100 - getCategoryTotal()).toFixed(1)}% more`
                            : `Reduce by ${(getCategoryTotal() - 100).toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                    {getCategoryTotal() === 100 && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Categories total 100%
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseJobForm}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                  disabled={uploadingImage}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-navy text-white text-sm font-medium rounded-md hover:bg-navy-light disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Uploading Image...' : (editingJob ? 'Update Job' : 'Post Job')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default JobsManagement
