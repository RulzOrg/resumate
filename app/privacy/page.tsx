import Link from "next/link"
import { RefreshCw } from "lucide-react"

export const metadata = {
  title: "Privacy Policy | ResuMate AI",
  description: "Privacy Policy for ResuMate AI - How we collect, use, and protect your data",
}

export default function PrivacyPage() {
  const lastUpdated = "December 22, 2024"

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border dark:border-white/10">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border dark:border-white/10 bg-surface-subtle dark:bg-white/5 px-3 py-2 backdrop-blur"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center bg-emerald-500 rounded-full">
              <RefreshCw className="h-4 w-4" />
            </span>
            <span className="text-base font-medium tracking-tighter">ResuMate AI</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-tight font-space-grotesk mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p className="text-foreground/80 leading-relaxed">
              ResuMate AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our AI-powered 
              resume optimization service.
            </p>
            <p className="text-foreground/80 leading-relaxed mt-4">
              Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, 
              please do not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">2.1 Personal Information</h3>
            <p className="text-foreground/80 leading-relaxed">
              When you create an account or use our services, we may collect:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li><strong>Account Information:</strong> Name, email address, and password (managed by Clerk)</li>
              <li><strong>Profile Information:</strong> Professional title, industry, and preferences</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through Stripe</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.2 Resume Content</h3>
            <p className="text-foreground/80 leading-relaxed">
              When you upload or create resumes, we collect:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Resume text and formatting</li>
              <li>Work history, education, and skills</li>
              <li>Contact information included in your resume</li>
              <li>Job descriptions you provide for optimization</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.3 Usage Data</h3>
            <p className="text-foreground/80 leading-relaxed">
              We automatically collect certain information when you use our Service:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Device information (browser type, operating system)</li>
              <li>IP address and general location</li>
              <li>Pages visited and features used</li>
              <li>Time spent on the Service</li>
              <li>Referring website or source</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <p className="text-foreground/80 leading-relaxed">
              We use the information we collect for the following purposes:
            </p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">3.1 Service Delivery</h3>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Parse and analyze your resume content</li>
              <li>Generate AI-optimized resume versions</li>
              <li>Provide ATS compatibility scoring</li>
              <li>Store and manage your resume versions</li>
              <li>Process payments and manage subscriptions</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">3.2 AI Processing</h3>
            <p className="text-foreground/80 leading-relaxed">
              Your resume content is processed by AI models to:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Extract and structure resume information</li>
              <li>Generate optimized content tailored to job descriptions</li>
              <li>Identify keywords and skills alignment</li>
              <li>Provide improvement recommendations</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mt-4 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <strong>Important:</strong> We do NOT use your personal resume data to train our AI models. 
              Your data is used solely to provide services to you.
            </p>

            <h3 className="text-xl font-medium mt-6 mb-3">3.3 Communication</h3>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Send service-related notifications</li>
              <li>Respond to support requests</li>
              <li>Send marketing communications (with your consent)</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">3.4 Service Improvement</h3>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Analyze usage patterns to improve features</li>
              <li>Debug and fix technical issues</li>
              <li>Develop new features and services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Third-Party Services</h2>
            <p className="text-foreground/80 leading-relaxed">
              We use trusted third-party services to operate our platform:
            </p>
            
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-surface-subtle dark:bg-white/5 rounded-lg">
                <h4 className="font-medium">Clerk (Authentication)</h4>
                <p className="text-sm text-foreground/70 mt-1">
                  Manages user authentication and account security. 
                  <a href="https://clerk.com/privacy" className="text-emerald-500 ml-1" target="_blank" rel="noopener noreferrer">
                    Clerk Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="p-4 bg-surface-subtle dark:bg-white/5 rounded-lg">
                <h4 className="font-medium">Stripe (Payments)</h4>
                <p className="text-sm text-foreground/70 mt-1">
                  Processes subscription payments securely. We never store your full credit card details.
                  <a href="https://stripe.com/privacy" className="text-emerald-500 ml-1" target="_blank" rel="noopener noreferrer">
                    Stripe Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="p-4 bg-surface-subtle dark:bg-white/5 rounded-lg">
                <h4 className="font-medium">OpenAI (AI Processing)</h4>
                <p className="text-sm text-foreground/70 mt-1">
                  Powers our AI resume optimization. Content is processed but not used for model training.
                  <a href="https://openai.com/privacy" className="text-emerald-500 ml-1" target="_blank" rel="noopener noreferrer">
                    OpenAI Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="p-4 bg-surface-subtle dark:bg-white/5 rounded-lg">
                <h4 className="font-medium">Cloudflare R2 (Storage)</h4>
                <p className="text-sm text-foreground/70 mt-1">
                  Stores uploaded resume files securely with encryption.
                  <a href="https://www.cloudflare.com/privacypolicy/" className="text-emerald-500 ml-1" target="_blank" rel="noopener noreferrer">
                    Cloudflare Privacy Policy
                  </a>
                </p>
              </div>
              
              <div className="p-4 bg-surface-subtle dark:bg-white/5 rounded-lg">
                <h4 className="font-medium">Neon (Database)</h4>
                <p className="text-sm text-foreground/70 mt-1">
                  Hosts our database with enterprise-grade security.
                  <a href="https://neon.tech/privacy-policy" className="text-emerald-500 ml-1" target="_blank" rel="noopener noreferrer">
                    Neon Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Retention</h2>
            <p className="text-foreground/80 leading-relaxed">
              We retain your data for as long as necessary to provide our services:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li><strong>Account Data:</strong> Retained while your account is active</li>
              <li><strong>Resume Content:</strong> Stored until you delete it or close your account</li>
              <li><strong>Usage Logs:</strong> Retained for up to 12 months for analytics</li>
              <li><strong>Payment Records:</strong> Retained as required by law (typically 7 years)</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mt-4">
              When you delete your account, we will delete your personal data within 30 days, except where 
              retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data Security</h2>
            <p className="text-foreground/80 leading-relaxed">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Encryption in transit (TLS/SSL) and at rest</li>
              <li>Secure authentication with multi-factor options</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls limiting employee access to data</li>
              <li>Secure cloud infrastructure with SOC 2 compliance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights</h2>
            <p className="text-foreground/80 leading-relaxed">
              Depending on your location, you may have the following rights:
            </p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">7.1 For All Users</h3>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Delete your account and associated data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">7.2 GDPR Rights (EU/EEA Residents)</h3>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Right to restriction of processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent</li>
              <li>Right to lodge a complaint with a supervisory authority</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">7.3 CCPA Rights (California Residents)</h3>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Right to know what personal information is collected</li>
              <li>Right to know if personal information is sold or disclosed</li>
              <li>Right to opt-out of sale of personal information</li>
              <li>Right to non-discrimination for exercising your rights</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mt-4">
              <strong>Note:</strong> We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Cookies and Tracking</h2>
            <p className="text-foreground/80 leading-relaxed">
              We use cookies and similar technologies for:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li><strong>Essential Cookies:</strong> Required for authentication and security</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
              <li><strong>Analytics Cookies:</strong> Understand how users interact with our Service</li>
            </ul>
            <p className="text-foreground/80 leading-relaxed mt-4">
              You can control cookies through your browser settings. Note that disabling certain cookies may 
              affect the functionality of our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Children's Privacy</h2>
            <p className="text-foreground/80 leading-relaxed">
              Our Service is not intended for users under 16 years of age. We do not knowingly collect 
              personal information from children under 16. If you become aware that a child has provided 
              us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. International Data Transfers</h2>
            <p className="text-foreground/80 leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place for such transfers, including standard 
              contractual clauses approved by relevant authorities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Changes to This Policy</h2>
            <p className="text-foreground/80 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last updated" date. For material 
              changes, we will notify you via email or prominent notice on our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Contact Us</h2>
            <p className="text-foreground/80 leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us:
            </p>
            <div className="mt-4 p-4 bg-surface-subtle dark:bg-white/5 rounded-lg">
              <p className="text-foreground/80">
                <strong>Email:</strong>{" "}
                <a href="mailto:privacy@useresumate.com" className="text-emerald-500 hover:text-emerald-400">
                  privacy@useresumate.com
                </a>
              </p>
              <p className="text-foreground/80 mt-2">
                <strong>Support:</strong>{" "}
                <Link href="/support" className="text-emerald-500 hover:text-emerald-400">
                  Contact Support
                </Link>
              </p>
            </div>
            <p className="text-foreground/80 leading-relaxed mt-4">
              We will respond to your request within 30 days.
            </p>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-border dark:border-white/10">
          <Link href="/" className="text-emerald-500 hover:text-emerald-400">
            ← Back to Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border dark:border-white/10 mt-16">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} ResuMate AI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link href="/support" className="text-sm text-muted-foreground hover:text-foreground">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

