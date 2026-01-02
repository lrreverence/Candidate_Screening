import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'
import LoginModal from '../components/LoginModal'
import SignupModal from '../components/SignupModal'

const Home = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { jobs: supabaseJobs, loading: supabaseLoading, error: supabaseError } = useSupabase()
  const { user, userProfile, signOut } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('All Jobs')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [pendingJobId, setPendingJobId] = useState(null)

  // Redirect admin users to /admin after login (only if not already there)
  useEffect(() => {
    if (user && userProfile?.role === 'admin' && !location.pathname.startsWith('/admin')) {
      navigate('/admin')
    }
  }, [user, userProfile, navigate, location.pathname])

  // Use only Supabase jobs - no fallback
  const allJobs = useMemo(() => {
    console.log('[HOME] Supabase jobs state:', { 
      hasJobs: !!supabaseJobs, 
      jobCount: supabaseJobs?.length || 0,
      loading: supabaseLoading 
    })
    
    if (supabaseJobs && supabaseJobs.length > 0) {
      console.log('[HOME] Using Supabase jobs with UUIDs:', supabaseJobs.length)
      return supabaseJobs.map(job => ({
        id: job.id, // This is a UUID from Supabase
        title: job.title,
        location: job.location,
        salary: job.salary,
        type: job.type,
        shift: job.shift,
        image: job.image,
        badge: job.badge_text ? {
          text: job.badge_text,
          icon: job.badge_icon,
          color: job.badge_color
        } : null,
        category: job.category
      }))
    }
    
    // Return empty array if no jobs - don't use fallback
    console.log('[HOME] No Supabase jobs found')
    return []
  }, [supabaseJobs, supabaseLoading])

  // Filter jobs based on category and search query
  const filteredJobs = useMemo(() => {
    let filtered = allJobs

    // Filter by category
    if (selectedCategory !== 'All Jobs') {
      const categoryMap = {
        'Armed Guard': 'Armed Guard',
        'Unarmed': 'Unarmed',
        'CCTV Operator': 'CCTV Operator',
        'Patrol': 'Patrol'
      }
      const category = categoryMap[selectedCategory]
      if (category) {
        filtered = filtered.filter(job => job.category === category)
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(query) ||
        job.location.toLowerCase().includes(query) ||
        job.type.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [allJobs, selectedCategory, searchQuery])

  const stats = [
    { value: "500+", label: "Active Guards" },
    { value: "45", label: "Cities Covered" },
    { value: "24/7", label: "Support Center" },
    { value: "98%", label: "Retention Rate" }
  ]

  const heroBackgroundImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuC_DSGl8UHGzg-xPl2w31czO6qPheyw8EMa-WotbRv0qXnmFXejrAsgS2igrhE7Rzou4hhCPplfqlF5LqfJxFDkjWlsbpDSUDohR8RAcvglG-FETdSxn45ADPHDOIgtYnTLe0e1nXNH2V92pV1SttPsvW5df06LOGhQg2c51rCri3rMYzTiJY4fTYsREmP-3ZMwwpYvwtTVgpyWuFISt_yoezafLjSFFHgKrflo2ckTmhs9J2s750PzOWqSdlW75ryXOC00YBY2wJ4"

  const handleApply = (jobId) => {
    if (!user) {
      // Store the jobId to redirect after login
      setPendingJobId(jobId)
      // Show login modal if not logged in
      setShowLoginModal(true)
      return
    }
    
    // Log the jobId to help debug
    console.log('[HOME] Applying for job with ID:', jobId, 'Type:', typeof jobId)
    
    // Navigate to application form if logged in
    navigate(`/apply/${jobId || ''}`)
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col overflow-x-hidden text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-[#1e40af] bg-[#0f172a]/95 backdrop-blur-md">
        <div className="px-4 md:px-10 py-3 max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 text-white">
            <div className="size-8 text-primary">
              <span className="material-symbols-outlined text-[32px]">shield_person</span>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">E Power Security</h2>
          </div>
          <div className="flex gap-3 items-center">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-text-muted text-sm">
                  <span className="material-symbols-outlined text-[18px]">account_circle</span>
                  <span>{user.email}</span>
                </div>
                <button
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    try {
                      const { error } = await signOut()
                      if (error) {
                        console.error('Failed to sign out:', error)
                        alert('Failed to sign out. Please try again.')
                      }
                      // Auth state listener will handle the state update
                    } catch (err) {
                      console.error('Sign out error:', err)
                      alert('An error occurred while signing out. Please try again.')
                    }
                  }}
                  type="button"
                  className="flex h-10 px-6 cursor-pointer items-center justify-center rounded-full bg-secondary text-white text-sm font-bold hover:bg-[#1e3a8a] transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="hidden sm:flex h-10 px-6 cursor-pointer items-center justify-center rounded-full bg-secondary text-white text-sm font-bold hover:bg-[#1e3a8a] transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => setShowSignupModal(true)}
                  className="flex h-10 px-6 cursor-pointer items-center justify-center rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center w-full">
        {/* Hero Section */}
        <section className="w-full px-4 md:px-10 py-8 md:py-12 flex justify-center">
          <div 
            className="w-full max-w-[1200px] rounded-2xl md:rounded-3xl overflow-hidden relative min-h-[480px] flex flex-col items-center justify-center p-6 text-center bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%), url("${heroBackgroundImage}")`
            }}
          >
            <div className="flex flex-col gap-4 mb-8 max-w-2xl relative z-10">
              <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold w-fit mx-auto uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Official Recruitment Portal
              </div>
              <h1 className="text-white text-4xl md:text-6xl font-black leading-tight tracking-tight">
                Secure Your Future with <span className="text-primary">E Power</span>
              </h1>
              <p className="text-text-muted text-base md:text-lg font-normal max-w-lg mx-auto">
                Join the elite team protecting top-tier assets. We offer competitive pay, comprehensive benefits, and a career path that matters.
              </p>
            </div>
            {/* Search Bar */}
            <div className="w-full max-w-[600px] relative z-10">
              <label className="flex w-full items-center p-1.5 bg-card-dark border border-secondary rounded-full shadow-lg focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                <div className="pl-4 pr-2 text-text-muted">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input 
                  className="w-full bg-transparent border-none text-white placeholder-text-muted focus:ring-0 text-base py-2.5" 
                  placeholder="Search by job title, keyword, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="hidden sm:flex shrink-0 h-10 px-6 cursor-pointer items-center justify-center rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors">
                  Find Jobs
                </button>
              </label>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="w-full px-4 md:px-10 pb-6 flex justify-center">
          <div className="w-full max-w-[1200px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-white text-2xl font-bold leading-tight">Open Positions</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar pr-2 md:pr-0">
                <button 
                  onClick={() => setSelectedCategory('All Jobs')}
                  className={`flex h-9 shrink-0 items-center gap-2 px-4 rounded-full text-sm font-bold transition ${
                    selectedCategory === 'All Jobs' 
                      ? 'bg-primary text-[#0f172a]' 
                      : 'bg-card-dark border border-secondary text-white hover:bg-secondary'
                  }`}
                >
                  All Jobs
                </button>
                <button 
                  onClick={() => setSelectedCategory('Armed Guard')}
                  className={`flex h-9 shrink-0 items-center gap-2 px-4 rounded-full text-sm font-medium transition ${
                    selectedCategory === 'Armed Guard' 
                      ? 'bg-primary text-[#0f172a]' 
                      : 'bg-card-dark border border-secondary text-white hover:bg-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">security</span>
                  Armed Guard
                </button>
                <button 
                  onClick={() => setSelectedCategory('Unarmed')}
                  className={`flex h-9 shrink-0 items-center gap-2 px-4 rounded-full text-sm font-medium transition ${
                    selectedCategory === 'Unarmed' 
                      ? 'bg-primary text-[#0f172a]' 
                      : 'bg-card-dark border border-secondary text-white hover:bg-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                  Unarmed
                </button>
                <button 
                  onClick={() => setSelectedCategory('CCTV Operator')}
                  className={`flex h-9 shrink-0 items-center gap-2 px-4 rounded-full text-sm font-medium transition ${
                    selectedCategory === 'CCTV Operator' 
                      ? 'bg-primary text-[#0f172a]' 
                      : 'bg-card-dark border border-secondary text-white hover:bg-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">videocam</span>
                  CCTV Operator
                </button>
                <button 
                  onClick={() => setSelectedCategory('Patrol')}
                  className={`flex h-9 shrink-0 items-center gap-2 px-4 rounded-full text-sm font-medium transition ${
                    selectedCategory === 'Patrol' 
                      ? 'bg-primary text-[#0f172a]' 
                      : 'bg-card-dark border border-secondary text-white hover:bg-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">local_police</span>
                  Patrol
                </button>
              </div>
            </div>
            
            {/* Error Display */}
            {supabaseError && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
                <p className="text-red-400 font-bold mb-2">Error loading jobs:</p>
                <p className="text-red-300 text-sm">{supabaseError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            
            {/* Loading State */}
            {supabaseLoading && (
              <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
                <p className="text-blue-400">Loading jobs...</p>
              </div>
            )}
            
            {/* No Jobs Message */}
            {!supabaseLoading && !supabaseError && filteredJobs.length === 0 && allJobs.length === 0 && (
              <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg">
                <p className="text-yellow-400">No jobs found. Please check back later.</p>
              </div>
            )}
            
            {/* Job Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <article 
                    key={job.id}
                    className="group relative flex flex-col bg-card-dark border border-[#1e40af] rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-300"
                  >
                    <div 
                      className="h-40 w-full bg-cover bg-center relative"
                      style={{ backgroundImage: `url("${job.image}")` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-card-dark to-transparent"></div>
                      {job.badge && (
                        <div className={`absolute top-4 right-4 ${job.badge.color === 'primary' ? 'bg-black/60' : 'bg-brand-navy/80'} backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10 flex items-center gap-1`}>
                          <span className={`material-symbols-outlined text-[14px] ${job.badge.color === 'primary' ? 'text-primary' : ''}`}>
                            {job.badge.icon}
                          </span>
                          {job.badge.text}
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-grow gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex items-center text-text-muted text-sm gap-1">
                          <span className="material-symbols-outlined text-[16px]">location_on</span>
                          {job.location}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-secondary/40 text-text-muted text-xs px-2.5 py-1 rounded-md border border-secondary">
                          {job.salary}
                        </span>
                        <span className="bg-secondary/40 text-text-muted text-xs px-2.5 py-1 rounded-md border border-secondary">
                          {job.type}
                        </span>
                        <span className="bg-secondary/40 text-text-muted text-xs px-2.5 py-1 rounded-md border border-secondary">
                          {job.shift}
                        </span>
                      </div>
                      <div className="mt-auto flex gap-3 pt-2">
                        <button 
                          onClick={() => navigate(`/job/${job.id}`)}
                          className="flex-1 h-10 rounded-full border border-secondary text-white text-sm font-bold hover:bg-secondary transition-colors"
                        >
                          View Details
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleApply(job.id)}
                          className="flex-1 h-10 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors flex items-center justify-center gap-1"
                        >
                          Apply
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {/* Job Card 6 (Apply CTA) */}
                <article className="flex flex-col items-center justify-center text-center bg-[#0f172a] border-2 border-dashed border-[#1e40af] rounded-2xl p-6 min-h-[400px]">
                  <div className="size-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-primary">person_add</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Don't see a fit?</h3>
                  <p className="text-text-muted mb-6">Join our talent pool. We are always looking for qualified professionals.</p>
                  <button 
                    type="button"
                    onClick={() => handleApply(null)}
                    className="h-10 px-6 rounded-full bg-secondary text-white text-sm font-bold hover:bg-[#1e3a8a] transition-colors"
                  >
                    Submit General Application
                  </button>
                </article>
              </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full px-4 md:px-10 py-12 md:py-16 mt-8 bg-card-dark border-y border-[#1e40af] flex justify-center">
          <div className="w-full max-w-[1200px] flex flex-wrap justify-center gap-8 md:gap-16">
            {stats.map((stat, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <span className={`text-4xl md:text-5xl font-black ${index === 0 ? 'text-primary' : 'text-white'}`}>
                  {stat.value}
                </span>
                <span className="text-sm text-text-muted mt-2 uppercase tracking-wide">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#0f172a] pt-12 pb-8 px-4 md:px-10 border-t border-[#1e40af]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 text-white mb-4">
              <div className="size-6 text-primary">
                <span className="material-symbols-outlined">shield_person</span>
              </div>
              <h2 className="text-white text-base font-bold">E Power Security</h2>
            </div>
            <p className="text-text-muted text-sm leading-relaxed">
              Setting the gold standard in modern security services. Protection you can trust, people you can rely on.
            </p>
          </div>
          <div className="col-span-1">
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Candidates</h4>
            <ul className="flex flex-col gap-2 text-text-muted text-sm">
              <li><a className="hover:text-primary transition-colors" href="#">Browse Jobs</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Candidate Login</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Submit Resume</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Job Alerts</a></li>
            </ul>
          </div>
          <div className="col-span-1">
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Company</h4>
            <ul className="flex flex-col gap-2 text-text-muted text-sm">
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/services" className="hover:text-primary transition-colors">Our Services</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div className="col-span-1">
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Contact</h4>
            <div className="flex flex-col gap-3 text-text-muted text-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">phone</span>
                <span>(02) 8921 0001</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span>epower.2012@yahoo.com</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">pin_drop</span>
                <span>Bonny Serrano Ave, Cubao, Quezon City, Metro Manila</span>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-[#1e40af] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#60a5fa]">
          <p>© 2025 E Power Security. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>

      {/* Auth Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false)
          setPendingJobId(null)
        }}
        onSwitchToSignup={() => {
          setShowLoginModal(false)
          setShowSignupModal(true)
        }}
        redirectTo={pendingJobId ? `/apply/${pendingJobId}` : null}
      />
      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={() => {
          setShowSignupModal(false)
          setShowLoginModal(true)
        }}
      />
    </div>
  )
}

export default Home

