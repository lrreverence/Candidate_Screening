import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function AdminHelpButton() {
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
        aria-label="Help"
      >
        <span className="material-symbols-outlined">help</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-navy">Help</p>
          </div>
          <Link
            to="/contact"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700"
          >
            <span className="material-symbols-outlined text-gray-500 text-xl">mail</span>
            Contact support
          </Link>
          <Link
            to="/terms"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700"
          >
            <span className="material-symbols-outlined text-gray-500 text-xl">description</span>
            Terms of Service
          </Link>
          <Link
            to="/privacy"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700"
          >
            <span className="material-symbols-outlined text-gray-500 text-xl">policy</span>
            Privacy Policy
          </Link>
        </div>
      )}
    </div>
  )
}
