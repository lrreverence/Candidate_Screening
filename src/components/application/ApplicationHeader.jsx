import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ApplicationHeader = () => {
  const { user } = useAuth()

  return (
    <header className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f172a]">
      <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-background-dark">
            <span className="material-symbols-outlined text-2xl">shield</span>
          </div>
          <span className="text-xl font-bold tracking-tight">E Power Security</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
          <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Careers</Link>
          <Link to="/contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
          {user ? (
            <span className="text-sm font-medium text-text-muted">{user.email}</span>
          ) : (
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">Login</Link>
          )}
        </nav>
      </div>
    </header>
  )
}

export default ApplicationHeader

