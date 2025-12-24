import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'

const JobDetail = () => {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs: supabaseJobs, loading: supabaseLoading } = useSupabase()
  const { user } = useAuth()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fallback jobs data
  const fallbackJobs = [
    {
      id: 1,
      title: "Security Guard (Armed)",
      location: "Makati City, Metro Manila",
      salary: "₱18,000 - ₱22,000/month",
      type: "Full-time",
      shift: "Night Shift",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZRk1m2i3zfyB3hCaKff_AaKIkUS-CTpDqys4aGCynnaHv0j12a4W1adJzL-j7qLkeNbOXgCg1a_H8CNti8u0ayjNHdYwra9uxSx49Sni_0sEIAnbPttmR-zqjVOp8vc4p3QT6qrWiEDfYD2oZ-VRtGilar8Bj6EKSmIk8duqo0pUnz7GrfY-HcBgMROD8VwkQEhcjfHBmuy9pkJ013rxG65VXxQmd6SRD6cMr_NnKjc2s8AaT9IzN9G0GCI9QOjO1jkqmZa3BKl0",
      badge_text: "Urgent",
      badge_icon: "schedule",
      badge_color: "primary",
      category: "Armed Guard",
      description: "We are seeking a highly trained and licensed Armed Security Guard to provide security services for high-risk environments. The ideal candidate will have extensive experience in security operations and be capable of handling emergency situations with professionalism and composure.",
      requirements: [
        "Valid Security Guard License (SGL) with firearms endorsement",
        "At least 2 years of experience in armed security",
        "Physical fitness and ability to stand/walk for extended periods",
        "Excellent observation and communication skills",
        "Ability to work night shifts and weekends",
        "Clean criminal record and background check",
        "First Aid and CPR certification preferred"
      ],
      responsibilities: [
        "Patrol assigned areas and monitor for suspicious activity",
        "Control access to facilities and verify credentials",
        "Respond to emergencies and security incidents",
        "Maintain detailed logs and incident reports",
        "Coordinate with law enforcement when necessary",
        "Ensure compliance with security protocols and procedures"
      ],
      benefits: [
        "Competitive salary package",
        "Health insurance coverage",
        "Paid training and certification",
        "Career advancement opportunities",
        "Overtime pay available",
        "Uniform and equipment provided"
      ]
    },
    {
      id: 2,
      title: "CCTV Operator",
      location: "Quezon City, Metro Manila",
      salary: "₱16,000 - ₱20,000/month",
      type: "Full-time",
      shift: "Rotating Shift",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAd3CslepwCSCpzvnCvkdjTpLzFZo7a4Etdl0lv97RQpd0h28B4gQZBPPK5zeKow3OM3jsmbGeeBZx5P9B7rpa1lG9V1-cGrI8ftwtDNudIM0nlajhnlbeeXbghOIGz8RHQuwFQb3MO34wjCfprCTIPe5k97fse0DsQREMslQTr3A_PifwdY3uad8mQmNsFDsix0nDMfF0Ts3IhftoVa_lJ7tNXmP75zhcVr7wdoR9G48rUJJIurAwWJc1JSZeIt9g75dmj9Lk-bAU",
      category: "CCTV Operator",
      description: "Join our team as a CCTV Operator and play a crucial role in maintaining security through advanced surveillance systems. You will monitor multiple camera feeds, identify potential security threats, and coordinate with on-ground security personnel.",
      requirements: [
        "High school diploma or equivalent",
        "Experience with CCTV systems preferred",
        "Strong attention to detail and observation skills",
        "Ability to work in a fast-paced environment",
        "Basic computer skills",
        "Good communication skills",
        "Ability to work rotating shifts including nights and weekends"
      ],
      responsibilities: [
        "Monitor multiple CCTV camera feeds simultaneously",
        "Identify and report suspicious activities",
        "Maintain surveillance logs and records",
        "Coordinate with security teams on the ground",
        "Operate and maintain CCTV equipment",
        "Respond to alarms and security alerts"
      ],
      benefits: [
        "Competitive salary",
        "Health insurance",
        "Paid training on advanced systems",
        "Career growth opportunities",
        "Shift differential pay",
        "Modern control room environment"
      ]
    },
    {
      id: 3,
      title: "Security Guard (Unarmed)",
      location: "BGC, Taguig City",
      salary: "₱15,000 - ₱18,000/month",
      type: "Full-time",
      shift: "Day Shift",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBh9NMyTEvvaGeIKwMO8q4oXClyDNEfQZbeGYFYAkN8akCAZ24d5EgqzkxMRYvQzMGHKGBvpT01CapUkx4T2G2IAUzZhq6TvhBt4649rDmEobaxK5WreRqjiA1hDNJ2QojG35dXwHl-ECy-06STI2vJVHMyssr7x6GWL0nLx9ixPB10hKhW2yNOxPv6danYy-Gb_bSV5cu-ntXN_q_ljLo9xD2YOApmT13Y4GG5Ncg6AjnlN8Tvdlo-XdtxJykbRqlJv4iu6SHwvWA",
      badge_text: "Featured",
      badge_icon: "star",
      badge_color: "white",
      category: "Unarmed",
      description: "We are looking for professional Unarmed Security Guards to provide security services for corporate and commercial properties. This role focuses on customer service, access control, and maintaining a safe environment.",
      requirements: [
        "Valid Security Guard License (SGL)",
        "At least 1 year of security experience",
        "Excellent customer service skills",
        "Professional appearance and demeanor",
        "Ability to work day shifts",
        "Good communication skills in English and Filipino",
        "Physical fitness for standing and walking"
      ],
      responsibilities: [
        "Greet and assist visitors professionally",
        "Control access to facilities",
        "Conduct regular patrols",
        "Monitor security systems",
        "Write incident reports",
        "Respond to emergencies"
      ],
      benefits: [
        "Competitive salary",
        "Health benefits",
        "Paid training",
        "Career advancement",
        "Day shift schedule",
        "Professional development"
      ]
    },
    {
      id: 4,
      title: "Security Guard (Mall)",
      location: "SM Megamall, Mandaluyong",
      salary: "₱16,000 - ₱19,000/month",
      type: "Full-time",
      shift: "Rotating Shift",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCvKqooubCoZGLRW7V4ltaM6NioiQHhGVpY1y-vsWMHOvpsiD-DzwmTBjXElR_57s0VowCVX2o5eOku1mGsFcxYO-YU7Gv_zUaAGnD0J32av5BscfikETzCx5bM8NAaxQCGB0ts0_cbO9taEVpE5tN4bjfCYp5sUoXMmac4gIUhcQFm_OCku93Vkw-mNm05jJumUA1tHqgguVbP0YyOjddNAXl9BGQQPhcQI4LLzIrwKmVfEYJ5AxuHY8FZXU7ZshksmOpmhyeeS4c",
      category: "Unarmed",
      description: "Join our team as a Mall Security Guard and help ensure the safety of shoppers and staff in one of Metro Manila's busiest shopping centers. This role requires excellent customer service skills and the ability to handle high-traffic environments.",
      requirements: [
        "Valid Security Guard License",
        "Experience in retail or mall security preferred",
        "Excellent customer service orientation",
        "Ability to work in a fast-paced environment",
        "Physical fitness for extended standing and walking",
        "Conflict resolution skills",
        "Flexibility to work rotating shifts"
      ],
      responsibilities: [
        "Patrol mall premises regularly",
        "Assist shoppers and provide directions",
        "Monitor for shoplifting and suspicious activity",
        "Coordinate with mall management",
        "Handle customer complaints professionally",
        "Respond to medical emergencies"
      ],
      benefits: [
        "Competitive salary",
        "Health insurance",
        "Mall employee discounts",
        "Paid training",
        "Career opportunities",
        "Uniform provided"
      ]
    },
    {
      id: 5,
      title: "Mobile Patrol Guard",
      location: "Pasig City, Metro Manila",
      salary: "₱17,000 - ₱21,000/month",
      type: "Full-time",
      shift: "Graveyard Shift",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC1bg08hhvOVTxQc6qVqHCSaooNdV2mj5taGFS5ox5-4rncQ0vqOShI017F-MtNCkpigVEY4oXl0jqcG9fIYmfSYBJAOP4x2Jl5lDhSKPbCsMXA8h187ooq2ksnL4Obiwix2LKWVwLWFxGnbDDyr0WtrqWnd85r-Jh-WzgFZsbQ98nefREOnh4BDSgOtZBO-v01Fa_KSsuNd9F6eot95kllgrwffensJQ2O56wtZep1fzDsxu4sdpYfAmapl1OmFOMUToTU1alFvII",
      category: "Patrol",
      description: "We are seeking Mobile Patrol Guards to provide security coverage across multiple locations. This role involves patrolling assigned routes, conducting property inspections, and responding to security incidents.",
      requirements: [
        "Valid Security Guard License",
        "Valid driver's license preferred",
        "At least 1 year of security experience",
        "Ability to work graveyard shifts",
        "Physical fitness for patrol duties",
        "Good navigation and map-reading skills",
        "Reliable and punctual"
      ],
      responsibilities: [
        "Patrol assigned routes and locations",
        "Conduct property inspections",
        "Document security findings",
        "Respond to alarm activations",
        "Coordinate with stationary security posts",
        "Maintain patrol vehicle and equipment"
      ],
      benefits: [
        "Competitive salary with shift differential",
        "Health insurance",
        "Vehicle and equipment provided",
        "Paid training",
        "Career advancement",
        "Overtime opportunities"
      ]
    }
  ]

  useEffect(() => {
    const fetchJob = () => {
      setLoading(true)
      
      // Try to find job from Supabase first
      if (supabaseJobs && supabaseJobs.length > 0) {
        const foundJob = supabaseJobs.find(j => j.id === parseInt(jobId))
        if (foundJob) {
          setJob({
            id: foundJob.id,
            title: foundJob.title,
            location: foundJob.location,
            salary: foundJob.salary,
            type: foundJob.type,
            shift: foundJob.shift,
            image: foundJob.image,
            badge: foundJob.badge_text ? {
              text: foundJob.badge_text,
              icon: foundJob.badge_icon,
              color: foundJob.badge_color
            } : null,
            category: foundJob.category,
            description: foundJob.description || "Join our team and help us provide exceptional security services.",
            requirements: foundJob.requirements || [],
            responsibilities: foundJob.responsibilities || [],
            benefits: foundJob.benefits || []
          })
          setLoading(false)
          return
        }
      }
      
      // Fallback to static data
      const foundJob = fallbackJobs.find(j => j.id === parseInt(jobId))
      if (foundJob) {
        setJob(foundJob)
      } else {
        // Job not found
        setJob(null)
      }
      setLoading(false)
    }

    if (!supabaseLoading) {
      fetchJob()
    }
  }, [jobId, supabaseJobs, supabaseLoading])

  const handleApply = () => {
    navigate(`/apply/${jobId}`)
  }

  if (loading || supabaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-white">
        <div className="text-center">
          <div className="text-text-muted">Loading job details...</div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-white">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-text-muted mb-4">error_outline</span>
          <h2 className="text-2xl font-bold text-white mb-2">Job Not Found</h2>
          <p className="text-text-muted mb-6">The job you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Jobs
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-white font-display">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-[#1e40af] bg-[#0f172a]/95 backdrop-blur-md">
        <div className="px-4 md:px-10 py-3 max-w-[1200px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 text-white">
            <div className="size-8 text-primary">
              <span className="material-symbols-outlined text-[32px]">shield_person</span>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">E Power Security</h2>
          </Link>
          <Link
            to="/"
            className="flex h-10 px-6 cursor-pointer items-center justify-center rounded-full bg-secondary text-white text-sm font-bold hover:bg-[#1e3a8a] transition-colors"
          >
            Back to Jobs
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full">
        {/* Hero Section with Job Image */}
        <div 
          className="w-full h-64 md:h-80 bg-cover bg-center relative"
          style={{ backgroundImage: `url("${job.image}")` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/80 to-transparent"></div>
          <div className="relative z-10 max-w-[1200px] mx-auto px-4 md:px-10 pt-8 h-full flex flex-col justify-end pb-8">
            {job.badge && (
              <div className="mb-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                  job.badge.color === 'primary' 
                    ? 'bg-primary text-[#0f172a]' 
                    : 'bg-white/20 backdrop-blur-sm text-white border border-white/30'
                }`}>
                  <span className="material-symbols-outlined text-[18px]">{job.badge.icon}</span>
                  {job.badge.text}
                </div>
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-black text-white mb-2">{job.title}</h1>
            <div className="flex items-center gap-4 text-text-muted">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">location_on</span>
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">work</span>
                <span>{job.category}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8 md:py-12">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-8">
              {/* Job Description */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Job Description</h2>
                <p className="text-text-muted leading-relaxed">{job.description}</p>
              </section>

              {/* Responsibilities */}
              {job.responsibilities && job.responsibilities.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4">Key Responsibilities</h2>
                  <ul className="space-y-3">
                    {job.responsibilities.map((responsibility, index) => (
                      <li key={index} className="flex items-start gap-3 text-text-muted">
                        <span className="material-symbols-outlined text-primary text-xl mt-0.5">check_circle</span>
                        <span>{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4">Requirements</h2>
                  <ul className="space-y-3">
                    {job.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start gap-3 text-text-muted">
                        <span className="material-symbols-outlined text-primary text-xl mt-0.5">verified</span>
                        <span>{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Apply Card */}
              <div className="bg-card-dark border border-secondary rounded-2xl p-6 sticky top-24">
                <h3 className="text-xl font-bold text-white mb-4">Job Details</h3>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">payments</span>
                    <div>
                      <div className="text-sm text-text-muted">Salary</div>
                      <div className="text-white font-semibold">{job.salary}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                    <div>
                      <div className="text-sm text-text-muted">Shift</div>
                      <div className="text-white font-semibold">{job.shift}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">work</span>
                    <div>
                      <div className="text-sm text-text-muted">Employment Type</div>
                      <div className="text-white font-semibold">{job.type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                    <div>
                      <div className="text-sm text-text-muted">Location</div>
                      <div className="text-white font-semibold">{job.location}</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleApply}
                  className="w-full h-12 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors flex items-center justify-center gap-2"
                >
                  Apply Now
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>

              {/* Benefits */}
              {job.benefits && job.benefits.length > 0 && (
                <div className="bg-card-dark border border-secondary rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Benefits</h3>
                  <ul className="space-y-2">
                    {job.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2 text-text-muted">
                        <span className="material-symbols-outlined text-primary text-[18px]">star</span>
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#0f172a] pt-12 pb-8 px-4 md:px-10 border-t border-[#1e40af]">
        <div className="max-w-[1200px] mx-auto">
          <div className="border-t border-[#1e40af] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#60a5fa]">
            <p>© 2025 E Power Security. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default JobDetail

