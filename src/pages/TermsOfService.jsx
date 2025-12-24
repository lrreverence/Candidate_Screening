import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const TermsOfService = () => {
  const { user } = useAuth()

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
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Terms of Service</h1>
            <p className="text-text-muted text-sm">Last updated: January 2025</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8 text-text-muted">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By accessing and using the E Power Security recruitment portal ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Use License</h2>
              <p className="leading-relaxed mb-4">
                Permission is granted to temporarily access the materials on E Power Security's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained on the website</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Job Application Process</h2>
              <p className="leading-relaxed mb-4">
                By submitting an application through our portal, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate, current, and complete information about yourself</li>
                <li>Maintain and promptly update your information to keep it accurate</li>
                <li>Submit only genuine applications for positions you are qualified for</li>
                <li>Understand that false or misleading information may result in immediate rejection or termination</li>
                <li>Consent to background checks and verification of provided information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Eligibility Requirements</h2>
              <p className="leading-relaxed mb-4">
                To be eligible for employment with E Power Security, applicants must:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Be at least 18 years of age</li>
                <li>Possess valid government-issued identification</li>
                <li>Meet the specific qualifications for the position applied for</li>
                <li>Pass required background checks and security clearances</li>
                <li>Be legally authorized to work in the Philippines</li>
                <li>Have no criminal record that would disqualify them from security work</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Privacy and Data Protection</h2>
              <p className="leading-relaxed">
                Your personal information, including but not limited to contact details, employment history, and identification documents, will be collected and processed in accordance with our Privacy Policy and applicable data protection laws. By using this service, you consent to the collection and use of your information as described in our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Account Responsibilities</h2>
              <p className="leading-relaxed mb-4">
                If you create an account on our portal, you are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
                <li>Ensuring that you exit from your account at the end of each session</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Prohibited Conduct</h2>
              <p className="leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service for any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>Violate any local, state, national, or international law or regulation</li>
                <li>Transmit any viruses, worms, or malicious code</li>
                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                <li>Impersonate any person or entity, or falsely state or misrepresent your affiliation with any person or entity</li>
                <li>Harvest or collect email addresses or other contact information of other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Intellectual Property</h2>
              <p className="leading-relaxed">
                The Service and its original content, features, and functionality are and will remain the exclusive property of E Power Security and its licensors. The Service is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Limitation of Liability</h2>
              <p className="leading-relaxed">
                In no event shall E Power Security, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Employment Decisions</h2>
              <p className="leading-relaxed">
                E Power Security reserves the right to accept or reject any application at its sole discretion. Submission of an application does not guarantee employment or an interview. All employment decisions are made based on qualifications, business needs, and other factors determined by E Power Security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Modifications to Terms</h2>
              <p className="leading-relaxed">
                E Power Security reserves the right to modify these terms at any time. We will notify users of any changes by posting the new Terms of Service on this page and updating the "Last updated" date. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Termination</h2>
              <p className="leading-relaxed">
                We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Governing Law</h2>
              <p className="leading-relaxed">
                These Terms shall be interpreted and governed by the laws of the Republic of the Philippines, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of Quezon City, Metro Manila.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">14. Contact Information</h2>
              <p className="leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-card-dark border border-secondary rounded-lg p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">mail</span>
                  <span>epower.2012@yahoo.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">phone</span>
                  <span>(02) 8921 0001</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">pin_drop</span>
                  <span>Bonny Serrano Ave, Cubao, Quezon City, Metro Manila</span>
                </div>
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

export default TermsOfService

