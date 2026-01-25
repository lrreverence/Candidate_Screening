import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ApplicationForm from './pages/ApplicationForm'
import IdPictureUpload from './pages/IdPictureUpload'
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
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import ProtectedRoute from './components/ProtectedRoute'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/job/:jobId" element={<JobDetail />} />
      <Route
        path="/apply"
        element={
          <ProtectedRoute>
            <ApplicationForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/apply/:jobId"
        element={
          <ProtectedRoute>
            <ApplicationForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/apply/:jobId/id-picture"
        element={
          <ProtectedRoute>
            <IdPictureUpload />
          </ProtectedRoute>
        }
      />
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
    </Routes>
  )
}

export default App
