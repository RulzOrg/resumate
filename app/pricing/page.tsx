import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap, Star, ArrowRight } from "lucide-react"
import Link from "next/link"
import { PricingCard } from "@/components/pricing/pricing-card"

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-gradient">ResumeAI</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-foreground font-medium">
                Pricing
              </Link>
              <Button variant="outline" size="sm" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 gradient-blur animate-float"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="secondary" className="mb-6">
            <Star className="w-3 h-3 mr-1" />
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-balance mb-6">
            Choose the perfect plan for your <span className="text-gradient">career goals</span>
          </h1>
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto mb-8">
            Start free and upgrade as you grow. All plans include our core AI optimization features.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              period="forever"
              description="Perfect for getting started with AI resume optimization"
              features={[
                "3 resume optimizations per month",
                "Basic job analysis",
                "ATS compatibility check",
                "Standard templates",
                "Email support",
              ]}
              buttonText="Get Started Free"
              buttonVariant="outline"
              popular={false}
            />

            <PricingCard
              name="Pro"
              price="$19"
              period="month"
              description="Ideal for active job seekers and career changers"
              features={[
                "Unlimited resume optimizations",
                "Advanced job analysis with insights",
                "Custom resume templates",
                "Cover letter optimization",
                "Priority support",
                "Resume version management",
                "Industry-specific recommendations",
              ]}
              buttonText="Start Pro Trial"
              buttonVariant="default"
              popular={true}
            />

            <PricingCard
              name="Enterprise"
              price="$49"
              period="month"
              description="For professionals and teams who need the best"
              features={[
                "Everything in Pro",
                "Team collaboration features",
                "Custom branding",
                "API access",
                "Advanced analytics",
                "Dedicated account manager",
                "Custom integrations",
                "SLA guarantee",
              ]}
              buttonText="Contact Sales"
              buttonVariant="outline"
              popular={false}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently asked questions</h2>
            <p className="text-xl text-muted-foreground">Everything you need to know about our pricing</p>
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll
                prorate any billing differences.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">What happens to my data if I cancel?</h3>
              <p className="text-muted-foreground">
                Your data remains accessible for 30 days after cancellation. You can export your resumes and
                optimizations during this period.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-muted-foreground">
                We offer a 14-day money-back guarantee for all paid plans. If you're not satisfied, we'll refund your
                payment in full.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Is there a free trial for paid plans?</h3>
              <p className="text-muted-foreground">
                Yes, Pro and Enterprise plans come with a 7-day free trial. No credit card required to start your trial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to supercharge your job search?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of professionals who've transformed their careers with AI-optimized resumes.
          </p>
          <Button size="lg" className="text-lg px-8" asChild>
            <Link href="/auth/signup">
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
