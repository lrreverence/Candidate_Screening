import React from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import AdminSidebar from '../../components/admin/AdminSidebar'
import ApplicantsManagement from './ApplicantsManagement'
import ApplicantDetailView from './ApplicantDetailView'

const AdminLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display text-[#111827]">
      <AdminSidebar />
      <Outlet />
    </div>
  )
}

const AdminDashboard = () => {
  return (
    <Routes>
      <Route path="applicants/:id" element={<ApplicantDetailView />} />
      <Route element={<AdminLayout />}>
        <Route path="applicants" element={<ApplicantsManagement />} />
        <Route index element={<ApplicantsManagement />} />
      </Route>
    </Routes>
  )
}

export default AdminDashboard

