import React from 'react'

const ContactSection = ({ formData, handleChange }) => {
  return (
    <>
      <h2 className="text-xl font-bold mt-12 mb-6 flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/10">
        <span className="material-symbols-outlined text-primary">contact_mail</span>
        Contact Details
      </h2>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="email">
            Email Address
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
            type="email"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="phone">
            Phone Number
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
            id="phone"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            placeholder="0912 345 6789"
            type="tel"
          />
        </div>
      </div>

      {/* Address */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="address">
          House/Unit No., Street Name
        </label>
        <input
          className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
          id="address"
          name="street_address"
          value={formData.street_address}
          onChange={handleChange}
          placeholder="e.g. Unit 4B, 123 Main Street"
          type="text"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="barangay">
          Barangay
        </label>
        <input
          className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
          id="barangay"
          name="barangay"
          value={formData.barangay}
          onChange={handleChange}
          placeholder="e.g. Barangay 123"
          type="text"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="city">
            City / Municipality
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="e.g. Manila"
            type="text"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="province">
            Province
          </label>
          <input
            className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
            id="province"
            name="province"
            value={formData.province}
            onChange={handleChange}
            placeholder="e.g. Metro Manila"
            type="text"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1" htmlFor="zip">
          Postal Code
        </label>
        <input
          className="w-full h-14 px-6 rounded-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary focus:ring-primary focus:ring-2 transition-all duration-200 placeholder:text-gray-400 dark:text-white text-base outline-none"
          id="zip"
          name="zip_code"
          value={formData.zip_code}
          onChange={handleChange}
          placeholder="e.g. 1000"
          type="text"
        />
      </div>
    </>
  )
}

export default ContactSection

