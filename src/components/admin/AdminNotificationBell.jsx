import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAdminNotifications } from '../../contexts/AdminNotificationContext'

export default function AdminNotificationBell() {
  const { newApplicationsCount } = useAdminNotifications()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasNew = newApplicationsCount > 0

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 relative"
        aria-label={hasNew ? `${newApplicationsCount} new application(s)` : 'Notifications'}
      >
        <span className="material-symbols-outlined">notifications</span>
        {hasNew && (
          <span className="absolute top-2 right-2 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white ring-2 ring-white px-1">
            {newApplicationsCount > 99 ? '99+' : newApplicationsCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-navy">Notifications</p>
          </div>
          {hasNew ? (
            <Link
              to="/admin/applicants"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-navy/10">
                <span className="material-symbols-outlined text-navy text-xl">description</span>
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {newApplicationsCount} new application{newApplicationsCount !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-500">Pending review</p>
              </div>
              <span className="material-symbols-outlined text-gray-400 ml-auto text-lg">chevron_right</span>
            </Link>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No new applications
            </div>
          )}
        </div>
      )}
    </div>
  )
}
