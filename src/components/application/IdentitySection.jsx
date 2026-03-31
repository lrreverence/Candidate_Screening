import React from 'react'

const NAME_EXTENSIONS = ['', 'Jr', 'Sr', 'I', 'II', 'III', 'IV', 'V']

const LANGUAGE_OPTIONS = [
  'English',
  'Tagalog',
  'Bisaya (Cebuano)',
  'Ilocano',
  'Kapampangan',
  'Hiligaynon (Ilonggo)',
  'Bikol',
  'Waray',
  'Pangasinan',
  'Chavacano',
  'Chinese',
  'Japanese',
  'Korean',
  'Arabic',
]

function getAgeFromDOB(dateOfBirth) {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1
  return age >= 0 ? age : null
}

function formatDateYYYYMMDD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const IdentitySection = ({ formData, handleChange, handleLanguagesSpokenChange }) => {
  const MAX_AGE = 65
  const age = getAgeFromDOB(formData.date_of_birth)
  const today = new Date()
  const minDob = new Date(today.getFullYear() - MAX_AGE, today.getMonth(), today.getDate())
  const minDobStr = formatDateYYYYMMDD(minDob)
  const maxDobStr = formatDateYYYYMMDD(today)
  const isOverAgeLimit = typeof age === 'number' && age > MAX_AGE
  const selectedLanguages = Array.isArray(formData.languages_spoken) ? formData.languages_spoken : []
  const onToggleLanguage = typeof handleLanguagesSpokenChange === 'function' ? handleLanguagesSpokenChange : () => {}

  return (
    <>
      <h2 className="text-xl font-bold mb-2 flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/10">
        <span className="material-symbols-outlined text-primary">person</span>
        1. Personal Information
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Must include: Middle Name, Name Extension (Jr, Sr, I, II, etc.), Age, Height, Weight, Status (Single/Married/Widowed), Religion
      </p>

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="firstName">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
            id="firstName"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="e.g. Jonathan"
            type="text"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="middleName">
            Middle Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
            id="middleName"
            name="middle_name"
            value={formData.middle_name}
            onChange={handleChange}
            placeholder="e.g. Reyes"
            type="text"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="lastName">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
            id="lastName"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="e.g. Doe"
            type="text"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="nameExtension">
            Name Extension
          </label>
          <div className="relative">
            <select
              className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 text-gray-500 dark:text-gray-400 dark:text-white text-base outline-none appearance-none"
              id="nameExtension"
              name="name_extension"
              value={formData.name_extension || ''}
              onChange={handleChange}
            >
              {NAME_EXTENSIONS.map((ext) => (
                <option key={ext || 'none'} value={ext}>
                  {ext || 'None (Jr, Sr, I, II, etc.)'}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
          </div>
        </div>
      </div>

      {/* Date of Birth & Age & Gender */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="dob">
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none appearance-none [&::-webkit-calendar-picker-indicator]:dark:invert"
            id="dob"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={handleChange}
            type="date"
            min={minDobStr}
            max={maxDobStr}
            required
          />
          <p className={`text-xs ml-2 ${isOverAgeLimit ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            Maximum age is {MAX_AGE}. Allowed range: {minDobStr} to {maxDobStr}.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="age">
            Age
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-gray-100 dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400 cursor-not-allowed"
            id="age"
            readOnly
            value={age != null ? `${age} years old` : '—'}
            tabIndex={-1}
          />
          <p className={`text-xs ml-2 ${isOverAgeLimit ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            Up to {MAX_AGE} years old only.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="gender">
            Gender
          </label>
          <div className="relative">
            <select
              className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 text-gray-500 dark:text-gray-400 dark:text-white text-base outline-none appearance-none"
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <option disabled value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Prefer not to say</option>
            </select>
            <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
          </div>
        </div>
      </div>

      {/* Height & Weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="height">
            Height (cm) <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
            id="height"
            name="height_cm"
            value={formData.height_cm}
            onChange={handleChange}
            placeholder="e.g. 170"
            type="number"
            min={100}
            max={250}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="weight">
            Weight (kg) <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
            id="weight"
            name="weight_kg"
            value={formData.weight_kg}
            onChange={handleChange}
            placeholder="e.g. 65"
            type="number"
            min={30}
            max={300}
            required
          />
        </div>
      </div>

      {/* Civil Status & Religion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="civilStatus">
            Status (Civil Status) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 text-gray-500 dark:text-gray-400 dark:text-white text-base outline-none appearance-none"
              id="civilStatus"
              name="civil_status"
              value={formData.civil_status || ''}
              onChange={handleChange}
              required
            >
              <option disabled value="">Select status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Widowed">Widowed</option>
            </select>
            <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="religion">
            Religion <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
            id="religion"
            name="religion"
            value={formData.religion}
            onChange={handleChange}
            placeholder="e.g. Roman Catholic"
            type="text"
            required
          />
        </div>
      </div>

      {/* Language / Dialogue Spoken */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">
          Language/Dialogue Spoken
        </label>
        <p className="text-xs ml-2 text-gray-500 dark:text-gray-400">
          Select all that apply.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LANGUAGE_OPTIONS.map((language) => (
            <label
              key={language}
              className={`group relative flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedLanguages.includes(language)
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 dark:border-white/10 bg-background-light dark:bg-background-dark'
              } hover:border-primary`}
            >
              <input
                type="checkbox"
                checked={selectedLanguages.includes(language)}
                onChange={() => onToggleLanguage(language)}
                className="h-5 w-5 rounded border-gray-400 text-primary focus:ring-primary/50 focus:ring-offset-0 bg-transparent transition-colors"
              />
              <span className="text-slate-900 dark:text-white text-sm font-medium">{language}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  )
}

export default IdentitySection
