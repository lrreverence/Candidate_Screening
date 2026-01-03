import React from 'react'
import { Link } from 'react-router-dom'

const ApplicationHelp = () => {
  return (
    <div className="mt-8 text-center">
      <p className="text-gray-500 dark:text-gray-400 text-sm">Need assistance with your application?</p>
      <Link to="/contact?subject=application-support" className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1 mt-1">
        <span className="material-symbols-outlined text-sm">support_agent</span>
        Contact Support
      </Link>
    </div>
  )
}

export default ApplicationHelp

