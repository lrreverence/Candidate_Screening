import React from 'react'
import { Link } from 'react-router-dom'

const ApplicationFooter = () => {
  return (
    <footer className="py-8 border-t border-gray-200 dark:border-white/10 mt-auto bg-white dark:bg-[#0f172a]">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <p>© 2025 E Power Security. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  )
}

export default ApplicationFooter

