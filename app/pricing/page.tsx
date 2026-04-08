"use client"

import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Check } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

export default function PricingPage() {
  const { isAuthenticated, login } = useAuth()
  const router = useRouter()

  const handleGetStarted = async () => {
    if (isAuthenticated) {
      router.push("/dashboard/pricing")
    } else {
      await login()
    }
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 pt-32 pb-20">
        {/* Header */}
        <div className="mx-auto mb-20 max-w-4xl text-center">
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">Simple, Transparent Pricing</h1>
          <p className="text-lg text-muted-foreground">
            Choose the plan that's right for you. All plans include blockchain verification.
          </p>
        </div>

        {/* Pricing Tiers */}
        <div className="mb-20 grid gap-8 md:grid-cols-3">
          {/* Free Plan */}
          <Card className="border-border/50 bg-card p-8">
            <div className="mb-6">
              <h3 className="mb-2 text-2xl font-bold">Starters Pack</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">$199.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">Perfect for individuals verifying occasional documents</p>
            </div>

            <ul className="mb-8 space-y-3">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">5 verifications per month</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">Basic document types</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">Mobile app access</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">Email support</span>
              </li>
            </ul>

            <Button variant="outline" className="w-full bg-transparent" onClick={handleGetStarted}>
              Get Started
            </Button>
          </Card>

          {/* Professional Plan */}
          <Card className="relative border-primary bg-card p-8 shadow-lg">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground">
              Most Popular
            </div>

            <div className="mb-6">
              <h3 className="mb-2 text-2xl font-bold">Professional</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">$499.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">For professionals and small teams</p>
            </div>

            <ul className="mb-8 space-y-3">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">Unlimited verifications</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">All document types</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">Priority support</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">API access</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">Bulk verification</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">Advanced analytics</span>
              </li>
            </ul>

            <Button className="w-full" onClick={handleGetStarted}>Subscribe</Button>
          </Card>

          {/* Enterprise Plan */}
          <Card className="border-border/50 bg-card p-8">
            <div className="mb-6">
              <h3 className="mb-2 text-2xl font-bold">Enterprise</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">$2500</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">For large organizations and institutions</p>
            </div>

            <ul className="mb-8 space-y-3">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">Everything in Professional</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">Custom integrations</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">Dedicated support</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">SLA guarantee</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">White-label options</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">Custom training</span>
              </li>
            </ul>

            <a href="mailto:info@shaji.org?subject=Enterprise%20Plan%20Inquiry">

              <Button variant="outline"  className="w-full bg-transparent" onClick={handleGetStarted}>Subscribe</Button>
              {/* <Button variant="outline" className="w-full bg-transparent">
                Subscribe
              </Button> */}
            </a>
          </Card>
        </div>

        {/* Institutional Pricing */}
        <section className="mb-20">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 p-8 md:p-12">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
                  {/* <Shield className="h-4 w-4" /> */}
                  For Educational Institutions
                </div>
                <h2 className="mb-4 text-3xl font-bold md:text-4xl">Institutional</h2>
                <p className="mb-6 text-lg text-muted-foreground">
                  Special pricing for universities, colleges, and educational institutions. Issue and verify unlimited
                  credentials for your students and alumni.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>Unlimited document issuance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>Branded verification portal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>Integration with student information systems</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>Dedicated account manager</span>
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <a href="mailto:info@shaji.org?subject=Request%20for%20Institutional%20Shaji%20Package">
                  <Button size="lg">Request a Demo</Button>
                </a>
              </div>
            </div>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="mb-20">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground">Everything you need to know about our pricing</p>
          </div>

          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="rounded-lg border-border/50 bg-card px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  Is there a free trial?
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  Yes! The Professional plan includes a 14-day free trial with full access to all features. No credit
                  card required to start.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="rounded-lg border-border/50 bg-card px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  Can I change plans later?
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately, and
                  we'll prorate any charges.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="rounded-lg border-border/50 bg-card px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  What payment methods do you accept?
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  We accept all major credit cards, PayPal, and wire transfers for Enterprise customers. All payments
                  are processed securely.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="rounded-lg border-border/50 bg-card px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  Is my data secure?
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  Yes. All data is encrypted end-to-end and stored on the blockchain. We never store sensitive personal
                  information, and we're fully compliant with FERPA and GDPR.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="rounded-lg border-border/50 bg-card px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  Do you offer discounts for non-profits?
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  Yes! We offer special pricing for non-profit organizations and educational institutions. Contact our
                  sales team to learn more.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="rounded-lg border-border/50 bg-card px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  What happens if I exceed my verification limit?
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  On the Free plan, you'll be prompted to upgrade. Professional and Enterprise plans include unlimited
                  verifications, so you never have to worry about limits.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* CTA Section */}
        <section>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 p-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to Get Started?</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join thousands of users who trust Shaji for secure document verification
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" onClick={handleGetStarted}>Subscribe</Button>
              <a
                href="https://wa.me/?text=Hi%2C%20I'm%20interested%20in%20Shaji%20and%20would%20like%20to%20speak%20with%20sales"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" variant="outline" className="bg-transparent">
                  Contact Sales
                </Button>
              </a>
            </div>
          </Card>
        </section>
      </div>
       {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Shaji logo"
                  className="h-8 w-auto" // Adjust size as needed
                />
              </Link>
              {/* <Shield className="h-5 w-5 text-primary" /> */}
              <span className="font-semibold">Shaji</span>
              <span className="text-sm text-muted-foreground">· Powered by Aqua Protocol</span>
            </div>

            <div className="flex items-center gap-6">
              <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground">
                Features
              </Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
                Pricing
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="GitHub"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="X (Twitter)"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="mt-6 border-t border-border/40 pt-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Shaji. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
