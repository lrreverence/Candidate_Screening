import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const Settings = () => {
  const { user, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Profile settings
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: ''
  })

  // System settings
  const [systemSettings, setSystemSettings] = useState({
    site_name: 'E Power Security',
    notifications_enabled: true,
    email_notifications: true,
    auto_archive_days: 90
  })

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        full_name: userProfile.full_name || '',
        email: user?.email || '',
        phone: userProfile.phone || '',
        role: userProfile.role || 'admin'
      })
    }
  }, [userProfile, user])

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData(prev => ({ ...prev, [name]: value }))
  }

  const handleSystemChange = (e) => {
    const { name, value, type, checked } = e.target
    setSystemSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSystem = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      // Here you would save system settings to your database
      // For now, we'll just simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000))

      setMessage({ type: 'success', text: 'System settings updated successfully!' })
    } catch (error) {
      console.error('Error updating system settings:', error)
      setMessage({ type: 'error', text: 'Failed to update system settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'system', label: 'System', icon: 'settings' },
    { id: 'security', label: 'Security', icon: 'security' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' }
  ]

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-[#f3f4f6]">
      {/* Top Navigation Bar */}
      <header className="hidden lg:flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-8 shadow-sm">
        <div>
          <h2 className="text-lg lg:text-xl font-bold text-navy">Settings</h2>
          <p className="text-xs text-gray-500 hidden sm:block">Manage your account and system preferences</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-4">
          <button className="flex size-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 size-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>
          <button className="flex size-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
            <span className="material-symbols-outlined">help</span>
          </button>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-navy text-navy'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] lg:text-[20px]">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Message Display */}
            {message.text && (
              <div className={`mx-4 lg:mx-6 mt-4 lg:mt-6 p-4 rounded-md ${
                message.type === 'success' ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">
                    {message.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  <span className="text-sm font-medium">{message.text}</span>
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div className="p-4 lg:p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-navy mb-4">Profile Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="full_name"
                          value={profileData.full_name}
                          onChange={handleProfileChange}
                          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={profileData.email}
                          disabled
                          className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleProfileChange}
                          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Role
                        </label>
                        <input
                          type="text"
                          name="role"
                          value={profileData.role}
                          disabled
                          className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed capitalize"
                        />
                        <p className="text-xs text-gray-500 mt-1">Role is managed by system</p>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="w-full sm:w-auto px-6 py-2.5 bg-navy text-white text-sm font-medium rounded-md hover:bg-navy-light focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* System Tab */}
              {activeTab === 'system' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-navy mb-4">System Settings</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Site Name
                        </label>
                        <input
                          type="text"
                          name="site_name"
                          value={systemSettings.site_name}
                          onChange={handleSystemChange}
                          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Auto-Archive Applications After (days)
                        </label>
                        <input
                          type="number"
                          name="auto_archive_days"
                          value={systemSettings.auto_archive_days}
                          onChange={handleSystemChange}
                          min="30"
                          max="365"
                          className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        />
                        <p className="text-xs text-gray-500 mt-1">Applications will be automatically archived after this many days</p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Enable Notifications</p>
                            <p className="text-xs text-gray-500">Receive system notifications</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="notifications_enabled"
                              checked={systemSettings.notifications_enabled}
                              onChange={handleSystemChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-navy rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Email Notifications</p>
                            <p className="text-xs text-gray-500">Receive notifications via email</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="email_notifications"
                              checked={systemSettings.email_notifications}
                              onChange={handleSystemChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-navy rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSaveSystem}
                        disabled={saving}
                        className="w-full sm:w-auto px-6 py-2.5 bg-navy text-white text-sm font-medium rounded-md hover:bg-navy-light focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-navy mb-4">Security Settings</h3>
                    <div className="space-y-6">
                      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start gap-4">
                          <div className="rounded-full bg-navy p-3 text-white">
                            <span className="material-symbols-outlined">lock</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-navy mb-1">Change Password</h4>
                            <p className="text-xs text-gray-600 mb-4">Update your password to keep your account secure</p>
                            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                              Change Password
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start gap-4">
                          <div className="rounded-full bg-blue-600 p-3 text-white">
                            <span className="material-symbols-outlined">verified_user</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-navy mb-1">Two-Factor Authentication</h4>
                            <p className="text-xs text-gray-600 mb-4">Add an extra layer of security to your account</p>
                            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                              Enable 2FA
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start gap-4">
                          <div className="rounded-full bg-green-600 p-3 text-white">
                            <span className="material-symbols-outlined">history</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-navy mb-1">Login History</h4>
                            <p className="text-xs text-gray-600 mb-4">View recent login activity on your account</p>
                            <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                              View History
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-navy mb-4">Notification Preferences</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-700">New Application Submitted</p>
                          <p className="text-xs text-gray-500">Get notified when a new application is submitted</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-navy rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Application Status Changed</p>
                          <p className="text-xs text-gray-500">Get notified when an application status is updated</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-navy rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-700">License Expiring Soon</p>
                          <p className="text-xs text-gray-500">Get notified when licenses are about to expire</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-navy rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Weekly Summary Report</p>
                          <p className="text-xs text-gray-500">Receive a weekly summary of all activities</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-navy rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Settings
