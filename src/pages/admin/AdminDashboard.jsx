import React, { useState } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import AdminSidebar from '../../components/admin/AdminSidebar'
import Dashboard from './Dashboard'
import ApplicantsManagement from './ApplicantsManagement'
import ApplicantDetailView from './ApplicantDetailView'
import JobsManagement from './JobsManagement'
import Settings from './Settings'

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display text-[#111827]">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-lg bg-gold text-navy">
              <span className="material-symbols-outlined text-sm font-bold">shield</span>
            </div>
            <h1 className="text-xs font-bold uppercase tracking-wider text-navy">E Power Security</h1>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  )
}

const AdminDashboard = () => {
  return (
    <Routes>
      <Route path="applicants/:id" element={<ApplicantDetailView />} />
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="applicants" element={<ApplicantsManagement />} />
        <Route path="jobs" element={<JobsManagement />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default AdminDashboard

