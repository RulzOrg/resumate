"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { toast } from "sonner"
import {
  HelpCircle,
  MessageSquare,
  Mail,
  FileText,
  Zap,
  CreditCard,
  Upload,
  Target,
  Shield,
  BookOpen,
  Loader2
} from "lucide-react"

export default function SupportPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // TODO: Implement actual contact form submission
    // For now, just show a success message
    setTimeout(() => {
      toast.success("Message sent! We'll get back to you within 24 hours.")
      setFormData({ name: "", email: "", subject: "", message: "" })
      setLoading(false)
    }, 1000)
  }

  const faqs = [
    {
      category: "Getting Started",
      icon: <BookOpen className="w-5 h-5" />,
      questions: [
        {
          q: "How do I upload my resume?",
          a: "Click the 'Upload Resume' button on your dashboard or drag and drop your PDF/DOCX file directly onto the upload area. We support files up to 10MB."
        },
        {
          q: "What file formats are supported?",
          a: "We support PDF and DOCX formats. For best results, use a well-formatted PDF with clear sections and consistent styling."
        },
        {
          q: "How do I set my master resume?",
          a: "Go to your dashboard, find the resume you want to set as master, click the three-dot menu, and select 'Set as Master Resume'. This will be your default resume for optimizations."
        },
      ]
    },
    {
      category: "Optimization & Analysis",
      icon: <Target className="w-5 h-5" />,
      questions: [
        {
          q: "How does resume optimization work?",
          a: "Our AI analyzes the job description, extracts key requirements and keywords, then rewrites your resume to highlight relevant experience and skills while maintaining ATS compatibility."
        },
        {
          q: "What is a job analysis?",
          a: "Job analysis breaks down a job posting to identify required skills, experience level, keywords, and company culture. It helps you understand what employers are looking for."
        },
        {
          q: "Can I optimize for multiple jobs?",
          a: "Yes! You can create multiple optimized versions of your resume, each tailored to different job postings. Your usage limits depend on your subscription plan."
        },
        {
          q: "How accurate is the AI optimization?",
          a: "Our AI uses advanced language models trained on thousands of successful resumes. While highly accurate, we recommend reviewing and personalizing the output before submitting."
        },
      ]
    },
    {
      category: "Subscription & Billing",
      icon: <CreditCard className="w-5 h-5" />,
      questions: [
        {
          q: "What's included in the free plan?",
          a: "Free users get 3 resume optimizations and 5 job analyses per month. You can also store up to 3 resume versions."
        },
        {
          q: "How do I upgrade my subscription?",
          a: "Go to Settings > Subscription and click 'Upgrade Plan'. You can choose between Pro (unlimited optimizations) or Enterprise (team features) plans."
        },
        {
          q: "Can I cancel my subscription?",
          a: "Yes, you can cancel anytime from Settings > Subscription. You'll retain access until the end of your billing period."
        },
        {
          q: "Do you offer refunds?",
          a: "We offer a 7-day money-back guarantee for new subscriptions. Contact support within 7 days of purchase for a full refund."
        },
      ]
    },
    {
      category: "Privacy & Security",
      icon: <Shield className="w-5 h-5" />,
      questions: [
        {
          q: "Is my data secure?",
          a: "Yes! We use enterprise-grade encryption for all data transmission and storage. Your resumes are stored securely and never shared with third parties."
        },
        {
          q: "Can I delete my data?",
          a: "You can delete individual resumes anytime from your dashboard. To delete your entire account and all associated data, go to Settings > Danger Zone."
        },
        {
          q: "Do you use my resume data for training?",
          a: "No, we never use your personal resume data to train our AI models. Your data remains private and is used only to provide services to you."
        },
      ]
    },
    {
      category: "Technical Issues",
      icon: <Zap className="w-5 h-5" />,
      questions: [
        {
          q: "Why is my upload failing?",
          a: "Check that your file is under 10MB and in PDF or DOCX format. If issues persist, try converting to PDF or clearing your browser cache."
        },
        {
          q: "The optimization is taking too long",
          a: "Optimization typically takes 10-30 seconds. If it takes longer, refresh the page and try again. Contact support if the issue persists."
        },
        {
          q: "I can't see my optimized resumes",
          a: "Check the 'Optimized' tab on your dashboard. If they're missing, try refreshing the page or logging out and back in."
        },
      ]
    },
  ]

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">How can we help?</h1>
        <p className="text-lg text-muted-foreground">
          Get answers to common questions or reach out to our support team
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3 mb-12">
        <Card className="text-center">
          <CardHeader>
            <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
            <CardTitle>Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Learn how to use all features effectively
            </p>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-primary" />
            <CardTitle>Community</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Join our community for tips and discussions
            </p>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <Mail className="w-8 h-8 mx-auto mb-2 text-primary" />
            <CardTitle>Email Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Get help from our support team
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Contact Us
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <HelpCircle className="w-6 h-6" />
          Frequently Asked Questions
        </h2>

        {faqs.map((category, idx) => (
          <Card key={idx} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {category.icon}
                {category.category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {category.questions.map((faq, faqIdx) => (
                  <AccordionItem key={faqIdx} value={`${idx}-${faqIdx}`}>
                    <AccordionTrigger className="text-left">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card id="contact-form">
        <CardHeader>
          <CardTitle>Still need help?</CardTitle>
          <CardDescription>
            Send us a message and we'll get back to you within 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="How can we help?"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Describe your issue or question in detail..."
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          For urgent issues, email us directly at{" "}
          <a href="mailto:support@airesume.com" className="underline">
            support@airesume.com
          </a>
        </p>
        <p className="mt-2">
          Response time: Within 24 hours on business days
        </p>
      </div>
    </div>
  )
}