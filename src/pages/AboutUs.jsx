import React from 'react'
import { Link } from 'react-router-dom'

const AboutUs = () => {
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
        <div className="w-full max-w-[900px]">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">About E Power Security</h1>
            <p className="text-text-muted text-lg">Setting the gold standard in modern security services</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8 text-text-muted">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
              <p className="leading-relaxed">
                At E Power Security, we are dedicated to providing exceptional security services that protect our clients' assets, people, and operations. Our mission is to deliver reliable, professional, and innovative security solutions while creating meaningful career opportunities for security professionals across the Philippines.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Who We Are</h2>
              <p className="leading-relaxed mb-4">
                E Power Security is a leading security services provider in the Philippines, with a proven track record of excellence spanning over a decade. We specialize in delivering comprehensive security solutions tailored to meet the unique needs of businesses, institutions, and individuals.
              </p>
              <p className="leading-relaxed">
                Our team consists of highly trained, licensed, and experienced security professionals who are committed to maintaining the highest standards of service. We operate with integrity, professionalism, and a deep commitment to protecting what matters most to our clients.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Our Values</h2>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="bg-card-dark border border-secondary rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-primary text-3xl">verified</span>
                    <h3 className="text-xl font-bold text-white">Integrity</h3>
                  </div>
                  <p className="leading-relaxed">
                    We conduct our business with honesty, transparency, and ethical practices. Our word is our bond, and we stand behind every commitment we make.
                  </p>
                </div>
                <div className="bg-card-dark border border-secondary rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-primary text-3xl">security</span>
                    <h3 className="text-xl font-bold text-white">Excellence</h3>
                  </div>
                  <p className="leading-relaxed">
                    We strive for excellence in everything we do, continuously improving our services and training our personnel to exceed expectations.
                  </p>
                </div>
                <div className="bg-card-dark border border-secondary rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-primary text-3xl">groups</span>
                    <h3 className="text-xl font-bold text-white">Teamwork</h3>
                  </div>
                  <p className="leading-relaxed">
                    We believe in the power of collaboration, both within our organization and with our clients, to achieve shared security goals.
                  </p>
                </div>
                <div className="bg-card-dark border border-secondary rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-primary text-3xl">diversity_3</span>
                    <h3 className="text-xl font-bold text-white">Respect</h3>
                  </div>
                  <p className="leading-relaxed">
                    We treat everyone with dignity and respect, fostering an inclusive environment where all team members can thrive and grow.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Our History</h2>
              <p className="leading-relaxed mb-4">
                Founded in 2012, E Power Security began with a vision to transform the security services industry in the Philippines. What started as a small team of dedicated professionals has grown into a trusted partner for hundreds of clients across Metro Manila and beyond.
              </p>
              <p className="leading-relaxed">
                Over the years, we have expanded our services, enhanced our training programs, and built a reputation for reliability and excellence. Today, we proudly serve a diverse clientele including corporate offices, retail establishments, residential communities, educational institutions, and industrial facilities.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Why Choose E Power Security</h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary text-2xl mt-1">check_circle</span>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Licensed & Certified</h3>
                    <p className="leading-relaxed">All our security personnel are properly licensed, certified, and undergo rigorous background checks before deployment.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary text-2xl mt-1">check_circle</span>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Comprehensive Training</h3>
                    <p className="leading-relaxed">Our guards receive ongoing training in security protocols, emergency response, customer service, and the latest security technologies.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary text-2xl mt-1">check_circle</span>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">24/7 Support</h3>
                    <p className="leading-relaxed">Our support center operates around the clock to ensure immediate response to any security concerns or emergencies.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary text-2xl mt-1">check_circle</span>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Proven Track Record</h3>
                    <p className="leading-relaxed">With 500+ active guards and coverage across 45 cities, we have demonstrated our ability to deliver reliable security solutions at scale.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary text-2xl mt-1">check_circle</span>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Competitive Benefits</h3>
                    <p className="leading-relaxed">We offer competitive compensation, comprehensive benefits, and career advancement opportunities to attract and retain the best talent.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary text-2xl mt-1">check_circle</span>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Client-Focused Approach</h3>
                    <p className="leading-relaxed">We work closely with each client to understand their unique needs and develop customized security solutions that fit their requirements.</p>
                  </div>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Our Commitment</h2>
              <p className="leading-relaxed mb-4">
                At E Power Security, we are committed to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining the highest standards of professionalism and service quality</li>
                <li>Investing in our people through continuous training and development</li>
                <li>Building long-term partnerships with our clients based on trust and reliability</li>
                <li>Contributing to safer communities across the Philippines</li>
                <li>Creating rewarding career opportunities for security professionals</li>
                <li>Staying at the forefront of security industry best practices and technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Join Our Team</h2>
              <p className="leading-relaxed mb-4">
                We are always looking for dedicated, professional individuals who share our commitment to excellence. If you're interested in a career in security services, we offer:
              </p>
              <div className="bg-card-dark border border-secondary rounded-lg p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">work</span>
                  <span>Competitive salaries and benefits packages</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">school</span>
                  <span>Comprehensive training and certification programs</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">trending_up</span>
                  <span>Career advancement opportunities</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">support_agent</span>
                  <span>24/7 support and assistance</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">groups</span>
                  <span>A supportive team environment</span>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors"
                >
                  View Open Positions
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-[#1e40af]">
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

export default AboutUs

