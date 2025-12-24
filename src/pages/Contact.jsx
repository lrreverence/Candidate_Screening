import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // In a real application, this would send the form data to a backend
    console.log('Form submitted:', formData)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    }, 3000)
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
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full px-4 md:px-10 py-8 md:py-12 flex justify-center">
        <div className="w-full max-w-[1200px]">
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Contact Us</h1>
            <p className="text-text-muted text-lg max-w-2xl mx-auto">
              Get in touch with us for security services, career opportunities, or any inquiries
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Contact Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Get in Touch</h2>
                <p className="text-text-muted leading-relaxed mb-6">
                  Whether you're looking for security services, interested in joining our team, or have general inquiries, we're here to help. Reach out to us through any of the following channels.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-card-dark border border-secondary rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-2xl">phone</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">Phone</h3>
                      <p className="text-text-muted">(02) 8921 0001</p>
                      <p className="text-text-muted text-sm mt-1">Available 24/7 for emergencies</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card-dark border border-secondary rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-2xl">mail</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">Email</h3>
                      <p className="text-text-muted">epower.2012@yahoo.com</p>
                      <p className="text-text-muted text-sm mt-1">We respond within 24 hours</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card-dark border border-secondary rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-2xl">pin_drop</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">Office Address</h3>
                      <p className="text-text-muted">Bonny Serrano Ave, Cubao</p>
                      <p className="text-text-muted">Quezon City, Metro Manila</p>
                      <p className="text-text-muted text-sm mt-1">Visit us Monday to Friday, 8 AM - 5 PM</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card-dark border border-secondary rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                  Business Hours
                </h3>
                <div className="space-y-2 text-text-muted">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span>8:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span>9:00 AM - 1:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span>Closed</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-secondary">
                    <p className="text-sm text-primary font-medium">Emergency Services: 24/7</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-card-dark border border-secondary rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Send Us a Message</h2>
              
              {submitted ? (
                <div className="bg-primary/20 border border-primary rounded-lg p-6 text-center">
                  <span className="material-symbols-outlined text-primary text-4xl mb-3">check_circle</span>
                  <h3 className="text-lg font-bold text-white mb-2">Message Sent!</h3>
                  <p className="text-text-muted">Thank you for contacting us. We'll get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-background-dark border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-background-dark border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="john.doe@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-white mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-background-dark border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="+63 912 345 6789"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-white mb-2">
                      Subject *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-background-dark border border-secondary rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select a subject</option>
                      <option value="security-services">Security Services Inquiry</option>
                      <option value="career">Career Opportunities</option>
                      <option value="general">General Inquiry</option>
                      <option value="support">Customer Support</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows="5"
                      className="w-full px-4 py-3 bg-background-dark border border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-3 rounded-full bg-primary text-[#0f172a] text-sm font-bold hover:bg-[#60a5fa] transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">send</span>
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <section className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card-dark border border-secondary rounded-lg p-6 text-center">
              <span className="material-symbols-outlined text-primary text-4xl mb-3">support_agent</span>
              <h3 className="text-lg font-bold text-white mb-2">24/7 Support</h3>
              <p className="text-text-muted text-sm">
                Our support center is available around the clock for emergency security needs.
              </p>
            </div>
            <div className="bg-card-dark border border-secondary rounded-lg p-6 text-center">
              <span className="material-symbols-outlined text-primary text-4xl mb-3">quick_reference</span>
              <h3 className="text-lg font-bold text-white mb-2">Quick Response</h3>
              <p className="text-text-muted text-sm">
                We aim to respond to all inquiries within 24 hours during business days.
              </p>
            </div>
            <div className="bg-card-dark border border-secondary rounded-lg p-6 text-center">
              <span className="material-symbols-outlined text-primary text-4xl mb-3">verified</span>
              <h3 className="text-lg font-bold text-white mb-2">Trusted Partner</h3>
              <p className="text-text-muted text-sm">
                Over a decade of experience serving clients across the Philippines.
              </p>
            </div>
          </section>

          <div className="pt-8 border-t border-[#1e40af] text-center">
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

export default Contact

