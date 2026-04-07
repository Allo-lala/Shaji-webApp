import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"
import { Shield, Lock, Zap, CheckCircle, FileCheck, Globe, Apple, Smartphone } from "lucide-react"
import { Analytics } from "@vercel/analytics/next" // Add this line Vercel Analytics

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
              {/* <Shield className="h-4 w-4" /> */}
              Powered by Aqua Protocol
            </div>

            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-balance md:text-6xl lg:text-7xl">
              Verify Academic Documents with <span className="text-primary">Blockchain Trust</span>
            </h1>

            <p className="mb-10 text-lg text-muted-foreground text-pretty md:text-xl">
              Shaji uses cryptographic proofs and zero-knowledge technology to instantly verify diplomas, transcripts,
              and certificates without compromising privacy.
            </p>

            {/* <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <Link href="/verify">
                <Button size="lg" className="w-full sm:w-auto">
                  Verify a Document
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                  Learn More
                </Button>
              </Link>
            </div> */}

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <p className="w-full text-sm text-muted-foreground sm:w-auto">Download the mobile app:</p>
              <a href="#" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto bg-transparent">
                  <Apple className="h-4 w-4" />
                  App Store
                </Button>
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto bg-transparent">
                  <Smartphone className="h-4 w-4" />
                  Google Play
                </Button>
              </a>
            </div>
            {/* End of added app download buttons */}
          </div>

          <div className="flex items-center justify-center">
            <div className="relative">
              <img
                src="/shaji.png"
                alt="Shaji Mobile App Image"
                className="h-auto w-full max-w-[300px] rounded-3xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Why Choose Shaji?</h2>
          <p className="text-lg text-muted-foreground">
            Built on blockchain technology for maximum security and trust
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Zero-Knowledge Proofs</h3>
            <p className="text-muted-foreground">
              Verify credentials without exposing sensitive personal information using advanced cryptography
            </p>
          </Card>

          {/* Card 2 */}
          <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Instant Verification</h3>
            <p className="text-muted-foreground">
              Get results in seconds, not days. No more waiting for manual verification processes
            </p>
          </Card>

          {/* Card 3 */}
          <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Blockchain Security</h3>
            <p className="text-muted-foreground">
              Immutable records on Aqua Protocol ensure documents cannot be forged or tampered with
            </p>
          </Card>

          {/* Card 4 */}
          <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
              <FileCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Multiple Document Types</h3>
            <p className="text-muted-foreground">
              Verify diplomas, transcripts, certificates, and more from institutions worldwide
            </p>
          </Card>

          {/* Card 5 */}
          <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Global Acceptance</h3>
            <p className="text-muted-foreground">
              Recognized by employers and institutions across the world for reliable verification
            </p>
          </Card>

          {/* Card 6 */}
          <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Easy Integration</h3>
            <p className="text-muted-foreground">
              Simple mobile app interface makes verification accessible to everyone
            </p>
          </Card>
        </div>
      </section>


      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">How It Works</h2>
          <p className="text-lg text-muted-foreground">Three simple steps to verify any academic document</p>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-primary">
                1
              </div>
              <h3 className="mb-2 text-xl font-semibold">Upload Document</h3>
              <p className="text-muted-foreground">
                Scan or upload your academic document through the Shaji mobile app
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full  text-2xl font-bold text-primary">
                2
              </div>
              <h3 className="mb-2 text-xl font-semibold">Cryptographic Verification</h3>
              <p className="text-muted-foreground">
                Our system checks the blockchain for matching cryptographic proofs
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full  text-2xl font-bold text-primary">
                3
              </div>
              <h3 className="mb-2 text-xl font-semibold">Get Results</h3>
              <p className="text-muted-foreground">
                Receive instant verification with detailed authenticity information
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to Verify Your Documents?</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join thousands of users who trust Shaji for secure document verification
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {/* <Link href="#"> */}
              <Button size="lg">Download Shaji</Button>
            {/* </Link> */}
            <div className="flex items-center gap-3">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="gap-2 bg-transparent">
                  <Apple className="h-5 w-5" />
                  iOS
                </Button>
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="gap-2 bg-transparent">
                  <Smartphone className="h-5 w-5" />
                  Android
                </Button>
              </a>
            </div>
            {/* End of added app download buttons in CTA section */}
          </div>
        </Card>
      </section>

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
                href="https://github.com/Allo-lala/Shaji-webApp"
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
                href="https://x.com/shaji"
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

      <Analytics />//  Vercel Analytics