import React from 'react'
import { Link } from 'react-router-dom'

const OurServices = () => {
  const services = [
    {
      icon: 'security',
      title: 'Armed Security Guards',
      description: 'Highly trained and licensed armed security personnel for high-risk environments requiring maximum protection.',
      features: ['Licensed firearms handling', 'Advanced threat assessment', 'Rapid response capabilities', '24/7 monitoring']
    },
    {
      icon: 'badge',
      title: 'Unarmed Security Guards',
      description: 'Professional unarmed security services for retail, corporate, and residential properties.',
      features: ['Customer service focused', 'Access control management', 'Patrol and monitoring', 'Incident reporting']
    },
    {
      icon: 'videocam',
      title: 'CCTV Monitoring',
      description: 'Expert CCTV operators providing real-time surveillance and monitoring services.',
      features: ['24/7 monitoring', 'Real-time alerts', 'Video analysis', 'Incident documentation']
    },
    {
      icon: 'local_police',
      title: 'Mobile Patrol Services',
      description: 'Mobile security patrol units providing coverage across multiple locations and routes.',
      features: ['Regular patrol routes', 'Rapid response', 'Property inspections', 'Incident reporting']
    },
    {
      icon: 'event',
      title: 'Event Security',
      description: 'Specialized security services for corporate events, concerts, conferences, and public gatherings.',
      features: ['Crowd management', 'Access control', 'VIP protection', 'Emergency response']
    },
    {
      icon: 'business',
      title: 'Corporate Security',
      description: 'Comprehensive security solutions for office buildings, corporate campuses, and business facilities.',
      features: ['Reception services', 'Visitor management', 'Access control systems', 'Emergency protocols']
    }
  ]

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
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full px-4 md:px-10 py-8 md:py-12 flex justify-center">
        <div className="w-full max-w-[1200px]">
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Our Services</h1>
            <p className="text-text-muted text-lg max-w-2xl mx-auto">
              Comprehensive security solutions tailored to protect your business, property, and people
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-card-dark border border-secondary rounded-2xl p-6 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-3xl">{service.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{service.title}</h3>
                </div>
                <p className="text-text-muted mb-4 leading-relaxed">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-text-muted">
                      <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Additional Services Section */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Additional Services</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card-dark border border-secondary rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">shield</span>
                  Security Consulting
                </h3>
                <p className="text-text-muted leading-relaxed">
                  Expert security assessments and recommendations to help you identify vulnerabilities and implement effective security strategies for your organization.
                </p>
              </div>
              <div className="bg-card-dark border border-secondary rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">school</span>
                  Security Training
                </h3>
                <p className="text-text-muted leading-relaxed">
                  Comprehensive training programs for your staff on security awareness, emergency response, and best practices for maintaining a secure environment.
                </p>
              </div>
              <div className="bg-card-dark border border-secondary rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">support_agent</span>
                  Security System Integration
                </h3>
                <p className="text-text-muted leading-relaxed">
                  Integration of our security personnel with your existing security systems, including access control, alarm systems, and surveillance technology.
                </p>
              </div>
              <div className="bg-card-dark border border-secondary rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                  Flexible Scheduling
                </h3>
                <p className="text-text-muted leading-relaxed">
                  Customizable security coverage schedules to match your operational needs, including day shifts, night shifts, rotating schedules, and special event coverage.
                </p>
              </div>
            </div>
          </section>

          {/* Why Choose Our Services */}
          <section className="bg-card-dark border border-secondary rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Why Choose Our Services</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-primary text-4xl">verified</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Licensed & Certified</h3>
                <p className="text-text-muted text-sm">
                  All our security personnel are properly licensed and certified according to Philippine security regulations.
                </p>
              </div>
              <div className="text-center">
                <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-primary text-4xl">schedule</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">24/7 Availability</h3>
                <p className="text-text-muted text-sm">
                  Round-the-clock support and monitoring to ensure your security needs are met at all times.
                </p>
              </div>
              <div className="text-center">
                <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-primary text-4xl">trending_up</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Proven Track Record</h3>
                <p className="text-text-muted text-sm">
                  Over a decade of experience serving clients across Metro Manila and beyond with exceptional results.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Secure Your Property?</h2>
            <p className="text-text-muted mb-6 max-w-2xl mx-auto">
              Contact us today to discuss your security needs and get a customized solution that fits your requirements and budget.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors"
              >
                <span className="material-symbols-outlined">mail</span>
                Contact Us
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-secondary text-white text-sm font-bold hover:bg-[#1e3a8a] transition-colors"
              >
                View Open Positions
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-[#1e40af] text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Return to Home
            </Link>
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

export default OurServices

