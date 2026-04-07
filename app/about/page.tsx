import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Shield, Target, Users, Zap, Lock, Globe } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        {/* Hero Section */}
        <div className="mx-auto mb-20 max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            {/* <Shield className="h-4 w-4" /> */}
            About Shaji
          </div>
          <h1 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl text-balance">
            Revolutionizing Academic Integrity with Blockchain
          </h1>
          <p className="text-lg text-muted-foreground text-pretty md:text-xl">
            Shaji is a cutting-edge platform that leverages blockchain technology and zero-knowledge proofs to provide
            instant, secure verification of academic documents worldwide.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-20">
          <Card className="border-border/50 bg-card p-8 md:p-12">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="mb-4 text-3xl font-bold">Our Mission</h2>
                <p className="mb-4 text-muted-foreground leading-relaxed">
                  To make academic credentials instantly verifiable, fully secure, and universally trusted. Shaji leverages the 
                  Aqua blockchain to eliminate slow, costly and fraud-prone verification, creating immutable records 
                  that are trusted worldwide.
                </p>
                {/* <p className="text-muted-foreground leading-relaxed">
                  Shaji eliminates these problems by using the Aqua Protocol blockchain to create an immutable,
                  cryptographically secure record of every academic document, making verification instant and
                  fraud-proof.
                </p> */}
              </div>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl" />
                  <div className="relative flex h-64 w-64 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5">
                    <Shield className="h-32 w-32 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Values Section */}
        <section className="mb-20">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Our Core Values</h2>
            <p className="text-lg text-muted-foreground">The principles that guide everything we do</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Security First</h3>
              <p className="text-muted-foreground leading-relaxed">
                We use military-grade encryption and blockchain technology to ensure your documents are protected
                against fraud and tampering.
              </p>
            </Card>

            <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Privacy Matters</h3>
              <p className="text-muted-foreground leading-relaxed">
                Zero-knowledge proofs allow verification without exposing sensitive personal information, protecting
                student privacy at all times.
              </p>
            </Card>

            <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Speed & Efficiency</h3>
              <p className="text-muted-foreground leading-relaxed">
                Instant verification means no more waiting days or weeks for credential checks, accelerating hiring and
                admissions processes.
              </p>
            </Card>

            <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Global Access</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our platform works worldwide, making it easy to verify credentials from any institution, anywhere in the
                world.
              </p>
            </Card>

            <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Accuracy</h3>
              <p className="text-muted-foreground leading-relaxed">
                Blockchain-based verification eliminates human error and ensures 100% accurate credential validation
                every time.
              </p>
            </Card>

            <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Trust</h3>
              <p className="text-muted-foreground leading-relaxed">
                Built on transparent, immutable blockchain technology that creates an unbreakable chain of trust for
                academic credentials.
              </p>
            </Card>
          </div>
        </section>

        {/* Technology Section */}
        <section className="mb-20">
          <Card className="border-border/50 bg-card p-8 md:p-12">
            <div className="mb-8 text-center">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">Powered by Aqua Protocol</h2>
              <p className="text-lg text-muted-foreground">
                Built on cutting-edge blockchain infrastructure for maximum security and reliability
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-6">
                <h3 className="mb-3 text-lg font-semibold">Zero-Knowledge Proofs</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Advanced cryptographic techniques that allow verification of credentials without revealing sensitive
                  personal information, ensuring maximum privacy protection.
                </p>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/20 p-6">
                <h3 className="mb-3 text-lg font-semibold">Immutable Records</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Once a document is registered on the blockchain, it cannot be altered or deleted, creating a
                  permanent, tamper-proof record of authenticity.
                </p>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/20 p-6">
                <h3 className="mb-3 text-lg font-semibold">Decentralized Network</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No single point of failure means the system is always available and resistant to attacks or
                  manipulation by bad actors.
                </p>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/20 p-6">
                <h3 className="mb-3 text-lg font-semibold">Smart Contracts</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automated verification logic ensures consistent, reliable results without human intervention or the
                  possibility of bias.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Stats Section */}
        <section className="mb-20">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 p-8 md:p-12">
            <div className="grid gap-8 text-center md:grid-cols-3">
              <div>
                <div className="mb-2 text-4xl font-bold text-primary md:text-5xl">13</div>
                <p className="text-muted-foreground">Documents Verified</p>
              </div>
              <div>
                <div className="mb-2 text-4xl font-bold text-primary md:text-5xl">5</div>
                <p className="text-muted-foreground">Partner Institutions</p>
              </div>
              <div>
                <div className="mb-2 text-4xl font-bold text-primary md:text-5xl">ALL</div>
                <p className="text-muted-foreground">Countries Supported</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Team Section */}
        <section>
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Built by Experts</h2>
            <p className="text-lg text-muted-foreground">
              Our team combines expertise in blockchain, cryptography and education technology
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="mb-1 text-lg font-semibold">Blockchain Engineers</h3>
              <p className="text-sm text-muted-foreground">
                Experts in distributed systems and cryptographic protocols
              </p>
            </Card>

            <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
              <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <h3 className="mb-1 text-lg font-semibold">Security Specialists</h3>
              <p className="text-sm text-muted-foreground">Dedicated to protecting your data and privacy</p>
            </Card>

            <Card className="border-border/50 bg-card p-6 flex flex-col items-center justify-center text-center h-64">
              <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full ">
                <Target className="h-10 w-10 text-primary" />
              </div>
              <h3 className="mb-1 text-lg font-semibold">Education Advisors</h3>
              <p className="text-sm text-muted-foreground">Understanding the needs of institutions and students</p>
            </Card>
          </div>
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
                  className="h-8 w-auto"
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
                href="https://x.com"
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
