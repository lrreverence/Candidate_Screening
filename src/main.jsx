import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { SupabaseProvider } from './contexts/SupabaseContext.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SupabaseProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SupabaseProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

