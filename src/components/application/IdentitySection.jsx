import React from 'react'

const IdentitySection = ({ formData, handleChange }) => {
  return (
    <>
      <h2 className="text-xl font-bold mb-8 flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/10">
        <span className="material-symbols-outlined text-primary">person</span>
        Identity Information
      </h2>

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="firstName">
            First Name
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
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="lastName">
            Last Name
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
      </div>

      {/* DOB & Gender */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="dob">
            Date of Birth
          </label>
          <div className="relative">
            <input
              className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none appearance-none [&::-webkit-calendar-picker-indicator]:dark:invert"
              id="dob"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              type="date"
            />
          </div>
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
    </>
  )
}

export default IdentitySection

