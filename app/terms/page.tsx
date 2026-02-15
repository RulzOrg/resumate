import Link from "next/link"
import { Logo } from "@/components/ui/logo"

export const metadata = {
  title: "Terms of Service | Useresumate",
  description: "Terms of Service for Useresumate - AI-powered resume optimization platform",
}

export default function TermsPage() {
  const lastUpdated = "December 22, 2024"

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-border bg-surface-subtle px-3 py-2 backdrop-blur"
          >
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-4xl font-bold tracking-tight font-space-grotesk mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Agreement to Terms</h2>
            <p className="text-foreground/80 leading-relaxed">
              By accessing or using Useresumate ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
              If you disagree with any part of these terms, you may not access the Service. These Terms apply to all 
              visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
            <p className="text-foreground/80 leading-relaxed">
              Useresumate is an AI-powered resume optimization platform that helps users create ATS-friendly, 
              job-tailored resumes. Our services include:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Resume parsing and analysis</li>
              <li>AI-powered resume optimization for specific job descriptions</li>
              <li>ATS compatibility checking and scoring</li>
              <li>Resume version management</li>
              <li>Export to multiple formats (PDF, DOCX)</li>
              <li>Cover letter generation (Pro plans)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Accounts</h2>
            <p className="text-foreground/80 leading-relaxed">
              When you create an account with us, you must provide accurate, complete, and current information. 
              Failure to do so constitutes a breach of the Terms, which may result in immediate termination of 
              your account on our Service.
            </p>
            <p className="text-foreground/80 leading-relaxed mt-4">
              You are responsible for safeguarding the password that you use to access the Service and for any 
              activities or actions under your password. You agree not to disclose your password to any third party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Acceptable Use</h2>
            <p className="text-foreground/80 leading-relaxed">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Upload false, misleading, or fraudulent information in your resume</li>
              <li>Impersonate another person or misrepresent your qualifications</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to other accounts or systems</li>
              <li>Use automated systems or bots to access the Service without permission</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Subscription and Billing</h2>
            <h3 className="text-xl font-medium mt-6 mb-3">5.1 Free Plan</h3>
            <p className="text-foreground/80 leading-relaxed">
              The free plan includes limited monthly usage. Free plan features and limits may change at our discretion.
            </p>

            <h3 className="text-xl font-medium mt-6 mb-3">5.2 Paid Subscriptions</h3>
            <p className="text-foreground/80 leading-relaxed">
              Paid subscriptions are billed in advance on a monthly or annual basis. Your subscription will 
              automatically renew unless you cancel it before the renewal date.
            </p>

            <h3 className="text-xl font-medium mt-6 mb-3">5.3 Cancellation</h3>
            <p className="text-foreground/80 leading-relaxed">
              You may cancel your subscription at any time through your account settings. Upon cancellation, 
              you will retain access to paid features until the end of your current billing period.
            </p>

            <h3 className="text-xl font-medium mt-6 mb-3">5.4 Refunds</h3>
            <p className="text-foreground/80 leading-relaxed">
              We offer a 7-day money-back guarantee for new subscriptions. If you are not satisfied with the 
              Service, contact us within 7 days of your initial purchase for a full refund. Refunds are not 
              available after this period or for subscription renewals.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Intellectual Property</h2>
            <h3 className="text-xl font-medium mt-6 mb-3">6.1 Your Content</h3>
            <p className="text-foreground/80 leading-relaxed">
              You retain all rights to the content you upload, including your resume text, work history, and 
              personal information. By using our Service, you grant us a limited license to process your content 
              solely for the purpose of providing the Service.
            </p>

            <h3 className="text-xl font-medium mt-6 mb-3">6.2 Our Content</h3>
            <p className="text-foreground/80 leading-relaxed">
              The Service and its original content (excluding content provided by users), features, and 
              functionality are and will remain the exclusive property of Useresumate and its licensors. 
              The Service is protected by copyright, trademark, and other laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. AI-Generated Content</h2>
            <p className="text-foreground/80 leading-relaxed">
              Our Service uses artificial intelligence to generate optimized resume content. While we strive 
              for accuracy, you are responsible for reviewing and verifying all AI-generated content before use. 
              You should:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Review all optimized content for accuracy</li>
              <li>Ensure the content truthfully represents your experience and qualifications</li>
              <li>Make any necessary corrections before submitting to employers</li>
              <li>Not rely solely on AI-generated content without personal review</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-foreground/80 leading-relaxed">
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, 
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="text-foreground/80 leading-relaxed mt-4">
              We do not guarantee that:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>The Service will meet your specific requirements</li>
              <li>Using our Service will result in job interviews or offers</li>
              <li>Your resume will pass all ATS systems</li>
              <li>The Service will be uninterrupted, timely, secure, or error-free</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Limitation of Liability</h2>
            <p className="text-foreground/80 leading-relaxed">
              IN NO EVENT SHALL USERESUMATE, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES 
              BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
              WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-foreground/80">
              <li>Your access to or use of (or inability to access or use) the Service</li>
              <li>Any conduct or content of any third party on the Service</li>
              <li>Any content obtained from the Service</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Termination</h2>
            <p className="text-foreground/80 leading-relaxed">
              We may terminate or suspend your account immediately, without prior notice or liability, for any 
              reason whatsoever, including without limitation if you breach the Terms. Upon termination, your 
              right to use the Service will immediately cease.
            </p>
            <p className="text-foreground/80 leading-relaxed mt-4">
              You may delete your account at any time through your account settings. Upon deletion, your data 
              will be removed according to our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Changes to Terms</h2>
            <p className="text-foreground/80 leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we 
              will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes 
              a material change will be determined at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">12. Governing Law</h2>
            <p className="text-foreground/80 leading-relaxed">
              These Terms shall be governed and construed in accordance with the laws of the United States, 
              without regard to its conflict of law provisions. Our failure to enforce any right or provision 
              of these Terms will not be considered a waiver of those rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mt-8 mb-4">13. Contact Us</h2>
            <p className="text-foreground/80 leading-relaxed">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="text-foreground/80 mt-4">
              <strong>Email:</strong>{" "}
              <a href="mailto:support@useresumate.com" className="text-primary hover:text-primary/90">
                support@useresumate.com
              </a>
            </p>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/" className="text-primary hover:text-primary/90">
            ← Back to Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Useresumate. All rights reserved.</p>
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

