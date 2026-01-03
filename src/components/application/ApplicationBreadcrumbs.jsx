import React from 'react'
import { Link } from 'react-router-dom'

const ApplicationBreadcrumbs = () => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-8 text-sm text-gray-500 dark:text-gray-400">
      <Link to="/" className="hover:text-primary transition-colors">Home</Link>
      <span className="material-symbols-outlined text-xs">chevron_right</span>
      <Link to="/" className="hover:text-primary transition-colors">Careers</Link>
      <span className="material-symbols-outlined text-xs">chevron_right</span>
      <span className="text-gray-900 dark:text-white font-medium">Application Form</span>
    </div>
  )
}

export default ApplicationBreadcrumbs

