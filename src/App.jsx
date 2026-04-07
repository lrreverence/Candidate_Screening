import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import ApplicationForm from './pages/ApplicationForm'
import DocumentsForm from './pages/DocumentsForm'
import ApplicationSuccess from './pages/ApplicationSuccess'
import AdminDashboard from './pages/admin/AdminDashboard'
import TermsOfService from './pages/TermsOfService'
import PrivacyPolicy from './pages/PrivacyPolicy'
import AboutUs from './pages/AboutUs'
import OurServices from './pages/OurServices'
import Contact from './pages/Contact'
import JobDetail from './pages/JobDetail'
import ResetPassword from './pages/ResetPassword'
import File201Form from './pages/File201Form'
import WorkExperienceForm from './pages/WorkExperienceForm'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import ProtectedRoute from './components/ProtectedRoute'
import ResumeProfile from './pages/ResumeProfile'
import IdPictureUpload from './pages/IdPictureUpload'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/job/:jobId" element={<JobDetail />} />
      <Route
        path="/profile/resume"
        element={
          <ProtectedRoute>
            <ResumeProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/personalinformation"
        element={
          <ProtectedRoute>
            <ApplicationForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/id-picture"
        element={
          <ProtectedRoute>
            <IdPictureUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/personalinformation/:jobId"
        element={
          <ProtectedRoute>
            <ApplicationForm />
          </ProtectedRoute>
        }
      />
      {/* Backwards compatible (old step-1 route) */}
      <Route path="/apply" element={<Navigate to="/profile/personalinformation" replace />} />
      <Route path="/apply/:jobId" element={<Navigate to="/profile/personalinformation/:jobId" replace />} />
      <Route
        path="/apply/:jobId/documents"
        element={
          <ProtectedRoute>
            <DocumentsForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/apply/:jobId/success"
        element={
          <ProtectedRoute>
            <ApplicationSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        }
      />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/services" element={<OurServices />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/apply/:jobId/work-experience"
        element={
          <ProtectedRoute>
            <WorkExperienceForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/apply/:jobId/201-file"
        element={
          <ProtectedRoute>
            <File201Form />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
