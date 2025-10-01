"use client"

import { useState, useRef, DragEvent, ChangeEvent } from "react"
import Link from "next/link"
import { 
  RefreshCw, 
  Upload, 
  Sparkles, 
  Mail, 
  Shield, 
  Plus, 
  Menu,
  Star,
  Check,
  ArrowRight,
  UploadCloud,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

const healthCheckSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  cv: z.instanceof(File, { message: "Please upload your CV" }).optional(),
})

type HealthCheckForm = z.infer<typeof healthCheckSchema>

export default function HealthCheckPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef2 = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<HealthCheckForm>({
    resolver: zodResolver(healthCheckSchema),
  })

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    const allowedExtensions = ["pdf", "doc", "docx"]
    const extension = file.name.split(".").pop()?.toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension || "")) {
      toast.error("Unsupported file type. Upload PDF, DOC, or DOCX.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10 MB.")
      return
    }

    setSelectedFile(file)
    setValue("cv", file)
    toast.success(`File selected: ${file.name}`)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const onSubmit = async (data: HealthCheckForm) => {
    if (!selectedFile) {
      toast.error("Please upload your CV (PDF, DOC, or DOCX)")
      return
    }

    setIsSubmitting(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSubmitting(false)

    // Show coming soon message
    toast.success("Coming soon! We're building the backend for this feature.", {
      description: "Your email has been saved. We'll notify you when it's ready!",
      duration: 5000,
    })

    // Reset form
    reset()
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (fileInputRef2.current) fileInputRef2.current.value = ""
  }

  return (
    <div className="antialiased text-white bg-black font-sans">
      {/* Background gradient */}
      <div
        className="absolute top-0 left-0 w-full h-[880px] -z-10"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, 0.3), hsla(0, 0%, 100%, 0))",
        }}
      />

      {/* Header */}
      <header className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <nav className="mt-6 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center bg-emerald-500 rounded-full">
                <RefreshCw className="h-4 w-4" />
              </span>
              <span className="text-base font-medium tracking-tighter font-sans">ResuMate AI</span>
            </Link>

            <div className="hidden gap-1 md:flex bg-white/5 border-white/10 border rounded-full p-1 backdrop-blur items-center">
              <a
                href="#how-it-works"
                className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white font-sans"
              >
                How It Works
              </a>
              <a href="#features" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white font-sans">
                Features
              </a>
              <a href="#waitlist" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white font-sans">
                Health Check
              </a>
              <a href="#faq" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white font-sans">
                FAQ
              </a>
            </div>

            <a
              href="#waitlist"
              className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-black bg-emerald-500 rounded-full ml-2 py-2 px-4 hover:bg-emerald-400 transition-colors font-sans"
            >
              Get Report
            </a>

            <button className="md:hidden inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium backdrop-blur font-sans">
              <Menu className="h-5 w-5" />
              Menu
            </button>
          </nav>

          {/* Hero Section */}
          <section id="waitlist" className="relative z-10 max-w-5xl text-center mx-auto pt-14 pb-12 sm:pt-20 md:pt-28">
            {/* Social proof */}
            <div className="mb-6 flex items-center justify-center gap-4">
              <div className="flex -space-x-3">
                <img
                  src="https://randomuser.me/api/portraits/women/68.jpg"
                  alt="User 1"
                  className="h-9 w-9 rounded-full ring-2 ring-black/60 object-cover"
                />
                <img
                  src="https://randomuser.me/api/portraits/men/32.jpg"
                  alt="User 2"
                  className="h-9 w-9 rounded-full ring-2 ring-black/60 object-cover"
                />
                <img
                  src="https://randomuser.me/api/portraits/women/44.jpg"
                  alt="User 3"
                  className="h-9 w-9 rounded-full ring-2 ring-black/60 object-cover"
                />
                <img
                  src="https://randomuser.me/api/portraits/men/8.jpg"
                  alt="User 4"
                  className="h-9 w-9 rounded-full ring-2 ring-black/60 object-cover"
                />
                <img
                  src="https://randomuser.me/api/portraits/women/39.jpg"
                  alt="User 5"
                  className="h-9 w-9 rounded-full ring-2 ring-black/60 object-cover"
                />
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-white fill-current" />
                  ))}
                </div>
                <p className="text-xs font-medium text-white/70 font-sans mt-1">Run a quick ATS health check</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium font-sans">Instant ATS check</span>
            </div>

            <h1 className="text-4xl tracking-tight sm:text-6xl md:text-7xl mx-auto font-semibold mt-4">
              <span
                className="text-white font-semibold"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                AI Resume
              </span>{" "}
              Health Check
            </h1>

            <p className="max-w-2xl text-base sm:text-lg font-normal text-white/70 mt-6 mx-auto font-sans">
              An instant analysis to verify if resumes meet basic ATS compatibility standards. Upload your CV to receive
              a personalised email with actionable feedback.
            </p>

            {/* Health Check Form */}
            <div className="mt-8 max-w-xl mx-auto">
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Drag & Drop Zone */}
                  <div className="relative">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`group relative flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed ${
                        isDragging
                          ? "border-emerald-500/50 bg-emerald-500/5 ring-2 ring-emerald-500/60"
                          : "border-white/15 bg-white/5"
                      } px-4 py-6 text-center hover:border-white/25 transition cursor-pointer`}
                    >
                      <div className="flex items-center justify-center h-9 w-9 rounded-full border border-white/10 bg-white/5">
                        <UploadCloud className="w-4 h-4 text-white/80" />
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-white/80 font-sans">
                        {selectedFile ? "Change CV" : "Drag & drop your CV"}
                      </div>
                      <div className="text-[11px] text-white/50 font-sans">
                        {selectedFile ? `${selectedFile.name} · ${formatFileSize(selectedFile.size)}` : "PDF, DOC, DOCX · max 10 MB"}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Email Input */}
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="you@domain.com"
                      autoComplete="email"
                      className={`w-full rounded-full bg-white/5 border ${
                        errors.email ? "border-red-500/60" : "border-white/15"
                      } text-white placeholder-white/40 pl-9 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm`}
                    />
                    {errors.email && (
                      <p className="absolute -bottom-5 left-0 text-xs text-red-400">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center items-center gap-2 rounded-full bg-emerald-500 text-black text-sm font-medium px-6 py-3 hover:bg-emerald-400 transition shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Get my ATS report</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-3 flex items-center justify-center gap-2">
                <Shield className="w-3.5 h-3.5 text-white/50" />
                <p className="text-xs text-white/60 font-sans">
                  We'll email a personalised report with actionable recommendations.
                </p>
              </div>
            </div>
          </section>
        </div>
      </header>

      {/* How It Works */}
      <section id="how-it-works" className="relative overflow-hidden py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-semibold">
                Check ATS readiness in three quick steps.
              </h2>
              <p className="mt-4 text-base text-white/70 font-sans">
                Verify your resume's basic ATS compatibility and formatting issues before applying. Get clear,
                actionable guidance by email.
              </p>
              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
                    <Upload className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium font-sans">1. Upload your CV</h3>
                    <p className="mt-1 text-sm text-white/60 font-sans">
                      Drop a PDF or DOCX and we'll run instant ATS checks.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
                    <Mail className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium font-sans">2. Enter your email</h3>
                    <p className="mt-1 text-sm text-white/60 font-sans">
                      We'll send your personalised findings and recommendations.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium font-sans">3. Get your ATS report</h3>
                    <p className="mt-1 text-sm text-white/60 font-sans">
                      Receive a clear summary with fixes you can apply right away.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=1080&q=80"
                alt="Resume health check UI"
                className="aspect-[4/3] w-full object-cover border-white/10 border rounded-2xl"
              />
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div className="max-w-3xl">
            <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-semibold">
              Ensure ATS compatibility before you apply.
            </h2>
            <p className="mt-3 text-base text-white/70 font-sans">
              Automated checks for formatting, parsing, and keyword alignment so your resume is machine-readable and
              recruiter-friendly.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 md:col-span-2 md:row-span-2 p-6 flex flex-col">
            <div className="relative flex-1">
              <h3 className="text-2xl sm:text-3xl tracking-tight font-semibold">ATS Compatibility Audit</h3>
              <p className="mt-2 text-sm sm:text-base text-white/70 font-sans">
                We scan structure, sections, fonts, tables, and graphics that could break parsing. Identify blockers and
                get clear steps to fix them.
              </p>
            </div>
            <div className="mt-6 rounded-lg overflow-hidden border border-white/10">
              <img
                src="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=1080&q=80"
                alt="ATS analysis UI"
                className="w-full object-cover"
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-medium tracking-tight flex items-center gap-2 font-sans">Parsing Readiness</h3>
            <p className="mt-2 text-sm text-white/70 font-sans">
              Detect elements that confuse ATS parsing like columns, headers/footers, icons, and images.
            </p>
            <div className="mt-4 rounded-lg overflow-hidden border border-white/10">
              <img
                src="https://images.unsplash.com/photo-1635151227785-429f420c6b9d?w=1080&q=80"
                alt="Parsing checks"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-medium tracking-tight flex items-center gap-2 font-sans">
              Instant Resume Score
            </h3>
            <p className="mt-2 text-sm text-white/70 font-sans">
              See a quick score of ATS readiness and priority fixes to improve it.
            </p>
            <div className="mt-4 rounded-lg overflow-hidden border border-white/10">
              <img
                src="https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=1080&q=80"
                alt="Resume Score UI"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2 font-sans">Formatting Checks</h3>
            <p className="mt-2 text-sm text-white/70 font-sans">
              Flags for tables, text boxes, unusual fonts, and layout issues.
            </p>
          </div>

          <div className="relative overflow-hidden bg-white/5 border-white/10 border rounded-2xl p-6">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2 font-sans">Keyword Coverage</h3>
            <p className="mt-2 text-sm text-white/70 font-sans">
              High-level signals on skills and terms commonly scanned by ATS.
            </p>
          </div>

          <div className="relative overflow-hidden bg-white/5 border-white/10 border rounded-2xl p-6">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2 font-sans">Exportable Fix List</h3>
            <p className="mt-2 text-sm text-white/70 font-sans">
              Receive a concise list of changes you can apply in minutes.
            </p>
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="relative py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium font-sans">Free ATS health check</span>
          </div>
          <h3 className="mt-4 text-2xl sm:text-3xl tracking-tight font-semibold">
            Upload your CV to get a personalised report by email.
          </h3>
          <p className="mt-2 text-sm text-white/70 font-sans">Takes under a minute to submit.</p>
          <div className="mt-6 max-w-md mx-auto">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Secondary Drag & Drop Zone */}
                <div className="relative">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef2.current?.click()}
                    className={`group relative flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed ${
                      isDragging
                        ? "border-emerald-500/50 bg-emerald-500/5 ring-2 ring-emerald-500/60"
                        : "border-white/15 bg-white/5"
                    } px-4 py-6 text-center hover:border-white/25 transition cursor-pointer`}
                  >
                    <div className="flex items-center justify-center h-9 w-9 rounded-full border border-white/10 bg-white/5">
                      <UploadCloud className="w-4 h-4 text-white/80" />
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-white/80 font-sans">
                      {selectedFile ? "Change CV" : "Drag & drop your CV"}
                    </div>
                    <div className="text-[11px] text-white/50 font-sans">
                      {selectedFile ? `${selectedFile.name}` : "PDF, DOC, DOCX · max 10 MB"}
                    </div>
                    <input
                      ref={fileInputRef2}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@domain.com"
                  autoComplete="email"
                  className="w-full rounded-full bg-white/5 border border-white/15 text-white placeholder-white/40 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center items-center gap-2 rounded-full bg-emerald-500 text-black text-sm font-medium px-6 py-3 hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Send my report</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative overflow-hidden pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-semibold">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-base text-white/70 font-sans">
              Everything you need to know about the Resume Health Check.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                question: "What will the health check analyze?",
                answer:
                  "We assess ATS parsing readiness (tables, columns, graphics), structure and headings, font usage, section ordering, and basic keyword coverage signals. You'll receive a concise report with fixes.",
              },
              {
                question: "Is my data private and secure?",
                answer:
                  "Yes. Your file is processed securely and is not used to train AI models. You can request deletion at any time.",
              },
              {
                question: "Will this guarantee passing every ATS?",
                answer:
                  "No tool can guarantee that, since ATS systems vary. Our checks address common parsing pitfalls and provide practical fixes to improve compatibility.",
              },
              {
                question: "How long does it take to get my report?",
                answer:
                  "Typically within minutes. We'll email your ATS health check to the address you provide.",
              },
            ].map((faq, index) => (
              <div key={index} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <button
                  className="w-full p-5 text-left flex items-center justify-between"
                  onClick={() => toggleFaq(index)}
                >
                  <h3 className="text-base font-medium pr-4 font-sans">{faq.question}</h3>
                  <span
                    className={`flex-shrink-0 w-5 h-5 text-white/60 transition-transform duration-300 ${
                      openFaq === index ? "rotate-45" : ""
                    }`}
                  >
                    <Plus className="w-5 h-5" />
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaq === index ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <p className="px-5 pb-5 pt-0 text-sm text-white/70 font-sans">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-sm text-white/50 font-sans">© 2025 ResuMate AI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-white/60 hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              <a href="#" className="text-white/60 hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
