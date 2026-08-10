import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import Footer from '../pageComponets/Footer'

function LegalPage() {
  const location = useLocation()
  const isPrivacy = location.pathname.includes('privacy')

  useEffect(() => {
    document.title = isPrivacy ? 'Privacy Policy | Vakrayan' : 'Terms of Service | Vakrayan'
    window.scrollTo(0, 0)
  }, [isPrivacy])

  const termsData = [
    {
      title: "1. Agreement to Terms",
      body: "Welcome to Vakrayan. By accessing our platform, registering an account, or placing an order, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use our services."
    },
    {
      title: "2. Registration & Account Security",
      body: "To place orders or unlock membership tiers, you must create a secure profile. You are solely responsible for maintaining the confidentiality of your account credentials. Vakrayan is not liable for any unauthorized access or transaction disputes."
    },
    {
      title: "3. Secure Payments & Razorpay",
      body: "All credit/debit card transactions, UPI payments, and wallet top-ups are processed securely via the Razorpay payment gateway. Vakrayan does not store, inspect, or manage your sensitive financial details on our databases."
    },
    {
      title: "4. Shipping, Delivery & Tracking",
      body: "We ship orders across India. Standard orders are processed within 2-3 business days. Delivery times typically range between 3-7 business days depending on your pin code location. Real-time tracking will be provided via your dashboard once dispatched."
    },
    {
      title: "5. 7-Day Return & Exchange Policy",
      body: "We offer a 7-day returns and exchanges window starting from the date of delivery. Items must be unworn, unwashed, and in their original packaging with tags intact. To initiate a request, upload front and back photos of the garment via your order detail page. Returns are subject to approval."
    },
    {
      title: "6. Limitation of Liability",
      body: "Vakrayan and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our services, or for the cost of procurement of substitute goods."
    }
  ]

  const privacyData = [
    {
      title: "1. Information We Collect",
      body: "We collect personal data you provide directly to us (name, email address, phone number, shipping and billing addresses) to process your orders, manage accounts, and deliver newsletter updates if subscribed."
    },
    {
      title: "2. How We Use Your Data",
      body: "Your information is used to process transactions, manage deliveries, prevent fraudulent orders, and improve user experiences. We do not sell, trade, or distribute your database metrics to third-party marketing companies."
    },
    {
      title: "3. Third-Party Integrations",
      body: "We share necessary logistics and payment metrics with secure third parties to fulfill your transactions. Payment details are handled entirely by Razorpay, and shipping coordinates are synced with our delivery partners."
    },
    {
      title: "4. Data Retention & Deletion",
      body: "We retain account profiles, shipping addresses, and transaction histories to comply with financial audits. You may request data deletion or edit your account information at any time from your user profile panel."
    },
    {
      title: "5. Security Measures",
      body: "We implement advanced server encryption and Appwrite database security guidelines to shield your data from unauthorized access, breach, or disclosure. However, no internet transmission is 100% secure."
    }
  ]

  const activeData = isPrivacy ? privacyData : termsData

  return (
    <>
      <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans pb-20">
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-12 space-y-10 relative z-20">
          
          {/* Back button */}
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors uppercase group cursor-pointer">
              <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
          </div>

          {/* Page Title */}
          <div className="border-b border-[var(--color-border)] pb-6">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase leading-none">
              {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-[var(--color-accent)] uppercase mt-2 font-bold">
              Last Updated: July 2026 // VAKRAYAN LEGAL DEPT
            </p>
          </div>

          {/* Content sections */}
          <div className="space-y-8">
            {activeData.map((section, idx) => (
              <div key={idx} className="space-y-2.5">
                <h3 className="text-base font-black tracking-wide uppercase text-[var(--color-text)]">
                  {section.title}
                </h3>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          {/* Contact footer */}
          <div className="bg-[var(--color-subtle)] border border-[var(--color-border)] p-6 rounded-2xl space-y-2.5">
            <h4 className="text-xs font-mono font-black tracking-widest text-[var(--color-text)] uppercase">
              ⚖️ Need Legal Assistance?
            </h4>
            <p className="text-[11px] text-[var(--color-muted)] leading-relaxed normal-case">
              If you have any questions regarding our terms, return conditions, or privacy policies, please reach out to our team at{' '}
              <a href="mailto:support@vakrayan.com" className="text-[var(--color-accent)] font-bold hover:underline">
                support@vakrayan.com
              </a>
              .
            </p>
          </div>

        </div>
      </div>
      <Footer />
    </>
  )
}

export default LegalPage
