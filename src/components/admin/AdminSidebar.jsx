import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const AdminSidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, userProfile, user } = useAuth()

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) {
      navigate('/')
    }
  }

  const menuItems = [
    { path: '/admin', icon: 'dashboard', label: 'Dashboard' },
    { path: '/admin/applicants', icon: 'group', label: 'Applicants' },
    { path: '/admin/jobs', icon: 'work', label: 'Job Postings' },
    { path: '/admin/archive', icon: 'inventory_2', label: 'Archive' },
  ]

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/applicants'
    }
    return location.pathname === path
  }

  return (
    <aside className="flex w-64 flex-col bg-navy text-white transition-all duration-300">
      <div className="flex h-16 items-center gap-3 border-b border-navy-light px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gold text-navy">
          <span className="material-symbols-outlined text-xl font-bold">shield</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold uppercase leading-none tracking-wider text-white">E Power Security</h1>
          <span className="text-[10px] text-gray-300">Admin Console</span>
        </div>
      </div>
      <div className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4">
        <nav className="flex flex-col gap-1 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                isActive(item.path)
                  ? 'bg-navy-light border-l-4 border-gold text-white shadow-sm'
                  : 'text-gray-300 hover:bg-navy-light hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive(item.path) ? 'filled' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-sm ${isActive(item.path) ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          ))}
          <div className="my-2 border-t border-navy-light"></div>
          <Link
            to="/admin/settings"
            className={`group flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
              isActive('/admin/settings')
                ? 'bg-navy-light border-l-4 border-gold text-white shadow-sm'
                : 'text-gray-300 hover:bg-navy-light hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className={`text-sm ${isActive('/admin/settings') ? 'font-bold' : 'font-medium'}`}>
              Settings
            </span>
          </Link>
        </nav>
      </div>
      <div className="border-t border-navy-light p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-9 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
            {userProfile?.full_name 
              ? userProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : user?.email?.[0].toUpperCase() || 'A'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">
              {userProfile?.full_name || 
               (userProfile?.first_name && userProfile?.last_name 
                 ? `${userProfile.first_name} ${userProfile.last_name}`
                 : user?.email || 'Admin User')}
            </span>
            <span className="text-xs text-gray-400">
              {userProfile?.role === 'admin' ? 'Administrator' : 'User'}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-navy-light hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

export default AdminSidebar

