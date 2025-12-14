import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ApplicationForm from './pages/ApplicationForm'
import QualificationsForm from './pages/QualificationsForm'
import DocumentUploadForm from './pages/DocumentUploadForm'
import ApplicationSuccess from './pages/ApplicationSuccess'
import AdminDashboard from './pages/admin/AdminDashboard'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/apply/:jobId?" element={<ApplicationForm />} />
      <Route path="/apply/:jobId?/qualifications" element={<QualificationsForm />} />
      <Route path="/apply/:jobId?/documents" element={<DocumentUploadForm />} />
      <Route path="/apply/:jobId?/success" element={<ApplicationSuccess />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/applicants" element={<AdminDashboard />} />
    </Routes>
  )
}

export default App
