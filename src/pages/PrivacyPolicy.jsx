import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PrivacyPolicy = () => {
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
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Privacy Policy</h1>
            <p className="text-text-muted text-sm">Last updated: January 2025</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8 text-text-muted">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
              <p className="leading-relaxed">
                E Power Security ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our recruitment portal and services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
              <p className="leading-relaxed mb-4">
                We may collect information about you in a variety of ways. The information we may collect on the site includes:
              </p>
              
              <h3 className="text-xl font-bold text-white mb-3 mt-6">Personal Data</h3>
              <p className="leading-relaxed mb-4">
                Personally identifiable information that you voluntarily provide to us when applying for positions, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name, email address, phone number, and mailing address</li>
                <li>Date of birth and government-issued identification numbers</li>
                <li>Employment history, educational background, and qualifications</li>
                <li>Resume, cover letter, and other application documents</li>
                <li>References and contact information for references</li>
                <li>Photographs and identification documents</li>
                <li>Background check information and criminal history records</li>
                <li>Any other information you choose to provide in your application</li>
              </ul>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">Derived Data</h3>
              <p className="leading-relaxed mb-4">
                Information our servers automatically collect when you access the site, such as:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your IP address, browser type, and operating system</li>
                <li>Access times and dates</li>
                <li>Pages viewed and time spent on pages</li>
                <li>Referring website addresses</li>
                <li>Device information and mobile network information</li>
              </ul>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">Account Data</h3>
              <p className="leading-relaxed">
                If you create an account, we may collect your username, password, and other authentication information to manage your account and application process.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
              <p className="leading-relaxed mb-4">
                Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the site to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process and evaluate your job application</li>
                <li>Verify your identity and qualifications</li>
                <li>Conduct background checks and security clearances</li>
                <li>Communicate with you regarding your application status</li>
                <li>Send you notifications about job opportunities that may interest you</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Comply with legal obligations and regulatory requirements</li>
                <li>Improve our recruitment processes and website functionality</li>
                <li>Prevent fraudulent activity and ensure security</li>
                <li>Generate anonymous statistical data for internal use</li>
                <li>Enforce our Terms of Service and other policies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Disclosure of Your Information</h2>
              <p className="leading-relaxed mb-4">
                We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
              </p>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">By Law or to Protect Rights</h3>
              <p className="leading-relaxed mb-4">
                If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.
              </p>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">Third-Party Service Providers</h3>
              <p className="leading-relaxed mb-4">
                We may share your information with third parties that perform services for us or on our behalf, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Background check and verification services</li>
                <li>Data storage and hosting providers</li>
                <li>Email and communication service providers</li>
                <li>Analytics and performance monitoring services</li>
              </ul>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">Business Transfers</h3>
              <p className="leading-relaxed">
                We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.
              </p>

              <h3 className="text-xl font-bold text-white mb-3 mt-6">With Your Consent</h3>
              <p className="leading-relaxed">
                We may disclose your personal information for any other purpose with your consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Data Security</h2>
              <p className="leading-relaxed">
                We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse. Any information disclosed online is vulnerable to interception and misuse by unauthorized parties. Therefore, we cannot guarantee complete security if you provide personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Data Retention</h2>
              <p className="leading-relaxed">
                We will retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. For unsuccessful applications, we may retain your information for up to two years for potential future opportunities, unless you request deletion. For successful applicants, we will retain your information as required by employment law and company policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Your Privacy Rights</h2>
              <p className="leading-relaxed mb-4">
                Depending on your location, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-white">Access:</strong> Request access to the personal information we hold about you</li>
                <li><strong className="text-white">Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong className="text-white">Deletion:</strong> Request deletion of your personal information, subject to legal obligations</li>
                <li><strong className="text-white">Objection:</strong> Object to processing of your personal information</li>
                <li><strong className="text-white">Restriction:</strong> Request restriction of processing your personal information</li>
                <li><strong className="text-white">Portability:</strong> Request transfer of your personal information to another service provider</li>
                <li><strong className="text-white">Withdrawal:</strong> Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="leading-relaxed mt-4">
                To exercise any of these rights, please contact us using the contact information provided at the end of this policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Cookies and Tracking Technologies</h2>
              <p className="leading-relaxed mb-4">
                We may use cookies, web beacons, tracking pixels, and other tracking technologies on the site to help customize the site and improve your experience. When you access the site, your personal information may be collected through the use of tracking technologies. Most browsers are set to accept cookies by default. You can remove or reject cookies, but such action may affect the availability and functionality of the site.
              </p>
              <p className="leading-relaxed">
                We may use cookies for authentication, session management, analytics, and to remember your preferences. You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Third-Party Websites</h2>
              <p className="leading-relaxed">
                The site may contain links to third-party websites and applications of interest, including advertisements and external services, that are not affiliated with us. Once you have used these links to leave the site, any information you provide to these third parties is not covered by this Privacy Policy, and we cannot guarantee the safety and privacy of your information. Before visiting and providing any information to any third-party websites, you should inform yourself of the privacy policies and practices (if any) of the third party responsible for that website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Children's Privacy</h2>
              <p className="leading-relaxed">
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately to have that information removed.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Policy for Residents of the Philippines</h2>
              <p className="leading-relaxed mb-4">
                If you are a resident of the Philippines, you have specific rights under the Data Privacy Act of 2012 (Republic Act No. 10173), including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Right to be informed about the collection and processing of your personal data</li>
                <li>Right to object to processing of your personal data</li>
                <li>Right to access your personal data</li>
                <li>Right to correct inaccurate or incomplete data</li>
                <li>Right to erasure or blocking of personal data</li>
                <li>Right to damages for violations of your privacy rights</li>
              </ul>
              <p className="leading-relaxed mt-4">
                We are committed to complying with the Data Privacy Act and protecting your personal information in accordance with Philippine law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Changes to This Privacy Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time in order to reflect changes to our practices or for other operational, legal, or regulatory reasons. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Contact Us</h2>
              <p className="leading-relaxed mb-4">
                If you have questions or comments about this Privacy Policy, or if you wish to exercise your privacy rights, please contact us at:
              </p>
              <div className="bg-card-dark border border-secondary rounded-lg p-6 space-y-3">
                <div>
                  <h4 className="text-white font-bold mb-2">E Power Security</h4>
                  <p className="text-text-muted text-sm">Data Privacy Officer</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">mail</span>
                  <span>epower.2012@yahoo.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">phone</span>
                  <span>(02) 8921 0001</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-1">pin_drop</span>
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

export default PrivacyPolicy

